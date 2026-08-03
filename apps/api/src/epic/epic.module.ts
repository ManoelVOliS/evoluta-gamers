import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { CatalogModule } from '../catalog/catalog.module'
import { GamesModule } from '../games/games.module'
import { SyncRun, SyncRunSchema } from '../steam/schemas/sync-run.schema'
import { UsersModule } from '../users/users.module'
import { EpicController } from './epic.controller'
import { EpicLinkTokenService } from './epic-link-token.service'
import { EpicLinkService } from './epic-link.service'
import { EpicSyncService } from './epic-sync.service'
import { EpicLinkToken, EpicLinkTokenSchema } from './schemas/epic-link-token.schema'
import { EpicSession, EpicSessionSchema } from './schemas/epic-session.schema'

@Module({
  imports: [
    UsersModule,
    GamesModule,
    CatalogModule,
    MongooseModule.forFeature([
      { name: EpicSession.name, schema: EpicSessionSchema },
      { name: EpicLinkToken.name, schema: EpicLinkTokenSchema },
      { name: SyncRun.name, schema: SyncRunSchema },
    ]),
  ],
  controllers: [EpicController],
  providers: [EpicLinkService, EpicLinkTokenService, EpicSyncService],
})
export class EpicModule {}
