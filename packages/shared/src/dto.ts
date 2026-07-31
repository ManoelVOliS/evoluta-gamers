import { z } from 'zod'
import {
  ClassificationState,
  DensityLevel,
  GameSource,
  GameStatus,
  UserRole,
  UserStatus,
} from './domain'

/* ---------------------------------------------------------------- auth --- */

export const LoginInput = z.object({
  email: z.email(),
  password: z.string().min(8),
})
export type LoginInput = z.infer<typeof LoginInput>

export const RegisterInput = z.object({
  name: z.string().min(2).max(60),
  email: z.email(),
  password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres'),
  inviteToken: z.string().min(10),
})
export type RegisterInput = z.infer<typeof RegisterInput>

export const AuthTokens = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
})
export type AuthTokens = z.infer<typeof AuthTokens>

/* --------------------------------------------------------------- users --- */

export const PublicUser = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  role: UserRole,
  status: UserStatus,
  steamId64: z.string().nullable(),
  lastSyncAt: z.iso.datetime().nullable(),
})
export type PublicUser = z.infer<typeof PublicUser>

export const UpdateProfileInput = z.object({
  name: z.string().min(2).max(60).optional(),
  bio: z.string().max(280).nullable().optional(),
  avatarUrl: z.url().nullable().optional(),
  /** Meta de jogos zerados por mês — PRD §5.4, não travar em 2. */
  monthlyGoal: z.number().int().min(1).max(20).optional(),
})
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>

/* --------------------------------------------------------------- steam --- */

export const LinkSteamInput = z.object({
  /** steamID64 (17 dígitos) ou o nome da URL personalizada. */
  identifier: z.string().min(2),
})
export type LinkSteamInput = z.infer<typeof LinkSteamInput>

export const SyncResult = z.object({
  imported: z.number(),
  updated: z.number(),
  removed: z.number(),
  syncedAt: z.iso.datetime(),
})
export type SyncResult = z.infer<typeof SyncResult>

/* -------------------------------------------------------------- catálogo --- */

/** Item do catálogo do usuário: jogo global + os dados que só são dele. */
export const CatalogItem = z.object({
  id: z.string(),
  appId: z.number().nullable(),
  name: z.string(),
  iconUrl: z.string().nullable(),
  source: GameSource,
  genres: z.array(z.string()),
  /** Horas que ESTE usuário já jogou (Steam `playtime_forever`). */
  playtimeHours: z.number(),
  /** Duração estimada para zerar. Fonte manual/seed, nunca a Steam. */
  estimatedHours: z.number().nullable(),
  finishable: z.boolean().nullable(),
  density: DensityLevel.nullable(),
  classificationState: ClassificationState,
  status: GameStatus,
  finishedAt: z.iso.datetime().nullable(),
  rating: z.number().int().min(1).max(10).nullable(),
})
export type CatalogItem = z.infer<typeof CatalogItem>

export const UpdateCatalogItemInput = z.object({
  status: GameStatus.optional(),
  finishedAt: z.iso.datetime().nullable().optional(),
  rating: z.number().int().min(1).max(10).nullable().optional(),
  /** Override pessoal sobre o catálogo global — PRD §5.3. */
  finishable: z.boolean().nullable().optional(),
  estimatedHours: z.number().min(0).nullable().optional(),
})
export type UpdateCatalogItemInput = z.infer<typeof UpdateCatalogItemInput>

/* -------------------------------------------------------------- paginação --- */

/** Cursor, não offset — ver ANALISE_PRD.md §6, item 3. */
export const CursorPage = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  })
