import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ErrorCode } from '@evoluta-gamers/shared'
import { UsersService } from '../users/users.service'

export type JwtPayload = {
  sub: string
  email: string
  role: string
}

export type AuthenticatedUser = {
  id: string
  email: string
  name: string
  role: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    })
  }

  /**
   * O token é revalidado contra o banco a cada request: um usuário suspenso
   * perde acesso na hora, sem esperar os 15 minutos do access token expirarem.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findById(payload.sub)
    if (!user) throw new UnauthorizedException()

    if (user.status === 'suspended') {
      throw new UnauthorizedException({ code: ErrorCode.ACCOUNT_SUSPENDED })
    }
    if (user.status === 'pending') {
      throw new UnauthorizedException({
        code: ErrorCode.ACCOUNT_PENDING_APPROVAL,
      })
    }

    return {
      id: user.id as string,
      email: user.email,
      name: user.name,
      role: user.role,
    }
  }
}
