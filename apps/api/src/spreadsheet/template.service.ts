import { Injectable } from '@nestjs/common'
import ExcelJS from 'exceljs'
import { DENSITY_RANGES } from '@evoluta-gamers/shared'

/**
 * Gera o modelo de planilha para quem quiser montar a própria lista.
 *
 * O formato é o mesmo que o parser lê: cabeçalho na primeira linha, colunas
 * identificadas pelo texto. Não copiamos a planilha original porque ela carrega
 * 370 jogos que não são de todo mundo.
 */
@Injectable()
export class TemplateService {
  async build(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'eVOLUTA Gamers'
    workbook.created = new Date()

    this.buildInstructions(workbook)
    this.buildSheet(workbook, 'Catalogo', true)
    this.buildSheet(workbook, 'Fora do escopo', false)

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }

  private buildInstructions(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Leia-me')
    sheet.getColumn(1).width = 100

    const lines = [
      'Modelo de importação — eVOLUTA Gamers',
      '',
      'COMO USAR',
      '  1. Preencha a aba "Catalogo" com os jogos que têm fim definido.',
      '  2. Use a aba "Fora do escopo" para roguelike, online, PvP e sandbox infinito.',
      '  3. Suba o arquivo em Meu catálogo > Importar planilha.',
      '  4. Confira o relatório antes de confirmar — nada é gravado antes disso.',
      '',
      'COLUNAS DA ABA CATALOGO',
      '  Jogo ................. nome como aparece na Steam (obrigatório)',
      '  Horas est. ........... quanto tempo leva para ZERAR, não quanto você já jogou',
      '  Genero ............... texto livre, só para você se organizar',
      '  Por que e zeravel .... anotação livre',
      '  Status ............... Nao iniciado / Jogando / Zerado / Abandonado',
      '  Zerado em ............ data de conclusão',
      '  Nota (0-10) .......... sua nota',
      '',
      'NÍVEIS DE DENSIDADE (calculados automaticamente pelas horas)',
      ...Object.entries(DENSITY_RANGES).map(
        ([level, range]) => `  Nivel ${level} ......... ${range.label}`,
      ),
      '',
      'OBSERVAÇÕES',
      '  - A ordem das colunas não importa; o que vale é o texto do cabeçalho.',
      '  - Uma linha por jogo. Evite agrupar ("Overcooked 1 e 2") — o importador',
      '    marca isso para conferência em vez de adivinhar.',
      '  - Reimportar a mesma planilha atualiza, não duplica.',
    ]

    lines.forEach((line, index) => {
      const cell = sheet.getCell(index + 1, 1)
      cell.value = line
      if (index === 0) cell.font = { bold: true, size: 14 }
      else if (/^[A-ZÇÃÕÁÉÍÓÚ ]+$/.test(line.trim()) && line.trim())
        cell.font = { bold: true }
    })
  }

  private buildSheet(
    workbook: ExcelJS.Workbook,
    name: string,
    finishable: boolean,
  ): void {
    const sheet = workbook.addWorksheet(name)

    const columns = finishable
      ? [
          { header: 'Jogo', width: 42 },
          { header: 'Horas est.', width: 12 },
          { header: 'Genero', width: 22 },
          { header: 'Por que e zeravel', width: 32 },
          { header: 'Status', width: 16 },
          { header: 'Zerado em', width: 14 },
          { header: 'Nota (0-10)', width: 12 },
        ]
      : [
          { header: 'Jogo', width: 42 },
          { header: 'Motivo', width: 48 },
        ]

    sheet.columns = columns.map((c) => ({ header: c.header, width: c.width }))

    const header = sheet.getRow(1)
    header.font = { bold: true }
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E8E8' },
    }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]

    if (!finishable) return

    // Listas suspensas evitam erro de digitação no campo que o parser precisa
    // reconhecer exatamente.
    for (let row = 2; row <= 500; row++) {
      sheet.getCell(`E${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Nao iniciado,Jogando,Zerado,Abandonado"'],
      }
      sheet.getCell(`G${row}`).dataValidation = {
        type: 'whole',
        operator: 'between',
        allowBlank: true,
        formulae: [0, 10],
      }
    }

    sheet.getCell('A2').value = 'EXEMPLO - apague esta linha'
    sheet.getCell('B2').value = 8
    sheet.getCell('C2').value = 'Puzzle'
    sheet.getCell('D2').value = 'Campanha curta com final'
    sheet.getCell('E2').value = 'Nao iniciado'
    sheet.getRow(2).font = { italic: true, color: { argb: 'FF999999' } }
  }
}
