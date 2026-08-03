import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import type { UserRole, UserStatus } from '@evoluta-gamers/shared'

export type UserDocument = HydratedDocument<User>

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string

  /** Hash argon2. A senha em texto puro nunca sai do request. */
  @Prop({ required: true })
  passwordHash!: string

  @Prop({ required: true, trim: true })
  name!: string

  @Prop({ type: String, default: null })
  avatarUrl!: string | null

  @Prop({ type: String, default: null })
  bio!: string | null

  @Prop({ required: true, enum: ['admin', 'user'], default: 'user' })
  role!: UserRole

  /** Rede fechada: a conta nasce `pending` e um admin libera — PRD §4/§5.1. */
  @Prop({
    required: true,
    enum: ['pending', 'active', 'suspended'],
    default: 'pending',
  })
  status!: UserStatus

  /** steamID64 verificado. Índice único parcial declarado abaixo. */
  @Prop({ type: String, default: null })
  steamId64!: string | null

  /** Nome e avatar da Steam, guardados no vínculo para não bater na API toda hora. */
  @Prop({ type: String, default: null })
  steamPersonaName!: string | null

  @Prop({ type: String, default: null })
  steamAvatarUrl!: string | null

  /** Meta de jogos zerados por mês — PRD §5.4 (não travar em 2). */
  @Prop({ default: 2, min: 1, max: 20 })
  monthlyGoal!: number

  @Prop({ type: Date, default: null })
  lastSyncAt!: Date | null

  /** Última falha de sincronização, para a métrica de admin do PRD §5.6. */
  @Prop({ type: String, default: null })
  lastSyncError!: string | null
}

export const UserSchema = SchemaFactory.createForClass(User)

/**
 * Único, mas só entre quem realmente tem Steam vinculada.
 *
 * `sparse` NÃO serve aqui: ele só ignora documentos em que o campo está
 * ausente, e `steamId64: null` é um valor presente — o segundo usuário sem
 * Steam colidiria com o primeiro (E11000). O filtro parcial resolve.
 */
UserSchema.index(
  { steamId64: 1 },
  { unique: true, partialFilterExpression: { steamId64: { $type: 'string' } } },
)
UserSchema.index({ status: 1 })
UserSchema.index({ role: 1 })
