import { Logger } from '@nestjs/common'

/**
 * Sem `MONGO_URI` em desenvolvimento, sobe um MongoDB em memória para que
 * `pnpm dev` funcione numa máquina sem Docker nem Mongo instalado.
 *
 * Os dados somem quando o processo morre — é rascunho, não ambiente. Para
 * dados que persistem: `docker compose up -d mongo` e preencha `MONGO_URI`.
 */
let memoryServer: { getUri(): string; stop(): Promise<boolean> } | null = null

export async function resolveMongoUri(
  configured: string | undefined,
  nodeEnv: string,
): Promise<string> {
  if (configured) return configured

  if (nodeEnv === 'production') {
    throw new Error('MONGO_URI é obrigatório em produção')
  }

  const logger = new Logger('dev-mongo')
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: 'evoluta-gamers' },
    })
    const uri = memoryServer.getUri()
    logger.warn(
      `MONGO_URI não definido — usando Mongo em memória (dados são descartados ao parar). URI: ${uri}`,
    )
    return uri
  } catch (error) {
    throw new Error(
      'MONGO_URI não definido e o Mongo em memória falhou ao subir. ' +
        'Defina MONGO_URI no .env ou rode `docker compose up -d mongo`. ' +
        `Causa: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export async function stopDevMongo(): Promise<void> {
  await memoryServer?.stop()
  memoryServer = null
}
