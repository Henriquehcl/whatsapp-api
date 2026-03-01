/**
 * Adaptador para integração com a Meta Cloud API
 * Isola a lógica de comunicação com a API externa
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { env } from '@/main/config/env';
import { ExternalServiceError } from '@/shared/errors/AppError';
import logger from '@/shared/logger';
import crypto from 'crypto';
import { IMetaApiAdapter } from './IMetaApiAdapter';

export class MetaApiAdapter implements IMetaApiAdapter {
  private api: AxiosInstance;
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly appSecret: string;

  constructor() {
    this.phoneNumberId = env.META_PHONE_NUMBER_ID;
    this.accessToken = env.META_ACCESS_TOKEN;
    this.appSecret = env.META_APP_SECRET;

    // Configuração do cliente HTTP
    this.api = axios.create({
      baseURL: env.META_API_URL,
      timeout: 30000, // 30 segundos
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    // Interceptors para logging
    this.api.interceptors.request.use((config) => {
      logger.debug('Meta API Request', {
        method: config.method,
        url: config.url,
        data: config.data,
      });
      return config;
    });

    this.api.interceptors.response.use(
      (response) => {
        logger.debug('Meta API Response', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error('Meta API Error', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      },
    );
  }

  /**
   * Envia mensagem via WhatsApp Cloud API
   */
  async sendMessage(message: any, tenantId: string): Promise<any> {
    try {
      // Constrói payload baseado no tipo de mensagem
      const payload = this.buildMessagePayload(message);

      // Adiciona metadados do tenant
      payload.messaging_product = 'whatsapp';
      payload.recipient_type = 'individual';

      // Envia para a API
      const response = await this.api.post(
        `/${this.phoneNumberId}/messages`,
        payload,
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new ExternalServiceError(
          'Meta WhatsApp API',
          error.response?.data?.error || error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Constrói payload específico para cada tipo de mensagem
   */
  private buildMessagePayload(message: any): any {
    const basePayload = {
      to: message.to,
      type: message.type,
    };

    switch (message.type) {
      case 'text':
        return {
          ...basePayload,
          text: {
            body: message.content.body,
            preview_url: message.content.preview_url || false,
          },
        };

      case 'template':
        return {
          ...basePayload,
          template: {
            name: message.content.name,
            language: message.content.language,
            components: message.content.components,
          },
        };

      case 'image':
        return {
          ...basePayload,
          image: {
            link: message.content.link,
            caption: message.content.caption,
          },
        };

      case 'audio':
        return {
          ...basePayload,
          audio: {
            link: message.content.link,
          },
        };

      case 'video':
        return {
          ...basePayload,
          video: {
            link: message.content.link,
            caption: message.content.caption,
          },
        };

      case 'document':
        return {
          ...basePayload,
          document: {
            link: message.content.link,
            caption: message.content.caption,
            filename: message.content.filename,
          },
        };

      default:
        throw new Error(`Tipo de mensagem não suportado: ${message.type}`);
    }
  }

  /**
   * Verifica assinatura do webhook
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.appSecret)
        .update(body)
        .digest('hex');

      // Formato esperado: sha256=hash
      const providedHash = signature.replace('sha256=', '');

      // Comparação segura para evitar timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(providedHash),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      logger.error('Erro ao verificar assinatura do webhook:', {
      error,
    });
      return false;
    }
  }

  /**
   * Marca mensagem como lida
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.api.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });
    } catch (error) {
      logger.error('Erro ao marcar mensagem como lida:', {
      error,
    });
      throw error;
    }
  }

  /**
   * Busca mídia pelo ID
   */
  async getMedia(mediaId: string): Promise<any> {
    try {
      const response = await this.api.get(`/${mediaId}`);
      return response.data;
    } catch (error) {
      logger.error('Erro ao buscar mídia:', {
      error,
    });
      throw error;
    }
  }

  /**
   * Download de mídia
   */
  async downloadMedia(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Erro ao fazer download de mídia:', {
      error,
    });
      throw error;
    }
  }

  /**
   * Verifica número de telefone
   */
  async verifyPhoneNumber(phoneNumber: string): Promise<boolean> {
    try {
      const response = await this.api.get(`/${phoneNumber}`);
      return response.data?.valid === true;
    } catch (error) {
      logger.error('Erro ao verificar número:', {
      error,
    });
      return false;
    }
  }
}