/**
 * Configuração e conexão com MongoDB usando Mongoose
 * Implementa conexão com pooling e retry logic
 */

import mongoose from 'mongoose';
import { env } from './env';
import logger from '@/shared/logger';

// Opções de conexão do Mongoose
const mongooseOptions: mongoose.ConnectOptions = {
  autoIndex: env.NODE_ENV === 'development', // Auto-index apenas em desenvolvimento
  maxPoolSize: 10, // Tamanho máximo do pool de conexões
  minPoolSize: 2, // Tamanho mínimo do pool de conexões
  socketTimeoutMS: 45000, // Timeout do socket
  connectTimeoutMS: 10000, // Timeout da conexão
  retryWrites: true, // Retry em writes
  retryReads: true, // Retry em reads
  serverSelectionTimeoutMS: 5000, // Timeout para seleção de servidor
  heartbeatFrequencyMS: 10000, // Frequência de heartbeat
};

/**
 * Estabelece conexão com MongoDB
 * @returns Promise com a conexão estabelecida
 */
export async function connectDatabase(): Promise<void> {
  try {
    logger.info('Conectando ao MongoDB...', {
      uri: env.MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'), // Log seguro
    });

    await mongoose.connect(env.MONGO_URI, mongooseOptions);

    logger.info('✅ MongoDB conectado com sucesso');
  } catch (error) {
    logger.error('❌ Erro ao conectar ao MongoDB', {
      error,
    });
    throw error;
  }
}

/**
 * Fecha conexão com MongoDB
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('🔌 MongoDB desconectado');
  } catch (error) {
    logger.error('Erro ao desconectar MongoDB:', {
      error,
    });
    throw error;
  }
}

// Eventos de conexão do Mongoose
mongoose.connection.on('connected', () => {
  logger.info('📊 Conexão MongoDB estabelecida');
});

mongoose.connection.on('error', (err) => {
  logger.error('❌ Erro na conexão MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB desconectado');
});

mongoose.connection.on('reconnected', () => {
  logger.info('🔄 MongoDB reconectado');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});