/**
 * Interface do repositório de webhooks (Port)
 * Define o contrato para operações com registros de webhook
 */

// Interface para payload bruto do webhook
export interface RawWebhookPayload {
  id?: string;
  tenantId: string;
  payload: any;
  signature?: string;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Interface do repositório
export interface IWebhookRepository {

  /**
   * Salva payload bruto do webhook para auditoria
   * @param payload - Payload recebido da Meta
   * @param tenantId - ID do tenant
   * @param signature - Assinatura do webhook (opcional)
   * @returns Webhook salvo
   */
  saveRaw(payload: any, tenantId: string, signature?: string): Promise<RawWebhookPayload>;

  /**
   * Busca webhook por ID
   * @param id - ID do webhook
   * @returns Webhook encontrado ou null
   */
  findById(id: string): Promise<RawWebhookPayload | null>;

  /**
   * Lista webhooks com filtros
   * @param filters - Filtros para busca
   * @param page - Número da página
   * @param limit - Itens por página
   * @returns Lista paginada de webhooks
   */
  list(
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
  }>;

  /**
   * Marca webhook como processado
   * @param id - ID do webhook
   * @param error - Erro ocorrido (se houver)
   */
  markAsProcessed(id: string, error?: string): Promise<void>;

  /**
   * Busca webhooks não processados
   * @param limit - Limite de resultados
   * @returns Lista de webhooks não processados
   */
  findUnprocessed(limit?: number): Promise<RawWebhookPayload[]>;

  /**
   * Remove webhooks antigos (para compliance/GDPR)
   * @param days - Dias para manter (padrão: 30)
   * @returns Número de registros removidos
   */
  deleteOldWebhooks(days?: number): Promise<number>;

  /**
   * Conta webhooks por período
   * @param tenantId - ID do tenant
   * @param startDate - Data inicial
   * @param endDate - Data final
   * @returns Número de webhooks
   */
  countByPeriod(tenantId: string, startDate: Date, endDate: Date): Promise<number>;
}