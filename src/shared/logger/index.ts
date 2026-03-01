/**
 * Logger estruturado usando Winston
 * Configura diferentes transports baseado no ambiente
 */

import winston from 'winston';
import { env } from '@/main/config/env';

// Define níveis de log personalizados
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define cores para cada nível
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Adiciona cores ao Winston
winston.addColors(colors);

// Formato personalizado para desenvolvimento
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Formato personalizado para produção (JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

// Seleciona formato baseado no ambiente
const format = env.NODE_ENV === 'development' ? devFormat : prodFormat;

// Cria o logger
const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  levels,
  format,
  transports: [
    // Transporte para console
    new winston.transports.Console(),
    
    // Transporte para arquivo de erros
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Transporte para todos os logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Em desenvolvimento, log mais detalhado
if (env.NODE_ENV === 'development') {
  logger.debug('Logging configurado para desenvolvimento');
}

// Interface para metadados estruturados
export interface LogMetadata {
  [key: string]: any;
}

// Wrapper functions para logging estruturado
export default {
  error: (message: string, meta?: LogMetadata) => {
    logger.error(message, meta);
  },
  warn: (message: string, meta?: LogMetadata) => {
    logger.warn(message, meta);
  },
  info: (message: string, meta?: LogMetadata) => {
    logger.info(message, meta);
  },
  http: (message: string, meta?: LogMetadata) => {
    logger.http(message, meta);
  },
  debug: (message: string, meta?: LogMetadata) => {
    logger.debug(message, meta);
  },
};