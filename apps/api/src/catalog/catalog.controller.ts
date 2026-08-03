import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { CreateManualGameInput, UpdateCatalogItemInput } from '@evoluta-gamers/shared'
import { CurrentUser } from '../auth/decorators'
import type { AuthenticatedUser } from '../auth/jwt.strategy'
import { ZodBody } from '../common/zod-validation.pipe'
import { CatalogService } from './catalog.service'

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { items: await this.catalog.list(user.id) }
  }

  @Post('manual')
  async createManual(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodBody(CreateManualGameInput)) body: CreateManualGameInput,
  ) {
    return this.catalog.createManual(user.id, body)
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodBody(UpdateCatalogItemInput)) body: UpdateCatalogItemInput,
  ) {
    return this.catalog.update(user.id, id, body)
  }
}
