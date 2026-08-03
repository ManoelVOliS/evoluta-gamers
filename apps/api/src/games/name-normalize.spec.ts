import { looksGrouped, nameVariants, normalizeGameName } from './name-normalize'

describe('normalizeGameName', () => {
  it('remove acentos, símbolos e pontuação', () => {
    expect(normalizeGameName('Co-op / gerência')).toBe('co op gerencia')
    expect(normalizeGameName('Dark Souls™ III')).toBe('dark souls iii')
    expect(normalizeGameName('Counter-Strike 2')).toBe('counter strike 2')
    expect(normalizeGameName('  LIMBO  ')).toBe('limbo')
  })

  it('trata & como "and" para casar grafias diferentes', () => {
    expect(normalizeGameName('Rick & Morty')).toBe('rick and morty')
  })
})

describe('nameVariants', () => {
  it('gera a variante sem o sufixo de edição', () => {
    // É isto que faz "The Witcher: Enhanced Edition" da Steam casar com
    // "The Witcher" digitado na planilha.
    expect(nameVariants('The Witcher: Enhanced Edition')).toEqual([
      'the witcher enhanced edition',
      'the witcher',
    ])
  })

  it('devolve só uma variante quando não há sufixo', () => {
    expect(nameVariants('Hollow Knight')).toEqual(['hollow knight'])
  })
})

describe('looksGrouped', () => {
  it('detecta entradas que são vários jogos', () => {
    // Casos reais da planilha.
    expect(looksGrouped('Overcooked! (1 e 2)')).toBe(true)
    expect(looksGrouped('todos os Call of Duty')).toBe(true)
  })

  it('não marca jogo comum como agrupado', () => {
    expect(looksGrouped('Hollow Knight')).toBe(false)
    expect(looksGrouped('Portal 2')).toBe(false)
  })
})
