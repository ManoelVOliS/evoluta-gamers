import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import * as argon2 from 'argon2'
import { createHash, randomBytes } from 'node:crypto'
import { Model, Types } from 'mongoose'
import {
  ErrorCode,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from '@evoluta-gamers/shared'
import { InvitesService } from '../invites/invites.service'
import { UsersService } from '../users/users.service'
import type { UserDocument } from '../users/schemas/user.schema'
import {
  RefreshToken,
  type RefreshTokenDocument,
} from './schemas/refresh-token.schema'

export type LoginResult = {
  user: PublicUser
  accessToken: string
  expiresIn: number
  refreshToken: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly invites: InvitesService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectModel(RefreshToken.name)
    private readonly refreshModel: Model<RefreshTokenDocument>,
  ) {}

  async register(input: RegisterInput): Promise<{ status: string }> {
    if (!(await this.invites.isUsable(input.inviteToken))) {
      throw new ConflictException({ code: ErrorCode.INVITE_INVALID })
    }
    if (await this.users.findByEmail(input.email)) {
      throw new ConflictException('Já existe uma conta com este e-mail')
    }

    const user = await this.users.create({
      name: input.name,
      email: input.email,
      passwordHash: await argon2.hash(input.password),
      status: 'pending',
    })

    // Consumido só depois da conta existir: se a criação falhar, o link continua válido.
    await this.invites.consume(input.inviteToken, user.id as string)

    return { status: 'pending' }
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.users.findByEmail(input.email)

    // Mesma mensagem para e-mail inexistente e senha errada: não confirmamos
    // a quem tenta adivinhar se um e-mail está cadastrado na rede.
    const invalid = new UnauthorizedException('E-mail ou senha incorretos')
    if (!user) throw invalid
    if (!(await argon2.verify(user.passwordHash, input.password))) throw invalid

    if (user.status === 'pending') {
      throw new UnauthorizedException({
        code: ErrorCode.ACCOUNT_PENDING_APPROVAL,
      })
    }
    if (user.status === 'suspended') {
      throw new UnauthorizedException({ code: ErrorCode.ACCOUNT_SUSPENDED })
    }

    return this.issueTokens(user)
  }

  async refresh(rawToken: string | undefined): Promise<LoginResult> {
    if (!rawToken) throw new UnauthorizedException('Sessão expirada')

    const stored = await this.refreshModel
      .findOne({
        tokenHash: this.hash(rawToken),
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec()
    if (!stored) throw new UnauthorizedException('Sessão expirada')

    const user = await this.users.findById(stored.userId.toString())
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Sessão expirada')
    }

    // Rotação: o refresh usado morre aqui. Se um token vazado for reusado
    // depois da rotação, ele já não vale nada.
    stored.revokedAt = new Date()
    await stored.save()

    return this.issueTokens(user)
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return
    await this.refreshModel
      .updateOne(
        { tokenHash: this.hash(rawToken) },
        { $set: { revokedAt: new Date() } },
      )
      .exec()
  }

  private async issueTokens(user: UserDocument): Promise<LoginResult> {
    const expiresIn = this.accessSeconds(
      this.config.getOrThrow<string>('JWT_ACCESS_TTL'),
    )
    const accessToken = await this.jwt.signAsync(
      { sub: user.id as string, email: user.email, role: user.role },
      { expiresIn },
    )

    const refreshToken = randomBytes(48).toString('base64url')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.refreshDays())

    await this.refreshModel.create({
      userId: new Types.ObjectId(user.id as string),
      tokenHash: this.hash(refreshToken),
      expiresAt,
    })

    return {
      user: UsersService.toPublic(user),
      accessToken,
      expiresIn,
      refreshToken,
    }
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private refreshDays(): number {
    const ttl = this.config.getOrThrow<string>('JWT_REFRESH_TTL')
    const match = /^(\d+)d$/.exec(ttl)
    return match?.[1] ? Number(match[1]) : 30
  }

  private accessSeconds(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl)
    if (!match?.[1] || !match[2]) return 900
    const value = Number(match[1])
    const unit = match[2]
    const factor = { s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 60
    return value * factor
  }
}
