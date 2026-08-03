import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { AnyBulkWriteOperation, Model, Types } from 'mongoose'
import { ErrorCode, type SyncResult } from '@evoluta-gamers/shared'
import { UserGame, type UserGameDocument } from '../catalog/schemas/user-game.schema'
import { nameVariants } from '../games/name-normalize'
import { Game, type GameDocument } from '../games/schemas/game.schema'
import { UsersService } from '../users/users.service'
import { EpicLinkService } from './epic-link.service'
import { EpicSessionError, fetchEpicLibrary, type LegendaryGame } from './legendary-cli'
import { SyncRun, type SyncRunDocument } from '../steam/schemas/sync-run.schema'

@Injectable()
export class EpicSyncService {
  constructor(
    private readonly link: EpicLinkService,
    private readonly users: UsersService,
    @InjectModel(Game.name) private readonly games: Model<GameDocument>,
    @InjectModel(UserGame.name)
    private readonly userGames: Model<UserGameDocument>,
    @InjectModel(SyncRun.name)
    private readonly syncRuns: Model<SyncRunDocument>,
  ) {}

  async sync(userId: string): Promise<SyncResult> {
    const sessionJson = await this.link.getSessionJson(userId)
    if (!sessionJson) {
      throw new BadRequestException({ code: ErrorCode.EPIC_NOT_LINKED })
    }

    let owned: LegendaryGame[]
    try {
      owned = await fetchEpicLibrary(sessionJson)
    } catch (error) {
      const message = error instanceof EpicSessionError ? error.message : String(error)
      await this.recordFailure(userId, message)
      throw new BadRequestException({ code: ErrorCode.EPIC_SESSION_INVALID })
    }

    const startedAt = new Date()
    const uniqueOwned = [...new Map(owned.map((g) => [g.appName, g])).values()]
    const gameIds = await this.resolveGameIds(uniqueOwned)

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
          gameId: gameIds.get(g.appName)!,
        },
        update: {
          $set: {
            source: 'epic',
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

    const removedResult = await this.userGames
      .updateMany(
        {
          userId: new Types.ObjectId(userId),
          source: 'epic',
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
   * Mesma lógica de `SteamSyncService.resolveGameIds` (apps/api/src/steam/steam-sync.service.ts),
   * só trocando o campo de identidade: `epicAppName` (string) em vez de
   * `appId` (número). Reconcilia com jogos que a planilha ou a Steam já
   * criaram, casando por nome, antes de criar um `games` novo.
   */
  private async resolveGameIds(
    owned: LegendaryGame[],
  ): Promise<Map<string, Types.ObjectId>> {
    const byAppName = new Map(owned.map((g) => [g.appName, g]))
    const appNames = [...byAppName.keys()]

    const existingByAppName = await this.games
      .find({ epicAppName: { $in: appNames } })
      .select('epicAppName')
      .exec()
    const known = new Set(existingByAppName.map((g) => g.epicAppName))
    const result = new Map<string, Types.ObjectId>(
      existingByAppName.map((g) => [g.epicAppName!, g._id as Types.ObjectId]),
    )

    const missing = appNames.filter((id) => !known.has(id))
    if (missing.length === 0) return result

    const missingVariants = missing.flatMap((id) =>
      nameVariants(byAppName.get(id)!.title),
    )
    const candidates = await this.games
      .find({
        epicAppName: null,
        $or: [
          { nameNormalized: { $in: missingVariants } },
          { aliases: { $in: missingVariants } },
        ],
      })
      .exec()
    const byNameVariant = new Map<string, GameDocument>()
    for (const doc of candidates) {
      byNameVariant.set(doc.nameNormalized, doc)
      for (const alias of doc.aliases) byNameVariant.set(alias, doc)
    }

    for (const appName of missing) {
      const epicGame = byAppName.get(appName)!
      const variants = nameVariants(epicGame.title)
      const normalized = variants[0]!
      const merge = variants.map((v) => byNameVariant.get(v)).find(Boolean)

      if (merge) {
        merge.epicAppName = appName
        await merge.save()
        result.set(appName, merge._id as Types.ObjectId)

        for (const [key, doc] of byNameVariant) {
          if (doc === merge) byNameVariant.delete(key)
        }
        continue
      }

      const created = await this.games.create({
        epicAppName: appName,
        name: epicGame.title,
        nameNormalized: normalized,
        aliases: variants.slice(1),
      })
      result.set(appName, created._id as Types.ObjectId)
    }

    return result
  }

  private async recordSuccess(
    userId: string,
    counts: { imported: number; updated: number; removed: number; restored: number },
  ): Promise<void> {
    await Promise.all([
      this.syncRuns.create({
        userId: new Types.ObjectId(userId),
        source: 'epic',
        status: 'ok',
        ...counts,
      }),
      this.users.recordSyncOutcome(userId, { ok: true, error: null }),
    ])
  }

  private async recordFailure(userId: string, message: string): Promise<void> {
    await Promise.all([
      this.syncRuns.create({
        userId: new Types.ObjectId(userId),
        source: 'epic',
        status: 'error',
        errorMessage: message,
      }),
      this.users.recordSyncOutcome(userId, { ok: false, error: message }),
    ])
  }
}
