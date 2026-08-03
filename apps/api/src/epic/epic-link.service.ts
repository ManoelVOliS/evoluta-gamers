import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { ErrorCode, type EpicLinkResult } from '@evoluta-gamers/shared'
import { EpicLinkTokenService } from './epic-link-token.service'
import { decryptEpicSession, encryptEpicSession } from './epic-token-crypto'
import {
  authenticateWithCode,
  EpicSessionError,
  validateEpicSession,
} from './legendary-cli'
import { EpicSession, type EpicSessionDocument } from './schemas/epic-session.schema'

@Injectable()
export class EpicLinkService {
  constructor(
    private readonly config: ConfigService,
    private readonly linkTokens: EpicLinkTokenService,
    @InjectModel(EpicSession.name)
    private readonly sessions: Model<EpicSessionDocument>,
  ) {}

  async link(userId: string, sessionJson: string): Promise<EpicLinkResult> {
    let identity: { epicAccountId: string; displayName: string }
    try {
      identity = await validateEpicSession(sessionJson)
    } catch (error) {
      if (error instanceof EpicSessionError) {
        throw new UnprocessableEntityException({
          code: ErrorCode.EPIC_SESSION_INVALID,
        })
      }
      throw error
    }

    const owner = await this.sessions
      .findOne({ epicAccountId: identity.epicAccountId })
      .exec()
    if (owner && owner.userId.toString() !== userId) {
      throw new ConflictException({ code: ErrorCode.EPIC_ALREADY_LINKED })
    }

    const key = this.config.getOrThrow<string>('EPIC_TOKEN_ENCRYPTION_KEY')
    const blob = encryptEpicSession(sessionJson, key)

    await this.sessions
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
          $set: {
            ...blob,
            epicAccountId: identity.epicAccountId,
            displayName: identity.displayName,
          },
        },
        { upsert: true },
      )
      .exec()

    return identity
  }

  /**
   * Vínculo automático via extensão: troca o token de uso único pelo
   * `userId` que o gerou, gera a sessão a partir do `authorizationCode` da
   * Epic e reaproveita `link()` sem duplicar a validação/criptografia/upsert.
   */
  async linkViaCode(linkToken: string, code: string): Promise<EpicLinkResult> {
    const userId = await this.linkTokens.consume(linkToken)

    let sessionJson: string
    try {
      sessionJson = await authenticateWithCode(code)
    } catch (error) {
      if (error instanceof EpicSessionError) {
        throw new UnprocessableEntityException({
          code: ErrorCode.EPIC_SESSION_INVALID,
        })
      }
      throw error
    }

    return this.link(userId, sessionJson)
  }

  async unlink(userId: string): Promise<void> {
    await this.sessions.deleteOne({ userId: new Types.ObjectId(userId) }).exec()
  }

  async getSessionJson(userId: string): Promise<string | null> {
    const doc = await this.sessions
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec()
    if (!doc) return null

    const key = this.config.getOrThrow<string>('EPIC_TOKEN_ENCRYPTION_KEY')
    return decryptEpicSession(doc, key)
  }

  async getSummary(
    userId: string,
  ): Promise<{ epicAccountId: string; displayName: string } | null> {
    const doc = await this.sessions
      .findOne({ userId: new Types.ObjectId(userId) })
      .select('epicAccountId displayName')
      .exec()
    return doc ? { epicAccountId: doc.epicAccountId, displayName: doc.displayName } : null
  }
}
