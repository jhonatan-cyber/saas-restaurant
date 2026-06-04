import { z } from 'zod'

export const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  DIRECT_URL: z.string().url().optional(),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // Mercado Pago
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_PUBLIC_KEY: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().default('api'),
  CORS_ORIGINS: z.string().default('*'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Print Agent
  PRINT_AGENT_URL: z.string().url().optional(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
})

export type Env = z.infer<typeof envSchema>

/**
 * Parse and validate environment variables at app bootstrap.
 * Crashes with a clear message if required vars are missing or invalid.
 */
export function parseEnv(env: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(env)
  if (!result.success) {
    const missing = result.error.issues
      .filter(i => i.code === 'invalid_type' && i.received === 'undefined')
      .map(i => i.path.join('.'))

    const invalid = result.error.issues
      .filter(i => i.code !== 'invalid_type' || i.received !== 'undefined')
      .map(i => `${i.path.join('.')}: ${i.message}`)

    const messages: string[] = ['❌ Environment variable validation failed:']
    if (missing.length) messages.push(`   Missing required: ${missing.join(', ')}`)
    if (invalid.length) messages.push(`   Invalid: ${invalid.join('; ')}`)

    throw new Error(messages.join('\n'))
  }
  return result.data
}
