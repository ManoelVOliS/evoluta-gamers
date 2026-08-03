import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common'
import type { Response } from 'express'
import { ERROR_MESSAGES, type ErrorCode } from '@evoluta-gamers/shared'

type ErrorBody = {
  code: string
  message: string
  issues?: { field: string; message: string }[]
}

const GENERIC_MESSAGES = new Set([
  'Unauthorized',
  'Forbidden',
  'Forbidden resource',
  'Not Found',
  'Bad Request',
  'Internal Server Error',
])

/**
 * Normaliza toda resposta de erro para `{ code, message }`.
 *
 * O front decide a mensagem a partir do `code` (ver `ERROR_MESSAGES` no shared),
 * nunca do texto — senão qualquer ajuste de redação aqui quebraria a interface.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('http-exception')

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const payload = exception.getResponse()
      res.status(status).json(this.normalize(payload, status))
      return
    }

    this.logger.error(exception)
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor.',
    } satisfies ErrorBody)
  }

  private normalize(payload: unknown, status: number): ErrorBody {
    if (typeof payload === 'string') {
      return { code: this.codeFor(status), message: payload }
    }

    if (payload && typeof payload === 'object') {
      const body = payload as Record<string, unknown>
      const raw = typeof body.message === 'string' ? body.message : null
      const code =
        typeof body.code === 'string' ? body.code : this.codeFor(status)

      return {
        code,
        // Preferimos o texto do domínio (ERROR_MESSAGES, em pt-BR) ao que vem
        // na exceção; o Nest e o Passport devolvem texto genérico em inglês.
        message:
          ERROR_MESSAGES[code as ErrorCode] ??
          (raw && !GENERIC_MESSAGES.has(raw) ? raw : this.textFor(status)),
        ...(Array.isArray(body.issues)
          ? { issues: body.issues as ErrorBody['issues'] }
          : {}),
      }
    }

    return { code: this.codeFor(status), message: this.textFor(status) }
  }

  private codeFor(status: number): string {
    if (status === HttpStatus.UNAUTHORIZED) return 'UNAUTHORIZED'
    if (status === HttpStatus.FORBIDDEN) return 'FORBIDDEN'
    if (status === HttpStatus.NOT_FOUND) return 'NOT_FOUND'
    if (status === HttpStatus.BAD_REQUEST) return 'VALIDATION_ERROR'
    if (status === HttpStatus.CONFLICT) return 'CONFLICT'
    return 'INTERNAL_ERROR'
  }

  private textFor(status: number): string {
    if (status === HttpStatus.UNAUTHORIZED) return 'Sessão inválida ou expirada.'
    if (status === HttpStatus.FORBIDDEN) return 'Você não tem acesso a isto.'
    if (status === HttpStatus.NOT_FOUND) return 'Não encontrado.'
    return 'Não foi possível concluir a operação.'
  }
}
