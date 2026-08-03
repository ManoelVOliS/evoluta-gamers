import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * AES-256-GCM para o `user.json` da sessão Epic de cada usuário.
 *
 * Diferente da `STEAM_API_KEY` (uma credencial só, da aplicação — ver
 * ANALISE_PRD.md §2), aqui o segredo é POR USUÁRIO: um refresh token de
 * sessão real, que dá acesso à conta Epic da pessoa. Isso exige criptografia
 * reversível de verdade — não dá pra só hashear como senha.
 */
export type EncryptedBlob = {
  ciphertext: string
  iv: string
  authTag: string
}

const ALGORITHM = 'aes-256-gcm'

export function encryptEpicSession(
  plaintext: string,
  hexKey: string,
): EncryptedBlob {
  const key = Buffer.from(hexKey, 'hex')
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

/** Lança se a chave estiver errada ou o blob tiver sido adulterado (GCM autentica). */
export function decryptEpicSession(blob: EncryptedBlob, hexKey: string): string {
  const key = Buffer.from(hexKey, 'hex')
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(blob.iv, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(blob.authTag, 'base64'))

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, 'base64')),
    decipher.final(),
  ])

  return plaintext.toString('utf8')
}
