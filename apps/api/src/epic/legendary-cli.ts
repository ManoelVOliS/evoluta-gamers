import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Ponte com a ferramenta `legendary` (GPL-3.0, https://github.com/derrod/legendary)
 * — não existe API oficial da Epic pra biblioteca de jogos, então usamos a
 * mesma sessão que um usuário real teria gerado com `legendary auth`.
 *
 * Cada chamada isola a sessão num diretório temporário via `LEGENDARY_CONFIG_PATH`
 * (mecanismo documentado no próprio código da lib), nunca tocando na config
 * global da máquina, e apaga o diretório logo depois — o `user.json` só existe
 * em disco pelo tempo da chamada.
 */

export class EpicSessionError extends Error {}

export type LegendaryGame = {
  appName: string
  title: string
}

async function withTempSession<T>(
  sessionJson: string,
  fn: (configDir: string) => Promise<T>,
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'epic-session-'))
  try {
    await writeFile(join(dir, 'user.json'), sessionJson, {
      encoding: 'utf8',
      mode: 0o600,
    })
    return await fn(dir)
  } finally {
    // Best-effort: mesmo se algo falhar, não deixamos sessão de ninguém em disco.
    await rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
}

function run(args: string[], configDir: string): Promise<string> {
  // Lida aqui dentro (não no topo do módulo): no boot, o `ConfigModule` só
  // carrega o `.env` pro `process.env` depois que este arquivo já foi
  // importado — ler no topo sempre pegava `undefined` e caía no fallback
  // `'legendary'` bare, que não existe no PATH.
  const bin = process.env.LEGENDARY_BIN ?? 'legendary'
  return new Promise((resolve, reject) => {
    execFile(
      bin,
      ['--yes', ...args],
      {
        env: { ...process.env, LEGENDARY_CONFIG_PATH: configDir },
        timeout: 30_000,
        maxBuffer: 20 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          // A legendary sai com código != 0 tanto pra "sessão inválida" quanto
          // pra binário ausente — a mensagem em `stderr` distingue os casos,
          // mas do ponto de vista do usuário os dois pedem a mesma ação: gerar
          // uma sessão nova.
          reject(new EpicSessionError(stderr.trim() || error.message))
          return
        }
        resolve(stdout)
      },
    )
  })
}

/**
 * Valida a sessão e devolve a identidade da conta. Mais barato que buscar a
 * biblioteca inteira — usado só no momento do vínculo.
 */
export async function validateEpicSession(
  sessionJson: string,
): Promise<{ epicAccountId: string; displayName: string }> {
  return withTempSession(sessionJson, async (dir) => {
    const stdout = await run(['status', '--json'], dir)
    let parsed: { account?: string }
    try {
      parsed = JSON.parse(stdout)
    } catch {
      throw new EpicSessionError('resposta inesperada da legendary')
    }
    if (!parsed.account || parsed.account === '<not logged in>') {
      throw new EpicSessionError('sessão não autenticada')
    }

    // account_id não vem no `status --json`, mas já está no JSON que o
    // usuário colou — é o mesmo valor que a legendary vai usar por baixo.
    let raw: { account_id?: string }
    try {
      raw = JSON.parse(sessionJson)
    } catch {
      throw new EpicSessionError('JSON da sessão inválido')
    }
    if (!raw.account_id) {
      throw new EpicSessionError('JSON da sessão sem account_id')
    }

    return { epicAccountId: raw.account_id, displayName: parsed.account }
  })
}

/**
 * Roda `legendary auth --code <code>` num diretório temporário isolado e lê
 * de volta o `user.json` que ela mesma acabou de gerar. Diferente das outras
 * funções deste arquivo, que recebem uma sessão pronta, esta é a única que a
 * produz — usada pela troca automática via extensão, sem o usuário colar nada.
 */
export async function authenticateWithCode(code: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'epic-session-'))
  try {
    await run(['auth', '--code', code], dir)
    return await readFile(join(dir, 'user.json'), 'utf8')
  } catch (error) {
    if (error instanceof EpicSessionError) throw error
    throw new EpicSessionError((error as Error).message)
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
}

export async function fetchEpicLibrary(
  sessionJson: string,
): Promise<LegendaryGame[]> {
  return withTempSession(sessionJson, async (dir) => {
    const stdout = await run(['list', '--json'], dir)
    let raw: Array<Record<string, unknown>>
    try {
      raw = JSON.parse(stdout)
    } catch {
      throw new EpicSessionError('resposta inesperada da legendary')
    }
    return raw
      .filter((g) => typeof g.app_name === 'string' && typeof g.app_title === 'string')
      .map((g) => ({ appName: g.app_name as string, title: g.app_title as string }))
  })
}
