import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  Gamepad2,
  Library,
  Mail,
  UserCheck,
  Users,
} from 'lucide-react'
import type { AdminMetrics } from '@evoluta-gamers/shared'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

function Stat({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string
  value: number | string
  hint?: string
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        <Icon className='text-muted-foreground size-4' />
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        {hint && <p className='text-muted-foreground text-xs'>{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: async () =>
      (await api.get<AdminMetrics>('/admin/metrics')).data,
  })

  return (
    <>
      <Header fixed>
        <div className='me-auto font-medium'>Administração</div>
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Visão geral</h2>
          <p className='text-muted-foreground'>
            Estado da rede: quem entrou, quem está esperando e o que precisa da
            tua atenção.
          </p>
        </div>

        {isLoading || !data ? (
          <p className='text-muted-foreground'>Carregando…</p>
        ) : (
          <>
            {data.pendingUsers > 0 && (
              <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4'>
                <div className='flex items-center gap-2 text-sm'>
                  <AlertTriangle className='size-4' />
                  {data.pendingUsers === 1
                    ? '1 pessoa aguardando aprovação para entrar na rede.'
                    : `${data.pendingUsers} pessoas aguardando aprovação para entrar na rede.`}
                </div>
                <Button asChild size='sm'>
                  <Link to='/admin/usuarios'>Revisar agora</Link>
                </Button>
              </div>
            )}

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Stat
                title='Usuários ativos'
                value={data.activeUsers}
                hint={`${data.totalUsers} no total`}
                icon={Users}
              />
              <Stat
                title='Aguardando aprovação'
                value={data.pendingUsers}
                hint={data.suspendedUsers > 0 ? `${data.suspendedUsers} suspenso(s)` : 'nenhum suspenso'}
                icon={UserCheck}
              />
              <Stat
                title='Convites disponíveis'
                value={data.pendingInvites}
                hint='ainda não usados'
                icon={Mail}
              />
              <Stat
                title='Contas Steam vinculadas'
                value={data.usersWithSteam}
                hint={`de ${data.activeUsers} ativos`}
                icon={Gamepad2}
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <Stat
                title='Jogos no catálogo global'
                value={data.totalGames}
                hint='catálogo entra no próximo marco'
                icon={Library}
              />
              <Stat
                title='Sincronizações com falha'
                value={data.failedSyncs}
                hint='perfis privados ou erro na Steam'
                icon={AlertTriangle}
              />
            </div>
          </>
        )}
      </Main>
    </>
  )
}
