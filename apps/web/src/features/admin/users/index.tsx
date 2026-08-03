import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, Ban, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import type { PublicUser, UserStatus } from '@evoluta-gamers/shared'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

const STATUS_LABEL: Record<UserStatus, string> = {
  pending: 'Aguardando aprovação',
  active: 'Ativo',
  suspended: 'Suspenso',
}

const STATUS_VARIANT: Record<
  UserStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'outline',
  active: 'secondary',
  suspended: 'destructive',
}

export function AdminUsers() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.auth.user)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () =>
      (await api.get<{ items: PublicUser[] }>('/admin/users')).data.items,
  })

  const update = useMutation({
    mutationFn: async (vars: { id: string; status: UserStatus }) =>
      api.patch(`/admin/users/${vars.id}`, { status: vars.status }),
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] })
      toast.success(
        vars.status === 'active' ? 'Conta liberada' : 'Conta suspensa',
      )
    },
  })

  const pending = data?.filter((u) => u.status === 'pending') ?? []

  return (
    <>
      <Header fixed>
        <div className='me-auto font-medium'>Usuários</div>
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Usuários</h2>
          <p className='text-muted-foreground'>
            Quem entrou por convite aparece aqui como pendente e só acessa a
            rede depois que você aprovar.
          </p>
        </div>

        {pending.length > 0 && (
          <div className='rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm'>
            {pending.length === 1
              ? '1 pessoa aguardando aprovação.'
              : `${pending.length} pessoas aguardando aprovação.`}
          </div>
        )}

        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Steam</TableHead>
                <TableHead>Entrou em</TableHead>
                <TableHead className='text-end'>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className='text-muted-foreground py-8 text-center'>
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {data?.map((user) => {
                const isSelf = user.id === currentUser?.id
                return (
                  <TableRow key={user.id}>
                    <TableCell className='font-medium'>{user.name}</TableCell>
                    <TableCell className='text-muted-foreground'>
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                        {user.role === 'admin' ? 'Admin' : 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[user.status]}>
                        {STATUS_LABEL[user.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {user.steamId64 ? 'Vinculada' : '—'}
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {format(new Date(user.createdAt), "d 'de' MMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className='flex justify-end gap-1'>
                        {/* O backend também recusa auto-alteração; aqui é só
                            para não oferecer um botão que vai falhar. */}
                        {!isSelf && user.status === 'pending' && (
                          <Button
                            size='sm'
                            onClick={() =>
                              update.mutate({ id: user.id, status: 'active' })
                            }
                          >
                            <Check className='size-4' />
                            Aprovar
                          </Button>
                        )}
                        {!isSelf && user.status === 'active' && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() =>
                              update.mutate({ id: user.id, status: 'suspended' })
                            }
                          >
                            <Ban className='size-4' />
                            Suspender
                          </Button>
                        )}
                        {!isSelf && user.status === 'suspended' && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() =>
                              update.mutate({ id: user.id, status: 'active' })
                            }
                          >
                            <RotateCcw className='size-4' />
                            Reativar
                          </Button>
                        )}
                        {isSelf && (
                          <span className='text-muted-foreground text-xs'>
                            você
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Main>
    </>
  )
}
