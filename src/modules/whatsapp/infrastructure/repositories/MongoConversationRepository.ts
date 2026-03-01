/**
 * Implementacao do repositorio de conversas usando MongoDB
 */

import {
  ConversationFilters,
  IConversationRepository,
} from '../../application/ports/IConversationRepository';
import { Conversation } from '../../domain/entities/Conversation';
import {
  ConversationModel,
  IConversationDocument,
} from '../models/ConversationModel';
import { NotFoundError } from '@/shared/errors/AppError';
import logger from '@/shared/logger';

export class MongoConversationRepository implements IConversationRepository {
  private toEntity(doc: IConversationDocument): Conversation {
    return Conversation.rebuild({
      id: doc.id,
      tenantId: doc.tenantId,
      phoneNumber: doc.phoneNumber,
      contactName: doc.contactName,
      status: doc.status,
      lastMessage: doc.lastMessage,
      unreadCount: doc.unreadCount,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      lastActivityAt: doc.lastActivityAt,
    });
  }

  private toPersistence(conversation: Conversation): Record<string, any> {
    return conversation.toPersistence();
  }

  async save(conversation: Conversation): Promise<Conversation> {
    try {
      const doc = new ConversationModel(this.toPersistence(conversation));
      await doc.save();
      return this.toEntity(doc);
    } catch (error) {
      logger.error('Erro ao salvar conversa:', { error });
      throw error;
    }
  }

  async update(conversation: Conversation): Promise<Conversation> {
    try {
      const doc = await ConversationModel.findOneAndUpdate(
        { id: conversation.id },
        { $set: this.toPersistence(conversation) },
        { new: true, runValidators: true },
      );

      if (!doc) {
        throw new NotFoundError('Conversa', conversation.id);
      }

      return this.toEntity(doc);
    } catch (error) {
      logger.error('Erro ao atualizar conversa:', { error });
      throw error;
    }
  }

  async findById(id: string): Promise<Conversation | null> {
    try {
      const doc = await ConversationModel.findOne({ id });
      return doc ? this.toEntity(doc) : null;
    } catch (error) {
      logger.error('Erro ao buscar conversa por ID:', { error });
      throw error;
    }
  }

  async findByPhoneNumber(
    phoneNumber: string,
    tenantId: string,
  ): Promise<Conversation | null> {
    try {
      const doc = await ConversationModel.findOne({ phoneNumber, tenantId });
      return doc ? this.toEntity(doc) : null;
    } catch (error) {
      logger.error('Erro ao buscar conversa por telefone:', { error });
      throw error;
    }
  }

  async list(
    filters: ConversationFilters,
    page: number,
    limit: number,
  ): Promise<{ data: Conversation[]; total: number; page: number; limit: number }> {
    try {
      const query: Record<string, any> = {};

      if (filters.tenantId) query.tenantId = filters.tenantId;
      if (filters.phoneNumber) query.phoneNumber = filters.phoneNumber;
      if (filters.status) query.status = filters.status;

      if (filters.search) {
        query.$or = [
          { phoneNumber: { $regex: filters.search, $options: 'i' } },
          { contactName: { $regex: filters.search, $options: 'i' } },
        ];
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }

      const skip = (page - 1) * limit;

      const [docs, total] = await Promise.all([
        ConversationModel.find(query)
          .sort({ lastActivityAt: -1 })
          .skip(skip)
          .limit(limit),
        ConversationModel.countDocuments(query),
      ]);

      return {
        data: docs.map((doc) => this.toEntity(doc)),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Erro ao listar conversas:', { error });
      throw error;
    }
  }

  async updateLastActivity(id: string): Promise<void> {
    try {
      await ConversationModel.findOneAndUpdate(
        { id },
        { $set: { lastActivityAt: new Date() } },
      );
    } catch (error) {
      logger.error('Erro ao atualizar ultima atividade:', { error });
      throw error;
    }
  }

  async incrementUnreadCount(id: string): Promise<void> {
    try {
      await ConversationModel.findOneAndUpdate(
        { id },
        {
          $inc: { unreadCount: 1 },
          $set: { lastActivityAt: new Date() },
        },
      );
    } catch (error) {
      logger.error('Erro ao incrementar nao lidas:', { error });
      throw error;
    }
  }

  async resetUnreadCount(id: string): Promise<void> {
    try {
      await ConversationModel.findOneAndUpdate(
        { id },
        { $set: { unreadCount: 0 } },
      );
    } catch (error) {
      logger.error('Erro ao resetar nao lidas:', { error });
      throw error;
    }
  }

  async findActiveConversations(tenantId?: string): Promise<Conversation[]> {
    try {
      const query: Record<string, any> = { status: 'active' };
      if (tenantId) query.tenantId = tenantId;

      const docs = await ConversationModel.find(query).sort({ lastActivityAt: -1 });
      return docs.map((doc) => this.toEntity(doc));
    } catch (error) {
      logger.error('Erro ao buscar conversas ativas:', { error });
      throw error;
    }
  }

  async countByStatus(tenantId: string): Promise<Record<string, number>> {
    try {
      const grouped = await ConversationModel.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const counts: Record<string, number> = {
        active: 0,
        archived: 0,
        blocked: 0,
      };

      for (const row of grouped) {
        counts[row._id] = row.count;
      }

      return counts;
    } catch (error) {
      logger.error('Erro ao contar conversas por status:', { error });
      throw error;
    }
  }
}

