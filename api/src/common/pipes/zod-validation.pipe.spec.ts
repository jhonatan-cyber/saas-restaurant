import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  // ── Test schemas ──────────────────────────────────────────────────

  const simpleSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    price: z.number().positive('El precio debe ser positivo'),
    isActive: z.boolean().optional().default(true),
  });

  const nestedSchema = z.object({
    user: z.object({
      email: z.string().email('Email inválido'),
      role: z.enum(['ADMIN', 'USER']),
    }),
    tags: z.array(z.string()).min(1, 'Al menos un tag requerido'),
  });

  const unionSchema = z.union([
    z.object({ type: z.literal('A'), value: z.string() }),
    z.object({ type: z.literal('B'), value: z.number() }),
  ]);

  const numberSchema = z.number().int().min(0).max(100);

  // ── Valid values ─────────────────────────────────────────────────

  describe('valid values', () => {
    it('passes a valid object through', () => {
      const pipe = new ZodValidationPipe(simpleSchema);

      const result = pipe.transform({ name: 'Test', price: 100 });

      expect(result).toEqual({ name: 'Test', price: 100, isActive: true });
    });

    it('applies default values from the schema', () => {
      const pipe = new ZodValidationPipe(simpleSchema);

      const result = pipe.transform({ name: 'Test', price: 50 }) as any;

      expect(result.isActive).toBe(true);
    });

    it('passes a valid nested object through', () => {
      const pipe = new ZodValidationPipe(nestedSchema);

      const result = pipe.transform({
        user: { email: 'test@test.com', role: 'ADMIN' },
        tags: ['urgent'],
      });

      expect(result).toBeDefined();
      expect((result as any).user.email).toBe('test@test.com');
    });

    it('passes a valid union value through (type A)', () => {
      const pipe = new ZodValidationPipe(unionSchema);

      const result = pipe.transform({ type: 'A', value: 'hello' });

      expect(result).toEqual({ type: 'A', value: 'hello' });
    });

    it('passes a valid union value through (type B)', () => {
      const pipe = new ZodValidationPipe(unionSchema);

      const result = pipe.transform({ type: 'B', value: 42 });

      expect(result).toEqual({ type: 'B', value: 42 });
    });

    it('passes a valid primitive value through', () => {
      const pipe = new ZodValidationPipe(numberSchema);

      const result = pipe.transform(50);

      expect(result).toBe(50);
    });

    it('passes through edge case values (0, empty string after defaults)', () => {
      const schema = z.object({
        count: z.number().min(0).default(0),
        label: z.string().default(''),
      });
      const pipe = new ZodValidationPipe(schema);

      const result = pipe.transform({}) as any;

      expect(result.count).toBe(0);
      expect(result.label).toBe('');
    });
  });

  // ── Invalid values ───────────────────────────────────────────────

  describe('invalid values', () => {
    it('throws BadRequestException for missing required fields', () => {
      const pipe = new ZodValidationPipe(simpleSchema);

      try {
        pipe.transform({});
        fail('Should have thrown');
      } catch (e) {
        const err = e as BadRequestException;
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toContain('Validation failed');
      }
    });

    it('includes formatted error messages', () => {
      const pipe = new ZodValidationPipe(simpleSchema);

      try {
        pipe.transform({ name: '', price: -5 });
        fail('Should have thrown');
      } catch (e) {
        const err = e as BadRequestException;
        const response = err.getResponse() as any;
        expect(response.errors).toBeDefined();
        expect(Array.isArray(response.errors)).toBe(true);
        // Should contain both error paths
        const errors = response.errors as string[];
        expect(errors.some((msg) => msg.includes('name'))).toBe(true);
        expect(errors.some((msg) => msg.includes('price'))).toBe(true);
      }
    });

    it('uses path.join for nested field errors', () => {
      const pipe = new ZodValidationPipe(nestedSchema);

      try {
        pipe.transform({ user: { email: 'not-an-email', role: 'ADMIN' }, tags: ['a'] });
        fail('Should have thrown');
      } catch (e) {
        const err = e as BadRequestException;
        const response = err.getResponse() as any;
        const errors = response.errors as string[];
        expect(errors.some((msg) => msg.startsWith('user.email'))).toBe(true);
      }
    });

    it('uses "root" as path when error path is empty', () => {
      const pipe = new ZodValidationPipe(numberSchema);

      try {
        pipe.transform('not-a-number' as any);
        fail('Should have thrown');
      } catch (e) {
        const err = e as BadRequestException;
        const response = err.getResponse() as any;
        const errors = response.errors as string[];
        expect(errors.some((msg) => msg.startsWith('root:'))).toBe(true);
      }
    });

    it('throws for invalid enum values', () => {
      const pipe = new ZodValidationPipe(nestedSchema);

      try {
        pipe.transform({
          user: { email: 'test@test.com', role: 'INVALID' },
          tags: ['a'],
        });
        fail('Should have thrown');
      } catch (e) {
        const err = e as BadRequestException;
        expect(err.getResponse()).toBeDefined();
      }
    });

    it('throws for array min length violation', () => {
      const pipe = new ZodValidationPipe(nestedSchema);

      try {
        pipe.transform({
          user: { email: 'test@test.com', role: 'ADMIN' },
          tags: [],
        });
        fail('Should have thrown');
      } catch (e) {
        const err = e as BadRequestException;
        const response = err.getResponse() as any;
        expect(response.errors[0]).toContain('tags');
      }
    });

    it('throws with statusCode 400 in response', () => {
      const pipe = new ZodValidationPipe(simpleSchema);

      try {
        pipe.transform({});
        fail('Should have thrown');
      } catch (e) {
        const err = e as BadRequestException;
        const response = err.getResponse() as any;
        expect(response.statusCode).toBe(400);
        expect(response.error).toBe('Bad Request');
      }
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles null values', () => {
      const pipe = new ZodValidationPipe(simpleSchema);

      expect(() => pipe.transform(null)).toThrow(BadRequestException);
    });

    it('handles undefined values', () => {
      const pipe = new ZodValidationPipe(simpleSchema);

      expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
    });

    it('handles empty object', () => {
      const pipe = new ZodValidationPipe(simpleSchema);

      expect(() => pipe.transform({})).toThrow(BadRequestException);
    });

    it('strips unknown fields by default', () => {
      const pipe = new ZodValidationPipe(simpleSchema);

      const result = pipe.transform({
        name: 'Test',
        price: 100,
        unknownField: 'should-be-stripped',
      });

      expect(result).not.toHaveProperty('unknownField');
    });
  });
});
