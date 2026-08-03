import { randomBytes } from 'node:crypto'
import { decryptEpicSession, encryptEpicSession } from './epic-token-crypto'

describe('epic-token-crypto', () => {
  const key = randomBytes(32).toString('hex')

  it('criptografa e decriptografa de volta ao original', () => {
    const original = JSON.stringify({ refresh_token: 'segredo-de-verdade', account_id: 'abc123' })
    const blob = encryptEpicSession(original, key)

    expect(blob.ciphertext).not.toContain('segredo-de-verdade')
    expect(decryptEpicSession(blob, key)).toBe(original)
  })

  it('rejeita com a chave errada', () => {
    const blob = encryptEpicSession('dado sensível', key)
    const otherKey = randomBytes(32).toString('hex')

    expect(() => decryptEpicSession(blob, otherKey)).toThrow()
  })

  it('rejeita blob adulterado — GCM autentica o conteúdo', () => {
    const blob = encryptEpicSession('dado sensível', key)
    const tampered = { ...blob, ciphertext: Buffer.from('outracoisa').toString('base64') }

    expect(() => decryptEpicSession(tampered, key)).toThrow()
  })
})
