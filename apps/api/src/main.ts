import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  // `legendary-cli.ts` é um módulo simples (não gerenciado pelo Nest) e lê
  // `process.env.LEGENDARY_BIN` direto — o `ConfigService` valida a variável
  // mas nunca escreve de volta no `process.env` global, então replicamos aqui.
  process.env.LEGENDARY_BIN = config.getOrThrow<string>('LEGENDARY_BIN')

  app.setGlobalPrefix('api')
  app.use(helmet())
  app.use(cookieParser())
  // Validação é por rota, com `ZodBody` — ver src/common/zod-validation.pipe.ts.

  // Refresh token vai em cookie httpOnly, então o CORS precisa de credentials.
  app.enableCors({
    origin: config.getOrThrow<string>('WEB_ORIGIN'),
    credentials: true,
  })

  const port = config.getOrThrow<number>('PORT')
  await app.listen(port)
  new Logger('bootstrap').log(`API em http://localhost:${port}/api`)
}

void bootstrap()
