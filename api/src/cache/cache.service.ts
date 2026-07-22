import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import crypto from 'node:crypto';

/**
 * Servicio de caché con respaldo dual:
 * 1. Redis (cuando está disponible, usando ioredis).
 * 2. In-memory Map (fallback si Redis no arranca).
 *
 * Cada entrada de caché tiene un TTL configurable (por defecto 30s).
 * Las claves se generan con un prefix + hash de parámetros para consistencia.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: IORedis | null = null;
  private readonly memory: Map<string, { value: string; expires: number }> = new Map();
  private useRedis = false;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');

    if (!redisUrl) {
      this.useRedis = false;
      this.logger.warn('⚠️  REDIS_URL no configurado — usando caché en memoria');
      return;
    }

    try {
      const client = new IORedis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (attempt) => Math.min(attempt * 200, 2000),
        enableReadyCheck: true,
      });

      // Si la conexión falla, loggear y usar memoria
      client.on('error', (err) => {
        this.logger.warn(`⚠️  Redis error: ${err instanceof Error ? err.message : String(err)} — usando caché en memoria`);
        this.useRedis = false;
      });

      client.on('ready', () => {
        this.logger.log('✅ CacheService conectado a Redis');
      });

      this.redis = client;
      this.useRedis = true;
    } catch {
      this.useRedis = false;
      this.logger.warn('⚠️  No se pudo conectar a Redis — usando caché en memoria');
    }
  }

  // ── API pública ──────────────────────────────────────────────────────

  /**
   * Obtiene un valor de la caché.
   * Devuelve `null` si no existe o expiró.
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis && this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (raw === null) return null;
        return JSON.parse(raw) as T;
      } catch {
        // Redis error → fallback a memoria
        return this.memoryGet<T>(key);
      }
    }
    return this.memoryGet<T>(key);
  }

  /**
   * Guarda un valor en la caché con un TTL en segundos.
   */
  async set(key: string, value: unknown, ttlSeconds = 30): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.useRedis && this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, serialized);
        return;
      } catch {
        // Redis error → fallback a memoria
      }
    }
    this.memorySet(key, serialized, ttlSeconds);
  }

  /**
   * Elimina una clave de la caché.
   */
  async del(key: string): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch {
        // ignore
      }
    }
    this.memory.delete(key);
  }

  /**
   * Elimina todas las claves que coincidan con un patrón.
   * Ejemplo: `delByPattern('categories:*')` borra toda la caché de categorías.
   */
  async delByPattern(pattern: string): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = nextCursor;
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } while (cursor !== '0');
        return;
      } catch {
        // ignore
      }
    }
    // Memoria: borrar todas las claves que matcheen el patrón
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    for (const key of this.memory.keys()) {
      if (regex.test(key)) {
        this.memory.delete(key);
      }
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  /**
   * Genera una clave de caché consistente a partir de un prefix y parámetros.
   * El hash SHA-256 de los parámetros asegura claves cortas y únicas.
   *
   * @example
   *   cacheKey('categories:listAll', { isActive: true, branchId: 'xyz' })
   *   // → 'categories:listAll:a1b2c3d4e5f6...'
   */
  static key(prefix: string, params?: object): string {
    if (!params) return prefix;
    const hash = crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex').slice(0, 16);
    return `${prefix}:${hash}`;
  }

  // ── Memoria interna ──────────────────────────────────────────────────

  private memoryGet<T>(key: string): T | null {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.memory.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  private memorySet(key: string, value: string, ttlSeconds: number): void {
    this.memory.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Limpia toda la caché (útil en testing o admin).
   */
  async flushAll(): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.flushall();
      } catch {
        // ignore
      }
    }
    this.memory.clear();
  }
}
