import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import { LoginInput, RegisterInput } from '@evoluta-gamers/shared'
import { ZodBody } from '../common/zod-validation.pipe'
import { InvitesService } from '../invites/invites.service'
import { AuthService, type LoginResult } from './auth.service'
import { Public } from './decorators'

const REFRESH_COOKIE = 'eg_refresh'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly invites: InvitesService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  register(@Body(new ZodBody(RegisterInput)) body: RegisterInput) {
    return this.auth.register(body)
  }

  /** Consultado pela tela de cadastro antes de o usuário preencher o formulário. */
  @Public()
  @Get('invite-check')
  async checkInvite(@Query('token') token?: string) {
    return { valid: token ? await this.invites.isUsable(token) : false }
  }

  @Public()
  @HttpCode(200)
  @Post('login')
  async login(
    @Body(new ZodBody(LoginInput)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithSession(await this.auth.login(body), res)
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE
    ]
    return this.respondWithSession(await this.auth.refresh(token), res)
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE
    ]
    await this.auth.logout(token)
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
  }

  /**
   * O refresh vai em cookie httpOnly (JavaScript não lê, então XSS não rouba a
   * sessão longa); só o access token de 15 min volta no corpo.
   */
  private respondWithSession(result: LoginResult, res: Response) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production'
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    return {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    }
  }
}
