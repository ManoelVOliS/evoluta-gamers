import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import type {
  CatalogItem,
  CreateManualGameInput,
  UpdateCatalogItemInput,
} from '@evoluta-gamers/shared'
import { nameVariants } from '../games/name-normalize'
import { Game, type GameDocument } from '../games/schemas/game.schema'
import { UserGame, type UserGameDocument } from './schemas/user-game.schema'

type Populated = UserGameDocument & { gameId: GameDocument }

@Injectable()
export class CatalogService {
  constructor(
    @InjectModel(UserGame.name)
    private readonly model: Model<UserGameDocument>,
    @InjectModel(Game.name)
    private readonly games: Model<GameDocument>,
  ) {}

  async list(userId: string): Promise<CatalogItem[]> {
    const items = (await this.model
      .find({ userId: new Types.ObjectId(userId), removedAt: null })
      .populate('gameId')
      .sort({ createdAt: -1 })
      .exec()) as unknown as Populated[]

    return items.filter((i) => i.gameId).map((i) => CatalogService.toDto(i))
  }

  async update(
    userId: string,
    id: string,
    input: UpdateCatalogItemInput,
  ): Promise<CatalogItem> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Jogo não encontrado no seu catálogo')
    }

    const patch: Record<string, unknown> = {}
    if (input.status !== undefined) patch.status = input.status
    if (input.rating !== undefined) patch.rating = input.rating
    if (input.finishedAt !== undefined) {
      patch.finishedAt = input.finishedAt ? new Date(input.finishedAt) : null
    }
    // Ajustes de classificação são pessoais: não tocam no catálogo global.
    if (input.finishable !== undefined) {
      patch['override.finishable'] = input.finishable
    }
    if (input.estimatedHours !== undefined) {
      patch['override.estimatedHours'] = input.estimatedHours
    }

    // Marcar como zerado sem informar a data registra hoje — senão o jogo
    // ficaria fora de qualquer mês na rotina.
    if (input.status === 'finished' && input.finishedAt === undefined) {
      patch.finishedAt = new Date()
    }

    const updated = (await this.model
      .findOneAndUpdate(
        { _id: id, userId: new Types.ObjectId(userId) },
        { $set: patch },
        { new: true },
      )
      .populate('gameId')
      .exec()) as unknown as Populated | null

    if (!updated) {
      throw new NotFoundException('Jogo não encontrado no seu catálogo')
    }
    return CatalogService.toDto(updated)
  }

  /**
   * Entrada que nenhum processo automático traz — Epic Games, Family Sharing.
   * Casa por nome com o catálogo global antes de criar, pelo mesmo motivo que
   * a sync da Steam e o import de planilha fazem isso: sem reconciliar, o
   * mesmo jogo digitado por duas pessoas vira dois documentos, e o "Hollow
   * Knight" que a rede já classificou não é aproveitado.
   */
  async createManual(
    userId: string,
    input: CreateManualGameInput,
  ): Promise<CatalogItem> {
    const variants = nameVariants(input.name)
    const normalized = variants[0]!

    let game = await this.games
      .findOne({
        $or: [
          { nameNormalized: { $in: variants } },
          { aliases: { $in: variants } },
        ],
      })
      .exec()

    game ??= await this.games.create({
      name: input.name,
      nameNormalized: normalized,
      aliases: variants.slice(1),
    })

    try {
      const created = (await this.model.create({
        userId: new Types.ObjectId(userId),
        gameId: game._id,
        source: input.source,
        override: { estimatedHours: input.estimatedHours ?? null },
      })) as unknown as UserGameDocument
      const populated = (await created.populate('gameId')) as Populated
      return CatalogService.toDto(populated)
    } catch (error) {
      // Índice único {userId,gameId}: é a mesma checagem que impede duas
      // entradas do mesmo jogo pro mesmo usuário, venha de onde vier.
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('Esse jogo já está no seu catálogo')
      }
      throw error
    }
  }

  async countForUser(userId: string): Promise<number> {
    return this.model
      .countDocuments({ userId: new Types.ObjectId(userId), removedAt: null })
      .exec()
  }

  static toDto(item: Populated): CatalogItem {
    const game = item.gameId
    const c = game.classification

    return {
      id: item.id as string,
      gameId: game.id as string,
      appId: game.appId,
      name: game.name,
      iconUrl: game.iconUrl,
      source: item.source,
      genres: game.genres,
      tagsPtBr: c.tagsPtBr,
      playtimeHours: Math.round((item.playtimeMinutes / 60) * 10) / 10,
      // O ajuste pessoal vence a classificação global — PRD §5.3.
      estimatedHours: item.override.estimatedHours ?? c.estimatedHours,
      finishable: item.override.finishable ?? c.finishable,
      density: c.density,
      classificationState: c.state,
      status: item.status,
      finishedAt: item.finishedAt ? item.finishedAt.toISOString() : null,
      rating: item.rating,
    }
  }
}
