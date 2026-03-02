/**
 * Configuracao principal da aplicacao Express
 * Registra middlewares, rotas e documentacao
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { setupSwagger } from '@/docs/swagger';
import logger from '@/shared/logger';
import { MetaApiAdapter } from '@/modules/whatsapp/infrastructure/adapters/MetaApiAdapter';
import { MongoMessageRepository } from '@/modules/whatsapp/infrastructure/repositories/MongoMessageRepository';
import { MongoWebhookRepository } from '@/modules/whatsapp/infrastructure/repositories/MongoWebhookRepository';
import { MongoConversationRepository } from '@/modules/whatsapp/infrastructure/repositories/MongoConversationRepository';
import { SendMessageUseCase } from '@/modules/whatsapp/application/use-cases/SendMessageUseCase';
import { GetConversationUseCase } from '@/modules/whatsapp/application/use-cases/GetConversationUseCase';
import { ProcessWebhookUseCase } from '@/modules/whatsapp/application/use-cases/ProcessWebhookUseCase';
import { MessageController } from '@/modules/whatsapp/presentation/controllers/MessageController';
import { WebhookController } from '@/modules/whatsapp/presentation/controllers/WebhookController';
import { createWhatsAppRoutes } from '@/modules/whatsapp/presentation/routes/whatsapp.routes';

// Inicializa app Express
export const app = express();

// ==================== Middlewares Globais ====================

// Seguranca
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: env.NODE_ENV === 'production',
}));

// CORS
app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? ['https://seu-dominio.com']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  maxAge: 86400,
}));

// Compressao
app.use(compression());

// Parsing de JSON com limite aumentado
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging de requisicoes (Morgan + Winston)
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.http(message.trim()),
  },
}));

// ==================== Health Check ====================

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ==================== Documentacao Swagger ====================

setupSwagger(app);

// ==================== Rotas da API ====================

const metaApiAdapter = new MetaApiAdapter();
const messageRepository = new MongoMessageRepository();
const conversationRepository = new MongoConversationRepository();
const webhookRepository = new MongoWebhookRepository();

const sendMessageUseCase = new SendMessageUseCase(
  messageRepository,
  conversationRepository,
  metaApiAdapter,
);
const getConversationUseCase = new GetConversationUseCase(
  messageRepository,
  conversationRepository,
);
const processWebhookUseCase = new ProcessWebhookUseCase(
  messageRepository,
  conversationRepository,
  webhookRepository,
);

const messageController = new MessageController(
  sendMessageUseCase,
  getConversationUseCase,
);
const webhookController = new WebhookController(
  processWebhookUseCase,
  metaApiAdapter,
);

app.use(createWhatsAppRoutes(messageController, webhookController));

app.get('/', (_req, res) => {
  res.json({
    message: 'WhatsApp Business API Platform',
    version: '1.0.0',
    documentation: '/api-docs',
  });
});

// ==================== Middleware de Erros ====================

app.use(errorHandler);

// ==================== Tratamento de Rotas Nao Encontradas ====================

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Rota ${req.originalUrl} nao encontrada`,
      statusCode: 404,
    },
    timestamp: new Date().toISOString(),
  });
});
