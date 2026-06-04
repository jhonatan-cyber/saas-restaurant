import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import type { ZodSchema, ZodError } from 'zod';

/**
 * Pipe de validación con Zod para NestJS.
 * Reemplaza gradualmente la validación de DTOs basada en decorators.
 *
 * Uso en controladores:
 * ```ts
 * @Post()
 * async create(@Body(new ZodValidationPipe(createProductSchema)) input: CreateProductInput)
 * ```
 *
 * También puede usarse como pipe global:
 * ```ts
 * app.useGlobalPipes(new ZodValidationPipe(allSchemasUnion));
 * ```
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private schema: ZodSchema;

  constructor(schema: ZodSchema) {
    this.schema = schema;
  }

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const messages = this.formatZodErrors(result.error);
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: messages,
        error: 'Bad Request',
      });
    }

    return result.data;
  }

  private formatZodErrors(error: ZodError): string[] {
    return error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    });
  }
}
