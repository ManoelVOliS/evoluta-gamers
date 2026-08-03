import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type InviteDocument = HydratedDocument<Invite>

/**
 * Convite de uso único para entrar na rede fechada — PRD §5.1.
 *
 * O documento não guarda "status": ele é derivado na leitura a partir de
 * `usedAt`/`revokedAt`/`expiresAt`. Guardar um status redundante daria margem a
 * um convite marcado como válido depois de expirado.
 */
@Schema({ collection: 'invites', timestamps: true })
export class Invite {
  @Prop({ required: true, unique: true })
  token!: string

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId

  /** Lembrete livre do admin ("pro meu irmão"), só para achar na lista. */
  @Prop({ type: String, default: null })
  note!: string | null

  @Prop({ required: true })
  expiresAt!: Date

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  usedBy!: Types.ObjectId | null

  @Prop({ type: Date, default: null })
  usedAt!: Date | null

  @Prop({ type: Date, default: null })
  revokedAt!: Date | null
}

export const InviteSchema = SchemaFactory.createForClass(Invite)

InviteSchema.index({ createdAt: -1 })
