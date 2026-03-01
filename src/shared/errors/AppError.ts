/**
 * Classe base para erros personalizados da aplicação
 * Permite adicionar código HTTP, código de erro e metadados
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly metadata?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    errorCode = 'INTERNAL_ERROR',
    metadata?: Record<string, any>,
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.metadata = metadata;
    this.isOperational = isOperational;

    // Captura stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converte o erro para formato JSON
   */
  toJSON() {
    return {
      error: {
        code: this.errorCode,
        message: this.message,
        statusCode: this.statusCode,
        ...(this.metadata && { metadata: this.metadata }),
        ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
      },
    };
  }
}

// Erros comuns da aplicação
export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', metadata);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} com ID ${id} não encontrado`
      : `${resource} não encontrado`;
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 409, 'CONFLICT', metadata);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Muitas requisições. Tente novamente mais tarde.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: any) {
    super(
      `Erro no serviço externo: ${service}`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      { service, originalError: originalError?.message },
      false,
    );
  }
}