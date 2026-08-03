import { z } from 'zod'
import {
  ClassificationState,
  DensityLevel,
  GameSource,
  GameStatus,
  ManualGameSource,
  SyncStatus,
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

/* ------------------------------------------------------------- convites --- */

/** Estado derivado do convite — não é campo do banco, é calculado na leitura. */
export const InviteStatus = z.enum(['pending', 'used', 'expired', 'revoked'])
export type InviteStatus = z.infer<typeof InviteStatus>

export const Invite = z.object({
  id: z.string(),
  token: z.string(),
  status: InviteStatus,
  note: z.string().nullable(),
  createdByName: z.string(),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  usedByName: z.string().nullable(),
  usedAt: z.iso.datetime().nullable(),
})
export type Invite = z.infer<typeof Invite>

export const CreateInviteInput = z.object({
  /** Lembrete de para quem é o convite. Só para o admin se achar na lista. */
  note: z.string().max(80).optional(),
  /** Validade em dias. PRD §5.1 usa 7. */
  expiresInDays: z.number().int().min(1).max(90).default(7),
})
export type CreateInviteInput = z.infer<typeof CreateInviteInput>

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
  monthlyGoal: z.number().int(),
  createdAt: z.iso.datetime(),
})
export type PublicUser = z.infer<typeof PublicUser>

/** Resposta de login/registro: sessão e usuário juntos, sem round-trip extra. */
export const LoginResult = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
  user: PublicUser,
})
export type LoginResult = z.infer<typeof LoginResult>

export const UpdateProfileInput = z.object({
  name: z.string().min(2).max(60).optional(),
  bio: z.string().max(280).nullable().optional(),
  avatarUrl: z.url().nullable().optional(),
  /** Meta de jogos zerados por mês — PRD §5.4, não travar em 2. */
  monthlyGoal: z.number().int().min(1).max(20).optional(),
})
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>

/* --------------------------------------------------------------- admin --- */

/** Alterações que só um admin faz sobre a conta de outra pessoa — PRD §5.6. */
export const AdminUpdateUserInput = z.object({
  status: UserStatus.optional(),
  role: UserRole.optional(),
})
export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserInput>

export const AdminMetrics = z.object({
  totalUsers: z.number(),
  activeUsers: z.number(),
  pendingUsers: z.number(),
  suspendedUsers: z.number(),
  usersWithSteam: z.number(),
  pendingInvites: z.number(),
  totalGames: z.number(),
  /** Sincronizações da Steam que falharam — PRD §5.6. */
  failedSyncs: z.number(),
})
export type AdminMetrics = z.infer<typeof AdminMetrics>

/* --------------------------------------------------------------- steam --- */

export const LinkSteamInput = z.object({
  /** steamID64 (17 dígitos) ou o nome da URL personalizada. */
  identifier: z.string().min(2),
})
export type LinkSteamInput = z.infer<typeof LinkSteamInput>

export const SyncResult = z.object({
  status: SyncStatus,
  imported: z.number(),
  updated: z.number(),
  removed: z.number(),
  restored: z.number(),
  syncedAt: z.iso.datetime(),
})
export type SyncResult = z.infer<typeof SyncResult>

export const SteamLinkResult = z.object({
  steamId64: z.string(),
  personaName: z.string(),
  avatarUrl: z.string().nullable(),
  /** Já avisa na hora do vínculo — não precisa esperar a sync falhar. */
  profilePublic: z.boolean(),
})
export type SteamLinkResult = z.infer<typeof SteamLinkResult>

export const SteamStatus = z.object({
  linked: z.boolean(),
  steamId64: z.string().nullable(),
  personaName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  lastSyncAt: z.iso.datetime().nullable(),
  lastSyncStatus: SyncStatus.nullable(),
  gameCount: z.number(),
})
export type SteamStatus = z.infer<typeof SteamStatus>

/* ---------------------------------------------------------------- epic --- */

/**
 * O conteúdo colado é o `user.json` que a ferramenta `legendary` (GPL-3.0,
 * open source) grava depois do login real do usuário na Epic. Ver
 * TASKS/capitulos/04-steam.md, adendo Epic Games, para o fluxo completo.
 */
export const LinkEpicInput = z.object({
  sessionJson: z.string().min(2),
})
export type LinkEpicInput = z.infer<typeof LinkEpicInput>

export const EpicLinkResult = z.object({
  epicAccountId: z.string(),
  displayName: z.string(),
})
export type EpicLinkResult = z.infer<typeof EpicLinkResult>

export const EpicStatus = z.object({
  linked: z.boolean(),
  epicAccountId: z.string().nullable(),
  displayName: z.string().nullable(),
  lastSyncAt: z.iso.datetime().nullable(),
  lastSyncStatus: SyncStatus.nullable(),
  gameCount: z.number(),
})
export type EpicStatus = z.infer<typeof EpicStatus>

/* -------------------------------------------------------------- catálogo --- */

/** Item do catálogo do usuário: jogo global + os dados que só são dele. */
export const CatalogItem = z.object({
  id: z.string(),
  gameId: z.string(),
  appId: z.number().nullable(),
  name: z.string(),
  iconUrl: z.string().nullable(),
  source: GameSource,
  genres: z.array(z.string()),
  /** Gênero em pt-BR vindo da planilha ("Terror-puzzle"). */
  tagsPtBr: z.array(z.string()),
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

/** Entrada de jogo que nenhum processo automático traz — Epic Games, Family Sharing. */
export const CreateManualGameInput = z.object({
  name: z.string().min(2).max(120),
  /** Duração pra zerar, se o usuário já souber. Vira override pessoal. */
  estimatedHours: z.number().min(0).nullable().optional(),
  source: ManualGameSource,
})
export type CreateManualGameInput = z.infer<typeof CreateManualGameInput>

export const UpdateCatalogItemInput = z.object({
  status: GameStatus.optional(),
  finishedAt: z.iso.datetime().nullable().optional(),
  rating: z.number().int().min(1).max(10).nullable().optional(),
  /** Override pessoal sobre o catálogo global — PRD §5.3. */
  finishable: z.boolean().nullable().optional(),
  estimatedHours: z.number().min(0).nullable().optional(),
})
export type UpdateCatalogItemInput = z.infer<typeof UpdateCatalogItemInput>

/* --------------------------------------------------------------- import --- */

/**
 * Como a linha da planilha foi casada com o catálogo. `ambiguous` é a entrada
 * que representa vários jogos ("Overcooked! (1 e 2)") e exige decisão humana.
 */
export const ImportMatchKind = z.enum(['exact', 'alias', 'new', 'ambiguous'])
export type ImportMatchKind = z.infer<typeof ImportMatchKind>

export const ImportRow = z.object({
  rowId: z.string(),
  sheet: z.string(),
  name: z.string(),
  estimatedHours: z.number().nullable(),
  density: DensityLevel.nullable(),
  genrePtBr: z.string().nullable(),
  finishable: z.boolean().nullable(),
  status: GameStatus.nullable(),
  match: ImportMatchKind,
  /** Nome do jogo já existente com que casou, quando casou. */
  matchedName: z.string().nullable(),
  warnings: z.array(z.string()),
})
export type ImportRow = z.infer<typeof ImportRow>

export const ImportSummary = z.object({
  total: z.number(),
  finishable: z.number(),
  outOfScope: z.number(),
  unclassified: z.number(),
  matched: z.number(),
  newGames: z.number(),
  ambiguous: z.number(),
})
export type ImportSummary = z.infer<typeof ImportSummary>

export const ImportPreview = z.object({
  importId: z.string(),
  summary: ImportSummary,
  rows: z.array(ImportRow),
  expiresAt: z.iso.datetime(),
})
export type ImportPreview = z.infer<typeof ImportPreview>

export const ApplyImportInput = z.object({
  importId: z.string(),
  /** Linhas ambíguas que o usuário decidiu descartar. */
  skipRowIds: z.array(z.string()).default([]),
})
export type ApplyImportInput = z.infer<typeof ApplyImportInput>

export const ImportResult = z.object({
  gamesCreated: z.number(),
  gamesUpdated: z.number(),
  catalogAdded: z.number(),
  catalogUpdated: z.number(),
  skipped: z.number(),
})
export type ImportResult = z.infer<typeof ImportResult>

/* -------------------------------------------------------------- paginação --- */

/** Cursor, não offset — ver ANALISE_PRD.md §6, item 3. */
export const CursorPage = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  })
