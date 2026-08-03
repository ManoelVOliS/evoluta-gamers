import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
import type { SyncStatus } from '@evoluta-gamers/shared'

export type SyncRunDocument = HydratedDocument<SyncRun>

/**
 * Histórico de sincronizações — dá ao admin visibilidade de quem está falhando
 * (PRD §5.6). Compartilhado entre Steam e Epic; `source` distingue qual.
 */
@Schema({ collection: 'sync_runs', timestamps: true })
export class SyncRun {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId

  /** Default 'steam' por compatibilidade com os registros já gravados antes da Epic existir. */
  @Prop({ required: true, enum: ['steam', 'epic'], default: 'steam' })
  source!: 'steam' | 'epic'

  @Prop({ required: true, enum: ['ok', 'private', 'not_found', 'error'] })
  status!: SyncStatus

  @Prop({ type: String, default: null })
  errorMessage!: string | null

  @Prop({ default: 0 })
  imported!: number

  @Prop({ default: 0 })
  updated!: number

  @Prop({ default: 0 })
  removed!: number

  @Prop({ default: 0 })
  restored!: number
}

export const SyncRunSchema = SchemaFactory.createForClass(SyncRun)

SyncRunSchema.index({ userId: 1, createdAt: -1 })
