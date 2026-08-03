import { ContentSection } from '../components/content-section'
import { EpicCard } from './epic-card'

export function SettingsEpic() {
  return (
    <ContentSection
      title='Conta Epic Games'
      desc='Vincule automaticamente com nossa extensão (se instalada) — ou cole a sessão manualmente, gerada pela legendary (open source), sem API oficial da Epic.'
    >
      <EpicCard />
    </ContentSection>
  )
}
