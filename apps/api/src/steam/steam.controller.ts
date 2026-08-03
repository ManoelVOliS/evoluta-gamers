import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { LinkSteamInput } from '@evoluta-gamers/shared'
import type { SteamStatus } from '@evoluta-gamers/shared'
import { CurrentUser } from '../auth/decorators'
import type { AuthenticatedUser } from '../auth/jwt.strategy'
import { ZodBody } from '../common/zod-validation.pipe'
import { CatalogService } from '../catalog/catalog.service'
import { UsersService } from '../users/users.service'
import { SteamLinkService } from './steam-link.service'
import { SteamSyncService } from './steam-sync.service'
import { SyncRun, type SyncRunDocument } from './schemas/sync-run.schema'

@Controller('steam')
export class SteamController {
  constructor(
    private readonly link: SteamLinkService,
    private readonly sync: SteamSyncService,
    private readonly users: UsersService,
    private readonly catalog: CatalogService,
    @InjectModel(SyncRun.name)
    private readonly syncRuns: Model<SyncRunDocument>,
  ) {}

  @Post('link')
  async linkAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodBody(LinkSteamInput)) body: LinkSteamInput,
  ) {
    return this.link.link(user.id, body.identifier)
  }

  @Delete('link')
  @HttpCode(204)
  async unlinkAccount(@CurrentUser() user: AuthenticatedUser) {
    await this.link.unlink(user.id)
  }

  @Get('status')
  async status(@CurrentUser() current: AuthenticatedUser): Promise<SteamStatus> {
    // Lido do sync_runs, não de `user.lastSyncAt`: esse campo é compartilhado
    // com a Epic, e contaminaria o card errado se alguém vincular as duas.
    const [user, lastRun] = await Promise.all([
      this.users.findById(current.id),
      this.syncRuns
        .findOne({ userId: new Types.ObjectId(current.id), source: 'steam' })
        .sort({ createdAt: -1 })
        .exec(),
    ])
    const gameCount = user?.steamId64
      ? await this.catalog.countForUser(current.id)
      : 0

    return {
      linked: Boolean(user?.steamId64),
      steamId64: user?.steamId64 ?? null,
      personaName: user?.steamPersonaName ?? null,
      avatarUrl: user?.steamAvatarUrl ?? null,
      lastSyncAt: lastRun
        ? (lastRun as unknown as { createdAt: Date }).createdAt.toISOString()
        : null,
      lastSyncStatus: lastRun?.status ?? null,
      gameCount,
    }
  }

  @Post('sync')
  async syncLibrary(@CurrentUser() user: AuthenticatedUser) {
    return this.sync.sync(user.id)
  }
}
