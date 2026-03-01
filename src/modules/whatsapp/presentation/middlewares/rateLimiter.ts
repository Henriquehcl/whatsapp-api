//src/modules/whatsapp/presentation/middlewares/rateLimiter.ts

/**
 * Middleware de Rate Limiting
 * Controla o número de requisições para prevenir abuso e garantir disponibilidade
 */

import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { env } from '@/main/config/env';
import { RateLimitError } from '@/shared/errors/AppError';
import logger from '@/shared/logger';

// Configuração padrão de rate limiting
export const defaultLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutos padrão
  max: env.RATE_LIMIT_MAX_REQUESTS || 100, // Limite de requisições por janela
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Muitas requisições. Tente novamente mais tarde.',
      statusCode: 429,
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true, // Retorna headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
  keyGenerator: (req: Request) => {
    const r = req as Request & { user?: { id?: string } };
    if (r.user?.id) {
      return `user:${r.user.id}`;
    }
    return `ip:${r.ip}`;
  },
  handler: (req: Request, res: Response, next: NextFunction, options?: any) => {
    const r = req as Request & { user?: { id?: string } };
    logger.warn('Rate limit excedido', {
      ip: r.ip,
      userId: r.user?.id,
      path: r.path,
      method: r.method,
    });
    
    next(new RateLimitError());
  },
  skip: (req) => {
    // Pula rate limiting para webhooks da Meta (já têm verificação própria)
    return req.path.includes('/webhook') && req.method === 'POST';
  },
});

// Rate limiter mais restritivo para endpoints de envio de mensagens
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 mensagens por minuto
  message: {
    success: false,
    error: {
      code: 'MESSAGE_RATE_LIMIT_EXCEEDED',
      message: 'Limite de envio de mensagens excedido. Tente novamente em alguns minutos.',
      statusCode: 429,
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const r = req as Request & { user?: { id?: string }; body?: any };
    const userId = r.user?.id || 'anonymous';
    const toNumber = r.body?.to || 'unknown';
    return `user:${userId}:to:${toNumber}`;
  },
  handler: (req: Request, res: Response, next: NextFunction, options?: any) => {
    const r = req as Request & { user?: { id?: string }; body?: any };
    logger.warn('Rate limit de mensagens excedido', {
      userId: r.user?.id,
      to: r.body?.to,
      ip: r.ip,
    });
    
    next(new RateLimitError('Limite de envio de mensagens excedido. Tente novamente em alguns minutos.'));
  },
});

// Rate limiter para autenticação (login, refresh token)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Muitas tentativas de autenticação. Tente novamente mais tarde.',
      statusCode: 429,
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
});

// Rate limiter para webhooks (proteção contra chamadas excessivas da Meta)
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 600, // 600 requisições por minuto (10/segundo - seguro para Meta)
  message: {
    success: false,
    error: {
      code: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
      message: 'Limite de webhooks excedido.',
      statusCode: 429,
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Para webhooks, limita por tenant e IP
    const r = req as Request & { headers: any };
    const tenantId = (r.headers['x-tenant-id'] as string) || 'default';
    return `webhook:${tenantId}:${r.ip}`;
  },
});

// Rate limiter para API geral (padrão)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 requisições por minuto
  message: {
    success: false,
    error: {
      code: 'API_RATE_LIMIT_EXCEEDED',
      message: 'Limite de requisições da API excedido.',
      statusCode: 429,
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware combinado que aplica diferentes limiters baseado na rota
export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Aplica limiter apropriado baseado no path
  if (req.path.includes('/webhook')) {
    return webhookLimiter(req, res, next);
  }
  
  if (req.path.includes('/auth') || req.path.includes('/login')) {
    return authLimiter(req, res, next);
  }
  
  if (req.path.includes('/messages') && req.method === 'POST') {
    return messageLimiter(req, res, next);
  }
  
  // Para todas as outras rotas, aplica o limiter padrão
  return apiLimiter(req, res, next);
};
