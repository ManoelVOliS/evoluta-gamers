import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { LinkEpicInput } from '@evoluta-gamers/shared'
import type { EpicStatus } from '@evoluta-gamers/shared'
import { CurrentUser } from '../auth/decorators'
import type { AuthenticatedUser } from '../auth/jwt.strategy'
import { ZodBody } from '../common/zod-validation.pipe'
import { CatalogService } from '../catalog/catalog.service'
import { SyncRun, type SyncRunDocument } from '../steam/schemas/sync-run.schema'
import { EpicLinkService } from './epic-link.service'
import { EpicSyncService } from './epic-sync.service'

@Controller('epic')
export class EpicController {
  constructor(
    private readonly link: EpicLinkService,
    private readonly sync: EpicSyncService,
    private readonly catalog: CatalogService,
    @InjectModel(SyncRun.name)
    private readonly syncRuns: Model<SyncRunDocument>,
  ) {}

  @Post('link')
  async linkAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodBody(LinkEpicInput)) body: LinkEpicInput,
  ) {
    return this.link.link(user.id, body.sessionJson)
  }

  @Delete('link')
  @HttpCode(204)
  async unlinkAccount(@CurrentUser() user: AuthenticatedUser) {
    await this.link.unlink(user.id)
  }

  @Get('status')
  async status(@CurrentUser() current: AuthenticatedUser): Promise<EpicStatus> {
    // Lido do sync_runs, não de `user.lastSyncAt`: esse campo é compartilhado
    // com a Steam, e contaminaria o card errado se alguém vincular as duas.
    const [summary, lastRun, gameCount] = await Promise.all([
      this.link.getSummary(current.id),
      this.syncRuns
        .findOne({ userId: new Types.ObjectId(current.id), source: 'epic' })
        .sort({ createdAt: -1 })
        .exec(),
      this.catalog.countForUser(current.id),
    ])

    return {
      linked: Boolean(summary),
      epicAccountId: summary?.epicAccountId ?? null,
      displayName: summary?.displayName ?? null,
      lastSyncAt: lastRun
        ? (lastRun as unknown as { createdAt: Date }).createdAt.toISOString()
        : null,
      lastSyncStatus: lastRun?.status ?? null,
      gameCount: summary ? gameCount : 0,
    }
  }

  @Post('sync')
  async syncLibrary(@CurrentUser() user: AuthenticatedUser) {
    return this.sync.sync(user.id)
  }
}
