import { createFileRoute } from '@tanstack/react-router'
import { AdminInvites } from '@/features/admin/invites'

export const Route = createFileRoute('/_authenticated/admin/convites/')({
  component: AdminInvites,
})
