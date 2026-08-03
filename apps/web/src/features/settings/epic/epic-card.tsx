import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Gamepad2,
  Link2,
  Loader2,
  RefreshCw,
  Unlink,
} from 'lucide-react'
import { toast } from 'sonner'
import type { EpicStatus, SyncResult } from '@evoluta-gamers/shared'
import { api, errorCodeOf, errorMessageOf } from '@/lib/api-client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function EpicCard() {
  const queryClient = useQueryClient()
  const [sessionJson, setSessionJson] = useState('')
  const [instructionsOpen, setInstructionsOpen] = useState(true)

  const { data: status, isLoading } = useQuery({
    queryKey: ['epic', 'status'],
    queryFn: async () => (await api.get<EpicStatus>('/epic/status')).data,
  })

  const link = useMutation({
    mutationFn: async () => api.post('/epic/link', { sessionJson }),
    onSuccess: async () => {
      setSessionJson('')
      await queryClient.invalidateQueries({ queryKey: ['epic', 'status'] })
      toast.success('Conta Epic vinculada!')
    },
    onError: (error) => {
      toast.error(errorMessageOf(error) ?? 'Não consegui vincular essa sessão.')
    },
  })

  const unlink = useMutation({
    mutationFn: async () => api.delete('/epic/link'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['epic', 'status'] })
      toast.success('Conta Epic desvinculada.')
    },
  })

  const sync = useMutation({
    mutationFn: async () => (await api.post<SyncResult>('/epic/sync')).data,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['epic', 'status'] })
      await queryClient.invalidateQueries({ queryKey: ['catalog'] })
      toast.success(
        `Sincronizado: ${result.imported} novos, ${result.updated} atualizados` +
          (result.removed ? `, ${result.removed} sumiram da biblioteca` : ''),
      )
    },
    onError: (error) => {
      const code = errorCodeOf(error)
      if (code === 'EPIC_SESSION_INVALID') {
        toast.error(errorMessageOf(error) ?? 'Sessão expirada.', {
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
          A Epic não tem uma forma automática de conectar como a Steam. Usamos
          a <code className='text-xs'>legendary</code> (ferramenta open source,
          não é da Epic nem nossa) para ler sua biblioteca — o login acontece
          na página oficial da Epic, nunca aqui.
        </p>

        <Collapsible open={instructionsOpen} onOpenChange={setInstructionsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant='outline' size='sm' className='w-full justify-between'>
              Como pegar minha sessão
              <ChevronDown
                className={`size-4 transition-transform ${instructionsOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-3'>
            <ol className='text-muted-foreground list-decimal space-y-2 ps-4 text-sm'>
              <li>
                Instale o Python (python.org) se ainda não tiver, e rode no
                terminal: <code className='text-xs'>pip install legendary-gl</code>
              </li>
              <li>
                Rode <code className='text-xs'>legendary auth</code> — isso abre
                o login oficial da Epic. Faça login normalmente lá.
              </li>
              <li>
                Depois de logar, abra o arquivo de sessão:
                <br />
                Windows:{' '}
                <code className='text-xs'>
                  C:\Users\SEU-USUÁRIO\.config\legendary\user.json
                </code>
                <br />
                Linux/macOS:{' '}
                <code className='text-xs'>~/.config/legendary/user.json</code>
              </li>
              <li>Copie todo o conteúdo do arquivo e cole abaixo.</li>
            </ol>
          </CollapsibleContent>
        </Collapsible>

        <div className='grid gap-1.5'>
          <Label htmlFor='epic-session'>Conteúdo do user.json</Label>
          <Textarea
            id='epic-session'
            value={sessionJson}
            onChange={(e) => setSessionJson(e.target.value)}
            placeholder='{"account_id": "...", "refresh_token": "...", ...}'
            className='h-32 font-mono text-xs'
          />
        </div>

        <Button
          onClick={() => link.mutate()}
          disabled={!sessionJson.trim() || link.isPending}
        >
          {link.isPending ? (
            <Loader2 className='animate-spin' />
          ) : (
            <Link2 className='size-4' />
          )}
          Vincular
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <Avatar>
          <AvatarFallback>
            <Gamepad2 className='size-4' />
          </AvatarFallback>
        </Avatar>
        <div className='flex-1'>
          <p className='font-medium'>{status.displayName}</p>
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
              A sessão pode ter expirado. Rode "legendary auth" de novo e cole
              o novo conteúdo do arquivo aqui.
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
    </div>
  )
}
