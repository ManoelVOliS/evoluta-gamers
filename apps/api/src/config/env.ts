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

  MONGO_URI: z.string().min(1),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa de pelo menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  /**
   * Chave única da aplicação na Steam Web API — ver ANALISE_PRD.md §2.
   * Não é chave "do usuário": qualquer key válida lê qualquer perfil público.
   */
  STEAM_API_KEY: z.string().min(1),

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
  const result = envSchema.safeParse(config)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`)
  }
  return result.data
}
