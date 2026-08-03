import { createFileRoute } from '@tanstack/react-router'
import { UserDashboard } from '@/features/app/dashboard'

export const Route = createFileRoute('/_authenticated/app/')({
  component: UserDashboard,
})
