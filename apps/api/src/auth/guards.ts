import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import type { UserRole } from '@evoluta-gamers/shared'
import { IS_PUBLIC_KEY, ROLES_KEY } from './decorators'
import type { AuthenticatedUser } from './jwt.strategy'

/**
 * Guard global: tudo exige autenticação, salvo o que estiver marcado com
 * `@Public()`. Fechar por padrão evita rota nova nascer exposta por esquecimento.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super()
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true
    return super.canActivate(context)
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0) return true

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>()

    if (!user || !required.includes(user.role as UserRole)) {
      throw new ForbiddenException('Acesso restrito a administradores')
    }
    return true
  }
}
