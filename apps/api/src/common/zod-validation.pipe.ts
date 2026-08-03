import { BadRequestException, type PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

/**
 * Valida o corpo/query contra um schema de `@evoluta-gamers/shared`.
 *
 * Não usamos a `ValidationPipe` do Nest de propósito: ela exige
 * `class-validator` + DTOs em classe, o que duplicaria os schemas que o front
 * já consome. O contrato mora em `packages/shared` e vale para os dois lados.
 *
 * Uso: `@Body(new ZodBody(LoginInput)) body: LoginInput`
 */
export class ZodBody<T extends ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados inválidos',
        issues: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }
    return result.data
  }
}
