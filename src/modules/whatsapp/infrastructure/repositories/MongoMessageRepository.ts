/**
 * Implementação do repositório de mensagens usando MongoDB
 */

import {
  IMessageRepository,
  MessageFilters,
  PaginationOptions,
} from '../../application/ports/IMessageRepository';
import { Message } from '../../domain/entities/Message';
import { MessageModel, IMessageDocument } from '../models/MessageModel';
import { NotFoundError } from '@/shared/errors/AppError';
import logger from '@/shared/logger';

export class MongoMessageRepository implements IMessageRepository {
  /**
   * Converte documento do MongoDB para entidade Message
   */
  private toEntity(doc: IMessageDocument): Message {
    // Helpers to safely map raw DB strings to domain union types
    const mapToMessageType = (t: string): import('../../domain/entities/Message').MessageType => {
      const allowed = ['text', 'template', 'image', 'audio', 'video', 'document'];
      return (allowed.includes(t) ? t : 'text') as import('../../domain/entities/Message').MessageType;
    };

    const mapToMessageStatus = (s: string): import('../../domain/entities/Message').MessageStatus => {
      const allowed = ['pending', 'sent', 'delivered', 'read', 'failed', 'deleted'];
      return (allowed.includes(s) ? s : 'pending') as import('../../domain/entities/Message').MessageStatus;
    };

    return Message.rebuild({
      id: doc.id,
      tenantId: doc.tenantId,
      conversationId: doc.conversationId,
      direction: doc.direction as import('../../domain/entities/Message').MessageDirection,
      type: mapToMessageType(doc.type),
      status: mapToMessageStatus(doc.status),
      from: doc.from,
      to: doc.to,
      content: doc.content,
      metaMessageId: doc.metaMessageId,
      metaStatus: doc.metaStatus,
      metadata: doc.metadata,
      sentAt: doc.sentAt,
      deliveredAt: doc.deliveredAt,
      readAt: doc.readAt,
      failedAt: doc.failedAt,
      errorDetails: doc.errorDetails,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Converte entidade para formato de persistência
   */
  private toPersistence(message: Message): any {
    return message.toPersistence();
  }

  async save(message: Message): Promise<Message> {
    try {
      const data = this.toPersistence(message);
      const doc = new MessageModel(data);
      await doc.save();
      logger.debug('Mensagem salva no MongoDB', { messageId: message.id });
      return this.toEntity(doc);
    } catch (error) {
      logger.error('Erro ao salvar mensagem:', {
      error,
    });
      throw error;
    }
  }

  async update(message: Message): Promise<Message> {
    try {
      const data = this.toPersistence(message);
      const doc = await MessageModel.findOneAndUpdate(
        { id: message.id },
        { $set: data },
        { new: true, runValidators: true },
      );

      if (!doc) {
        throw new NotFoundError('Message', message.id);
      }

      logger.debug('Mensagem atualizada', { messageId: message.id });
      return this.toEntity(doc);
    } catch (error) {
      logger.error('Erro ao atualizar mensagem:', {
      error,
    });
      throw error;
    }
  }

  async findById(id: string): Promise<Message | null> {
    try {
      const doc = await MessageModel.findOne({ id });
      return doc ? this.toEntity(doc) : null;
    } catch (error) {
      logger.error('Erro ao buscar mensagem por ID:', {
      error,
    });
      throw error;
    }
  }

  async findByMetaMessageId(metaMessageId: string): Promise<Message | null> {
    try {
      const doc = await MessageModel.findOne({ metaMessageId });
      return doc ? this.toEntity(doc) : null;
    } catch (error) {
      logger.error('Erro ao buscar mensagem por metaMessageId:', {
      error,
    });
      throw error;
    }
  }

  async list(
    filters: MessageFilters,
    pagination: PaginationOptions,
  ): Promise<{ data: Message[]; total: number; page: number; limit: number }> {
    try {
      // Constrói query baseada nos filtros
      const query: any = {};

      if (filters.tenantId) {
        query.tenantId = filters.tenantId;
      }

      if (filters.conversationId) {
        query.conversationId = filters.conversationId;
      }

      if (filters.phoneNumber) {
        query.$or = [{ from: filters.phoneNumber }, { to: filters.phoneNumber }];
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.direction) {
        query.direction = filters.direction;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.createdAt.$lte = filters.endDate;
        }
      }

      // Calcula skip para paginação
      const skip = (pagination.page - 1) * pagination.limit;

      // Ordenação
      const sort: any = {};
      sort[pagination.sortBy || 'createdAt'] = pagination.sortOrder === 'asc' ? 1 : -1;

      // Executa consulta
      const [docs, total] = await Promise.all([
        MessageModel.find(query).sort(sort).skip(skip).limit(pagination.limit),
        MessageModel.countDocuments(query),
      ]);

      return {
        data: docs.map(doc => this.toEntity(doc)),
        total,
        page: pagination.page,
        limit: pagination.limit,
      };
    } catch (error) {
      logger.error('Erro ao listar mensagens:', {
      error,
    });
      throw error;
    }
  }

  async findByConversationId(
    conversationId: string,
    pagination: PaginationOptions,
  ): Promise<{ data: Message[]; total: number }> {
    try {
      const skip = (pagination.page - 1) * pagination.limit;
      const sort: any = {};
      sort[pagination.sortBy || 'createdAt'] = pagination.sortOrder === 'asc' ? 1 : -1;

      const [docs, total] = await Promise.all([
        MessageModel.find({ conversationId })
          .sort(sort)
          .skip(skip)
          .limit(pagination.limit),
        MessageModel.countDocuments({ conversationId }),
      ]);

      return {
        data: docs.map(doc => this.toEntity(doc)),
        total,
      };
    } catch (error) {
      logger.error('Erro ao buscar mensagens por conversa:', {
      error,
    });
      throw error;
    }
  }

  async findByPhoneNumber(
    phoneNumber: string,
    tenantId: string,
    pagination: PaginationOptions,
  ): Promise<{ data: Message[]; total: number }> {
    try {
      const skip = (pagination.page - 1) * pagination.limit;
      const sort: any = {};
      sort[pagination.sortBy || 'createdAt'] = pagination.sortOrder === 'asc' ? 1 : -1;

      const query = {
        tenantId,
        $or: [{ from: phoneNumber }, { to: phoneNumber }],
      };

      const [docs, total] = await Promise.all([
        MessageModel.find(query).sort(sort).skip(skip).limit(pagination.limit),
        MessageModel.countDocuments(query),
      ]);

      return {
        data: docs.map(doc => this.toEntity(doc)),
        total,
      };
    } catch (error) {
      logger.error('Erro ao buscar mensagens por telefone:', {
      error,
    });
      throw error;
    }
  }

  async updatePendingMessages(): Promise<void> {
    try {
      // Busca mensagens pendentes há mais de 5 minutos e marca como falha
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      await MessageModel.updateMany(
        {
          status: 'pending',
          createdAt: { $lt: fiveMinutesAgo },
        },
        {
          $set: {
            status: 'failed',
            errorDetails: 'Timeout no processamento',
            failedAt: new Date(),
          },
        },
      );

      logger.info('Mensagens pendentes atualizadas');
    } catch (error) {
      logger.error('Erro ao atualizar mensagens pendentes:', {
      error,
    });
      throw error;
    }
  }

  async countMessages(filters: MessageFilters): Promise<number> {
    try {
      const query: any = {};

      if (filters.tenantId) {
        query.tenantId = filters.tenantId;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.createdAt.$lte = filters.endDate;
        }
      }

      return await MessageModel.countDocuments(query);
    } catch (error) {
      logger.error('Erro ao contar mensagens:', {
      error,
    });
      throw error;
    }
  }

  async deleteOldMessages(days: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await MessageModel.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      logger.info('Mensagens antigas removidas', { count: result.deletedCount });
      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Erro ao remover mensagens antigas:', {
      error,
    });
      throw error;
    }
  }
}