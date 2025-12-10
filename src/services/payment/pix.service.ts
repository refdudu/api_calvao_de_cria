import qrcode from 'qrcode';
import crypto from 'crypto';

export interface OrderData {
  recipientName: string;
  total: number;
  orderNumber: string;
}

export interface IPixService {
  processPixPayment(orderData: OrderData): Promise<any>;
}

export class PixService implements IPixService {
  /**
   * Simula a geração de um payload PIX no padrão BR Code (EMV-MPM).
   */
  private generateBRCode({ recipientName, total, orderNumber }: OrderData): string {
    const merchantCity = 'SAO PAULO'; // Cidade do recebedor (mock)
    const chavePix = crypto.randomBytes(16).toString('hex'); // Chave aleatória (mock)

    // Formata os dados para o padrão EMV-MPM
    const formattedName = recipientName.substring(0, 25).toUpperCase().replace(/\s/g, '');
    const formattedValue = total.toFixed(2);
    const transactionId = orderNumber.replace(/-/g, ''); // ID da transação sem caracteres especiais

    // Monta a string no padrão EMV-MPM (simplificado para mock)
    const payload = [
      '000201', // Payload Format Indicator
      `26${(chavePix.length + 25).toString().padStart(2, '0')}0014BR.GOV.BCB.PIX01${chavePix.length}${chavePix}`,
      '52040000', // Merchant Category Code
      '5303986', // Transaction Currency (BRL)
      `54${formattedValue.length.toString().padStart(2, '0')}${formattedValue}`,
      '5802BR',
      `59${formattedName.length.toString().padStart(2, '0')}${formattedName}`,
      `60${merchantCity.length.toString().padStart(2, '0')}${merchantCity}`,
      `62${(transactionId.length + 7).toString().padStart(2, '0')}05${transactionId.length.toString().padStart(2, '0')}${transactionId}`,
      '6304', // CRC16 (mockado)
    ].join('');

    return payload + 'A1B2'; // Adiciona um CRC16 mockado no final
  }

  /**
   * Processa um pagamento PIX, gerando o código e a imagem do QR Code.
   */
  async processPixPayment(orderData: OrderData) {
    const qrCodeData = this.generateBRCode(orderData);

    try {
      // Gera a imagem do QR Code como uma Data URL (string base64)
      const qrCodeImageUrl = await qrcode.toDataURL(qrCodeData);

      return {
        method: 'pix',
        qrCode: qrCodeData,
        qrCodeImageUrl: qrCodeImageUrl,
        transactionId: `PIX_${orderData.orderNumber}`,
      };
    } catch (err) {
      console.error('Falha ao gerar QR Code:', err);
      // Em caso de falha na geração do QR Code, ainda podemos retornar o "copia e cola".
      return {
        method: 'pix',
        qrCode: qrCodeData,
        qrCodeImageUrl: null,
        transactionId: `PIX_${orderData.orderNumber}`,
      };
    }
  }
}

export const processPixPayment = new PixService().processPixPayment.bind(new PixService()); // Backward compatibility for functional export if needed, or better usage below
export default new PixService();
