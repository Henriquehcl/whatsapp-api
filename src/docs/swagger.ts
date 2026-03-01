/**
 * Configuração da documentação Swagger (OpenAPI 3.0)
 * Gera documentação interativa da API
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { env } from '@/main/config/env';

// Opções do Swagger
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp Business API Platform',
      version: '1.0.0',
      description: `
        API profissional para integração com WhatsApp Business Platform (Meta Cloud API)
        
        ## Características
        - Envio de mensagens (texto, template, mídia)
        - Webhook para recebimento de eventos
        - Histórico de conversas
        - Multi-tenancy
        - Segurança com JWT
        - Rate limiting
        - Logs estruturados
      `,
      contact: {
        name: 'Suporte',
        email: 'suporte@exemplo.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Servidor de Desenvolvimento',
      },
      {
        url: 'https://api.exemplo.com',
        description: 'Servidor de Produção',
      },
    ],
    tags: [
      {
        name: 'Mensagens',
        description: 'Endpoints para envio e gerenciamento de mensagens',
      },
      {
        name: 'Conversas',
        description: 'Endpoints para gerenciamento de conversas',
      },
      {
        name: 'Webhook',
        description: 'Endpoints para configuração do webhook da Meta',
      },
      {
        name: 'Health',
        description: 'Endpoints de monitoramento',
      },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check da aplicacao',
          description: 'Retorna status basico da API.',
          security: [],
          responses: {
            '200': {
              description: 'Servico saudavel',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'healthy' },
                      timestamp: { type: 'string', format: 'date-time' },
                      uptime: { type: 'number', example: 123.45 },
                      environment: { type: 'string', example: 'development' },
                      memory: { type: 'object' },
                      version: { type: 'string', example: '1.0.0' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/webhook': {
        get: {
          tags: ['Webhook'],
          summary: 'Verificacao do webhook da Meta',
          description: 'Endpoint chamado pela Meta para validar o webhook.',
          security: [],
          parameters: [
            {
              in: 'query',
              name: 'hub.mode',
              schema: { type: 'string', example: 'subscribe' },
              required: true,
            },
            {
              in: 'query',
              name: 'hub.verify_token',
              schema: { type: 'string', example: 'meu_token' },
              required: true,
            },
            {
              in: 'query',
              name: 'hub.challenge',
              schema: { type: 'string', example: '123456' },
              required: true,
            },
          ],
          responses: {
            '200': {
              description: 'Webhook verificado com sucesso',
              content: {
                'text/plain': {
                  schema: { type: 'string', example: '123456' },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
          },
        },
        post: {
          tags: ['Webhook'],
          summary: 'Recebe eventos do webhook da Meta',
          description:
            'Recebe eventos de mensagens/status. O endpoint sempre retorna sucesso para evitar reentrega agressiva da Meta.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: true,
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Evento recebido e processado',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          received: { type: 'boolean', example: true },
                        },
                        additionalProperties: true,
                      },
                      timestamp: { type: 'string', format: 'date-time' },
                      path: { type: 'string', example: '/webhook' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/webhook/health': {
        get: {
          tags: ['Webhook'],
          summary: 'Health check do webhook',
          security: [],
          responses: {
            '200': {
              description: 'Webhook saudavel',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          status: { type: 'string', example: 'healthy' },
                          timestamp: { type: 'string', format: 'date-time' },
                          webhookUrl: { type: 'string', example: 'http://localhost:3000/api/v1/webhook' },
                        },
                      },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/messages': {
        post: {
          tags: ['Mensagens'],
          summary: 'Enviar mensagem',
          description: 'Envia mensagem de texto, template ou imagem.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SendMessageRequest',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Mensagem enviada com sucesso',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SendMessageResponse',
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/ValidationError',
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '429': {
              $ref: '#/components/responses/RateLimitError',
            },
          },
        },
        get: {
          tags: ['Mensagens'],
          summary: 'Listar mensagens',
          description: 'Endpoint em implementacao parcial no backend.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'conversationId', schema: { type: 'string' } },
            { in: 'query', name: 'phoneNumber', schema: { type: 'string' } },
            { in: 'query', name: 'status', schema: { type: 'string' } },
            { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date-time' } },
            { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date-time' } },
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, default: 50 } },
          ],
          responses: {
            '200': {
              description: 'Lista retornada',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { type: 'object', additionalProperties: true },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
          },
        },
      },
      '/api/v1/messages/{id}': {
        get: {
          tags: ['Mensagens'],
          summary: 'Buscar mensagem por id',
          description: 'Endpoint em implementacao parcial no backend.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Mensagem encontrada',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { type: 'object', additionalProperties: true },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '404': {
              $ref: '#/components/responses/NotFoundError',
            },
          },
        },
      },
      '/api/v1/conversations/{phone}': {
        get: {
          tags: ['Conversas'],
          summary: 'Buscar conversa por telefone',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'phone',
              required: true,
              schema: { type: 'string', pattern: '^\\d+$' },
              description: 'Numero do telefone contendo apenas digitos.',
            },
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, default: 50 } },
          ],
          responses: {
            '200': {
              description: 'Historico da conversa',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/PaginatedResponse',
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/ValidationError',
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insira seu token JWT no formato: Bearer <token>',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Erro de validação',
                },
                statusCode: {
                  type: 'number',
                  example: 400,
                },
                details: {
                  type: 'object',
                  example: {},
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        SendMessageRequest: {
          oneOf: [
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['text'],
                },
                to: {
                  type: 'string',
                  example: '5511999999999',
                  description: 'Número do destinatário (apenas dígitos)',
                },
                content: {
                  type: 'object',
                  properties: {
                    body: {
                      type: 'string',
                      example: 'Olá! Esta é uma mensagem de teste.',
                      maxLength: 4096,
                    },
                    preview_url: {
                      type: 'boolean',
                      example: false,
                    },
                  },
                  required: ['body'],
                },
              },
              required: ['type', 'to', 'content'],
            },
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['template'],
                },
                to: {
                  type: 'string',
                  example: '5511999999999',
                },
                content: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      example: 'hello_world',
                    },
                    language: {
                      type: 'object',
                      properties: {
                        code: {
                          type: 'string',
                          example: 'pt',
                        },
                      },
                    },
                    components: {
                      type: 'array',
                      items: {
                        type: 'object',
                      },
                    },
                  },
                  required: ['name', 'language'],
                },
              },
              required: ['type', 'to', 'content'],
            },
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['image'],
                },
                to: {
                  type: 'string',
                  example: '5511999999999',
                },
                content: {
                  type: 'object',
                  properties: {
                    link: {
                      type: 'string',
                      format: 'uri',
                      example: 'https://exemplo.com/imagem.jpg',
                    },
                    caption: {
                      type: 'string',
                      example: 'Descrição da imagem',
                    },
                  },
                  required: ['link'],
                },
              },
              required: ['type', 'to', 'content'],
            },
          ],
        },
        SendMessageResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: true,
                },
                messageId: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                metaMessageId: {
                  type: 'string',
                  example: 'wamid.HBgNNTUxMTk5OTk5OTk5ORUCABEYEjdDRjU2RkY5N0I5RkE5RkE5',
                },
                status: {
                  type: 'string',
                  example: 'sent',
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            type: {
              type: 'string',
              enum: ['text', 'template', 'image', 'audio', 'video', 'document'],
            },
            direction: {
              type: 'string',
              enum: ['inbound', 'outbound'],
            },
            status: {
              type: 'string',
              enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
            },
            from: {
              type: 'string',
              example: '5511999999999',
            },
            to: {
              type: 'string',
              example: '5511888888888',
            },
            content: {
              type: 'object',
            },
            metaMessageId: {
              type: 'string',
            },
            sentAt: {
              type: 'string',
              format: 'date-time',
            },
            deliveredAt: {
              type: 'string',
              format: 'date-time',
            },
            readAt: {
              type: 'string',
              format: 'date-time',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            phoneNumber: {
              type: 'string',
              example: '5511999999999',
            },
            contactName: {
              type: 'string',
              example: 'João Silva',
            },
            status: {
              type: 'string',
              enum: ['active', 'archived', 'blocked'],
            },
            unreadCount: {
              type: 'number',
              example: 3,
            },
            lastMessage: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                },
                direction: {
                  type: 'string',
                },
              },
            },
            lastActivityAt: {
              type: 'string',
              format: 'date-time',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                },
                meta: {
                  type: 'object',
                  properties: {
                    page: {
                      type: 'number',
                      example: 1,
                    },
                    limit: {
                      type: 'number',
                      example: 50,
                    },
                    total: {
                      type: 'number',
                      example: 100,
                    },
                    totalPages: {
                      type: 'number',
                      example: 2,
                    },
                    hasNext: {
                      type: 'boolean',
                      example: true,
                    },
                    hasPrevious: {
                      type: 'boolean',
                      example: false,
                    },
                  },
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Token não fornecido ou inválido',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Token não fornecido',
                  statusCode: 401,
                },
                timestamp: '2024-01-01T00:00:00.000Z',
              },
            },
          },
        },
        ValidationError: {
          description: 'Erro de validação',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Recurso não encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        RateLimitError: {
          description: 'Limite de requisições excedido',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [],
};

// Gera especificação OpenAPI
const specs = swaggerJsdoc(options);

/**
 * Configura Swagger UI na aplicação
 */
export function setupSwagger(app: Express): void {
  // Opções do Swagger UI
  const swaggerUiOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'WhatsApp API - Documentação',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  };

  // Rota da documentação
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

  // Rota para JSON da especificação
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log(`📚 Documentação disponível em /api-docs`);
}

