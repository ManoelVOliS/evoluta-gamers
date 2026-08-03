import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
import type { GameSource, GameStatus } from '@evoluta-gamers/shared'

export type UserGameDocument = HydratedDocument<UserGame>

/** Ajuste pessoal sobre a classificação global — PRD §5.3. */
@Schema({ _id: false })
export class UserGameOverride {
  @Prop({ type: Boolean, default: null })
  finishable!: boolean | null

  @Prop({ type: Number, default: null })
  estimatedHours!: number | null
}

export const UserGameOverrideSchema =
  SchemaFactory.createForClass(UserGameOverride)

/** Relação usuário ↔ jogo: só o que pertence àquele usuário — PRD §6. */
@Schema({ collection: 'user_games', timestamps: true })
export class UserGame {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'Game', required: true })
  gameId!: Types.ObjectId

  @Prop({
    required: true,
    enum: ['steam', 'epic', 'manual_family_sharing', 'manual_epic'],
    default: 'manual_family_sharing',
  })
  source!: GameSource

  /**
   * Horas JÁ JOGADAS, em minutos — é o que a Steam devolve (`playtime_forever`).
   * Guardar em horas fracionadas perderia precisão e desalinharia do dado dela.
   */
  @Prop({ default: 0 })
  playtimeMinutes!: number

  @Prop({
    required: true,
    enum: ['not_started', 'playing', 'finished', 'abandoned'],
    default: 'not_started',
  })
  status!: GameStatus

  @Prop({ type: Date, default: null })
  finishedAt!: Date | null

  /** 0 a 10, como na planilha. */
  @Prop({ type: Number, default: null })
  rating!: number | null

  @Prop({ type: UserGameOverrideSchema, default: () => ({}) })
  override!: UserGameOverride

  /** Sumiu da biblioteca no re-sync. Nunca apagamos: o histórico importa. */
  @Prop({ type: Date, default: null })
  removedAt!: Date | null

  /**
   * Carimbado a cada sync da Steam em que o jogo apareceu. É como o re-sync
   * decide o que sumiu: quem não foi tocado na última rodada é o que falta.
   * `null` para itens que nunca vieram da Steam (manuais).
   */
  @Prop({ type: Date, default: null })
  lastSeenInSyncAt!: Date | null
}

export const UserGameSchema = SchemaFactory.createForClass(UserGame)

UserGameSchema.index({ userId: 1, gameId: 1 }, { unique: true })
UserGameSchema.index({ userId: 1, status: 1 })
UserGameSchema.index({ userId: 1, removedAt: 1 })
