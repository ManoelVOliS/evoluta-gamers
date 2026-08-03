import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { AnyBulkWriteOperation, Model, Types } from 'mongoose'
import { ErrorCode, type SyncResult } from '@evoluta-gamers/shared'
import { UserGame, type UserGameDocument } from '../catalog/schemas/user-game.schema'
import { nameVariants } from '../games/name-normalize'
import { Game, type GameDocument } from '../games/schemas/game.schema'
import { UsersService } from '../users/users.service'
import type { SteamOwnedGame } from './steam-api.client'
import { SteamApiClient } from './steam-api.client'
import { SyncRun, type SyncRunDocument } from './schemas/sync-run.schema'

@Injectable()
export class SteamSyncService {
  constructor(
    private readonly steam: SteamApiClient,
    private readonly users: UsersService,
    @InjectModel(Game.name) private readonly games: Model<GameDocument>,
    @InjectModel(UserGame.name)
    private readonly userGames: Model<UserGameDocument>,
    @InjectModel(SyncRun.name)
    private readonly syncRuns: Model<SyncRunDocument>,
  ) {}

  async sync(userId: string): Promise<SyncResult> {
    const user = await this.users.findById(userId)
    if (!user?.steamId64) {
      throw new BadRequestException({ code: ErrorCode.STEAM_NOT_LINKED })
    }

    const owned = await this.steam.getOwnedGames(user.steamId64)
    if (owned === null) {
      await this.recordFailure(userId, 'private', 'Perfil privado')
      throw new UnprocessableEntityException({
        code: ErrorCode.STEAM_PROFILE_PRIVATE,
      })
    }

    const startedAt = new Date()

    // A Steam pode repetir o mesmo appid na lista (acontece com alguns jogos).
    // Sem deduplicar aqui, o segundo registro vira um "update" fantasma sobre
    // o primeiro dentro do mesmo bulkWrite, inflando as contagens do resultado.
    const uniqueOwned = [...new Map(owned.map((g) => [g.appid, g])).values()]

    const gameIds = await this.resolveGameIds(uniqueOwned)

    // Quem sumiu vai virar removedAt=<agora>. Contar ANTES de tocar em nada
    // é o único jeito simples de saber quantos estavam removidos e voltaram.
    const restored = await this.userGames
      .countDocuments({
        userId: new Types.ObjectId(userId),
        gameId: { $in: [...gameIds.values()] },
        removedAt: { $ne: null },
      })
      .exec()

    const ops: AnyBulkWriteOperation<UserGame>[] = uniqueOwned.map((g) => ({
      updateOne: {
        filter: {
          userId: new Types.ObjectId(userId),
          gameId: gameIds.get(g.appid)!,
        },
        update: {
          $set: {
            source: 'steam',
            playtimeMinutes: g.playtime_forever,
            lastSeenInSyncAt: startedAt,
            removedAt: null,
          },
          $setOnInsert: { status: 'not_started' },
        },
        upsert: true,
      },
    }))

    const result = ops.length
      ? await this.userGames.bulkWrite(ops, { ordered: false })
      : { upsertedCount: 0, modifiedCount: 0 }

    // O que não foi tocado nesta rodada é o que sumiu da biblioteca. Nunca
    // apagamos — só marcamos; é o histórico de zerados que importa manter.
    const removedResult = await this.userGames
      .updateMany(
        {
          userId: new Types.ObjectId(userId),
          source: 'steam',
          removedAt: null,
          $or: [
            { lastSeenInSyncAt: { $lt: startedAt } },
            { lastSeenInSyncAt: null },
          ],
        },
        { $set: { removedAt: startedAt } },
      )
      .exec()

    await this.recordSuccess(userId, {
      imported: result.upsertedCount,
      updated: result.modifiedCount,
      removed: removedResult.modifiedCount,
      restored,
    })

    return {
      status: 'ok',
      imported: result.upsertedCount,
      updated: result.modifiedCount,
      removed: removedResult.modifiedCount,
      restored,
      syncedAt: startedAt.toISOString(),
    }
  }

  /**
   * Garante um `games._id` para cada jogo da Steam, reconciliando com o que
   * a importação de planilha já criou (aqueles docs não têm `appId`).
   * Sem isso, o mesmo jogo vira dois registros: um da planilha, outro da Steam.
   */
  private async resolveGameIds(
    /** Já deduplicado por appid — quem chama (`sync`) garante isso. */
    owned: SteamOwnedGame[],
  ): Promise<Map<number, Types.ObjectId>> {
    const byAppId = new Map(owned.map((g) => [g.appid, g]))
    const appids = [...byAppId.keys()]
    const existingByAppId = await this.games
      .find({ appId: { $in: appids } })
      .select('appId')
      .exec()
    const knownAppIds = new Set(existingByAppId.map((g) => g.appId))
    const result = new Map<number, Types.ObjectId>(
      existingByAppId.map((g) => [g.appId!, g._id as Types.ObjectId]),
    )

    const missing = appids.filter((id) => !knownAppIds.has(id))
    if (missing.length === 0) return result

    // Candidatos à reconciliação: jogos que a planilha criou sem appid.
    const missingVariants = missing.flatMap((id) =>
      nameVariants(byAppId.get(id)!.name),
    )
    const spreadsheetCandidates = await this.games
      .find({
        appId: null,
        $or: [
          { nameNormalized: { $in: missingVariants } },
          { aliases: { $in: missingVariants } },
        ],
      })
      .exec()
    const byNameVariant = new Map<string, GameDocument>()
    for (const doc of spreadsheetCandidates) {
      byNameVariant.set(doc.nameNormalized, doc)
      for (const alias of doc.aliases) byNameVariant.set(alias, doc)
    }

    for (const appid of missing) {
      const steamGame = byAppId.get(appid)!
      const variants = nameVariants(steamGame.name)
      const normalized = variants[0]!
      const merge = variants.map((v) => byNameVariant.get(v)).find(Boolean)

      if (merge) {
        merge.appId = appid
        merge.iconUrl = this.iconUrlFor(appid, steamGame.img_icon_url)
        await merge.save()
        result.set(appid, merge._id as Types.ObjectId)

        // Uma vez usado, tira da mesa TODAS as chaves do doc — não só as
        // variantes do jogo atual. Removendo só `variants`, um alias que o
        // doc tinha por outro motivo (ex.: veio da planilha com um nome
        // diferente) continuaria livre, e um segundo appid da Steam poderia
        // "roubar" o mesmo doc por baixo, sobrescrevendo o primeiro vínculo.
        for (const [key, doc] of byNameVariant) {
          if (doc === merge) byNameVariant.delete(key)
        }
        continue
      }

      const created = await this.games.create({
        appId: appid,
        name: steamGame.name,
        nameNormalized: normalized,
        aliases: variants.slice(1),
        iconUrl: this.iconUrlFor(appid, steamGame.img_icon_url),
      })
      result.set(appid, created._id as Types.ObjectId)
    }

    return result
  }

  private iconUrlFor(appid: number, hash: string): string | null {
    if (!hash) return null
    return `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appid}/${hash}.jpg`
  }

  private async recordSuccess(
    userId: string,
    counts: { imported: number; updated: number; removed: number; restored: number },
  ): Promise<void> {
    await Promise.all([
      this.syncRuns.create({
        userId: new Types.ObjectId(userId),
        status: 'ok',
        ...counts,
      }),
      this.users.recordSyncOutcome(userId, { ok: true, error: null }),
    ])
  }

  private async recordFailure(
    userId: string,
    status: 'private' | 'not_found' | 'error',
    message: string,
  ): Promise<void> {
    await Promise.all([
      this.syncRuns.create({
        userId: new Types.ObjectId(userId),
        status,
        errorMessage: message,
      }),
      this.users.recordSyncOutcome(userId, { ok: false, error: message }),
    ])
  }
}
