import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type RefreshTokenDocument = HydratedDocument<RefreshToken>

/**
 * Refresh tokens emitidos, para permitir revogação (logout, banimento).
 * Guardamos só o hash: um vazamento do banco não vira sessão de ninguém.
 */
@Schema({ collection: 'refresh_tokens', timestamps: true })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId

  @Prop({ required: true, unique: true })
  tokenHash!: string

  @Prop({ required: true })
  expiresAt!: Date

  @Prop({ type: Date, default: null })
  revokedAt!: Date | null
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken)

// O Mongo apaga sozinho o que já expirou — a coleção não cresce para sempre.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
