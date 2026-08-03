import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as argon2 from 'argon2'
import { UsersService } from './users.service'

/**
 * Cria a primeira conta de administrador — sem ela ninguém entra numa rede que
 * só aceita cadastro por convite.
 *
 * Só age com a coleção `users` VAZIA. Numa base que já tem gente, não faz nada:
 * assim a variável de ambiente não vira uma porta dos fundos permanente.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger('admin-bootstrap')

  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if ((await this.users.countAll()) > 0) return

    const email = this.config.get<string>('ADMIN_EMAIL')
    const password = this.config.get<string>('ADMIN_PASSWORD')

    if (!email || !password) {
      this.logger.warn(
        'Nenhum usuário na base e ADMIN_EMAIL/ADMIN_PASSWORD não definidos — ' +
          'ninguém consegue entrar. Preencha os dois no .env e reinicie.',
      )
      return
    }

    await this.users.create({
      name: 'Administrador',
      email,
      passwordHash: await argon2.hash(password),
      role: 'admin',
      status: 'active',
    })

    this.logger.log(`Primeiro administrador criado: ${email}`)
  }
}
