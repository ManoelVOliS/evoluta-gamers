/**
 * Normalização de nome de jogo, usada para casar a planilha com a biblioteca da
 * Steam. A planilha não traz appid — só o nome digitado à mão —, então o
 * casamento depende inteiramente disto.
 */

/**
 * Marcas de acento que sobram depois do `normalize('NFD')`.
 * Construído por string para os pontos de código ficarem visíveis no código —
 * escritos direto no literal, seriam caracteres combinantes invisíveis.
 */
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')

/** Símbolos de marca registrada, idem. */
const TRADEMARKS = new RegExp('[\\u2122\\u00ae\\u00a9]', 'g')

/** Sufixos de edição que não mudam o jogo, só a embalagem. */
const EDITION_WORDS = [
  'definitive',
  'remastered',
  'remaster',
  'goty',
  'game of the year',
  'enhanced',
  'complete',
  'deluxe',
  'ultimate',
  'directors cut',
  'director s cut',
  'anniversary',
  'redux',
  'reloaded',
]

const EDITION_PATTERN = new RegExp(
  `\\s+(${EDITION_WORDS.join('|')})(\\s+edition)?$`,
  'i',
)

export function normalizeGameName(raw: string): string {
  return (
    raw
      .normalize('NFD')
      // "gerência" -> "gerencia"
      .replace(DIACRITICS, '')
      .toLowerCase()
      .replace(TRADEMARKS, '')
      .replace(/&/g, ' and ')
      // qualquer não-alfanumérico vira espaço; ":" e "-" somem junto
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
  )
}

/**
 * Grafias alternativas do mesmo jogo — com e sem o sufixo de edição.
 * "The Witcher: Enhanced Edition" casa com "The Witcher".
 */
export function nameVariants(raw: string): string[] {
  const base = normalizeGameName(raw)
  const withoutEdition = base.replace(EDITION_PATTERN, '').trim()

  const variants = new Set([base])
  if (withoutEdition && withoutEdition !== base) variants.add(withoutEdition)

  return [...variants]
}

/**
 * Entradas que representam vários jogos, não um.
 *
 * A planilha tem `"Overcooked! (1 e 2)"` na aba Catalogo e coisas como
 * "todos os X" na aba Fora do escopo (cuja coluna se chama "Jogo / grupo").
 * Dividir isso automaticamente erraria — vai para conferência humana.
 */
export function looksGrouped(raw: string): boolean {
  const enumerationInParens = /\(\s*\d+\s*(e|,|&|-|\+)\s*\d+[^)]*\)/i
  const groupPrefix =
    /^(todos os|toda a|s[eé]rie|saga|franquia|cole[cç][aã]o)\b/i
  const multipleTitles = /\b(e|\+|&)\b.*\b(edition|trilogy|collection|bundle)\b/i

  return (
    enumerationInParens.test(raw) ||
    groupPrefix.test(raw) ||
    multipleTitles.test(raw)
  )
}
