import { Module } from '@nestjs/common'
import { GamesModule } from '../games/games.module'
import { InvitesModule } from '../invites/invites.module'
import { UsersModule } from '../users/users.module'
import { AdminController } from './admin.controller'

@Module({
  imports: [UsersModule, InvitesModule, GamesModule],
  controllers: [AdminController],
})
export class AdminModule {}
