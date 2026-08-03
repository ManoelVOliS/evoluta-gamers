import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type EpicLinkTokenDocument = HydratedDocument<EpicLinkToken>

/**
 * Token de uso único que autoriza a extensão a trocar um `authorizationCode`
 * da Epic pela sessão vinculada do usuário que o gerou — sem sessão de
 * usuário, a segurança do endpoint de troca vem inteiramente deste token.
 *
 * Diferente de `Invite`, não tem valor de auditoria depois de consumido/
 * expirado, então some sozinho via índice TTL.
 */
@Schema({ collection: 'epic_link_tokens', timestamps: true })
export class EpicLinkToken {
  @Prop({ required: true, unique: true })
  token!: string

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId

  @Prop({ required: true })
  expiresAt!: Date

  @Prop({ type: Date, default: null })
  usedAt!: Date | null
}

export const EpicLinkTokenSchema = SchemaFactory.createForClass(EpicLinkToken)

EpicLinkTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
