/**
 * Middleware global de tratamento de erros
 * Processa todos os erros da aplicação de forma padronizada
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/shared/errors/AppError';
import { ApiResponse } from '@/shared/utils/response';
import logger from '@/shared/logger';
import { env } from '@/main/config/env';

// Mapeamento de erros conhecidos para códigos HTTP
const errorMap: Record<string, number> = {
  ValidationError: 400,
  UnauthorizedError: 401,
  ForbiddenError: 403,
  NotFoundError: 404,
  ConflictError: 409,
  RateLimitError: 429,
  ExternalServiceError: 502,
};

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Log do erro com contexto
  logger.error('Erro na requisição:', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    request: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      body: req.body,
      ip: req.ip,
      user: (req as any).user?.id,
    },
  });

  // Se for um erro operacional da aplicação
  if (err instanceof AppError) {
    ApiResponse.error(res, {
      code: err.errorCode,
      message: err.message,
      statusCode: err.statusCode,
      details: err.metadata,
    });
    return;
  }

  // Erros de validação (Zod, etc.)
  if (err.name === 'ZodError') {
    ApiResponse.error(res, {
      code: 'VALIDATION_ERROR',
      message: 'Erro de validação',
      statusCode: 400,
      details: (err as any).errors,
    });
    return;
  }

  // Erros do MongoDB/Mongoose
  if (err.name === 'MongoServerError') {
    const mongoError = err as any;
    
    // Erro de chave duplicada
    if (mongoError.code === 11000) {
      ApiResponse.error(res, {
        code: 'DUPLICATE_KEY',
        message: 'Registro duplicado',
        statusCode: 409,
        details: { key: mongoError.keyValue },
      });
      return;
    }
  }

  // Erros de conexão
  if (err.message.includes('ECONNREFUSED') || err.message.includes('timeout')) {
    ApiResponse.error(res, {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Serviço temporariamente indisponível',
      statusCode: 503,
    });
    return;
  }

  // Em produção, não expor detalhes internos
  if (env.NODE_ENV === 'production') {
    ApiResponse.error(res, {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor',
      statusCode: 500,
    });
    return;
  }

  // Em desenvolvimento, retorna detalhes do erro
  ApiResponse.error(res, {
    code: 'INTERNAL_ERROR',
    message: err.message,
    statusCode: 500,
    details: {
      stack: err.stack,
      name: err.name,
    },
  });
}