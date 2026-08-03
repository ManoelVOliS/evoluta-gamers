import { BadRequestException, Injectable } from '@nestjs/common'
import ExcelJS from 'exceljs'
import type { GameStatus } from '@evoluta-gamers/shared'
import { normalizeGameName } from '../games/name-normalize'

/** Uma linha de jogo lida da planilha, ainda sem casamento com o catálogo. */
export type ParsedRow = {
  sheet: string
  rawName: string
  estimatedHours: number | null
  genrePtBr: string | null
  reason: string | null
  /** `false` na aba "Fora do escopo"; `null` na de não classificados. */
  finishable: boolean | null
  status: GameStatus | null
  finishedAt: Date | null
  rating: number | null
}

/** Abas derivadas/instrucionais: não têm jogo para importar. */
const IGNORED_SHEETS = ['leia-me', 'leiame', 'plano mensal', 'painel']

const STATUS_BY_LABEL: Record<string, GameStatus> = {
  'nao iniciado': 'not_started',
  jogando: 'playing',
  zerado: 'finished',
  abandonado: 'abandoned',
}

/** Aceita "Não iniciado" e "Nao iniciado" — a planilha atual usa sem acento. */
function toStatus(value: string | null): GameStatus | null {
  if (!value) return null
  return STATUS_BY_LABEL[normalizeGameName(value)] ?? null
}

/** Cabeçalho -> campo. A busca é por conteúdo normalizado, nunca por posição. */
const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['jogo', 'jogo grupo', 'nome', 'titulo'],
  estimatedHours: ['horas est', 'horas estimadas', 'horas', 'duracao'],
  genre: ['genero', 'generos'],
  reason: ['por que e zeravel', 'motivo', 'por que', 'sua classificacao'],
  status: ['status', 'situacao'],
  finishedAt: ['zerado em', 'data'],
  rating: ['nota 0 10', 'nota'],
}

@Injectable()
export class WorkbookParserService {
  async parse(buffer: Buffer): Promise<ParsedRow[]> {
    const workbook = new ExcelJS.Workbook()
    try {
      // Os tipos publicados do exceljs declaram um `Buffer` próprio que não
      // bate com o do @types/node atual. Em execução é o mesmo objeto.
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    } catch {
      throw new BadRequestException({
        code: 'IMPORT_FILE_INVALID',
        message: 'Não consegui ler este arquivo. Ele é mesmo um .xlsx?',
      })
    }

    const rows: ParsedRow[] = []
    for (const sheet of workbook.worksheets) {
      if (IGNORED_SHEETS.includes(normalizeGameName(sheet.name))) continue
      rows.push(...this.parseSheet(sheet))
    }

    if (rows.length === 0) {
      throw new BadRequestException({
        code: 'IMPORT_FILE_INVALID',
        message:
          'Nenhuma linha de jogo encontrada. Confira se a planilha tem uma coluna "Jogo".',
      })
    }
    return rows
  }

  private parseSheet(sheet: ExcelJS.Worksheet): ParsedRow[] {
    const header = this.findHeader(sheet)
    if (!header) return []

    // "Fora do escopo" define o significado da aba: nada ali tem fim.
    const sheetKey = normalizeGameName(sheet.name)
    const finishable = sheetKey.startsWith('fora do escopo')
      ? false
      : sheetKey.startsWith('nao classificados')
        ? null
        : true

    const rows: ParsedRow[] = []
    for (let n = header.row + 1; n <= sheet.rowCount; n++) {
      const row = sheet.getRow(n)
      const rawName = this.text(row.getCell(header.columns.name ?? 0))
      if (!rawName) continue

      // A linha de exemplo é detectada pelo conteúdo, não pelo número: num
      // template baixado pelo usuário ela pode estar em outro lugar.
      if (/^exemplo\b/i.test(rawName.trim())) continue

      // Rodapés explicativos ocupam a coluna do nome e entrariam como jogo.
      if (this.looksLikeNote(rawName)) continue

      rows.push({
        sheet: sheet.name,
        rawName: rawName.trim(),
        estimatedHours: this.number(row, header.columns.estimatedHours),
        genrePtBr: this.textAt(row, header.columns.genre),
        reason: this.textAt(row, header.columns.reason),
        finishable,
        status: toStatus(this.textAt(row, header.columns.status)),
        finishedAt: this.date(row, header.columns.finishedAt),
        rating: this.number(row, header.columns.rating),
      })
    }
    return rows
  }

  /**
   * Distingue nota de rodapé de título de jogo.
   *
   * A planilha real termina a aba Catalogo com "Horas estimadas = campanha
   * principal, ordem de grandeza (referencia HowLongToBeat)...", que ocupa a
   * coluna Jogo e entraria como um jogo chamado assim. Nome de jogo é curto e
   * não é uma frase; a heurística usa exatamente isso.
   */
  private looksLikeNote(name: string): boolean {
    const text = name.trim()
    if (text.length > 80) return true
    // "X = Y" e frases com ponto no meio são explicação, não título.
    return / = /.test(text) || /\.\s+[A-ZÀ-Ú]/.test(text)
  }

  /**
   * Procura a linha de cabeçalho nas primeiras linhas: na planilha atual ela
   * está na 4 (as três primeiras são título e instruções), mas fixar isso
   * quebraria qualquer planilha montada de outro jeito.
   */
  private findHeader(
    sheet: ExcelJS.Worksheet,
  ): { row: number; columns: Record<string, number> } | null {
    const limit = Math.min(sheet.rowCount, 12)

    for (let n = 1; n <= limit; n++) {
      const columns: Record<string, number> = {}
      const row = sheet.getRow(n)

      row.eachCell((cell, col) => {
        const label = normalizeGameName(this.text(cell) ?? '')
        if (!label) return
        for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
          if (columns[field] === undefined && aliases.includes(label)) {
            columns[field] = col
          }
        }
      })

      // Sem coluna de nome não há o que importar da aba.
      if (columns.name !== undefined) return { row: n, columns }
    }
    return null
  }

  private text(cell: ExcelJS.Cell | undefined): string | null {
    if (!cell) return null
    const value = cell.value
    if (value === null || value === undefined) return null
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    if (typeof value === 'object' && 'richText' in value) {
      return value.richText.map((part) => part.text).join('')
    }
    if (typeof value === 'object' && 'result' in value) {
      // Fórmula: usamos só o valor em cache, nunca reavaliamos.
      return value.result === null || value.result === undefined
        ? null
        : String(value.result)
    }
    return String(value)
  }

  private textAt(row: ExcelJS.Row, col: number | undefined): string | null {
    return col === undefined ? null : this.text(row.getCell(col))
  }

  private number(row: ExcelJS.Row, col: number | undefined): number | null {
    const raw = this.textAt(row, col)
    if (!raw) return null
    const parsed = Number(raw.replace(',', '.').replace(/[^\d.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : null
  }

  /**
   * A mesma coluna vem como texto ISO na planilha atual e como Date (ou serial
   * numérico) em planilhas geradas pelo Excel. Aceita os três.
   */
  private date(row: ExcelJS.Row, col: number | undefined): Date | null {
    if (col === undefined) return null
    const value = row.getCell(col).value
    if (!value) return null

    if (value instanceof Date) return value

    if (typeof value === 'number') {
      // Serial do Excel: dias desde 1899-12-30 (o -2 absorve o bug do ano
      // bissexto de 1900 que a Microsoft manteve por compatibilidade).
      const epoch = Date.UTC(1899, 11, 30)
      return new Date(epoch + value * 86_400_000)
    }

    const parsed = new Date(String(value))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
}
