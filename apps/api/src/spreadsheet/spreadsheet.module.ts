import { Module } from '@nestjs/common'
import { CatalogModule } from '../catalog/catalog.module'
import { GamesModule } from '../games/games.module'
import { ImportController } from './import.controller'
import { ImportService } from './import.service'
import { TemplateService } from './template.service'
import { WorkbookParserService } from './workbook-parser.service'

@Module({
  imports: [GamesModule, CatalogModule],
  controllers: [ImportController],
  providers: [ImportService, TemplateService, WorkbookParserService],
})
export class SpreadsheetModule {}
