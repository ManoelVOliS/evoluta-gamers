import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ImportPreview, ImportResult } from '@evoluta-gamers/shared'
import { api, errorMessageOf } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return (await api.post<ImportPreview>('/import/preview', form)).data
    },
    onSuccess: setPreview,
    onError: (error) =>
      toast.error(errorMessageOf(error) ?? 'Não consegui ler a planilha.'),
  })

  const apply = useMutation({
    mutationFn: async (importId: string) =>
      (await api.post<ImportResult>('/import/apply', { importId, skipRowIds: [] }))
        .data,
    onSuccess: async (data) => {
      setResult(data)
      setPreview(null)
      await queryClient.invalidateQueries({ queryKey: ['catalog'] })
    },
    onError: (error) =>
      toast.error(errorMessageOf(error) ?? 'Não consegui importar.'),
  })

  async function downloadTemplate() {
    // O endpoint exige Authorization, então um <a href> simples não serve:
    // precisa buscar com o token e entregar o blob ao navegador.
    try {
      const res = await api.get('/import/template', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'modelo-evoluta-gamers.xlsx'
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Não consegui gerar o modelo.')
    }
  }

  function reset() {
    setPreview(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const ambiguous = preview?.rows.filter((r) => r.match === 'ambiguous') ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Importar planilha</DialogTitle>
          <DialogDescription>
            Traga seus jogos de uma planilha. Nada é gravado antes de você
            conferir o resumo.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className='space-y-4'>
            <div className='flex gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm'>
              <CheckCircle2 className='mt-0.5 size-4 shrink-0' />
              <div>
                <p className='font-medium'>Importação concluída</p>
                <ul className='text-muted-foreground mt-1 space-y-0.5'>
                  <li>{result.catalogAdded} jogos adicionados ao seu catálogo</li>
                  <li>{result.catalogUpdated} atualizados</li>
                  <li>
                    {result.gamesCreated} novos no catálogo compartilhado da rede
                  </li>
                  {result.skipped > 0 && (
                    <li>{result.skipped} ignorados (precisam de conferência)</li>
                  )}
                </ul>
              </div>
            </div>
            <Button className='w-full' onClick={() => onOpenChange(false)}>
              Ver meu catálogo
            </Button>
          </div>
        ) : preview ? (
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
              <Stat label='Linhas lidas' value={preview.summary.total} />
              <Stat label='Zeráveis' value={preview.summary.finishable} />
              <Stat label='Fora do escopo' value={preview.summary.outOfScope} />
              <Stat label='Sem classificação' value={preview.summary.unclassified} />
            </div>

            <div className='text-muted-foreground text-sm'>
              {preview.summary.newGames} jogos novos ·{' '}
              {preview.summary.matched} já conhecidos pela rede
            </div>

            {ambiguous.length > 0 && (
              <div className='flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm'>
                <AlertTriangle className='mt-0.5 size-4 shrink-0' />
                <div>
                  <p className='font-medium'>
                    {ambiguous.length} entrada(s) parecem juntar mais de um jogo
                  </p>
                  <p className='text-muted-foreground mt-0.5'>
                    Vão ficar de fora para você adicionar separadamente depois:{' '}
                    {ambiguous.map((r) => r.name).join(', ')}
                  </p>
                </div>
              </div>
            )}

            <ScrollArea className='h-56 rounded-lg border'>
              <table className='w-full text-sm'>
                <tbody>
                  {preview.rows.slice(0, 200).map((row) => (
                    <tr key={row.rowId} className='border-b last:border-0'>
                      <td className='px-3 py-1.5'>{row.name}</td>
                      <td className='text-muted-foreground px-3 py-1.5 text-end whitespace-nowrap'>
                        {row.estimatedHours ? `${row.estimatedHours}h` : '—'}
                      </td>
                      <td className='px-3 py-1.5 text-end'>
                        {row.match === 'ambiguous' ? (
                          <Badge variant='outline'>conferir</Badge>
                        ) : row.finishable === false ? (
                          <Badge variant='secondary'>fora do escopo</Badge>
                        ) : row.density ? (
                          <Badge>nível {row.density}</Badge>
                        ) : (
                          <Badge variant='outline'>sem duração</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            <DialogFooter className='gap-2'>
              <Button variant='outline' onClick={reset}>
                Trocar arquivo
              </Button>
              <Button
                onClick={() => apply.mutate(preview.importId)}
                disabled={apply.isPending}
              >
                {apply.isPending && <Loader2 className='animate-spin' />}
                Importar {preview.summary.total - preview.summary.ambiguous} jogos
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className='space-y-4'>
            <button
              type='button'
              onClick={() => inputRef.current?.click()}
              className='border-muted-foreground/30 hover:bg-muted/50 flex w-full flex-col items-center gap-2 rounded-lg border border-dashed p-8 transition-colors'
            >
              {upload.isPending ? (
                <Loader2 className='text-muted-foreground size-6 animate-spin' />
              ) : (
                <FileSpreadsheet className='text-muted-foreground size-6' />
              )}
              <span className='text-sm font-medium'>
                {upload.isPending
                  ? 'Lendo a planilha…'
                  : 'Clique para escolher um arquivo .xlsx'}
              </span>
              <span className='text-muted-foreground text-xs'>até 5 MB</span>
            </button>

            <input
              ref={inputRef}
              type='file'
              accept='.xlsx'
              className='hidden'
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) upload.mutate(file)
              }}
            />

            <div className='flex items-center justify-between rounded-lg border p-3 text-sm'>
              <div>
                <p className='font-medium'>Não tem uma planilha?</p>
                <p className='text-muted-foreground text-xs'>
                  Baixe o modelo, preencha e volte aqui.
                </p>
              </div>
              <Button variant='outline' size='sm' onClick={() => void downloadTemplate()}>
                <Download className='size-4' />
                Baixar modelo
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-lg border p-3'>
      <div className='text-xl font-bold'>{value}</div>
      <div className='text-muted-foreground text-xs'>{label}</div>
    </div>
  )
}
