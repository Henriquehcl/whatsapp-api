/**
 * Controller para endpoints de mensagens
 * Recebe requisições HTTP e coordena casos de uso
 */

import { Request, Response, NextFunction } from 'express';
import { SendMessageUseCase } from '../../application/use-cases/SendMessageUseCase';
import { GetConversationUseCase } from '../../application/use-cases/GetConversationUseCase';
import { SendMessageSchema } from '../../application/dtos/MessageDTO';
import { ApiResponse } from '@/shared/utils/response';
import { ValidationError } from '@/shared/errors/AppError';
import logger from '@/shared/logger';

export class MessageController {
  constructor(
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly getConversationUseCase: GetConversationUseCase,
  ) {}

  /**
   * Envia uma nova mensagem
   * POST /api/v1/messages
   */
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extrai tenantId do usuário autenticado (adicionado pelo middleware)
      const tenantId = (req as any).user?.tenantId;

      if (!tenantId) {
        throw new ValidationError('Tenant não identificado');
      }

      // Valida dados de entrada
      const validationResult = SendMessageSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new ValidationError(
          'Dados inválidos',
          validationResult.error.errors,
        );
      }

      // Executa caso de uso
      const result = await this.sendMessageUseCase.execute(
        validationResult.data,
        tenantId,
      );

      // Retorna resposta
      ApiResponse.created(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Busca histórico de mensagens de uma conversa
   * GET /api/v1/conversations/:phone
   */
  async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone } = req.params;
      const tenantId = (req as any).user?.tenantId;
      const { page = '1', limit = '50' } = req.query;

      if (!tenantId) {
        throw new ValidationError('Tenant não identificado');
      }

      // Valida número de telefone
      if (!phone || !/^\d+$/.test(phone)) {
        throw new ValidationError('Número de telefone inválido');
      }

      // Executa caso de uso
      const result = await this.getConversationUseCase.execute({
        phoneNumber: phone,
        tenantId,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });

      // Retorna resposta paginada
      ApiResponse.paginated(
        res,
        result.messages,
        result.page,
        result.limit,
        result.total,
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lista mensagens com filtros
   * GET /api/v1/messages
   */
  async listMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId;
      const {
        conversationId,
        phoneNumber,
        status,
        startDate,
        endDate,
        page = '1',
        limit = '50',
      } = req.query;

      if (!tenantId) {
        throw new ValidationError('Tenant não identificado');
      }

      // Constrói filtros
      const filters: any = { tenantId };

      if (conversationId) {
        filters.conversationId = conversationId as string;
      }

      if (phoneNumber) {
        filters.phoneNumber = phoneNumber as string;
      }

      if (status) {
        filters.status = status as string;
      }

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }

      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      // Aqui você implementaria um caso de uso específico para listagem
      // Por simplicidade, estamos retornando um placeholder
      ApiResponse.success(res, {
        message: 'Endpoint em implementação',
        filters,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Busca mensagem por ID
   * GET /api/v1/messages/:id
   */
  async getMessageById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = (req as any).user?.tenantId;

      if (!tenantId) {
        throw new ValidationError('Tenant não identificado');
      }

      // Implementar busca de mensagem
      ApiResponse.success(res, {
        message: 'Endpoint em implementação',
        id,
      });
    } catch (error) {
      next(error);
    }
  }
}