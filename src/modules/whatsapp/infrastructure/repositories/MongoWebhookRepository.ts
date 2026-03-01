/**
 * Implementação do repositório de webhooks usando MongoDB
 */

import { IWebhookRepository, RawWebhookPayload } from '../../application/ports/IWebhookRepository';
import { WebhookModel, IWebhookDocument } from '../models/WebhookModel';
import logger from '@/shared/logger';

export class MongoWebhookRepository implements IWebhookRepository {

    /**
     * Converte documento do MongoDB para formato do repositório
     */
    private toDomain(doc: IWebhookDocument): RawWebhookPayload {
        return {
        id: doc.id,
        tenantId: doc.tenantId,
        payload: doc.payload,
        signature: doc.signature,
        processed: doc.processed,
        processedAt: doc.processedAt,
        error: doc.error,
        metadata: doc.metadata,
        createdAt: doc.createdAt,
        };
    }

    async saveRaw(payload: any, tenantId: string, signature?: string): Promise<RawWebhookPayload> {
        try {
        const doc = new WebhookModel({
            tenantId,
            payload,
            signature,
            processed: false,
            metadata: {
            receivedAt: new Date().toISOString(),
            contentType: 'application/json',
            },
            createdAt: new Date(),
        });

        await doc.save();
        
        logger.debug('Webhook bruto salvo', { 
            webhookId: doc.id, 
            tenantId 
        });

        return this.toDomain(doc);
        } catch (error) {
        logger.error('Erro ao salvar webhook bruto:', {
            error,
        });
        throw error;
        }
    }

  async findById(id: string): Promise<RawWebhookPayload | null> {
    try {
      const doc = await WebhookModel.findOne({ id });
      return doc ? this.toDomain(doc) : null;
    } catch (error) {
      logger.error('Erro ao buscar webhook por ID:', {
        error,
        });
      throw error;
    }
  }

  async list(
    filters: {
      tenantId?: string;
      processed?: boolean;
      startDate?: Date;
      endDate?: Date;
    },
    page: number,
    limit: number
  ): Promise<{
    data: RawWebhookPayload[];
    total: number;
  }> {
    try {
      const query: any = {};

      if (filters.tenantId) {
        query.tenantId = filters.tenantId;
      }

      if (filters.processed !== undefined) {
        query.processed = filters.processed;
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

      const skip = (page - 1) * limit;

      const [docs, total] = await Promise.all([
        WebhookModel.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        WebhookModel.countDocuments(query),
      ]);

      return {
        data: docs.map(doc => this.toDomain(doc)),
        total,
      };
    } catch (error) {
      logger.error('Erro ao listar webhooks:', {
        error,
        });
      throw error;
    }
  }

  async markAsProcessed(id: string, error?: string): Promise<void> {
    try {
      await WebhookModel.findOneAndUpdate(
        { id },
        {
          $set: {
            processed: true,
            processedAt: new Date(),
            error: error,
          },
        }
      );

      logger.debug('Webhook marcado como processado', { webhookId: id });
    } catch (error) {
      logger.error('Erro ao marcar webhook como processado:', {
        error,
        });
      throw error;
    }
  }

  async findUnprocessed(limit: number = 100): Promise<RawWebhookPayload[]> {
    try {
      const docs = await (WebhookModel as any).findUnprocessed(limit);
      return docs.map((doc: IWebhookDocument) => this.toDomain(doc));
    } catch (error) {
      logger.error('Erro ao buscar webhooks não processados:', {
        error,
        });
      throw error;
    }
  }

  async deleteOldWebhooks(days: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await WebhookModel.deleteMany({
        createdAt: { $lt: cutoffDate },
        processed: true, // Só remove webhooks já processados
      });

      logger.info('Webhooks antigos removidos', { count: result.deletedCount });
      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Erro ao remover webhooks antigos:', {
        error,
        });
      throw error;
    }
  }

   async countByPeriod(tenantId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      return await WebhookModel.countDocuments({
        tenantId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });
    } catch (error) {
      logger.error('Erro ao contar webhooks por período:', {
        error,
        });
      throw error;
    }
  }

}