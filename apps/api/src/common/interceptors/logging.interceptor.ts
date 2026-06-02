import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';

/**
 * Interceptor de logging.
 * Loggea método, path, status code y duración de cada request.
 * Reemplaza el uso de console.log/warn/error en producción.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const start = Date.now();
    const { method, originalUrl } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(`${method} ${originalUrl} ${res.statusCode} +${ms}ms`);
        },
        error: (err: unknown) => {
          const ms = Date.now() - start;
          const status =
            err instanceof Error && 'status' in err
              ? (err as { status?: number }).status ?? 500
              : 500;
          this.logger.warn(
            `${method} ${originalUrl} ${status} +${ms}ms — ${err instanceof Error ? err.message : 'unknown'}`,
          );
        },
      }),
    );
  }
}
