/**
 * Configuração e validação das variáveis de ambiente
 * Utiliza Zod para validação type-safe das configurações
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

// Schema de validação das variáveis de ambiente
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  // MongoDB
  MONGO_URI: z.string().min(1, 'MONGO_URI é obrigatório'),
  
  // Meta API
  META_API_URL: z.string().url('META_API_URL deve ser uma URL válida'),
  META_ACCESS_TOKEN: z.string().min(1, 'META_ACCESS_TOKEN é obrigatório'),
  META_PHONE_NUMBER_ID: z.string().min(1, 'META_PHONE_NUMBER_ID é obrigatório'),
  META_VERIFY_TOKEN: z.string().min(1, 'META_VERIFY_TOKEN é obrigatório'),
  META_APP_SECRET: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  API_AUTH_TOKEN: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Tipo inferido do schema
export type EnvConfig = z.infer<typeof envSchema>;

// Função para validar e obter as configurações
function validateEnv(): EnvConfig {
  try {
    const parsedEnv = envSchema.parse(process.env);

    if (parsedEnv.NODE_ENV === 'production' && !parsedEnv.META_APP_SECRET) {
      throw new Error(
        '❌ Variáveis de ambiente inválidas:\nMETA_APP_SECRET - é obrigatório em produção para validar assinatura do webhook',
      );
    }

    return parsedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')} - ${err.message}`).join('\n');
      throw new Error(`❌ Variáveis de ambiente inválidas:\n${missingVars}`);
    }
    throw error;
  }
}

// Exporta configurações validadas
export const env = validateEnv();
