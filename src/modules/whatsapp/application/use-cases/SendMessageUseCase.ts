//src/modules/whatsapp/application/use-cases/SendMessageUseCase.ts

/**
 * Caso de uso para envio de mensagens
 * Orquestra o processo completo de envio de mensagem
 */

import {
  SendMessageDTO,
  SendMessageResponseDTO,
  SendMessageSchema,
} from '../dtos/MessageDTO';
import { IMessageRepository } from '../ports/IMessageRepository';
import { IConversationRepository } from '../ports/IConversationRepository';
import { IMetaApiAdapter } from '../../infrastructure/adapters/IMetaApiAdapter';
import { Message } from '../../domain/entities/Message';
import { Conversation } from '../../domain/entities/Conversation';
import { ValidationError, ExternalServiceError } from '@/shared/errors/AppError';
import logger from '@/shared/logger';
import { z } from 'zod';

// Interface para o resultado do caso de uso
export interface SendMessageResult {
  success: boolean;
  messageId: string;
  metaMessageId?: string;
  status: string;
  timestamp: Date;
}

export class SendMessageUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly conversationRepository: IConversationRepository,
    private readonly metaApiAdapter: IMetaApiAdapter,
  ) {}

  /**
   * Executa o caso de uso de envio de mensagem
   */
  async execute(
    dto: SendMessageDTO,
    tenantId: string,
  ): Promise<SendMessageResult> {
    try {
      // 1. Validação dos dados de entrada
      logger.info('Iniciando envio de mensagem', { tenantId, to: dto.to });

      const validatedData = SendMessageSchema.parse(dto);

      // 2. Cria entidade de mensagem
      const message = Message.create({
        tenantId,
        direction: 'outbound',
        type: validatedData.type,
        from: '', // Será preenchido pelo adaptador da Meta
        to: validatedData.to,
        content: validatedData.content,
      });

      // 3. Busca ou cria conversa
      let conversation = await this.conversationRepository.findByPhoneNumber(
        validatedData.to,
        tenantId,
      );

      if (!conversation) {
        conversation = Conversation.create({
          tenantId,
          phoneNumber: validatedData.to,
        });
        await this.conversationRepository.save(conversation);
        logger.info('Nova conversa criada', { conversationId: conversation.id });
      }

      // 4. Associa mensagem à conversa
      (message as any).props.conversationId = conversation.id;

      // 5. Salva mensagem no banco (status pending)
      await this.messageRepository.save(message);
      logger.info('Mensagem salva no banco', { messageId: message.id });

      // 6. Envia para a Meta API
      let metaResponse;
      try {
        metaResponse = await this.metaApiAdapter.sendMessage(
          validatedData,
          tenantId,
        );
      } catch (error) {
        // Em caso de erro na Meta, marca mensagem como falha
        message.markAsFailed(error instanceof Error ? error.message : 'Erro desconhecido');
        await this.messageRepository.update(message);
        throw error;
      }

      // 7. Atualiza mensagem com dados da Meta
      if (metaResponse && metaResponse.messages && metaResponse.messages[0]) {
        message.markAsSent(metaResponse.messages[0].id);
      }
      await this.messageRepository.update(message);

      // 8. Atualiza conversa
      conversation.updateWithMessage(message);
      await this.conversationRepository.update(conversation);

      logger.info('Mensagem enviada com sucesso', {
        messageId: message.id,
        metaMessageId: message.metaMessageId,
      });

      // 9. Retorna resultado
      return {
        success: true,
        messageId: message.id,
        metaMessageId: message.metaMessageId,
        status: message.status,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Erro ao enviar mensagem:', {
      error,
    });

      if (error instanceof z.ZodError) {
        // validation failure from Zod schema
        throw new ValidationError('Dados inválidos', error.errors || []);
      }

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new Error(`Falha ao enviar mensagem: ${error}`);
    }
  }
}