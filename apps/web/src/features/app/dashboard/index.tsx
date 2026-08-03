import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CalendarCheck, CheckCircle2, Library, Target } from 'lucide-react'
import type { CatalogItem } from '@evoluta-gamers/shared'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

export function UserDashboard() {
  const user = useAuthStore((s) => s.auth.user)

  const { data: catalog } = useQuery({
    queryKey: ['catalog'],
    queryFn: async () =>
      (await api.get<{ items: CatalogItem[] }>('/catalog')).data.items,
  })

  const total = catalog?.length ?? 0
  const finished = catalog?.filter((i) => i.status === 'finished').length ?? 0
  const remainingHours = (catalog ?? [])
    .filter((i) => i.status !== 'finished' && i.status !== 'abandoned')
    .reduce((sum, i) => sum + (i.estimatedHours ?? 0), 0)

  return (
    <>
      <Header fixed>
        <div className='me-auto font-medium'>Painel</div>
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Olá, {user?.name?.split(' ')[0]}
          </h2>
          <p className='text-muted-foreground'>
            Aqui você acompanha seu backlog e o que falta zerar.
          </p>
        </div>

        {/* Catálogo vazio é o único estado em que o app não serve para nada —
            então enquanto ele estiver assim, essa é a única chamada de ação. */}
        {total === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <Library className='size-4' />
                Comece pelo seu catálogo
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <p className='text-muted-foreground text-sm'>
                Importe sua planilha de jogos para montar o catálogo. A conexão
                com a Steam chega no próximo capítulo e vai somar a isso.
              </p>
              <Button asChild variant='outline' size='sm'>
                <Link to='/app/catalogo'>Importar planilha</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>
                Jogos no catálogo
              </CardTitle>
              <Library className='text-muted-foreground size-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{total}</div>
              <p className='text-muted-foreground text-xs'>
                {total === 0 ? 'importe sua planilha' : 'para zerar'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>Zerados</CardTitle>
              <CheckCircle2 className='text-muted-foreground size-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{finished}</div>
              <p className='text-muted-foreground text-xs'>
                {total > 0
                  ? `${Math.round((finished / total) * 100)}% do catálogo`
                  : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>Meta mensal</CardTitle>
              <Target className='text-muted-foreground size-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{user?.monthlyGoal ?? 2}</div>
              <p className='text-muted-foreground text-xs'>jogos por mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>
                Horas restantes
              </CardTitle>
              <CalendarCheck className='text-muted-foreground size-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {remainingHours > 0 ? `${remainingHours}h` : '—'}
              </div>
              <p className='text-muted-foreground text-xs'>
                estimativa do que falta
              </p>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
