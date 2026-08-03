import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
import type { ClassificationState, DensityLevel } from '@evoluta-gamers/shared'

export type GameDocument = HydratedDocument<Game>

/**
 * Classificação do jogo no catálogo GLOBAL — PRD §5.3.
 *
 * `estimatedHours` é a duração para ZERAR o jogo. Não confundir com as horas
 * que o usuário já jogou, que vivem em `user_games.playtimeMinutes` e vêm da
 * Steam. A Steam não expõe duração; este dado vem da planilha ou de um humano.
 */
@Schema({ _id: false })
export class GameClassification {
  @Prop({
    required: true,
    enum: ['unclassified', 'suggested', 'confirmed'],
    default: 'unclassified',
  })
  state!: ClassificationState

  /** Tem fim definido? `null` = ninguém decidiu ainda. */
  @Prop({ type: Boolean, default: null })
  finishable!: boolean | null

  @Prop({ type: Number, default: null })
  estimatedHours!: number | null

  /** Sempre derivada de `estimatedHours` — nunca informada à mão. */
  @Prop({ type: Number, default: null })
  density!: DensityLevel | null

  /** "Campanha linear com final", "MOBA online / PvP - sem fim". */
  @Prop({ type: String, default: null })
  reason!: string | null

  /** Gênero em pt-BR da planilha ("Terror-puzzle"). Separado de `genres`. */
  @Prop({ type: [String], default: [] })
  tagsPtBr!: string[]

  @Prop({
    type: String,
    enum: ['rule', 'spreadsheet', 'human', null],
    default: null,
  })
  source!: 'rule' | 'spreadsheet' | 'human' | null

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  confirmedBy!: Types.ObjectId | null

  @Prop({ type: Date, default: null })
  confirmedAt!: Date | null
}

export const GameClassificationSchema =
  SchemaFactory.createForClass(GameClassification)

@Schema({ collection: 'games', timestamps: true })
export class Game {
  /**
   * Ausente (não `null`) enquanto o jogo só existe na planilha. O índice único
   * é parcial justamente por isso — ver comentário abaixo.
   */
  @Prop({ type: Number, default: null })
  appId!: number | null

  /** Equivalente ao `appId` da Steam, mas da Epic — lá o identificador é string. */
  @Prop({ type: String, default: null })
  epicAppName!: string | null

  @Prop({ required: true, trim: true })
  name!: string

  /** Chave de casamento planilha ↔ Steam. Ver `normalizeGameName`. */
  @Prop({ required: true, index: true })
  nameNormalized!: string

  /** Outras grafias normalizadas (edições, nome da planilha). */
  @Prop({ type: [String], default: [] })
  aliases!: string[]

  /** Gêneros da Steam, em inglês. Nunca sobrescritos pela planilha. */
  @Prop({ type: [String], default: [] })
  genres!: string[]

  @Prop({ type: String, default: null })
  iconUrl!: string | null

  @Prop({ type: GameClassificationSchema, default: () => ({}) })
  classification!: GameClassification
}

export const GameSchema = SchemaFactory.createForClass(Game)

/**
 * Único só entre os jogos que já têm appid. `sparse` não serviria: `appId: null`
 * é valor presente, e o segundo jogo vindo só da planilha colidiria.
 */
GameSchema.index(
  { appId: 1 },
  { unique: true, partialFilterExpression: { appId: { $type: 'number' } } },
)
GameSchema.index(
  { epicAppName: 1 },
  { unique: true, partialFilterExpression: { epicAppName: { $type: 'string' } } },
)
GameSchema.index({ aliases: 1 })
GameSchema.index({ 'classification.state': 1 })
