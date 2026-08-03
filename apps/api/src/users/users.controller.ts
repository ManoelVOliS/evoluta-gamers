import { Body, Controller, Get, NotFoundException, Patch } from '@nestjs/common'
import { UpdateProfileInput } from '@evoluta-gamers/shared'
import { CurrentUser } from '../auth/decorators'
import type { AuthenticatedUser } from '../auth/jwt.strategy'
import { ZodBody } from '../common/zod-validation.pipe'
import { UsersService } from './users.service'

@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async me(@CurrentUser() current: AuthenticatedUser) {
    const user = await this.users.findById(current.id)
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return UsersService.toPublic(user)
  }

  @Patch()
  async update(
    @CurrentUser() current: AuthenticatedUser,
    @Body(new ZodBody(UpdateProfileInput)) body: UpdateProfileInput,
  ) {
    return UsersService.toPublic(await this.users.updateProfile(current.id, body))
  }
}
