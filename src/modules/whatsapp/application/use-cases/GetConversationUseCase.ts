/**
 * Caso de uso para buscar conversa e seu histórico de mensagens
 * Recupera uma conversa específica com paginação de mensagens
 */

import { IMessageRepository } from '../ports/IMessageRepository';
import { IConversationRepository } from '../ports/IConversationRepository';
import { Message } from '../../domain/entities/Message';
import { Conversation } from '../../domain/entities/Conversation';
import { NotFoundError, ValidationError } from '@/shared/errors/AppError';
import logger from '@/shared/logger';

// Interface para os parâmetros de entrada
export interface GetConversationDTO {
  phoneNumber: string;
  tenantId: string;
  page?: number;
  limit?: number;
  includeArchived?: boolean;
}

// Interface para mensagem no histórico
export interface HistoricalMessage {
  id: string;
  type: string;
  direction: 'inbound' | 'outbound';
  status: string;
  content: any;
  metaMessageId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

// Interface para o resultado da conversa
export interface ConversationResult {
  conversation: {
    id: string;
    phoneNumber: string;
    contactName?: string;
    status: string;
    unreadCount: number;
    lastActivityAt: Date;
    createdAt: Date;
  };
  messages: HistoricalMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class GetConversationUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly conversationRepository: IConversationRepository,
  ) {}

  /**
   * Executa o caso de uso para buscar uma conversa
   */
  async execute(dto: GetConversationDTO): Promise<ConversationResult> {
    try {
      // 1. Validação dos parâmetros
      this.validateInput(dto);

      const { phoneNumber, tenantId, page = 1, limit = 50, includeArchived = false } = dto;

      logger.info('Buscando conversa', { 
        tenantId, 
        phoneNumber, 
        page, 
        limit 
      });

      // 2. Busca a conversa pelo número de telefone
      let conversation = await this.conversationRepository.findByPhoneNumber(
        phoneNumber,
        tenantId,
      );

      // 3. Se não encontrar e não for para incluir arquivadas, retorna erro
      if (!conversation) {
        logger.warn('Conversa não encontrada', { tenantId, phoneNumber });
        throw new NotFoundError('Conversa', phoneNumber);
      }

      // 4. Verifica status da conversa
      if (conversation.status === 'blocked') {
        throw new ValidationError('Esta conversa está bloqueada');
      }

      if (conversation.status === 'archived' && !includeArchived) {
        throw new ValidationError('Esta conversa está arquivada. Use includeArchived=true para acessá-la');
      }

      // 5. Busca o histórico de mensagens da conversa
      const messagesResult = await this.messageRepository.findByConversationId(
        conversation.id,
        { page, limit, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      // 6. Converte mensagens para formato de resposta
      const messages = messagesResult.data.map((msg: Message) => ({
        id: msg.id,
        type: msg.type,
        direction: msg.direction,
        status: msg.status,
        content: msg.content,
        metaMessageId: msg.metaMessageId,
        sentAt: msg['props'].sentAt,
        deliveredAt: msg['props'].deliveredAt,
        readAt: msg['props'].readAt,
        createdAt: msg.createdAt,
      }));

      // 7. Calcula total de páginas
      const totalPages = Math.ceil(messagesResult.total / limit);

      // 8. Prepara resultado
      const result: ConversationResult = {
        conversation: {
          id: conversation.id,
          phoneNumber: conversation.phoneNumber,
          contactName: conversation.contactName,
          status: conversation.status,
          unreadCount: conversation.unreadCount,
          lastActivityAt: conversation.lastActivityAt,
          createdAt: conversation.createdAt,
        },
        messages,
        total: messagesResult.total,
        page,
        limit,
        totalPages,
      };

      // 9. Se solicitado, marca mensagens como lidas
      if (page === 1) {
        await this.markConversationAsRead(conversation);
      }

      logger.info('Conversa recuperada com sucesso', {
        conversationId: conversation.id,
        messageCount: messages.length,
        totalMessages: messagesResult.total,
      });

      return result;
    } catch (error) {
      logger.error('Erro ao buscar conversa:', {
      error,
    });
      throw error;
    }
  }

  /**
   * Valida os dados de entrada
   */
  private validateInput(dto: GetConversationDTO): void {
    const { phoneNumber, tenantId, page, limit } = dto;

    if (!phoneNumber || phoneNumber.trim().length === 0) {
      throw new ValidationError('Número de telefone é obrigatório');
    }

    if (!/^\d+$/.test(phoneNumber)) {
      throw new ValidationError('Número de telefone deve conter apenas dígitos');
    }

    if (phoneNumber.length < 10 || phoneNumber.length > 15) {
      throw new ValidationError('Número de telefone deve ter entre 10 e 15 dígitos');
    }

    if (!tenantId) {
      throw new ValidationError('Tenant ID é obrigatório');
    }

    if (page && (page < 1 || !Number.isInteger(page))) {
      throw new ValidationError('Página deve ser um número inteiro positivo');
    }

    if (limit && (limit < 1 || limit > 100)) {
      throw new ValidationError('Limite deve estar entre 1 e 100');
    }
  }

  /**
   * Marca conversa como lida (zera contador de não lidas)
   */
  private async markConversationAsRead(conversation: Conversation): Promise<void> {
    try {
      if (conversation.unreadCount > 0) {
        conversation.markAsRead();
        await this.conversationRepository.update(conversation);
        
        logger.debug('Conversa marcada como lida', {
          conversationId: conversation.id,
          previousUnread: conversation.unreadCount,
        });
      }
    } catch (error) {
      // Não falha a requisição principal se não conseguir marcar como lida
      logger.error('Erro ao marcar conversa como lida:', {
      error,
    });
    }
  }

  /**
   * Busca conversa por ID (método auxiliar)
   */
  async findById(id: string, tenantId: string): Promise<Conversation | null> {
    try {
      const conversation = await this.conversationRepository.findById(id);
      
      if (conversation && conversation.tenantId !== tenantId) {
        throw new ValidationError('Conversa não pertence ao tenant informado');
      }
      
      return conversation;
    } catch (error) {
      logger.error('Erro ao buscar conversa por ID:', {
      error,
    });
      throw error;
    }
  }

  /**
   * Lista todas as conversas de um tenant (método auxiliar)
   */
  async listByTenant(
    tenantId: string,
    filters: {
      status?: 'active' | 'archived' | 'blocked';
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    data: Conversation[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { status, search, page = 1, limit = 20 } = filters;

      const result = await this.conversationRepository.list(
        {
          tenantId,
          status,
          search,
        },
        page,
        limit
      );

      return {
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error) {
      logger.error('Erro ao listar conversas do tenant:', {
      error,
    });
      throw error;
    }
  }

  /**
   * Obtém estatísticas de conversas
   */
  async getConversationStats(tenantId: string): Promise<{
    total: number;
    active: number;
    archived: number;
    blocked: number;
    unreadTotal: number;
  }> {
    try {
      const [total, active, archived, blocked] = await Promise.all([
        this.conversationRepository.countByStatus(tenantId).then(counts => 
          Object.values(counts).reduce((a, b) => a + b, 0)
        ),
        this.conversationRepository.countByStatus(tenantId).then(counts => counts['active'] || 0),
        this.conversationRepository.countByStatus(tenantId).then(counts => counts['archived'] || 0),
        this.conversationRepository.countByStatus(tenantId).then(counts => counts['blocked'] || 0),
      ]);

      // Busca todas as conversas ativas para somar não lidas
      const activeConversations = await this.conversationRepository.findActiveConversations(tenantId);
      const unreadTotal = activeConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

      return {
        total,
        active,
        archived,
        blocked,
        unreadTotal,
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de conversas:', {
        error,
        });
      throw error;
    }
  }
}