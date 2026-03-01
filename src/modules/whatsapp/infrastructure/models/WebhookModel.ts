/**
 * Modelo Mongoose para Webhooks
 * Armazena payloads brutos recebidos da Meta para auditoria e rastreabilidade
 */

import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IWebhookDocument extends Document {
  id: string;
  tenantId: string;
  payload: any;
  signature?: string;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const WebhookSchema = new Schema<IWebhookDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: uuidv4,
      comment: 'UUID único do webhook para referência',
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
      comment: 'ID do tenant (multi-tenancy) - usado para isolar dados de diferentes clientes',
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
      comment: 'Payload bruto recebido da Meta Cloud API em formato JSON',
    },
    signature: {
      type: String,
      comment: 'Assinatura X-Hub-Signature-256 para verificação de integridade',
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
      comment: 'Indica se o webhook já foi processado pelo sistema',
    },
    processedAt: {
      type: Date,
      comment: 'Data e hora em que o webhook foi processado',
    },
    error: {
      type: String,
      comment: 'Mensagem de erro caso o processamento tenha falhado',
    },
    metadata: {
      type: Schema.Types.Mixed,
      comment: 'Metadados adicionais como IP de origem, headers, etc.',
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false, // Não precisamos de updatedAt para webhooks pois são imutáveis após criação
    },
    collection: 'webhooks',
    versionKey: false, // Remove o campo __v do Mongoose
  }
);

// Índices compostos para consultas comuns
WebhookSchema.index({ tenantId: 1, createdAt: -1 }); // Para listar webhooks por tenant em ordem cronológica
WebhookSchema.index({ processed: 1, createdAt: 1 }); // Para processamento de webhooks pendentes (jobs)
WebhookSchema.index({ tenantId: 1, processed: 1 }); // Para consultas de webhooks pendentes por tenant

// Índice TTL para remoção automática após 30 dias (GDPR/compliance)
// Webhooks serão automaticamente removidos após 30 dias para cumprir políticas de retenção de dados
WebhookSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 2592000, // 30 dias em segundos
  partialFilterExpression: { processed: true } // Só remove webhooks já processados
});

// Middleware pré-save para garantir que o payload seja sempre um objeto válido
WebhookSchema.pre('save', function(next) {
  try {
    // Garante que o payload é um objeto válido
    if (this.payload && typeof this.payload === 'string') {
      this.payload = JSON.parse(this.payload);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Método estático para buscar webhooks não processados
WebhookSchema.statics.findUnprocessed = function(limit: number = 100) {
  return this.find({ 
    processed: false,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Últimas 24h
  })
    .sort({ createdAt: 1 })
    .limit(limit);
};

// Configuração para serialização JSON
WebhookSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Configuração para serialização em objeto
WebhookSchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Exporta o modelo
export const WebhookModel = mongoose.model<IWebhookDocument>('Webhook', WebhookSchema);