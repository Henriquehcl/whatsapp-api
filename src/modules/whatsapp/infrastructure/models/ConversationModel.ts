/**
 * Modelo Mongoose para Conversas
 * Define schema e indices para colecao de conversas
 */

import mongoose, { Document, Schema } from 'mongoose';

interface ILastMessage {
  messageId: string;
  content: string;
  timestamp: Date;
  direction: 'inbound' | 'outbound';
}

export interface IConversationDocument extends Document {
  id: string;
  tenantId: string;
  phoneNumber: string;
  contactName?: string;
  status: 'active' | 'archived' | 'blocked';
  lastMessage?: ILastMessage;
  unreadCount: number;
  metadata?: Record<string, any>;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LastMessageSchema = new Schema<ILastMessage>(
  {
    messageId: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, required: true },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },
  },
  { _id: false },
);

const ConversationSchema = new Schema<IConversationDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    contactName: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'blocked'],
      required: true,
      default: 'active',
      index: true,
    },
    lastMessage: {
      type: LastMessageSchema,
      required: false,
    },
    unreadCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
    },
    lastActivityAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'conversations',
    versionKey: '__v',
  },
);

ConversationSchema.index({ tenantId: 1, phoneNumber: 1 }, { unique: true });
ConversationSchema.index({ tenantId: 1, status: 1, lastActivityAt: -1 });
ConversationSchema.index({ tenantId: 1, unreadCount: -1 });

ConversationSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const r = ret as any;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const ConversationModel = mongoose.model<IConversationDocument>(
  'Conversation',
  ConversationSchema,
);

