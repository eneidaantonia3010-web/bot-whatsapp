// ============================================
// Glow Studio by Sofia — Frontend Environment Validation (Zod)
// ============================================

import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL debe ser una URL válida')
    .default('https://glow-studio-api-2vzt.onrender.com'),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL debe ser una URL válida')
    .default('http://localhost:3000'),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z
    .string()
    .min(8, 'NEXT_PUBLIC_WHATSAPP_NUMBER debe tener al menos 8 dígitos')
    .default('5491178296781'),
});

const serverEnvSchema = clientEnvSchema.extend({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXTAUTH_SECRET: z
    .string()
    .min(1, 'NEXTAUTH_SECRET es requerido')
    .default('glow-studio-dev-secret-key-32chars-min!'),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type Env = ServerEnv;

function validateEnv(): Env {
  const isServer = typeof window === 'undefined';
  const isProd = process.env.NODE_ENV === 'production';

  const rawEnv = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || (isProd ? 'https://glow-studio-api-2vzt.onrender.com' : 'http://localhost:3001'),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || (isProd ? 'https://glow-studio-web.onrender.com' : 'http://localhost:3000'),
    NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5491178296781',
    NODE_ENV: process.env.NODE_ENV || 'development',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || (isProd ? undefined : 'glow-studio-dev-secret-key-32chars-min!'),
  };

  const schema = isServer ? serverEnvSchema : clientEnvSchema;
  const parsed = schema.safeParse(rawEnv);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    const errorMessage = `❌ [Environment Validation Error] Invalid environment variables:\n${errorDetails}`;

    if (isProd) {
      console.error(errorMessage);
      throw new Error(errorMessage);
    } else {
      console.warn(`⚠️ [Environment Warning] Validation issues detected:\n${errorDetails}`);
      return {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5491178296781',
        NODE_ENV: (process.env.NODE_ENV as 'development' | 'test' | 'production') || 'development',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'glow-studio-dev-secret-key-32chars-min!',
      };
    }
  }

  return parsed.data as Env;
}

export const env = validateEnv();
export default env;
