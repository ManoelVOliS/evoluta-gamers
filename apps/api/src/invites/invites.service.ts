import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { randomBytes } from 'node:crypto'
import { Model, Types } from 'mongoose'
import {
  ErrorCode,
  type CreateInviteInput,
  type Invite as InviteDto,
  type InviteStatus,
} from '@evoluta-gamers/shared'
import { Invite, type InviteDocument } from './schemas/invite.schema'

type PopulatedInvite = InviteDocument & {
  createdBy: { name?: string } | Types.ObjectId
  usedBy: { name?: string } | Types.ObjectId | null
}

@Injectable()
export class InvitesService {
  constructor(
    @InjectModel(Invite.name) private readonly model: Model<InviteDocument>,
  ) {}

  async create(
    createdBy: string,
    input: CreateInviteInput,
  ): Promise<InviteDocument> {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + input.expiresInDays)

    return this.model.create({
      // 32 bytes em base64url: inadivinhável, e cabe numa URL sem escapar.
      token: randomBytes(32).toString('base64url'),
      createdBy: new Types.ObjectId(createdBy),
      note: input.note ?? null,
      expiresAt,
    })
  }

  async list(): Promise<PopulatedInvite[]> {
    return this.model
      .find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .populate('usedBy', 'name')
      .exec() as unknown as Promise<PopulatedInvite[]>
  }

  async revoke(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Convite inválido')
    }
    await this.model
      .updateOne(
        { _id: id, usedAt: null, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      )
      .exec()
  }

  /**
   * Valida e consome o convite numa única operação atômica: o `updateOne`
   * condicionado a `usedAt: null` impede que dois cadastros simultâneos com o
   * mesmo link passem os dois (o "uso único" do PRD §5.1 quebraria numa corrida).
   */
  async consume(token: string, userId: string): Promise<void> {
    const result = await this.model
      .updateOne(
        {
          token,
          usedAt: null,
          revokedAt: null,
          expiresAt: { $gt: new Date() },
        },
        { $set: { usedAt: new Date(), usedBy: new Types.ObjectId(userId) } },
      )
      .exec()

    if (result.modifiedCount === 0) {
      throw new BadRequestException({ code: ErrorCode.INVITE_INVALID })
    }
  }

  /** Checagem sem consumir, para a tela de cadastro avisar antes de preencher. */
  async isUsable(token: string): Promise<boolean> {
    const count = await this.model
      .countDocuments({
        token,
        usedAt: null,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec()
    return count > 0
  }

  async countPending(): Promise<number> {
    return this.model
      .countDocuments({
        usedAt: null,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec()
  }

  static statusOf(invite: InviteDocument): InviteStatus {
    if (invite.revokedAt) return 'revoked'
    if (invite.usedAt) return 'used'
    if (invite.expiresAt.getTime() <= Date.now()) return 'expired'
    return 'pending'
  }

  static toDto(invite: PopulatedInvite): InviteDto {
    const createdBy = invite.createdBy as { name?: string }
    const usedBy = invite.usedBy as { name?: string } | null
    return {
      id: invite.id as string,
      token: invite.token,
      status: InvitesService.statusOf(invite),
      note: invite.note,
      createdByName: createdBy?.name ?? 'desconhecido',
      createdAt: (invite as unknown as { createdAt: Date }).createdAt.toISOString(),
      expiresAt: invite.expiresAt.toISOString(),
      usedByName: usedBy?.name ?? null,
      usedAt: invite.usedAt ? invite.usedAt.toISOString() : null,
    }
  }
}
