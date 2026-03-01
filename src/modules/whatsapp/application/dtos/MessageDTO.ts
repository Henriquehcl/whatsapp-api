/**
 * Data Transfer Objects para Mensagens
 * Define contratos para entrada e saída de dados
 */

import { z } from 'zod';

// Schema para validação de mensagem de texto
export const TextMessageSchema = z.object({
  type: z.literal('text'),
  to: z.string().regex(/^\d+$/, 'Número deve conter apenas dígitos'),
  content: z.object({
    body: z.string().min(1, 'Corpo da mensagem é obrigatório').max(4096),
    preview_url: z.boolean().optional().default(false),
  }),
});

// Schema para validação de template
export const TemplateMessageSchema = z.object({
  type: z.literal('template'),
  to: z.string().regex(/^\d+$/, 'Número deve conter apenas dígitos'),
  content: z.object({
    name: z.string().min(1, 'Nome do template é obrigatório'),
    language: z.object({
      code: z.string().length(2, 'Código do idioma deve ter 2 caracteres'),
    }),
    components: z
      .array(
        z.object({
          type: z.enum(['header', 'body', 'button']),
          parameters: z.array(
            z.object({
              type: z.enum(['text', 'currency', 'date_time', 'image', 'document', 'video']),
              text: z.string().optional(),
              currency: z.any().optional(),
              date_time: z.any().optional(),
              image: z.object({ link: z.string().url() }).optional(),
              document: z.object({ link: z.string().url() }).optional(),
              video: z.object({ link: z.string().url() }).optional(),
            })
          ),
        })
      )
      .optional(),
  }),
});

// Schema para validação de mensagem com imagem
export const ImageMessageSchema = z.object({
  type: z.literal('image'),
  to: z.string().regex(/^\d+$/, 'Número deve conter apenas dígitos'),
  content: z.object({
    link: z.string().url('URL inválida'),
    caption: z.string().max(1024).optional(),
  }),
});

// Union de todos os schemas de mensagem
export const SendMessageSchema = z.discriminatedUnion('type', [
  TextMessageSchema,
  TemplateMessageSchema,
  ImageMessageSchema,
]);

// Tipo inferido do schema
export type SendMessageDTO = z.infer<typeof SendMessageSchema>;

// DTO para resposta de envio de mensagem
export interface SendMessageResponseDTO {
  id: string;
  status: string;
  metaMessageId?: string;
  timestamp: Date;
}

// DTO para filtros de listagem de mensagens
export interface ListMessagesDTO {
  conversationId?: string;
  phoneNumber?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// DTO para resposta de mensagem
export interface MessageResponseDTO {
  id: string;
  type: string;
  direction: string;
  status: string;
  from: string;
  to: string;
  content: any;
  metaMessageId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
}