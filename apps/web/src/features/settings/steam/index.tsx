import { ContentSection } from '../components/content-section'
import { SteamCard } from './steam-card'

export function SettingsSteam() {
  return (
    <ContentSection
      title='Conta Steam'
      desc='Vincule sua conta para trazer sua biblioteca de jogos automaticamente.'
    >
      <SteamCard />
    </ContentSection>
  )
}
