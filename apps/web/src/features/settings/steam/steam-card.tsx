import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertTriangle,
  CheckCircle2,
  Gamepad2,
  Link2,
  Loader2,
  RefreshCw,
  Unlink,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SteamStatus, SyncResult } from '@evoluta-gamers/shared'
import { api, errorCodeOf, errorMessageOf } from '@/lib/api-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SteamCard() {
  const queryClient = useQueryClient()
  const [identifier, setIdentifier] = useState('')

  const { data: status, isLoading } = useQuery({
    queryKey: ['steam', 'status'],
    queryFn: async () => (await api.get<SteamStatus>('/steam/status')).data,
  })

  const link = useMutation({
    mutationFn: async () =>
      api.post('/steam/link', { identifier: identifier.trim() }),
    onSuccess: async (res) => {
      setIdentifier('')
      await queryClient.invalidateQueries({ queryKey: ['steam', 'status'] })
      if (!res.data.profilePublic) {
        toast.warning(
          'Conta vinculada, mas o perfil parece privado — a sincronização pode falhar até você abrir "Detalhes do jogo" nas configurações de privacidade da Steam.',
        )
      } else {
        toast.success('Conta Steam vinculada!')
      }
    },
    onError: (error) => {
      toast.error(errorMessageOf(error) ?? 'Não consegui vincular essa conta.')
    },
  })

  const unlink = useMutation({
    mutationFn: async () => api.delete('/steam/link'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['steam', 'status'] })
      toast.success('Conta Steam desvinculada.')
    },
  })

  const sync = useMutation({
    mutationFn: async () => (await api.post<SyncResult>('/steam/sync')).data,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['steam', 'status'] })
      await queryClient.invalidateQueries({ queryKey: ['catalog'] })
      toast.success(
        `Sincronizado: ${result.imported} novos, ${result.updated} atualizados` +
          (result.removed ? `, ${result.removed} sumiram da biblioteca` : ''),
      )
    },
    onError: (error) => {
      const code = errorCodeOf(error)
      if (code === 'STEAM_PROFILE_PRIVATE') {
        toast.error(errorMessageOf(error) ?? 'Perfil privado.', {
          duration: 10_000,
        })
      } else {
        toast.error(errorMessageOf(error) ?? 'Não consegui sincronizar.')
      }
    },
  })

  if (isLoading) {
    return <p className='text-muted-foreground text-sm'>Carregando…</p>
  }

  if (!status?.linked) {
    return (
      <div className='space-y-4'>
        <p className='text-muted-foreground text-sm'>
          Cole seu steamID64 ou a URL do seu perfil da Steam. É daqui que vem
          sua biblioteca de jogos.
        </p>
        <div className='flex gap-2'>
          <Input
            placeholder='steamcommunity.com/id/seunome'
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && identifier.trim()) link.mutate()
            }}
          />
          <Button
            onClick={() => link.mutate()}
            disabled={!identifier.trim() || link.isPending}
          >
            {link.isPending ? (
              <Loader2 className='animate-spin' />
            ) : (
              <Link2 className='size-4' />
            )}
            Vincular
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <Avatar>
          <AvatarImage src={status.avatarUrl ?? undefined} />
          <AvatarFallback>
            <Gamepad2 className='size-4' />
          </AvatarFallback>
        </Avatar>
        <div className='flex-1'>
          <p className='font-medium'>{status.personaName}</p>
          <p className='text-muted-foreground text-sm'>
            {status.gameCount} jogos no catálogo
          </p>
        </div>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => unlink.mutate()}
          disabled={unlink.isPending}
        >
          <Unlink className='size-4' />
          Desvincular
        </Button>
      </div>

      {status.lastSyncStatus === 'error' && (
        <div className='flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm'>
          <AlertTriangle className='mt-0.5 size-4 shrink-0' />
          <div>
            <p className='font-medium'>A última sincronização falhou</p>
            <p className='text-muted-foreground'>
              Confere se "Detalhes do jogo" está Público nas configurações de
              privacidade da tua conta Steam.
            </p>
          </div>
        </div>
      )}

      {status.lastSyncStatus === 'ok' && status.lastSyncAt && (
        <div className='flex items-center gap-2 text-sm'>
          <CheckCircle2 className='size-4 text-emerald-600' />
          <span className='text-muted-foreground'>
            Sincronizado em{' '}
            {format(new Date(status.lastSyncAt), "d 'de' MMM 'às' HH:mm", {
              locale: ptBR,
            })}
          </span>
        </div>
      )}

      <div className='flex items-center gap-3'>
        <Button
          variant='outline'
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
        >
          {sync.isPending ? (
            <Loader2 className='animate-spin' />
          ) : (
            <RefreshCw className='size-4' />
          )}
          Sincronizar agora
        </Button>
        <Label className='text-muted-foreground text-xs'>
          A sincronização também roda automaticamente todo dia.
        </Label>
      </div>
    </div>
  )
}
