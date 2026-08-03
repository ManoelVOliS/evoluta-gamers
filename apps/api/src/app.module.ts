import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { MongooseModule } from '@nestjs/mongoose'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AdminModule } from './admin/admin.module'
import { AuthModule } from './auth/auth.module'
import { CatalogModule } from './catalog/catalog.module'
import { GamesModule } from './games/games.module'
import { SpreadsheetModule } from './spreadsheet/spreadsheet.module'
import { JwtAuthGuard, RolesGuard } from './auth/guards'
import { HttpExceptionFilter } from './common/http-exception.filter'
import { resolveMongoUri } from './config/dev-mongo'
import { validateEnv } from './config/env'
import { HealthModule } from './health/health.module'
import { EpicModule } from './epic/epic.module'
import { InvitesModule } from './invites/invites.module'
import { SteamModule } from './steam/steam.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        uri: await resolveMongoUri(
          config.get<string>('MONGO_URI'),
          config.getOrThrow<string>('NODE_ENV'),
        ),
      }),
    }),
    // Sync diária da Steam — PRD §5.2.
    ScheduleModule.forRoot(),
    // Protege a API de abuso. O throttle da Steam Web API é outro, e vive
    // dentro do SteamModule (global, não por usuário) — ANALISE_PRD.md §6.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    HealthModule,
    AuthModule,
    UsersModule,
    InvitesModule,
    AdminModule,
    GamesModule,
    CatalogModule,
    SpreadsheetModule,
    SteamModule,
    EpicModule,
  ],
  providers: [
    // Toda resposta de erro sai como { code, message } — o front lê o code.
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Sem registrar o guard, o ThrottlerModule acima não limita nada.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Fecha a API por padrão: rota nova nasce protegida, e só abre com @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
