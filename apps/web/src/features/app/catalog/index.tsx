import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Library, Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  DENSITY_RANGES,
  GAME_SOURCE_LABELS,
  GAME_STATUS_LABELS,
  type CatalogItem,
  type GameStatus,
} from '@evoluta-gamers/shared'
import { api, errorMessageOf } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { AddManualGameDialog } from './add-manual-dialog'
import { ImportDialog } from './import-dialog'

export function Catalog() {
  const queryClient = useQueryClient()
  const [importing, setImporting] = useState(false)
  const [addingManual, setAddingManual] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<GameStatus | 'all'>('all')
  const [density, setDensity] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['catalog'],
    queryFn: async () =>
      (await api.get<{ items: CatalogItem[] }>('/catalog')).data.items,
  })

  const update = useMutation({
    mutationFn: async (vars: { id: string; status: GameStatus }) =>
      api.patch(`/catalog/${vars.id}`, { status: vars.status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['catalog'] })
    },
    onError: (error) =>
      toast.error(errorMessageOf(error) ?? 'Não consegui salvar.'),
  })

  const items = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (data ?? [])
      .filter((i) => (term ? i.name.toLowerCase().includes(term) : true))
      .filter((i) => (status === 'all' ? true : i.status === status))
      .filter((i) =>
        density === 'all' ? true : String(i.density ?? '') === density,
      )
      .sort((a, b) => (a.estimatedHours ?? 9999) - (b.estimatedHours ?? 9999))
  }, [data, search, status, density])

  const finished = data?.filter((i) => i.status === 'finished').length ?? 0

  return (
    <>
      <Header fixed>
        <div className='me-auto font-medium'>Meu catálogo</div>
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Meu catálogo</h2>
            <p className='text-muted-foreground'>
              {data?.length
                ? `${data.length} jogos · ${finished} zerados`
                : 'Seus jogos, do mais curto ao mais longo.'}
            </p>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => setAddingManual(true)}>
              <Plus className='size-4' />
              Adicionar jogo
            </Button>
            <Button onClick={() => setImporting(true)}>
              <Upload className='size-4' />
              Importar planilha
            </Button>
          </div>
        </div>

        {!isLoading && data?.length === 0 ? (
          <div className='flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center'>
            <Library className='text-muted-foreground size-8' />
            <div>
              <p className='font-medium'>Seu catálogo está vazio</p>
              <p className='text-muted-foreground text-sm'>
                Importe sua planilha, conecte a Steam ou adicione um jogo à mão
                pra começar.
              </p>
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={() => setAddingManual(true)}>
                <Plus className='size-4' />
                Adicionar jogo
              </Button>
              <Button onClick={() => setImporting(true)}>
                <Upload className='size-4' />
                Importar planilha
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className='flex flex-wrap gap-2'>
              <Input
                placeholder='Buscar jogo…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='w-56'
              />
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as GameStatus | 'all')}
              >
                <SelectTrigger className='w-44'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos os status</SelectItem>
                  {Object.entries(GAME_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={density} onValueChange={setDensity}>
                <SelectTrigger className='w-44'>
                  <SelectValue placeholder='Nível' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos os níveis</SelectItem>
                  {Object.entries(DENSITY_RANGES).map(([level, range]) => (
                    <SelectItem key={level} value={level}>
                      Nível {level} — {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jogo</TableHead>
                    <TableHead className='w-28'>Duração</TableHead>
                    <TableHead className='w-24'>Nível</TableHead>
                    <TableHead>Gênero</TableHead>
                    <TableHead className='w-32'>Origem</TableHead>
                    <TableHead className='w-48'>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className='text-muted-foreground py-8 text-center'
                      >
                        Carregando…
                      </TableCell>
                    </TableRow>
                  )}
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className='font-medium'>{item.name}</TableCell>
                      <TableCell className='text-muted-foreground'>
                        {item.estimatedHours ? `${item.estimatedHours}h` : '—'}
                      </TableCell>
                      <TableCell>
                        {item.density ? (
                          <Badge variant='outline'>{item.density}</Badge>
                        ) : (
                          <span className='text-muted-foreground'>—</span>
                        )}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {item.tagsPtBr[0] ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>
                          {GAME_SOURCE_LABELS[item.source]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.status}
                          onValueChange={(v) =>
                            update.mutate({ id: item.id, status: v as GameStatus })
                          }
                        >
                          <SelectTrigger className='h-8 w-full'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(GAME_STATUS_LABELS).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && items.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className='text-muted-foreground py-8 text-center'
                      >
                        Nenhum jogo com esses filtros.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {items.length > 0 && (
              <p className='text-muted-foreground text-xs'>
                Mostrando {items.length} de {data?.length} jogos.
              </p>
            )}
          </>
        )}
      </Main>

      <ImportDialog open={importing} onOpenChange={setImporting} />
      <AddManualGameDialog open={addingManual} onOpenChange={setAddingManual} />
    </>
  )
}
