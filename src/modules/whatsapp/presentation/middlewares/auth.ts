/**
 * Middleware de autenticação JWT
 * Verifica token e adiciona informações do usuário à requisição
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/main/config/env';
import { UnauthorizedError } from '@/shared/errors/AppError';
import logger from '@/shared/logger';

// Interface para payload do JWT
interface JwtPayload {
  id: string;
  tenantId: string;
  email?: string;
  role?: string;
}

// Estende o tipo Request do Express
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware de autenticação
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // Obtém token do header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Token não fornecido');
    }

    // Verifica formato do token (Bearer <token>)
    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      throw new UnauthorizedError('Formato de token inválido');
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      throw new UnauthorizedError('Formato de token inválido');
    }

    // Verifica e decodifica o token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Adiciona informações do usuário à requisição
    req.user = {
      id: decoded.id,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role,
    };

    logger.debug('Usuário autenticado', {
      userId: decoded.id,
      tenantId: decoded.tenantId,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Token inválido'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expirado'));
    } else {
      next(error);
    }
  }
};

/**
 * Middleware opcional de autenticação
 * Não falha se não houver token, apenas adiciona se existir
 */
export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');

      if (parts.length === 2) {
        const [scheme, token] = parts;

        if (/^Bearer$/i.test(scheme)) {
          try {
            const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
            req.user = decoded;
          } catch {
            // Ignora erro em autenticação opcional
          }
        }
      }
    }

    next();
  } catch {
    next();
  }
};