import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, Copy, Info, Link2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Invite } from '@evoluta-gamers/shared'
import { api } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const STATUS_LABEL: Record<Invite['status'], string> = {
  pending: 'Disponível',
  used: 'Usado',
  expired: 'Expirado',
  revoked: 'Revogado',
}

const STATUS_VARIANT: Record<
  Invite['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'default',
  used: 'secondary',
  expired: 'outline',
  revoked: 'destructive',
}

function inviteUrl(token: string) {
  return `${window.location.origin}/sign-up?invite=${token}`
}

export function AdminInvites() {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'invites'],
    queryFn: async () =>
      (await api.get<{ items: Invite[] }>('/admin/invites')).data.items,
  })

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post<Invite>('/admin/invites', {
          note: note.trim() || undefined,
          expiresInDays: 7,
        })
      ).data,
    onSuccess: async (invite) => {
      setNote('')
      await queryClient.invalidateQueries({ queryKey: ['admin', 'invites'] })
      await copy(invite.token)
      toast.success('Convite criado e link copiado')
    },
  })

  const revoke = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/invites/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'invites'] })
      toast.success('Convite revogado')
    },
  })

  async function copy(token: string) {
    await navigator.clipboard.writeText(inviteUrl(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      <Header fixed>
        <div className='me-auto font-medium'>Convites</div>
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Convites</h2>
          <p className='text-muted-foreground'>
            A única porta de entrada da rede. Ninguém se cadastra sem um link
            daqui.
          </p>
        </div>

        {/* O usuário pediu explicitamente que a regra fique visível na tela,
            não escondida na documentação. */}
        <div className='bg-muted/50 flex gap-3 rounded-lg border p-4 text-sm'>
          <Info className='text-muted-foreground mt-0.5 size-4 shrink-0' />
          <div className='space-y-1.5'>
            <p className='font-medium'>Como funciona o cadastro</p>
            <ul className='text-muted-foreground list-disc space-y-1 ps-4'>
              <li>
                Esta é uma rede fechada: a tela de cadastro só aceita quem chega
                por um link de convite gerado aqui.
              </li>
              <li>
                Cada link vale para <strong>uma única pessoa</strong>. Depois de
                usado, o mesmo link para de funcionar.
              </li>
              <li>
                O link <strong>expira em 7 dias</strong>. Passou disso, é só
                gerar outro.
              </li>
              <li>
                Quem se cadastra entra como <strong>pendente</strong> e ainda
                precisa ser aprovado por você em{' '}
                <strong>Usuários</strong> antes de conseguir entrar.
              </li>
              <li>
                Enquanto o convite não foi usado, você pode revogá-lo aqui e ele
                deixa de valer na hora.
              </li>
            </ul>
          </div>
        </div>

        <div className='flex flex-wrap items-end gap-3'>
          <div className='grid gap-1.5'>
            <Label htmlFor='note'>Para quem é este convite? (opcional)</Label>
            <Input
              id='note'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder='ex.: meu irmão'
              className='w-64'
              maxLength={80}
            />
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Link2 className='size-4' />
            Gerar link de convite
          </Button>
        </div>

        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Para</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Usado por</TableHead>
                <TableHead className='text-end'>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className='text-muted-foreground py-8 text-center'>
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className='text-muted-foreground py-8 text-center'>
                    Nenhum convite ainda. Gere o primeiro acima.
                  </TableCell>
                </TableRow>
              )}
              {data?.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>{invite.note ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[invite.status]}>
                      {STATUS_LABEL[invite.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-muted-foreground'>
                    {format(new Date(invite.createdAt), "d 'de' MMM", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell className='text-muted-foreground'>
                    {format(new Date(invite.expiresAt), "d 'de' MMM", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>{invite.usedByName ?? '—'}</TableCell>
                  <TableCell>
                    <div className='flex justify-end gap-1'>
                      {invite.status === 'pending' && (
                        <>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => void copy(invite.token)}
                          >
                            {copied === invite.token ? (
                              <Check className='size-4' />
                            ) : (
                              <Copy className='size-4' />
                            )}
                            Copiar link
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => revoke.mutate(invite.id)}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Main>
    </>
  )
}
