/**
 * Ponto de entrada da aplicação
 * Configura e inicia o servidor HTTP
 */

import 'module-alias/register';
import './config/alias'; // Este arquivo precisa ser corrigido
import mongoose from 'mongoose';
import { app } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import logger from '@/shared/logger'; // Este import já funciona se os aliases estiverem corretos

// Porta do servidor
const PORT = env.PORT || 3000;

/**
 * Função para iniciar o servidor
 */
async function bootstrap() {
  try {
    // Conecta ao MongoDB
    await connectDatabase();

    // Inicia servidor HTTP
    const server = app.listen(PORT, () => {
      logger.info(`
      🚀 Servidor iniciado com sucesso!
      
      📡 Ambiente: ${env.NODE_ENV}
      🔌 Porta: ${PORT}
      📊 MongoDB: Conectado
      📚 Documentação: http://localhost:${PORT}/api-docs
      💓 Health Check: http://localhost:${PORT}/health
      `);
    });

    // Configura timeouts
    server.timeout = 120000; // 2 minutos
    server.keepAliveTimeout = 65000; // 65 segundos

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} recebido. Iniciando shutdown graceful...`);

      server.close(async () => {
        logger.info('Servidor HTTP fechado');
        
        // Desconecta do banco
        await mongoose.disconnect();
        logger.info('Desconectado do MongoDB');

        process.exit(0);
      });

      // Força shutdown após timeout
      setTimeout(() => {
        logger.error('Shutdown forçado devido a timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Erro ao iniciar servidor:', {
      error: error instanceof Error ? error.message : error,
    });
    process.exit(1);
  }
}

// Inicia a aplicação
bootstrap();

// Tratamento de exceções não capturadas
process.on('uncaughtException', (error) => {
  logger.error('Exceção não capturada:', {
    error: error instanceof Error ? error.message : error,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Rejeição não tratada:', { 
    reason: reason instanceof Error ? reason.message : reason,
    promise 
  });
});