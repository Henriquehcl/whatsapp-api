/**
 * Modelo Mongoose para Mensagens
 * Define schema e índices para coleção de mensagens
 */

import mongoose, { Schema, Document } from 'mongoose';

// Interface para documento do Mongoose
export interface IMessageDocument extends Document {
  id: string;
  tenantId: string;
  conversationId?: string;
  direction: 'inbound' | 'outbound';
  type: string;
  status: string;
  from: string;
  to: string;
  content: any;
  metaMessageId?: string;
  metaStatus?: any;
  metadata?: Record<string, any>;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  errorDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema da mensagem
const MessageSchema = new Schema<IMessageDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      comment: 'UUID da mensagem',
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
      comment: 'ID do tenant (multi-tenancy)',
    },
    conversationId: {
      type: String,
      index: true,
      comment: 'ID da conversa',
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
      index: true,
      comment: 'Direção da mensagem',
    },
    type: {
      type: String,
      enum: ['text', 'template', 'image', 'audio', 'video', 'document', 'interactive', 'unknown'],
      required: true,
      index: true,
      comment: 'Tipo da mensagem',
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'deleted'],
      required: true,
      default: 'pending',
      index: true,
      comment: 'Status atual da mensagem',
    },
    from: {
      type: String,
      required: true,
      index: true,
      comment: 'Número do remetente',
    },
    to: {
      type: String,
      required: true,
      index: true,
      comment: 'Número do destinatário',
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
      comment: 'Conteúdo da mensagem (varia por tipo)',
    },
    metaMessageId: {
      type: String,
      sparse: true,
      index: true,
      comment: 'ID da mensagem na Meta',
    },
    metaStatus: {
      type: Schema.Types.Mixed,
      comment: 'Status detalhado da Meta',
    },
    metadata: {
      type: Schema.Types.Mixed,
      comment: 'Metadados adicionais',
    },
    sentAt: {
      type: Date,
      comment: 'Data de envio',
    },
    deliveredAt: {
      type: Date,
      comment: 'Data de entrega',
    },
    readAt: {
      type: Date,
      comment: 'Data de leitura',
    },
    failedAt: {
      type: Date,
      comment: 'Data da falha',
    },
    errorDetails: {
      type: String,
      comment: 'Detalhes do erro em caso de falha',
    },
  },
  {
    timestamps: true, // Adiciona createdAt e updatedAt automaticamente
    collection: 'messages',
    versionKey: '__v',
  },
);

// Índices compostos para consultas comuns
MessageSchema.index({ tenantId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ tenantId: 1, from: 1, to: 1 });
MessageSchema.index({ status: 1, createdAt: 1 }); // Para processamento de mensagens pendentes

// Índice TTL para remoção automática de mensagens antigas (opcional)
// MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 dias

// Virtual para ID (já temos campo id)
MessageSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const r = ret as any;
    delete r._id;
    delete r.__v;
    return r;
  },
});

// Middleware pré-save para garantir id único
MessageSchema.pre('save', async function (next) {
  // Verifica se já existe mensagem com mesmo metaMessageId (se presente)
  if (this.metaMessageId) {
    const existing = await mongoose.model('Message').findOne({
      metaMessageId: this.metaMessageId,
    });
    if (existing && existing.id !== this.id) {
      throw new Error(`Mensagem com metaMessageId ${this.metaMessageId} já existe`);
    }
  }
  next();
});

// Exporta o modelo
export const MessageModel = mongoose.model<IMessageDocument>('Message', MessageSchema);