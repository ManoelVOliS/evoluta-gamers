import type { PublicUser } from '@evoluta-gamers/shared'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Devolve o usuário da sessão, buscando na API se o store ainda estiver vazio
 * (caso de recarregar a página). Devolve `null` quando não há sessão válida.
 *
 * Não lança: quem chama é o `beforeLoad` das rotas, que decide o redirect.
 */
export async function loadSession(): Promise<PublicUser | null> {
  const { user } = useAuthStore.getState().auth
  if (user) return user

  try {
    const { data } = await api.get<PublicUser>('/me')
    useAuthStore.getState().auth.setUser(data)
    return data
  } catch {
    useAuthStore.getState().auth.reset()
    return null
  }
}

/** Para onde cada papel vai ao entrar: admin administra, usuário joga. */
export function homeFor(user: PublicUser): '/admin' | '/app' {
  return user.role === 'admin' ? '/admin' : '/app'
}
