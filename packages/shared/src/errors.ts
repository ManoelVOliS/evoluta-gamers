/**
 * Códigos de erro de domínio. A API responde `{ code, message }` e o front decide
 * a mensagem/ação a partir do `code` — nunca a partir do texto.
 */
export const ErrorCode = {
  /** Perfil Steam com "Detalhes do jogo" privado — PRD §5.2, risco §9. */
  STEAM_PROFILE_PRIVATE: 'STEAM_PROFILE_PRIVATE',
  /** steamID64 / vanity URL não resolveu. */
  STEAM_PROFILE_NOT_FOUND: 'STEAM_PROFILE_NOT_FOUND',
  /** Steam Web API fora do ar ou key inválida. */
  STEAM_UNAVAILABLE: 'STEAM_UNAVAILABLE',
  /** Convite inexistente, expirado ou já usado — PRD §5.1. */
  INVITE_INVALID: 'INVITE_INVALID',
  /** Conta criada mas ainda não aprovada pelo admin. */
  ACCOUNT_PENDING_APPROVAL: 'ACCOUNT_PENDING_APPROVAL',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  /** Esse steamID64 já está vinculado a outro usuário da rede. */
  STEAM_ALREADY_LINKED: 'STEAM_ALREADY_LINKED',
  /** Tentou sincronizar sem ter vinculado a Steam antes. */
  STEAM_NOT_LINKED: 'STEAM_NOT_LINKED',
  /** O JSON colado não é uma sessão válida da `legendary`, ou expirou. */
  EPIC_SESSION_INVALID: 'EPIC_SESSION_INVALID',
  /** Tentou sincronizar sem ter vinculado a Epic antes. */
  EPIC_NOT_LINKED: 'EPIC_NOT_LINKED',
  /** Essa conta Epic já está vinculada a outro usuário da rede. */
  EPIC_ALREADY_LINKED: 'EPIC_ALREADY_LINKED',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

/** Texto exibido ao usuário, em pt-BR, por código. */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  STEAM_PROFILE_PRIVATE:
    'Teu perfil da Steam está com "Detalhes do jogo" privado. Abre Perfil → Editar perfil → Configurações de privacidade e muda "Detalhes do jogo" para Público, depois sincroniza de novo.',
  STEAM_PROFILE_NOT_FOUND:
    'Não achei esse perfil na Steam. Confere o steamID64 ou a URL personalizada.',
  STEAM_UNAVAILABLE:
    'A Steam não respondeu agora. A sincronização automática tenta de novo mais tarde.',
  INVITE_INVALID: 'Este convite não existe, já foi usado ou expirou.',
  ACCOUNT_PENDING_APPROVAL:
    'Tua conta ainda não foi aprovada por um administrador.',
  ACCOUNT_SUSPENDED: 'Esta conta está suspensa.',
  STEAM_ALREADY_LINKED:
    'Esta conta Steam já está vinculada a outro usuário da rede.',
  STEAM_NOT_LINKED: 'Vincule sua conta Steam antes de sincronizar.',
  EPIC_SESSION_INVALID:
    'Essa sessão da Epic não é válida ou expirou. Rode "legendary auth" de novo e cole o novo conteúdo de user.json.',
  EPIC_NOT_LINKED: 'Vincule sua conta Epic antes de sincronizar.',
  EPIC_ALREADY_LINKED:
    'Esta conta Epic já está vinculada a outro usuário da rede.',
}
