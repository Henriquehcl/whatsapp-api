/**
 * Entidade de domínio para Mensagem
 * Representa o núcleo do negócio, independente de infraestrutura
 */

import { v4 as uuidv4 } from 'uuid';

// Tipos de mensagem suportados
export type MessageType = 'text' | 'template' | 'image' | 'audio' | 'video' | 'document';

// Status possíveis da mensagem
export type MessageStatus = 
  | 'pending'    // Aguardando envio
  | 'sent'       // Enviada para Meta
  | 'delivered'  // Entregue ao dispositivo
  | 'read'       // Lida pelo usuário
  | 'failed'     // Falha no envio
  | 'deleted';   // Mensagem deletada

// Direção da mensagem
export type MessageDirection = 'outbound' | 'inbound';

// Interface para conteúdo de texto
export interface TextContent {
  body: string;
  preview_url?: boolean;
}

// Interface para conteúdo de template
export interface TemplateContent {
  name: string;
  language: {
    code: string;
  };
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters: Array<{
      type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
      text?: string;
      currency?: any;
      date_time?: any;
      image?: { link: string };
      document?: { link: string };
      video?: { link: string };
    }>;
  }>;
}

// Interface para conteúdo de mídia
export interface MediaContent {
  link: string;
  caption?: string;
  filename?: string;
  mime_type?: string;
}

// Propriedades da entidade Message
export interface MessageProps {
  id?: string;
  tenantId: string;
  conversationId?: string;
  direction: MessageDirection;
  type: MessageType;
  status: MessageStatus;
  from: string;  // Número do remetente
  to: string;    // Número do destinatário
  content: TextContent | TemplateContent | MediaContent;
  metaMessageId?: string;  // ID da mensagem na Meta
  metaStatus?: any;        // Status detalhado da Meta
  metadata?: Record<string, any>;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  errorDetails?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Message {
  private props: MessageProps;

  private constructor(props: MessageProps) {
    this.props = props;
  }

  /**
   * Factory method para criar nova mensagem
   */
  static create(props: Omit<MessageProps, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Message {
    return new Message({
      ...props,
      id: uuidv4(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Reconstrói mensagem existente (para repositórios)
   */
  static rebuild(props: MessageProps): Message {
    return new Message(props);
  }

  // Getters
  get id(): string {
    if (!this.props.id) throw new Error('Message ID não definido');
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get conversationId(): string | undefined {
    return this.props.conversationId;
  }

  get direction(): MessageDirection {
    return this.props.direction;
  }

  get type(): MessageType {
    return this.props.type;
  }

  get status(): MessageStatus {
    return this.props.status;
  }

  get from(): string {
    return this.props.from;
  }

  get to(): string {
    return this.props.to;
  }

  get content(): any {
    return this.props.content;
  }

  get metaMessageId(): string | undefined {
    return this.props.metaMessageId;
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
   * Marca mensagem como enviada
   */
  markAsSent(metaMessageId: string): void {
    this.props.status = 'sent';
    this.props.metaMessageId = metaMessageId;
    this.props.sentAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Marca mensagem como entregue
   */
  markAsDelivered(): void {
    this.props.status = 'delivered';
    this.props.deliveredAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Marca mensagem como lida
   */
  markAsRead(): void {
    this.props.status = 'read';
    this.props.readAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Marca mensagem como falha
   */
  markAsFailed(errorDetails: string): void {
    this.props.status = 'failed';
    this.props.failedAt = new Date();
    this.props.errorDetails = errorDetails;
    this.props.updatedAt = new Date();
  }

  /**
   * Atualiza status baseado no webhook da Meta
   */
  updateStatusFromMeta(metaStatus: any): void {
    this.props.metaStatus = metaStatus;
    
    // Mapeia status da Meta para status interno
    switch (metaStatus.status) {
      case 'sent':
        this.markAsSent(metaStatus.message_id);
        break;
      case 'delivered':
        this.markAsDelivered();
        break;
      case 'read':
        this.markAsRead();
        break;
      case 'failed':
        this.markAsFailed(metaStatus.errors?.[0]?.message || 'Erro desconhecido');
        break;
    }
  }

  /**
   * Converte para formato de persistência
   */
  toPersistence(): MessageProps {
    return { ...this.props };
  }

  /**
   * Converte para formato de resposta da API
   */
  toResponse() {
    return {
      id: this.id,
      type: this.type,
      direction: this.direction,
      status: this.status,
      from: this.from,
      to: this.to,
      content: this.content,
      metaMessageId: this.metaMessageId,
      sentAt: this.props.sentAt,
      deliveredAt: this.props.deliveredAt,
      readAt: this.props.readAt,
      createdAt: this.createdAt,
    };
  }
}