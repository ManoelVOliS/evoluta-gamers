import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { GamesModule } from '../games/games.module'
import { CatalogController } from './catalog.controller'
import { CatalogService } from './catalog.service'
import { UserGame, UserGameSchema } from './schemas/user-game.schema'

@Module({
  imports: [
    GamesModule,
    MongooseModule.forFeature([
      { name: UserGame.name, schema: UserGameSchema },
    ]),
  ],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService, MongooseModule],
})
export class CatalogModule {}
