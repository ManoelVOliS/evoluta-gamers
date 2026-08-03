import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WorkbookParserService } from './workbook-parser.service'

/**
 * Roda contra a planilha real do projeto (`seed/jogos-para-zerar.xlsx`), não
 * contra um fixture inventado — é ela que precisa importar sem susto.
 */
describe('WorkbookParserService', () => {
  const parser = new WorkbookParserService()
  const buffer = readFileSync(
    join(__dirname, '..', '..', 'seed', 'jogos-para-zerar.xlsx'),
  )

  it('lê as três abas de jogos e ignora as derivadas', async () => {
    const rows = await parser.parse(buffer)
    const sheets = [...new Set(rows.map((r) => r.sheet))]

    expect(sheets).toEqual(
      expect.arrayContaining(['Catalogo', 'Fora do escopo', 'Nao classificados']),
    )
    expect(sheets).not.toContain('Painel')
    expect(sheets).not.toContain('Plano mensal')
    expect(sheets).not.toContain('Leia-me')
  })

  it('descarta a linha de exemplo', async () => {
    const rows = await parser.parse(buffer)
    expect(rows.some((r) => /^EXEMPLO/i.test(r.rawName))).toBe(false)
  })

  it('marca a aba "Fora do escopo" como não-zerável', async () => {
    const rows = await parser.parse(buffer)
    const out = rows.filter((r) => r.sheet === 'Fora do escopo')

    expect(out.length).toBeGreaterThan(100)
    expect(out.every((r) => r.finishable === false)).toBe(true)
    // Caso real conferido no arquivo.
    expect(out.some((r) => r.rawName === 'Counter-Strike 2')).toBe(true)
  })

  it('lê duração, gênero e motivo do catálogo', async () => {
    const rows = await parser.parse(buffer)
    const catalog = rows.filter((r) => r.sheet === 'Catalogo')

    expect(catalog.length).toBeGreaterThan(100)
    expect(catalog.every((r) => r.finishable === true)).toBe(true)

    const limbo = catalog.find((r) => r.rawName === 'LIMBO')
    expect(limbo).toBeDefined()
    expect(limbo?.estimatedHours).toBe(4)
    expect(limbo?.genrePtBr).toBe('Puzzle-plataforma')
  })

  it('converte o status em português para o enum do domínio', async () => {
    const rows = await parser.parse(buffer)
    const catalog = rows.filter((r) => r.sheet === 'Catalogo')

    // A planilha grava "Nao iniciado", sem acento.
    expect(catalog.some((r) => r.status === 'not_started')).toBe(true)
    expect(catalog.every((r) => r.status !== null)).toBe(true)
  })

  it('ignora o rodapé explicativo da aba Catalogo', async () => {
    const rows = await parser.parse(buffer)
    // "Horas estimadas = campanha principal, ordem de grandeza..." ocupa a
    // coluna Jogo no fim da aba e não é um jogo.
    expect(rows.some((r) => r.rawName.startsWith('Horas estimadas'))).toBe(false)
    expect(rows.every((r) => r.rawName.length <= 80)).toBe(true)
  })

  it('rejeita arquivo que não é planilha', async () => {
    await expect(parser.parse(Buffer.from('não sou um xlsx'))).rejects.toThrow()
  })
})
