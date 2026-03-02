/**
 * Controller para webhooks da Meta
 * Gerencia verificação e recebimento de eventos
 */

import { Request, Response, NextFunction } from 'express';
import { ProcessWebhookUseCase } from '../../application/use-cases/ProcessWebhookUseCase';
import { env } from '@/main/config/env';
import { ApiResponse } from '@/shared/utils/response';
import { ValidationError, UnauthorizedError } from '@/shared/errors/AppError';
import logger from '@/shared/logger';
import { IMetaApiAdapter } from '../../infrastructure/adapters/IMetaApiAdapter';

export class WebhookController {
  constructor(
    private readonly processWebhookUseCase: ProcessWebhookUseCase,
    private readonly metaApiAdapter: IMetaApiAdapter,
  ) {}

  /**
   * Verificação do webhook (GET)
   * Meta envia uma requisição GET para verificar o webhook
   */
  async verifyWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mode = Array.isArray(req.query['hub.mode'])
        ? req.query['hub.mode'][0]
        : req.query['hub.mode'];
      const token = Array.isArray(req.query['hub.verify_token'])
        ? req.query['hub.verify_token'][0]
        : req.query['hub.verify_token'];
      const challenge = Array.isArray(req.query['hub.challenge'])
        ? req.query['hub.challenge'][0]
        : req.query['hub.challenge'];

      logger.info('Verificando webhook', { mode, token });

      // Verifica se é uma requisição de verificação
      if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN && challenge) {
        logger.info('Webhook verificado com sucesso');
        res.status(200).send(String(challenge));
      } else {
        throw new UnauthorizedError('Falha na verificação do webhook');
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Recebe eventos do webhook (POST)
   * Meta envia eventos (mensagens, status, etc.)
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      console.log('===== WEBHOOK RECEBIDO =====');

    console.log('Headers:', req.headers);

    console.log('Body:');
    console.log(JSON.stringify(req.body, null, 2));

      // Valida presença do body
      if (!req.body) {
        throw new ValidationError('Body vazio');
      }

      // Verifica assinatura (opcional em desenvolvimento)
      if (env.NODE_ENV === 'production') {
        if (!signature) {
          throw new UnauthorizedError('Assinatura não fornecida');
        }

        console.log('Signature recebida:', { signature });

        const bodyString = ((req as Request & { rawBody?: string }).rawBody)
          ?? JSON.stringify(req.body);
        const isValid = this.metaApiAdapter.verifyWebhookSignature(
          signature,
          bodyString,
        );

        if (!isValid) {
          logger.warn('Assinatura inválida do webhook', { signature });
          throw new UnauthorizedError('Assinatura inválida');
        }
      }

      console.log('Webhook recebido', {
        tenantId,
        object: req.body.object,
      });

      // Processa o webhook
      const result = await this.processWebhookUseCase.execute(
        req.body,
        tenantId,
        signature,
      );

      console.log('Resultado do processamento:', result);

      // Meta espera resposta 200 OK mesmo se houver erros
      ApiResponse.success(res, {
        received: true,
        ...result,
      });
    } catch (error) {
      // Sempre retorna 200 para a Meta, mas loga o erro
      logger.error('Erro ao processar webhook:', {
      error,
    });
      ApiResponse.success(res, {
        received: true,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Health check específico para webhook
   * GET /api/v1/webhook/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    ApiResponse.success(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      webhookUrl: `${req.protocol}://${req.get('host')}/api/v1/webhook`,
    });
  }
}
