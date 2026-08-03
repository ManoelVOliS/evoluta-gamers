import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { ManualGameSource } from '@evoluta-gamers/shared'
import { api, errorMessageOf } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SOURCE_OPTIONS: { value: ManualGameSource; label: string; hint: string }[] = [
  {
    value: 'manual_epic',
    label: 'Epic Games',
    hint: 'a Epic não tem uma forma automática de importar — digite os jogos que você tem lá',
  },
  {
    value: 'manual_family_sharing',
    label: 'Family Sharing da Steam',
    hint: 'jogos que você acessa pela conta de outra pessoa e não aparecem na sua biblioteca',
  },
]

export function AddManualGameDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [source, setSource] = useState<ManualGameSource>('manual_epic')
  const [hours, setHours] = useState('')

  const create = useMutation({
    mutationFn: async () =>
      api.post('/catalog/manual', {
        name: name.trim(),
        source,
        estimatedHours: hours.trim() ? Number(hours) : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['catalog'] })
      toast.success('Jogo adicionado ao catálogo')
      reset()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(errorMessageOf(error) ?? 'Não consegui adicionar esse jogo.')
    },
  })

  function reset() {
    setName('')
    setHours('')
    setSource('manual_epic')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Adicionar jogo manualmente</DialogTitle>
          <DialogDescription>
            Pra jogos que não vêm de nenhuma sincronização automática — hoje
            isso é Epic Games e Family Sharing.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='grid gap-1.5'>
            <Label htmlFor='manual-name'>Nome do jogo</Label>
            <Input
              id='manual-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='ex.: Fortnite'
              autoFocus
            />
            <p className='text-muted-foreground text-xs'>
              Se esse jogo já foi classificado por alguém da rede, o nível e a
              duração são herdados automaticamente.
            </p>
          </div>

          <div className='grid gap-1.5'>
            <Label>Origem</Label>
            <Select
              value={source}
              onValueChange={(v) => setSource(v as ManualGameSource)}
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='text-muted-foreground text-xs'>
              {SOURCE_OPTIONS.find((o) => o.value === source)?.hint}
            </p>
          </div>

          <div className='grid gap-1.5'>
            <Label htmlFor='manual-hours'>
              Duração estimada, se souber (opcional)
            </Label>
            <Input
              id='manual-hours'
              type='number'
              min={0}
              step='0.5'
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder='ex.: 12'
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
          >
            {create.isPending ? (
              <Loader2 className='animate-spin' />
            ) : (
              <Plus className='size-4' />
            )}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
