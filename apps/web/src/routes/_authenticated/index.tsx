import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/')({
  // Admin administra, usuário joga — cada um cai na sua área.
  beforeLoad: ({ context }) => {
    const user = (context as { user?: { role?: string } }).user
    throw redirect({ to: user?.role === 'admin' ? '/admin' : '/app' })
  },
})
