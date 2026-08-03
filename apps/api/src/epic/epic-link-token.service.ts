import { Injectable, UnprocessableEntityException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { randomBytes } from 'node:crypto'
import { Model, Types } from 'mongoose'
import { ErrorCode, type MintEpicLinkTokenResult } from '@evoluta-gamers/shared'
import {
  EpicLinkToken,
  type EpicLinkTokenDocument,
} from './schemas/epic-link-token.schema'

const TOKEN_TTL_MS = 10 * 60_000

@Injectable()
export class EpicLinkTokenService {
  constructor(
    @InjectModel(EpicLinkToken.name)
    private readonly model: Model<EpicLinkTokenDocument>,
  ) {}

  async mint(userId: string): Promise<MintEpicLinkTokenResult> {
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)
    const doc = await this.model.create({
      // 32 bytes em base64url: inadivinhável, e cabe numa URL sem escapar.
      token: randomBytes(32).toString('base64url'),
      userId: new Types.ObjectId(userId),
      expiresAt,
    })
    return { token: doc.token, expiresAt: expiresAt.toISOString() }
  }

  /**
   * Consumo atômico: o `findOneAndUpdate` condicionado a `usedAt: null`
   * impede que duas trocas simultâneas com o mesmo token passem as duas
   * (mesma condição de corrida documentada em `invites.service.ts`).
   */
  async consume(token: string): Promise<string> {
    const doc = await this.model
      .findOneAndUpdate(
        { token, usedAt: null, expiresAt: { $gt: new Date() } },
        { $set: { usedAt: new Date() } },
      )
      .exec()

    if (!doc) {
      throw new UnprocessableEntityException({
        code: ErrorCode.EPIC_LINK_TOKEN_INVALID,
      })
    }

    return doc.userId.toString()
  }
}
