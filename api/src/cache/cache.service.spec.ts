import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';

/**
 * CacheService tests.
 *
 * El constructor intenta conectar a Redis por defecto. Para testing,
 * configuramos REDIS_URL como string vacío para que use solo el
 * fallback en memoria (memory Map).
 */
describe('CacheService', () => {
  let service: CacheService;

  const createService = async (redisUrl?: string) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => (key === 'REDIS_URL' ? redisUrl : null)) },
        },
      ],
    }).compile();
    return module.get(CacheService);
  };

  beforeEach(async () => {
    service = await createService('');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════════
  //  static key()
  // ═════════════════════════════════════════════════════════════════
  describe('static key()', () => {
    it('returns prefix when no params', () => {
      const result = CacheService.key('products:list');
      expect(result).toBe('products:list');
    });

    it('returns prefix with hash when params provided', () => {
      const result = CacheService.key('categories:listAll', { isActive: true, branchId: 'xyz' });
      expect(result).toMatch(/^categories:listAll:[a-f0-9]{16}$/);
    });

    it('produces same hash for same params', () => {
      const a = CacheService.key('test', { foo: 1, bar: 'baz' });
      const b = CacheService.key('test', { foo: 1, bar: 'baz' });
      expect(a).toBe(b);
    });

    it('produces different hash for different params', () => {
      const a = CacheService.key('test', { foo: 1 });
      const b = CacheService.key('test', { foo: 2 });
      expect(a).not.toBe(b);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  Memory cache operations
  // ═════════════════════════════════════════════════════════════════
  describe('memory cache', () => {
    it('stores and retrieves a value', async () => {
      await service.set('test-key', { hello: 'world' });
      const result = await service.get<{ hello: string }>('test-key');
      expect(result).toEqual({ hello: 'world' });
    });

    it('returns null for non-existent key', async () => {
      const result = await service.get('nonexistent');
      expect(result).toBeNull();
    });

    it('respects TTL expiration', async () => {
      await service.set('ttl-key', 'value', -1); // TTL negativo = expired immediately
      const result = await service.get('ttl-key');
      expect(result).toBeNull();
    });

    it('deletes a key', async () => {
      await service.set('del-key', 'value');
      await service.del('del-key');
      const result = await service.get('del-key');
      expect(result).toBeNull();
    });

    it('deletes multiple keys by pattern', async () => {
      await service.set('cat:1', 'a');
      await service.set('cat:2', 'b');
      await service.set('prod:1', 'c');

      await service.delByPattern('cat:*');

      expect(await service.get('cat:1')).toBeNull();
      expect(await service.get('cat:2')).toBeNull();
      expect(await service.get('prod:1')).toBe('c');
    });

    it('flushes all keys', async () => {
      await service.set('a', 1);
      await service.set('b', 2);

      await service.flushAll();

      expect(await service.get('a')).toBeNull();
      expect(await service.get('b')).toBeNull();
    });

    it('overwrites existing key', async () => {
      await service.set('key', 'old');
      await service.set('key', 'new');
      const result = await service.get('key');
      expect(result).toBe('new');
    });
  });
});
