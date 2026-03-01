//src/modules/whatsapp/application/use-cases/ProcessWebhookUseCase.ts

/**
 * Caso de uso para processamento de webhooks da Meta
 * Processa eventos recebidos da WhatsApp Cloud API
 */

import { IMessageRepository } from '../ports/IMessageRepository';
import { IConversationRepository } from '../ports/IConversationRepository';
import { IWebhookRepository } from '../ports/IWebhookRepository';
import { Message } from '../../domain/entities/Message';
import { Conversation } from '../../domain/entities/Conversation';
import logger from '@/shared/logger';

// Interface para payload do webhook
export interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<any>;
        statuses?: Array<any>;
      };
      field: string;
    }>;
  }>;
}

// Interface para resultado do processamento
export interface WebhookProcessResult {
  processed: boolean;
  messageCount: number;
  statusCount: number;
  errors: Array<{ type: string; error: string }>;
}

export class ProcessWebhookUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly conversationRepository: IConversationRepository,
    private readonly webhookRepository: IWebhookRepository,
  ) {}

  /**
   * Executa o processamento do webhook
   */
  async execute(
    payload: WebhookPayload,
    tenantId: string,
    signature?: string,
  ): Promise<WebhookProcessResult> {
    const result: WebhookProcessResult = {
      processed: true,
      messageCount: 0,
      statusCount: 0,
      errors: [],
    };

    try {
      // 1. Salva payload bruto para auditoria
      await this.webhookRepository.saveRaw(payload, tenantId, signature);

      logger.info('Processando webhook da Meta', {
        tenantId,
        object: payload.object,
        entryCount: payload.entry?.length,
      });

      // 2. Processa cada entrada
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;

          // 3. Processa mensagens recebidas
          if (value.messages && value.messages.length > 0) {
            await this.processIncomingMessages(value, tenantId);
            result.messageCount += value.messages.length;
          }

          // 4. Processa atualizações de status
          if (value.statuses && value.statuses.length > 0) {
            await this.processStatusUpdates(value.statuses, tenantId);
            result.statusCount += value.statuses.length;
          }
        }
      }

      logger.info('Webhook processado com sucesso', result);
      return result;
    } catch (error) {
      logger.error('Erro ao processar webhook:', {
      error,
    });
      result.processed = false;
      result.errors.push({
        type: 'processing_error',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return result;
    }
  }

  /**
   * Processa mensagens recebidas
   */
  private async processIncomingMessages(
    value: any,
    tenantId: string,
  ): Promise<void> {
    for (const msg of value.messages) {
      try {
        // 1. Verifica se mensagem já existe
        const existingMessage = await this.messageRepository.findByMetaMessageId(
          msg.id,
        );

        if (existingMessage) {
          logger.debug('Mensagem já processada', { metaMessageId: msg.id });
          continue;
        }

        // 2. Obtém informações do contato
        const contact = value.contacts?.[0];
        const fromNumber = msg.from;
        const contactName = contact?.profile?.name;

        // 3. Busca ou cria conversa
        let conversation = await this.conversationRepository.findByPhoneNumber(
          fromNumber,
          tenantId,
        );

        if (!conversation) {
          conversation = Conversation.create({
            tenantId,
            phoneNumber: fromNumber,
            contactName,
          });
          await this.conversationRepository.save(conversation);
        } else if (contactName && conversation.contactName !== contactName) {
          conversation.updateContactName(contactName);
          await this.conversationRepository.update(conversation);
        }

        // 4. Cria mensagem recebida
        const message = Message.create({
          tenantId,
          conversationId: conversation.id,
          direction: 'inbound',
          type: this.mapMessageType(msg.type),
          from: fromNumber,
          to: value.metadata.phone_number_id,
          content: this.extractMessageContent(msg),
          metaMessageId: msg.id,
        });

        // 5. Marca como entregue se tiver status
        if (msg.status === 'delivered') {
          message.markAsDelivered();
        }

        // 6. Salva mensagem
        await this.messageRepository.save(message);

        // 7. Atualiza conversa
        conversation.updateWithMessage(message);
        await this.conversationRepository.update(conversation);

        logger.info('Mensagem recebida processada', {
          messageId: message.id,
          from: fromNumber,
          type: msg.type,
        });
      } catch (error) {
        logger.error('Erro ao processar mensagem recebida:', {
      error,
    });
      }
    }
  }

  /**
   * Processa atualizações de status
   */
  private async processStatusUpdates(
    statuses: any[],
    tenantId: string,
  ): Promise<void> {
    for (const status of statuses) {
      try {
        // 1. Busca mensagem pelo ID da Meta
        const message = await this.messageRepository.findByMetaMessageId(
          status.id,
        );

        if (!message) {
          logger.warn('Mensagem não encontrada para atualização de status', {
            metaMessageId: status.id,
          });
          continue;
        }

        // 2. Atualiza status
        message.updateStatusFromMeta(status);
        await this.messageRepository.update(message);

        // 3. Se for uma mensagem enviada, atualiza conversa
        if (status.status === 'delivered' || status.status === 'read') {
          const conversation = await this.conversationRepository.findById(
            message.conversationId!,
          );
          if (conversation) {
            // Atualiza último contato se necessário
            conversation.updateWithMessage(message);
            await this.conversationRepository.update(conversation);
          }
        }

        logger.debug('Status de mensagem atualizado', {
          messageId: message.id,
          status: status.status,
        });
      } catch (error) {
        logger.error('Erro ao processar atualização de status:', {
      error,
    });
      }
    }
  }

  /**
   * Mapeia tipo de mensagem da Meta para tipo interno
   */
  private mapMessageType(metaType: string): any {
    const typeMap: Record<string, any> = {
      text: 'text',
      image: 'image',
      audio: 'audio',
      video: 'video',
      document: 'document',
      interactive: 'interactive',
      contacts: 'contacts',
      location: 'location',
    };
    return typeMap[metaType] || 'unknown';
  }

  /**
   * Extrai conteúdo da mensagem baseado no tipo
   */
  private extractMessageContent(msg: any): any {
    switch (msg.type) {
      case 'text':
        return { body: msg.text.body };
      case 'image':
        return {
          link: msg.image.link,
          caption: msg.image.caption,
          mime_type: msg.image.mime_type,
        };
      case 'audio':
      case 'video':
      case 'document':
        return {
          link: msg[msg.type]?.link,
          filename: msg[msg.type]?.filename,
          mime_type: msg[msg.type]?.mime_type,
        };
      default:
        return msg;
    }
  }
}