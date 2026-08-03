import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type EpicSessionDocument = HydratedDocument<EpicSession>

/**
 * Sessão da `legendary` (user.json) de um usuário, criptografada — nunca em
 * texto puro no banco. Ver `epic-token-crypto.ts`.
 */
@Schema({ collection: 'epic_sessions', timestamps: true })
export class EpicSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId!: Types.ObjectId

  @Prop({ required: true })
  ciphertext!: string

  @Prop({ required: true })
  iv!: string

  @Prop({ required: true })
  authTag!: string

  @Prop({ required: true })
  epicAccountId!: string

  @Prop({ required: true })
  displayName!: string
}

export const EpicSessionSchema = SchemaFactory.createForClass(EpicSession)
