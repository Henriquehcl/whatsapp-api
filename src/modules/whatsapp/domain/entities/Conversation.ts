/**
 * Entidade de domínio para Conversa
 * Representa uma conversa entre um usuário e o negócio
 */

import { v4 as uuidv4 } from 'uuid';

// Status da conversa
export type ConversationStatus = 'active' | 'archived' | 'blocked';

// Interface para último contato
export interface LastContact {
  messageId: string;
  content: string;
  timestamp: Date;
  direction: 'inbound' | 'outbound';
}

// Propriedades da entidade Conversation
export interface ConversationProps {
  id?: string;
  tenantId: string;
  phoneNumber: string;  // Número do contato
  contactName?: string;  // Nome do contato (se disponível)
  status: ConversationStatus;
  lastMessage?: LastContact;
  unreadCount: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  lastActivityAt?: Date;
}

export class Conversation {
  private props: ConversationProps;

  private constructor(props: ConversationProps) {
    this.props = props;
  }

  /**
   * Factory method para criar nova conversa
   */
  static create(props: Omit<ConversationProps, 'id' | 'createdAt' | 'updatedAt' | 'unreadCount' | 'status'>): Conversation {
    return new Conversation({
      ...props,
      id: uuidv4(),
      status: 'active',
      unreadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    });
  }

  /**
   * Reconstrói conversa existente
   */
  static rebuild(props: ConversationProps): Conversation {
    return new Conversation(props);
  }

  // Getters
  get id(): string {
    if (!this.props.id) throw new Error('Conversation ID não definido');
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get phoneNumber(): string {
    return this.props.phoneNumber;
  }

  get contactName(): string | undefined {
    return this.props.contactName;
  }

  get status(): ConversationStatus {
    return this.props.status;
  }

  get unreadCount(): number {
    return this.props.unreadCount;
  }

  get lastActivityAt(): Date {
    if (!this.props.lastActivityAt) throw new Error('lastActivityAt não definido');
    return this.props.lastActivityAt;
  }

  get createdAt(): Date {
    if (!this.props.createdAt) throw new Error('createdAt não definido');
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    if (!this.props.updatedAt) throw new Error('updatedAt não definido');
    return this.props.updatedAt;
  }

  /**
   * Atualiza a conversa com uma nova mensagem
   */
  updateWithMessage(message: any): void {
    this.props.lastMessage = {
      messageId: message.id,
      content: message.content.body || message.content.link || 'Mídia',
      timestamp: new Date(),
      direction: message.direction,
    };

    this.props.lastActivityAt = new Date();
    
    // Incrementa contador de não lidas se for mensagem recebida
    if (message.direction === 'inbound') {
      this.props.unreadCount += 1;
    }
    
    this.props.updatedAt = new Date();
  }

  /**
   * Marca conversa como lida
   */
  markAsRead(): void {
    this.props.unreadCount = 0;
    this.props.updatedAt = new Date();
  }

  /**
   * Arquiva conversa
   */
  archive(): void {
    this.props.status = 'archived';
    this.props.updatedAt = new Date();
  }

  /**
   * Ativa conversa arquivada
   */
  activate(): void {
    this.props.status = 'active';
    this.props.updatedAt = new Date();
  }

  /**
   * Bloqueia conversa
   */
  block(): void {
    this.props.status = 'blocked';
    this.props.updatedAt = new Date();
  }

  /**
   * Atualiza nome do contato
   */
  updateContactName(name: string): void {
    this.props.contactName = name;
    this.props.updatedAt = new Date();
  }

  /**
   * Converte para formato de persistência
   */
  toPersistence(): ConversationProps {
    return { ...this.props };
  }

  /**
   * Converte para formato de resposta da API
   */
  toResponse() {
    return {
      id: this.id,
      phoneNumber: this.phoneNumber,
      contactName: this.contactName,
      status: this.status,
      unreadCount: this.unreadCount,
      lastMessage: this.props.lastMessage,
      lastActivityAt: this.lastActivityAt,
      createdAt: this.props.createdAt,
    };
  }
}