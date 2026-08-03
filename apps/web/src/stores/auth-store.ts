import { create } from 'zustand'
import type { PublicUser } from '@evoluta-gamers/shared'
import { getCookie, removeCookie, setCookie } from '@/lib/cookies'

const ACCESS_TOKEN_COOKIE = 'eg_access'

type AuthState = {
  auth: {
    user: PublicUser | null
    accessToken: string
    setUser: (user: PublicUser | null) => void
    setAccessToken: (accessToken: string) => void
    setSession: (user: PublicUser, accessToken: string) => void
    reset: () => void
  }
}

/**
 * O access token dura 15 minutos e fica em cookie legível só para permitir
 * recarregar a página sem perder a sessão. O que realmente sustenta a sessão é
 * o refresh token, que vive num cookie httpOnly e o JavaScript não alcança.
 */
export const useAuthStore = create<AuthState>()((set) => {
  const stored = getCookie(ACCESS_TOKEN_COOKIE)

  return {
    auth: {
      user: null,
      accessToken: stored ?? '',
      setUser: (user) =>
        set((state) => ({ auth: { ...state.auth, user } })),
      setAccessToken: (accessToken) =>
        set((state) => {
          setCookie(ACCESS_TOKEN_COOKIE, accessToken)
          return { auth: { ...state.auth, accessToken } }
        }),
      setSession: (user, accessToken) =>
        set((state) => {
          setCookie(ACCESS_TOKEN_COOKIE, accessToken)
          return { auth: { ...state.auth, user, accessToken } }
        }),
      reset: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN_COOKIE)
          return { auth: { ...state.auth, user: null, accessToken: '' } }
        }),
    },
  }
})
