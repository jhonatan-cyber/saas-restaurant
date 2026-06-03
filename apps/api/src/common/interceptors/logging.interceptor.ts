import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { pino } from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Interceptor de logging estructurado con pino.
 * Cada request tiene un correlation ID (x-request-id o generado).
 * Logs en JSON: method, url, statusCode, responseTime, reqId.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const start = Date.now();
    const reqId = (req.headers['x-request-id'] as string) || randomUUID();
    const { method, originalUrl } = req;

    // Attach reqId to request for downstream use
    req['reqId'] = reqId;

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          logger.info({
            req: { method, url: originalUrl },
            res: { statusCode: res.statusCode },
            responseTime: ms,
            reqId,
          });
        },
        error: (err: unknown) => {
          const ms = Date.now() - start;
          const status =
            err instanceof Error && 'status' in err
              ? (err as { status?: number }).status ?? 500
              : 500;
          logger.error({
            req: { method, url: originalUrl },
            res: { statusCode: status },
            responseTime: ms,
            reqId,
            error: err instanceof Error ? err.message : 'unknown',
            stack: process.env.NODE_ENV !== 'production' && err instanceof Error ? err.stack : undefined,
          });
        },
      }),
    );
  }
}
