/**
 * Interface do repositório de mensagens (Port)
 * Define o contrato que o repositório deve implementar
 */

import { Message } from '../../domain/entities/Message';

// Interface para filtros de busca
export interface MessageFilters {
  conversationId?: string;
  tenantId?: string;
  phoneNumber?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  direction?: 'inbound' | 'outbound';
}

// Interface para opções de paginação
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Interface do repositório
export interface IMessageRepository {
  /**
   * Salva uma nova mensagem
   */
  save(message: Message): Promise<Message>;

  /**
   * Atualiza uma mensagem existente
   */
  update(message: Message): Promise<Message>;

  /**
   * Busca mensagem por ID
   */
  findById(id: string): Promise<Message | null>;

  /**
   * Busca mensagem por ID da Meta
   */
  findByMetaMessageId(metaMessageId: string): Promise<Message | null>;

  /**
   * Lista mensagens com filtros e paginação
   */
  list(filters: MessageFilters, pagination: PaginationOptions): Promise<{
    data: Message[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * Busca mensagens de uma conversa
   */
  findByConversationId(
    conversationId: string,
    pagination: PaginationOptions
  ): Promise<{
    data: Message[];
    total: number;
  }>;

  /**
   * Busca mensagens de um número de telefone
   */
  findByPhoneNumber(
    phoneNumber: string,
    tenantId: string,
    pagination: PaginationOptions
  ): Promise<{
    data: Message[];
    total: number;
  }>;

  /**
   * Atualiza status de mensagens pendentes
   */
  updatePendingMessages(): Promise<void>;

  /**
   * Conta mensagens em um período
   */
  countMessages(filters: MessageFilters): Promise<number>;

  /**
   * Remove mensagens antigas (para compliance)
   */
  deleteOldMessages(days: number): Promise<number>;
}