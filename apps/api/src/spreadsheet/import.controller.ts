import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import type { Response } from 'express'
import { ApplyImportInput } from '@evoluta-gamers/shared'
import { CurrentUser } from '../auth/decorators'
import type { AuthenticatedUser } from '../auth/jwt.strategy'
import { ZodBody } from '../common/zod-validation.pipe'
import { ImportService } from './import.service'
import { TemplateService } from './template.service'

/** Um .xlsx é um zip: sem teto, um arquivo pequeno pode estourar a memória. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/** Assinatura de arquivo zip — o mimetype enviado pelo browser não é confiável. */
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04])

@Controller('import')
export class ImportController {
  constructor(
    private readonly imports: ImportService,
    private readonly template: TemplateService,
  ) {}

  @Get('template')
  async downloadTemplate(@Res() res: Response): Promise<void> {
    const buffer = await this.template.build()
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="modelo-evoluta-gamers.xlsx"',
      'Content-Length': String(buffer.length),
    })
    res.end(buffer)
  }

  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  async preview(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException({
        code: 'IMPORT_FILE_INVALID',
        message: 'Nenhum arquivo enviado.',
      })
    }
    if (!file.buffer.subarray(0, 4).equals(ZIP_MAGIC)) {
      throw new BadRequestException({
        code: 'IMPORT_FILE_INVALID',
        message: 'Este arquivo não é uma planilha .xlsx.',
      })
    }

    return this.imports.preview(user.id, file.buffer)
  }

  @Post('apply')
  async apply(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodBody(ApplyImportInput)) body: ApplyImportInput,
  ) {
    return this.imports.apply(user.id, body.importId, body.skipRowIds)
  }
}
