import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { InvitesService } from './invites.service'
import { Invite, InviteSchema } from './schemas/invite.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Invite.name, schema: InviteSchema }]),
  ],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
