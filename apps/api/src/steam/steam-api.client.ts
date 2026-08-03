import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosError } from 'axios'

export type SteamPlayerSummary = {
  steamid: string
  personaname: string
  avatarfull: string
  profileurl: string
  /** 1 = privado, 3 = público. */
  communityvisibilitystate: number
}

export type SteamOwnedGame = {
  appid: number
  name: string
  /** Em MINUTOS — a Steam nunca devolve horas. */
  playtime_forever: number
  img_icon_url: string
}

const BASE_URL = 'https://api.steampowered.com'

/**
 * Cliente cru da Steam Web API. Não decide regra de negócio — só sabe
 * conversar com a Steam e traduzir os casos estranhos dela.
 *
 * Throttle GLOBAL (não por usuário): a Steam limita por IP, então enfileirar
 * por usuário não protegeria nada. Uma fila sequencial simples in-process
 * basta para o volume de uma rede fechada.
 */
@Injectable()
export class SteamApiClient {
  private readonly logger = new Logger('steam-api')
  private queue: Promise<unknown> = Promise.resolve()
  private readonly minIntervalMs = 1100

  constructor(private readonly config: ConfigService) {}

  /** `null` = a Steam não achou esse nome de URL personalizada. */
  async resolveVanityUrl(vanity: string): Promise<string | null> {
    const data = await this.request<{
      response: { success: number; steamid?: string }
    }>('/ISteamUser/ResolveVanityURL/v1/', { vanityurl: vanity })

    // A Steam devolve HTTP 200 com success:42 para "não encontrado" — não é erro.
    return data.response.success === 1 ? (data.response.steamid ?? null) : null
  }

  async getPlayerSummary(steamId64: string): Promise<SteamPlayerSummary | null> {
    const data = await this.request<{
      response: { players: SteamPlayerSummary[] }
    }>('/ISteamUser/GetPlayerSummaries/v2/', { steamids: steamId64 })

    return data.response.players[0] ?? null
  }

  /**
   * `null` = perfil com "Detalhes do jogo" privado. A Steam sinaliza isso
   * devolvendo `{"response":{}}` — sem `game_count`, sem erro HTTP. Perfil
   * público sem nenhum jogo devolve `{"response":{"game_count":0}}`, que é
   * um caso diferente (por isso checamos a CHAVE, não o array `games`).
   */
  async getOwnedGames(steamId64: string): Promise<SteamOwnedGame[] | null> {
    const data = await this.request<{
      response: { game_count?: number; games?: SteamOwnedGame[] }
    }>('/IPlayerService/GetOwnedGames/v1/', {
      steamid: steamId64,
      include_appinfo: '1',
      include_played_free_games: '1',
    })

    if (data.response.game_count === undefined) return null
    return data.response.games ?? []
  }

  private async request<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    // Encadeia no fim da fila atual: garante que só uma chamada à Steam está
    // em voo por vez, espaçadas pelo intervalo mínimo.
    const run = this.queue.then(() => this.throttledGet<T>(path, params))
    this.queue = run.catch(() => undefined)
    return run
  }

  private async throttledGet<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const key = this.config.get<string>('STEAM_API_KEY')
    if (!key) {
      throw new ServiceUnavailableException({
        code: 'STEAM_KEY_MISSING',
        message: 'A integração com a Steam ainda não foi configurada.',
      })
    }

    try {
      const { data } = await axios.get<T>(`${BASE_URL}${path}`, {
        params: { key, format: 'json', ...params },
        timeout: 10_000,
      })
      return data
    } catch (error) {
      throw this.translateError(error)
    } finally {
      await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs))
    }
  }

  private translateError(error: unknown): Error {
    if (error instanceof AxiosError) {
      // Key inválida vem como 403 com HTML, não JSON — sem isso o erro
      // genérico faria parecer que a Steam está fora do ar.
      if (error.response?.status === 403) {
        this.logger.error('STEAM_API_KEY rejeitada pela Steam (403)')
        return new ServiceUnavailableException({
          code: 'STEAM_KEY_INVALID',
          message: 'A chave da Steam configurada no servidor é inválida.',
        })
      }
      this.logger.error(`Steam API falhou: ${error.message}`)
    }
    return new ServiceUnavailableException({
      code: 'STEAM_UNAVAILABLE',
      message: 'A Steam não respondeu agora. Tente de novo em instantes.',
    })
  }
}
