import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { CatalogModule } from '../catalog/catalog.module'
import { GamesModule } from '../games/games.module'
import { UsersModule } from '../users/users.module'
import { SyncRun, SyncRunSchema } from './schemas/sync-run.schema'
import { SteamApiClient } from './steam-api.client'
import { SteamController } from './steam.controller'
import { SteamLinkService } from './steam-link.service'
import { SteamSyncService } from './steam-sync.service'

@Module({
  imports: [
    UsersModule,
    GamesModule,
    CatalogModule,
    MongooseModule.forFeature([{ name: SyncRun.name, schema: SyncRunSchema }]),
  ],
  controllers: [SteamController],
  providers: [SteamApiClient, SteamLinkService, SteamSyncService],
})
export class SteamModule {}
