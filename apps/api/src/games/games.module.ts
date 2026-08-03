import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Game, GameSchema } from './schemas/game.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: Game.name, schema: GameSchema }])],
  exports: [MongooseModule],
})
export class GamesModule {}
