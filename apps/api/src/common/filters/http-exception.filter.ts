import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/**
 * Filtro global de excepciones.
 * Normaliza la respuesta de error a un formato predecible:
 *   {
 *     statusCode: number,
 *     error: string,
 *     message: string | string[],
 *     path: string,
 *     timestamp: string
 *   }
 *
 * Mapea errores de Prisma a HTTP status:
 *  - P2002 (unique constraint) → 409 Conflict
 *  - P2025 (record not found) → 404 Not Found
 *  - P2003 (foreign key constraint) → 409 Conflict
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, error, message } = this.resolveError(exception);

    if (status >= 500) {
      this.logger.error(
        `Excepción no controlada (${status}): ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Resuelve cualquier error a (status, error, message).
   */
  private resolveError(
    exception: unknown,
  ): { status: number; error: string; message: string | string[] } {
    // 1) Prisma errors (mapeo temprano porque NO extienden HttpException).
    const prisma = this.mapPrismaError(exception);
    if (prisma) return prisma;

    // 2) Errores HTTP de NestJS.
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return { status: exception.getStatus(), error: exception.name, message: res };
      }
      if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        return {
          status: exception.getStatus(),
          error: (r.error as string) ?? exception.name,
          message: (r.message as string | string[]) ?? exception.message,
        };
      }
      return { status: exception.getStatus(), error: exception.name, message: exception.message };
    }

    // 3) Error genérico.
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'InternalServerError',
        message: exception.message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: 'Internal server error',
    };
  }

  /**
   * Mapea los Prisma errors conocidos a HTTP.
   * Retorna null si no es un Prisma error reconocido.
   */
  private mapPrismaError(
    exception: unknown,
  ): { status: number; error: string; message: string | string[] } | null {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          // Unique constraint
          const target = (exception.meta?.target as string[] | string | undefined) ?? [];
          const targetStr = Array.isArray(target) ? target.join(', ') : String(target);
          return {
            status: HttpStatus.CONFLICT,
            error: 'UniqueConstraintFailed',
            message: `Ya existe un registro con esos valores (${targetStr})`,
          };
        }
        case 'P2025':
          // Record not found
          return {
            status: HttpStatus.NOT_FOUND,
            error: 'NotFound',
            message: 'Recurso no encontrado',
          };
        case 'P2003':
          // Foreign key constraint failed
          return {
            status: HttpStatus.CONFLICT,
            error: 'ForeignKeyConstraintFailed',
            message:
              'No se puede completar la operación porque hay datos relacionados (recurso en uso)',
          };
        default:
          return {
            status: HttpStatus.BAD_REQUEST,
            error: `PrismaError.${exception.code}`,
            message: exception.message,
          };
      }
    }
    return null;
  }
}
