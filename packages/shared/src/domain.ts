import { z } from 'zod'

/** Papéis de usuário — PRD §4. */
export const UserRole = z.enum(['admin', 'user'])
export type UserRole = z.infer<typeof UserRole>

/** Ciclo de vida da conta numa rede fechada por convite/aprovação — PRD §5.1. */
export const UserStatus = z.enum(['pending', 'active', 'suspended'])
export type UserStatus = z.infer<typeof UserStatus>

/**
 * Estado da classificação no catálogo global — ver ANALISE_PRD.md §4.
 * `suggested` = regra automática opinou; `confirmed` = um humano decidiu.
 * Sem essa distinção o catálogo compartilhado vira lixo compartilhado.
 */
export const ClassificationState = z.enum([
  'unclassified',
  'suggested',
  'confirmed',
])
export type ClassificationState = z.infer<typeof ClassificationState>

/**
 * Nível de densidade 1–5 — PRD §5.3, mesmas faixas da planilha.
 * Derivado da DURAÇÃO ESTIMADA do jogo, nunca das horas já jogadas pelo usuário.
 */
export const DensityLevel = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
])
export type DensityLevel = z.infer<typeof DensityLevel>

/** Faixas de horas (duração estimada) por nível, iguais às da planilha. */
export const DENSITY_RANGES: Record<
  DensityLevel,
  { min: number; max: number | null; label: string }
> = {
  1: { min: 0, max: 5, label: 'Até 5h' },
  2: { min: 6, max: 12, label: '6–12h' },
  3: { min: 13, max: 25, label: '13–25h' },
  4: { min: 26, max: 45, label: '26–45h' },
  5: { min: 46, max: null, label: '46h+' },
}

/** Converte duração estimada (horas) no nível de densidade correspondente. */
export function densityFromHours(hours: number): DensityLevel {
  if (hours <= 5) return 1
  if (hours <= 12) return 2
  if (hours <= 25) return 3
  if (hours <= 45) return 4
  return 5
}

/** Status do jogo para um usuário — PRD §5.3. */
export const GameStatus = z.enum([
  'not_started',
  'playing',
  'finished',
  'abandoned',
])
export type GameStatus = z.infer<typeof GameStatus>

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  not_started: 'Não iniciado',
  playing: 'Jogando',
  finished: 'Zerado',
  abandoned: 'Abandonado',
}

/** De onde veio a entrada na biblioteca do usuário — PRD §5.2 (family sharing manual). */
export const GameSource = z.enum(['steam', 'manual_family_sharing'])
export type GameSource = z.infer<typeof GameSource>

/** Tipo de grupo — PRD §5.5. */
export const GroupType = z.enum(['family', 'friends', 'other'])
export type GroupType = z.infer<typeof GroupType>

/** Evento de feed — PRD §5.5. */
export const ActivityType = z.enum([
  'game_started',
  'game_finished',
  'game_abandoned',
  'joined_group',
])
export type ActivityType = z.infer<typeof ActivityType>
