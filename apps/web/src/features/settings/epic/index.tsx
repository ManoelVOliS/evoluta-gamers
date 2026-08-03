import { ContentSection } from '../components/content-section'
import { EpicCard } from './epic-card'

export function SettingsEpic() {
  return (
    <ContentSection
      title='Conta Epic Games'
      desc='Sem API oficial da Epic — usamos a sessão gerada pela legendary (open source) para trazer sua biblioteca.'
    >
      <EpicCard />
    </ContentSection>
  )
}
