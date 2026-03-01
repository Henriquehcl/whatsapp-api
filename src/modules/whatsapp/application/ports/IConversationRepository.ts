/**
 * Interface do repositório de conversas (Port)
 * Define o contrato para operações com conversas
 */

import { Conversation } from '../../domain/entities/Conversation';

// Interface para filtros de conversas
export interface ConversationFilters {
  tenantId?: string;
  phoneNumber?: string;
  status?: 'active' | 'archived' | 'blocked';
  search?: string; // Busca por número ou nome
  startDate?: Date;
  endDate?: Date;
}

// Interface do repositório
export interface IConversationRepository {
  /**
   * Salva uma nova conversa
   */
  save(conversation: Conversation): Promise<Conversation>;

  /**
   * Atualiza uma conversa existente
   */
  update(conversation: Conversation): Promise<Conversation>;

  /**
   * Busca conversa por ID
   */
  findById(id: string): Promise<Conversation | null>;

  /**
   * Busca conversa por número de telefone
   */
  findByPhoneNumber(phoneNumber: string, tenantId: string): Promise<Conversation | null>;

  /**
   * Lista conversas com filtros e paginação
   */
  list(
    filters: ConversationFilters,
    page: number,
    limit: number
  ): Promise<{
    data: Conversation[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * Atualiza última atividade da conversa
   */
  updateLastActivity(id: string): Promise<void>;

  /**
   * Incrementa contador de mensagens não lidas
   */
  incrementUnreadCount(id: string): Promise<void>;

  /**
   * Reseta contador de mensagens não lidas
   */
  resetUnreadCount(id: string): Promise<void>;

  /**
   * Busca conversas ativas para processamento
   */
  findActiveConversations(tenantId?: string): Promise<Conversation[]>;

  /**
   * Conta conversas por status
   */
  countByStatus(tenantId: string): Promise<Record<string, number>>;
}