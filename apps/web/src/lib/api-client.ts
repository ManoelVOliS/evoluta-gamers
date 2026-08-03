import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth-store'

export const api = axios.create({
  // O Vite faz proxy de /api para a API Nest (ver vite.config.ts).
  baseURL: '/api',
  // O refresh token vive num cookie httpOnly; sem isto ele não é enviado.
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState().auth
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

/**
 * Uma única renovação em voo por vez: com o catálogo disparando várias queries
 * juntas, N respostas 401 simultâneas gerariam N refreshes concorrentes — e,
 * como o backend rotaciona o refresh token, todos menos um seriam recusados,
 * derrubando a sessão de quem estava só carregando uma tela.
 */
let refreshing: Promise<string> | null = null

function renewSession(): Promise<string> {
  refreshing ??= axios
    .post<{ accessToken: string }>(
      '/api/auth/refresh',
      {},
      { withCredentials: true },
    )
    .then((res) => {
      useAuthStore.getState().auth.setAccessToken(res.data.accessToken)
      return res.data.accessToken
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as (AxiosRequestConfig & { retried?: boolean }) | undefined

    const isExpiredSession =
      error.response?.status === 401 &&
      request &&
      !request.retried &&
      // Se o próprio refresh deu 401, não há o que renovar — seria loop.
      !request.url?.includes('/auth/')

    if (!isExpiredSession) throw error

    try {
      const token = await renewSession()
      request.retried = true
      request.headers = { ...request.headers, Authorization: `Bearer ${token}` }
      return api.request(request)
    } catch {
      useAuthStore.getState().auth.reset()
      throw error
    }
  },
)

/** Código de domínio da resposta de erro (ver ErrorCode no shared). */
export function errorCodeOf(error: unknown): string | null {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { code?: unknown } | undefined
    return typeof data?.code === 'string' ? data.code : null
  }
  return null
}

export function errorMessageOf(error: unknown): string | null {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: unknown } | undefined
    return typeof data?.message === 'string' ? data.message : null
  }
  return null
}
