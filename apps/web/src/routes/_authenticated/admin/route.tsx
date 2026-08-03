import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated/admin')({
  // A API já recusa quem não é admin (RolesGuard); aqui é só para não mostrar
  // uma tela que não vai carregar nada.
  beforeLoad: ({ context }) => {
    const user = (context as { user?: { role?: string } }).user
    if (user?.role !== 'admin') {
      throw redirect({ to: '/app' })
    }
  },
  component: () => <AuthenticatedLayout area='admin' />,
})
