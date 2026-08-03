import { z } from 'zod'

/**
 * Validação de ambiente no boot. Se faltar variável, a API não sobe —
 * é preferível quebrar no `docker compose up` a descobrir em produção.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3333),

  /**
   * Opcional só em desenvolvimento: sem MONGO_URI a API sobe um Mongo em memória
   * (ver `bootstrapDevMongo`), pra `pnpm dev` funcionar sem Docker instalado.
   * Em produção o `validateEnv` exige a URI.
   */
  MONGO_URI: z.string().min(1).optional(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa de pelo menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  /**
   * Chave única da aplicação na Steam Web API — ver ANALISE_PRD.md §2.
   * Não é chave "do usuário": qualquer key válida lê qualquer perfil público.
   */
  STEAM_API_KEY: z.string().min(1).optional(),

  /**
   * AES-256-GCM: chave de 32 bytes em hex (64 caracteres) usada para guardar a
   * sessão da Epic (`legendary`) de cada usuário. Diferente da Steam, aqui o
   * segredo É por usuário (um refresh token de sessão real), então precisa de
   * criptografia reversível de verdade — ver TASKS/capitulos/04-steam.md,
   * adendo Epic Games. Gere com:
   * node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   */
  EPIC_TOKEN_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, 'precisa ter exatamente 64 caracteres hex (32 bytes)')
    .optional(),

  /**
   * Caminho do binário `legendary`. Em produção (Docker) já vem como variável
   * de ambiente real do container; em dev local pode não estar no PATH — daí
   * o default aqui e a necessidade de declarar no schema (sem isso, o
   * `ConfigService` nunca enxerga essa variável, mesmo com ela no `.env`).
   */
  LEGENDARY_BIN: z.string().min(1).default('legendary'),

  /** Bootstrap do primeiro admin, aplicado só se a coleção `users` estiver vazia. */
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  /** Origem do frontend, para CORS e para o retorno do Steam OpenID. */
  WEB_ORIGIN: z.url().default('http://localhost:5173'),

  /** Fuso do domínio: "rotina do mês" é mês civil em SP — ANALISE_PRD.md §6. */
  TZ: z.string().default('America/Sao_Paulo'),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): Env {
  // `FOO=` no .env chega como string vazia, não como ausente — sem isso o
  // `.optional()` do schema não vale de nada para variável declarada e vazia.
  const cleaned = Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== ''),
  )

  const result = envSchema.safeParse(cleaned)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`)
  }

  // O que é tolerável em dev não é em produção: sem banco e sem chave da Steam
  // a aplicação simplesmente não faz o que se propõe.
  if (result.data.NODE_ENV === 'production') {
    const missing = (['MONGO_URI', 'STEAM_API_KEY'] as const).filter(
      (key) => !result.data[key],
    )
    if (missing.length > 0) {
      throw new Error(
        `Em produção estas variáveis são obrigatórias: ${missing.join(', ')}`,
      )
    }
  }

  return result.data
}
