import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { SteamLinkResult } from '@evoluta-gamers/shared'
import { ErrorCode } from '@evoluta-gamers/shared'
import { UsersService } from '../users/users.service'
import { SteamApiClient } from './steam-api.client'

const STEAM_ID_PATTERN = /^\d{17}$/
const PROFILE_URL_PATTERN =
  /steamcommunity\.com\/(?:id|profiles)\/([^/?#]+)/i

@Injectable()
export class SteamLinkService {
  constructor(
    private readonly steam: SteamApiClient,
    private readonly users: UsersService,
  ) {}

  async link(userId: string, identifier: string): Promise<SteamLinkResult> {
    const steamId64 = await this.resolveToSteamId(identifier.trim())
    if (!steamId64) {
      throw new NotFoundException({ code: ErrorCode.STEAM_PROFILE_NOT_FOUND })
    }

    const owner = await this.users.findBySteamId(steamId64)
    if (owner && owner.id !== userId) {
      throw new ConflictException({ code: ErrorCode.STEAM_ALREADY_LINKED })
    }

    const summary = await this.steam.getPlayerSummary(steamId64)
    if (!summary) {
      throw new NotFoundException({ code: ErrorCode.STEAM_PROFILE_NOT_FOUND })
    }

    const user = await this.users.linkSteam(userId, {
      steamId64,
      personaName: summary.personaname,
      avatarUrl: summary.avatarfull,
    })

    return {
      steamId64,
      personaName: user.steamPersonaName!,
      avatarUrl: user.steamAvatarUrl,
      // 3 = público. Avisamos aqui, sem esperar a primeira sync falhar.
      profilePublic: summary.communityvisibilitystate === 3,
    }
  }

  async unlink(userId: string): Promise<void> {
    await this.users.unlinkSteam(userId)
  }

  /** Aceita steamID64 puro, URL do perfil, ou o nome da URL personalizada. */
  private async resolveToSteamId(identifier: string): Promise<string | null> {
    if (STEAM_ID_PATTERN.test(identifier)) return identifier

    const fromUrl = PROFILE_URL_PATTERN.exec(identifier)?.[1]
    const vanity = fromUrl ?? identifier

    // "/profiles/<id>" já é o steamID64 puro dentro da URL.
    if (STEAM_ID_PATTERN.test(vanity)) return vanity

    return this.steam.resolveVanityUrl(vanity)
  }
}
