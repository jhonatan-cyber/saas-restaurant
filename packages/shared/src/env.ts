import { z } from 'zod'

export const envSchema = z.object({
  // Database — individual vars
  MYSQL_HOST: z.string().default('localhost'),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_USER: z.string().default('root'),
  MYSQL_PASSWORD: z.string().default(''),
  MYSQL_DATABASE: z.string().default('saas_restaurant'),
  MYSQL_ROOT_PASSWORD: z.string().optional(),

  // Database — connection string (construido desde las vars individuales)
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL').default(
    'mysql://root@localhost:3306/saas_restaurant'
  ),
  DIRECT_URL: z.string().url().optional(),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  API_PUBLIC_URL: z.string().default('http://localhost:3001'),

  // Mercado Pago
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_PUBLIC_KEY: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),

  // Ports de servicios
  API_PORT: z.coerce.number().int().positive().default(3001),
  APP_PORT: z.coerce.number().int().positive().default(3000),
  ADMIN_PORT: z.coerce.number().int().positive().default(3003),
  PRINT_AGENT_PORT: z.coerce.number().int().positive().default(3002),
  LANDING_PORT: z.coerce.number().int().positive().default(4321),
  PORT: z.coerce.number().int().positive().optional(),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  API_GLOBAL_PREFIX: z.string().default('api'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  DISABLE_WS: z.string().default('false'),
  CHOKIDAR_USEPOLLING: z.enum(['true', 'false']).optional(),

  // Rate limiting (NestJS ThrottlerModule)
  THROTTLE_TTL: z.coerce.number().int().positive().default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  // Reports
  REPORTS_STORAGE_DIR: z.string().optional(),
  REPORTS_BASE_URL: z.string().optional(),

  // Frontend (Vite) — expuestas al cliente via import.meta.env
  VITE_API_URL: z.string().url().optional(),
  VITE_API_BASE_URL: z.string().url().optional(),

  // SSR / Internal (para server-side rendering desde el backend)
  API_INTERNAL_URL: z.string().url().optional(),
  API_INTERNAL_BASE_URL: z.string().url().optional(),

  // Print Agent
  API_URL: z.string().url().optional(),
  PRINTER_NAME: z.string().optional(),
  PRINTERS_JSON: z.string().optional(),
  PRINT_AGENT_URL: z.string().url().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Scripts / Utilidades
  API_HEALTH_URL: z.string().url().optional(),

  // Mobile (Expo)
  EXPO_PUBLIC_API_URL: z.string().url().optional(),
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
      .filter(i => i.code === 'invalid_type' && i.input === undefined)
      .map(i => i.path.join('.'))

    const invalid = result.error.issues
      .filter(i => i.code !== 'invalid_type' || i.input !== undefined)
      .map(i => `${i.path.join('.')}: ${i.message}`)

    const messages: string[] = ['❌ Environment variable validation failed:']
    if (missing.length) messages.push(`   Missing required: ${missing.join(', ')}`)
    if (invalid.length) messages.push(`   Invalid: ${invalid.join('; ')}`)

    throw new Error(messages.join('\n'))
  }
  return result.data
}
