import { createFileRoute } from '@tanstack/react-router'
import { SettingsEpic } from '@/features/settings/epic'

export const Route = createFileRoute('/_authenticated/app/settings/epic')({
  component: SettingsEpic,
})
