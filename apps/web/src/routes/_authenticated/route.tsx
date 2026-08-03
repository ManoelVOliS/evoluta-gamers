import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { loadSession } from '@/lib/session'

export const Route = createFileRoute('/_authenticated')({
  // Guard de sessão. Sem isto qualquer rota interna abriria sem login.
  beforeLoad: async ({ location }) => {
    const user = await loadSession()
    if (!user) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
    return { user }
  },
  component: Outlet,
})
