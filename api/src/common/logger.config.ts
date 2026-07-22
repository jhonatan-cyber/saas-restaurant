import { Params } from 'nestjs-pino';
import { pino } from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    transport: isProduction
      ? undefined
      : isTest
        ? undefined  // No pretty transport in tests — keep it simple
        : {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
          },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
    customProps: () => ({
      context: 'HTTP',
    }),
    quietReqLogger: false,
  },
};

/**
 * Crea un logger standalone para usar fuera del contexto HTTP.
 */
export function createLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    transport: isProduction
      ? undefined
      : isTest
        ? undefined
        : {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
          },
  });
}
