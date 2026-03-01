/**
 * Rotas do módulo WhatsApp
 * Define endpoints e aplica middlewares
 */

import { Router } from 'express';
import { MessageController } from '../controllers/MessageController';
import { WebhookController } from '../controllers/WebhookController';
import { authMiddleware } from '../middlewares/auth';
import { rateLimiter } from '../middlewares/rateLimiter';

// Função para configurar rotas com injeção de dependências
export function createWhatsAppRoutes(
  messageController: MessageController,
  webhookController: WebhookController,
): Router {
  const router = Router();

  /**
   * Rotas públicas (webhook)
   * A Meta precisa acessar sem autenticação
   */
  router.get('/webhook', webhookController.verifyWebhook.bind(webhookController));
  router.post('/webhook', webhookController.handleWebhook.bind(webhookController));
  router.get('/webhook/health', webhookController.healthCheck.bind(webhookController));

  /**
   * Rotas protegidas por autenticação
   * Aplicam rate limiting específico
   */
  const protectedRouter = Router();
  protectedRouter.use(authMiddleware);
  protectedRouter.use(rateLimiter);

  // Rotas de mensagens
  protectedRouter.post('/messages', messageController.sendMessage.bind(messageController));
  protectedRouter.get('/messages', messageController.listMessages.bind(messageController));
  protectedRouter.get('/messages/:id', messageController.getMessageById.bind(messageController));

  // Rotas de conversas
  protectedRouter.get('/conversations/:phone', messageController.getConversation.bind(messageController));

  // Monta rotas protegidas sob /api/v1
  router.use('/api/v1', protectedRouter);

  return router;
}