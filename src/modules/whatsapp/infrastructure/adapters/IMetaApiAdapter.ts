/**
 * Interface do adaptador da Meta API
 * Define o contrato para comunicação com a WhatsApp Cloud API
 */

export interface IMetaApiAdapter {
  /**
   * Envia mensagem via WhatsApp
   */
  sendMessage(message: any, tenantId: string): Promise<any>;

  /**
   * Verifica assinatura do webhook
   */
  verifyWebhookSignature(signature: string, body: string): boolean;

  /**
   * Marca mensagem como lida
   */
  markAsRead(messageId: string): Promise<void>;

  /**
   * Busca informações de mídia
   */
  getMedia(mediaId: string): Promise<any>;

  /**
   * Download de mídia
   */
  downloadMedia(url: string): Promise<Buffer>;

  /**
   * Verifica se número é válido no WhatsApp
   */
  verifyPhoneNumber(phoneNumber: string): Promise<boolean>;
}