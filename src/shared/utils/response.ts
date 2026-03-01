/**
 * Padronização de respostas da API
 * Implementa padrão de resposta consistente para todos os endpoints
 */

import { Response } from 'express';

// Interface para resposta paginada
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Interface para resposta de sucesso
export interface SuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
  path?: string;
}

// Interface para resposta de erro
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, any>;
  };
  timestamp: string;
  path?: string;
}

/**
 * Classe utilitária para enviar respostas padronizadas
 */
export class ApiResponse {
  /**
   * Envia resposta de sucesso
   */
  static success<T>(
    res: Response,
    data: T,
    statusCode = 200,
  ): Response<SuccessResponse<T>> {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      path: res.req?.originalUrl,
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Envia resposta de sucesso com paginação
   */
  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
  ): Response<SuccessResponse<PaginatedResponse<T>>> {
    const totalPages = Math.ceil(total / limit);
    const response: SuccessResponse<PaginatedResponse<T>> = {
      success: true,
      data: {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
      timestamp: new Date().toISOString(),
      path: res.req?.originalUrl,
    };
    return res.status(200).json(response);
  }

  /**
   * Envia resposta de erro
   */
  static error(
    res: Response,
    error: {
      code: string;
      message: string;
      statusCode: number;
      details?: Record<string, any>;
    },
  ): Response<ErrorResponse> {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      },
      timestamp: new Date().toISOString(),
      path: res.req?.originalUrl,
    };
    return res.status(error.statusCode).json(response);
  }

  /**
   * Envia resposta de criação (201)
   */
  static created<T>(res: Response, data: T): Response<SuccessResponse<T>> {
    return this.success(res, data, 201);
  }

  /**
   * Envia resposta sem conteúdo (204)
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Envia resposta de accepted (202)
   */
  static accepted<T>(
    res: Response,
    data?: T
    ): Response<SuccessResponse<T | undefined>> {
    return this.success(res, data, 202);
    }
}