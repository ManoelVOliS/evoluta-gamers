import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common'
import type { UserRole } from '@evoluta-gamers/shared'
import type { AuthenticatedUser } from './jwt.strategy'

export const IS_PUBLIC_KEY = 'isPublic'
export const ROLES_KEY = 'roles'

/** Libera a rota do guard global de autenticação (login, registro, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

/** Restringe a rota a papéis específicos — PRD §4. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser =>
    ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user,
)
