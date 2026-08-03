import { createFileRoute } from '@tanstack/react-router'
import { SettingsSteam } from '@/features/settings/steam'

export const Route = createFileRoute('/_authenticated/app/settings/steam')({
  component: SettingsSteam,
})
