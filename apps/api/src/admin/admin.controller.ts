import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import {
  AdminUpdateUserInput,
  CreateInviteInput,
  type AdminMetrics,
} from '@evoluta-gamers/shared'
import { CurrentUser, Roles } from '../auth/decorators'
import type { AuthenticatedUser } from '../auth/jwt.strategy'
import { ZodBody } from '../common/zod-validation.pipe'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Game, type GameDocument } from '../games/schemas/game.schema'
import { InvitesService } from '../invites/invites.service'
import { UsersService } from '../users/users.service'

@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(
    private readonly users: UsersService,
    private readonly invites: InvitesService,
    @InjectModel(Game.name) private readonly games: Model<GameDocument>,
  ) {}

  @Get('metrics')
  async metrics(): Promise<AdminMetrics> {
    const [byStatus, usersWithSteam, failedSyncs, pendingInvites, totalGames] =
      await Promise.all([
        this.users.countByStatus(),
        this.users.countWithSteam(),
        this.users.countFailedSyncs(),
        this.invites.countPending(),
        this.games.estimatedDocumentCount().exec(),
      ])

    const active = byStatus.active ?? 0
    const pending = byStatus.pending ?? 0
    const suspended = byStatus.suspended ?? 0

    return {
      totalUsers: active + pending + suspended,
      activeUsers: active,
      pendingUsers: pending,
      suspendedUsers: suspended,
      usersWithSteam,
      pendingInvites,
      totalGames,
      failedSyncs,
    }
  }

  @Get('users')
  async listUsers() {
    const users = await this.users.listAll()
    return { items: users.map((u) => UsersService.toPublic(u)) }
  }

  @Patch('users/:id')
  async updateUser(
    @CurrentUser() current: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodBody(AdminUpdateUserInput)) body: AdminUpdateUserInput,
  ) {
    // Sem isto, um admin distraído se rebaixa ou se suspende e a rede fica
    // sem ninguém que possa reverter.
    if (id === current.id) {
      throw new BadRequestException(
        'Você não pode alterar o próprio papel ou status',
      )
    }
    return UsersService.toPublic(await this.users.adminUpdate(id, body))
  }

  @Get('invites')
  async listInvites() {
    const invites = await this.invites.list()
    return { items: invites.map((i) => InvitesService.toDto(i)) }
  }

  @Post('invites')
  async createInvite(
    @CurrentUser() current: AuthenticatedUser,
    @Body(new ZodBody(CreateInviteInput)) body: CreateInviteInput,
  ) {
    const invite = await this.invites.create(current.id, body)
    const [populated] = await this.invites.list()
    return populated
      ? InvitesService.toDto(populated)
      : { id: invite.id as string, token: invite.token }
  }

  @Delete('invites/:id')
  @HttpCode(204)
  async revokeInvite(@Param('id') id: string) {
    await this.invites.revoke(id)
  }
}
