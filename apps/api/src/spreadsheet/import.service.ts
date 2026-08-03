import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { randomUUID } from 'node:crypto'
import { Model, Types } from 'mongoose'
import {
  densityFromHours,
  type ImportPreview,
  type ImportResult,
  type ImportRow,
  type ImportSummary,
} from '@evoluta-gamers/shared'
import { UserGame, type UserGameDocument } from '../catalog/schemas/user-game.schema'
import { looksGrouped, nameVariants, normalizeGameName } from '../games/name-normalize'
import { Game, type GameDocument } from '../games/schemas/game.schema'
import type { ParsedRow } from './workbook-parser.service'
import { WorkbookParserService } from './workbook-parser.service'

/** Preview guardado em memória até o usuário confirmar. */
type PendingImport = {
  userId: string
  rows: (ImportRow & { parsed: ParsedRow })[]
  expiresAt: number
}

const PREVIEW_TTL_MS = 30 * 60 * 1000

@Injectable()
export class ImportService {
  /**
   * Previews vivem em memória, não no banco: são descartáveis, expiram em 30
   * minutos e não valem uma coleção. Reiniciar a API cancela previews abertos,
   * o que é aceitável — o usuário só reenvia o arquivo.
   */
  private readonly pending = new Map<string, PendingImport>()

  constructor(
    private readonly parser: WorkbookParserService,
    @InjectModel(Game.name) private readonly games: Model<GameDocument>,
    @InjectModel(UserGame.name)
    private readonly userGames: Model<UserGameDocument>,
  ) {}

  async preview(userId: string, buffer: Buffer): Promise<ImportPreview> {
    const parsed = await this.parser.parse(buffer)
    const rows = await this.match(parsed)

    const importId = randomUUID()
    const expiresAt = Date.now() + PREVIEW_TTL_MS
    this.evictExpired()
    this.pending.set(importId, { userId, rows, expiresAt })

    return {
      importId,
      summary: this.summarize(rows),
      rows: rows.map(({ parsed: _parsed, ...row }) => row),
      expiresAt: new Date(expiresAt).toISOString(),
    }
  }

  async apply(
    userId: string,
    importId: string,
    skipRowIds: string[],
  ): Promise<ImportResult> {
    const job = this.pending.get(importId)
    if (!job || job.userId !== userId || job.expiresAt < Date.now()) {
      throw new BadRequestException({
        code: 'IMPORT_JOB_EXPIRED',
        message: 'Esta conferência expirou. Envie a planilha de novo.',
      })
    }

    const skip = new Set(skipRowIds)
    const result: ImportResult = {
      gamesCreated: 0,
      gamesUpdated: 0,
      catalogAdded: 0,
      catalogUpdated: 0,
      skipped: 0,
    }

    for (const row of job.rows) {
      // Entradas ambíguas nunca entram sozinhas: sem decisão, ficam de fora.
      if (skip.has(row.rowId) || row.match === 'ambiguous') {
        result.skipped++
        continue
      }
      await this.applyRow(userId, row, result)
    }

    this.pending.delete(importId)
    return result
  }

  private async applyRow(
    userId: string,
    row: ImportRow & { parsed: ParsedRow },
    result: ImportResult,
  ): Promise<void> {
    const { parsed } = row
    const variants = nameVariants(parsed.rawName)
    const normalized = variants[0]!

    const classification = {
      // Veio de um humano preenchendo planilha: é decisão, não palpite.
      state: parsed.finishable === null ? 'unclassified' : 'confirmed',
      finishable: parsed.finishable,
      estimatedHours: parsed.estimatedHours,
      density:
        parsed.estimatedHours === null
          ? null
          : densityFromHours(parsed.estimatedHours),
      reason: parsed.reason,
      tagsPtBr: parsed.genrePtBr ? [parsed.genrePtBr] : [],
      source: 'spreadsheet' as const,
    }

    const existing = await this.games
      .findOne({ $or: [{ nameNormalized: normalized }, { aliases: normalized }] })
      .exec()

    let game: GameDocument
    if (existing) {
      // Não sobrescrevemos o que já foi confirmado por alguém: o catálogo é
      // compartilhado, e reimportar não pode desfazer decisão alheia.
      if (existing.classification.state !== 'confirmed') {
        existing.classification = {
          ...existing.classification,
          ...classification,
        } as GameDocument['classification']
        await existing.save()
        result.gamesUpdated++
      }
      game = existing
    } else {
      game = await this.games.create({
        name: parsed.rawName,
        nameNormalized: normalized,
        aliases: variants.slice(1),
        classification,
      })
      result.gamesCreated++
    }

    // Fora do escopo é informação do catálogo global; não vira item pessoal.
    if (parsed.finishable === false) return

    const update = await this.userGames
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), gameId: game._id },
        {
          $setOnInsert: { source: 'manual_family_sharing' },
          $set: {
            status: parsed.status ?? 'not_started',
            finishedAt: parsed.finishedAt,
            rating: parsed.rating,
          },
        },
        { upsert: true, new: false },
      )
      .exec()

    if (update) result.catalogUpdated++
    else result.catalogAdded++
  }

  /** Casa cada linha da planilha com o catálogo global já existente. */
  private async match(
    parsed: ParsedRow[],
  ): Promise<(ImportRow & { parsed: ParsedRow })[]> {
    const allVariants = [...new Set(parsed.flatMap((p) => nameVariants(p.rawName)))]

    const known = await this.games
      .find({
        $or: [
          { nameNormalized: { $in: allVariants } },
          { aliases: { $in: allVariants } },
        ],
      })
      .select('name nameNormalized aliases')
      .exec()

    const byName = new Map<string, GameDocument>()
    for (const game of known) {
      byName.set(game.nameNormalized, game)
      for (const alias of game.aliases) byName.set(alias, game)
    }

    const seen = new Set<string>()

    return parsed.map((p, index) => {
      const variants = nameVariants(p.rawName)
      const normalized = variants[0]!
      const hit = variants.map((v) => byName.get(v)).find(Boolean)

      const warnings: string[] = []
      if (seen.has(normalized)) warnings.push('Aparece mais de uma vez na planilha')
      seen.add(normalized)

      if (p.finishable === true && p.estimatedHours === null) {
        warnings.push('Sem duração estimada — não entra na rotina do mês')
      }

      const grouped = looksGrouped(p.rawName)
      if (grouped) {
        warnings.push('Parece representar mais de um jogo — confira antes de importar')
      }

      return {
        rowId: `r${index}`,
        sheet: p.sheet,
        name: p.rawName,
        estimatedHours: p.estimatedHours,
        density:
          p.estimatedHours === null ? null : densityFromHours(p.estimatedHours),
        genrePtBr: p.genrePtBr,
        finishable: p.finishable,
        status: p.status,
        match: grouped
          ? ('ambiguous' as const)
          : hit
            ? hit.nameNormalized === normalized
              ? ('exact' as const)
              : ('alias' as const)
            : ('new' as const),
        matchedName: hit?.name ?? null,
        warnings,
        parsed: p,
      }
    })
  }

  private summarize(rows: ImportRow[]): ImportSummary {
    return {
      total: rows.length,
      finishable: rows.filter((r) => r.finishable === true).length,
      outOfScope: rows.filter((r) => r.finishable === false).length,
      unclassified: rows.filter((r) => r.finishable === null).length,
      matched: rows.filter((r) => r.match === 'exact' || r.match === 'alias')
        .length,
      newGames: rows.filter((r) => r.match === 'new').length,
      ambiguous: rows.filter((r) => r.match === 'ambiguous').length,
    }
  }

  private evictExpired(): void {
    const now = Date.now()
    for (const [id, job] of this.pending) {
      if (job.expiresAt < now) this.pending.delete(id)
    }
  }
}
