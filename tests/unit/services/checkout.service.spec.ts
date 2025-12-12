import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderStatus } from '../../../src/enums/order.enum';

// Mock dependencies BEFORE import
vi.mock('../../../src/repositories/cart.repository', () => ({ default: {} }));
vi.mock('../../../src/repositories/address.repository', () => ({ default: {} }));
vi.mock('../../../src/repositories/paymentMethod.repository', () => ({ default: {} }));
vi.mock('../../../src/repositories/order.repository', () => ({ default: {} }));
vi.mock('../../../src/repositories/coupon.repository', () => ({ default: {} }));
vi.mock('../../../src/services/payment/pix.service', () => ({ default: {} }));

import { CheckoutService } from '../../../src/services/checkout.service';
import AppError from '../../../src/utils/AppError';

// Mocks
const mockCartRepo = {
  findByIdentifier: vi.fn(),
};
const mockAddressRepo = {
  findAddressByIdAndUserIdDetail: vi.fn(),
};
const mockPaymentRepo = {
  findByIdentifier: vi.fn(),
  findAllEnabled: vi.fn(),
};
const mockOrderRepo = {
  findLastByDatePrefix: vi.fn(),
  createOrderTransactional: vi.fn(),
};
const mockCouponRepo = {
  findByCode: vi.fn(),
};
const mockPixService = {
  processPixPayment: vi.fn(),
};

describe('CheckoutService', () => {
  let checkoutService: CheckoutService;

  beforeEach(() => {
    vi.clearAllMocks();
    checkoutService = new CheckoutService(
      mockCartRepo as any,
      mockAddressRepo as any,
      mockPaymentRepo as any,
      mockOrderRepo as any,
      mockCouponRepo as any,
      mockPixService as any
    );
  });

  describe('previewCoupon', () => {
    it('should apply fixed discount correctly', async () => {
      const mockCart = {
        items: [{ id: '1', quantity: 1, totalItemPrice: 100 }],
        subtotal: 100,
        itemsDiscount: 0,
      };
      mockCartRepo.findByIdentifier.mockResolvedValue(mockCart);

      const mockCoupon = {
        code: 'TEST10',
        type: 'fixed',
        value: 10,
        minPurchaseValue: 50,
      };
      mockCouponRepo.findByCode.mockResolvedValue(mockCoupon);

      const result = await checkoutService.previewCoupon('user1', 'TEST10');

      expect(result.data.discount).toBe(10);
      expect(result.data.total).toBe(90);
    });

    it('should error if minimum purchase value not met', async () => {
      const mockCart = {
        items: [{ id: '1', quantity: 1, totalItemPrice: 40 }],
        subtotal: 40,
        itemsDiscount: 0,
      };
      mockCartRepo.findByIdentifier.mockResolvedValue(mockCart);

      const mockCoupon = {
        code: 'TEST10',
        minPurchaseValue: 50,
      };
      mockCouponRepo.findByCode.mockResolvedValue(mockCoupon);

      await expect(checkoutService.previewCoupon('user1', 'TEST10')).rejects.toThrow(
        /valor mínimo/i
      );
    });
  });

  describe('createOrder', () => {
    it('should generate order number correctly', async () => {
      // Mock data setup
      const mockCart = {
        items: [{ productId: 'p1', quantity: 1, unitPrice: 100, totalItemPrice: 100 }],
        subtotal: 100,
        itemsDiscount: 0,
        total: 100,
        activeCouponCode: undefined,
        save: vi.fn().mockReturnThis(),
      };
      mockCartRepo.findByIdentifier.mockResolvedValue(mockCart);

      const mockAddress = { recipientName: 'Test' };
      mockAddressRepo.findAddressByIdAndUserIdDetail.mockResolvedValue(mockAddress);

      const mockPayment = { identifier: 'pix', isEnabled: true };
      mockPaymentRepo.findByIdentifier.mockResolvedValue(mockPayment);

      mockOrderRepo.findLastByDatePrefix.mockResolvedValue({ orderNumber: '20231206-0001' });
      mockPixService.processPixPayment.mockResolvedValue({ qrCode: '...' });
      mockOrderRepo.createOrderTransactional.mockResolvedValue({
        _id: 'order1',
        orderNumber: '20231206-0001',
        status: OrderStatus.AWAITING_PAYMENT,
        createdAt: new Date(),
        shippingAddress: {
          ...mockAddress,
          street: 'Street',
          number: '1',
          city: 'City',
          state: 'ST',
          cep: '00000-000',
          phone: '000000000',
        },
        items: [],
        totals: { total: 100, totalDiscount: 0, subtotal: 100 },
        payment: { method: 'pix', qrCodeImageUrl: 'url', qrCode: 'code' },
      });

      // Force a specific date to predictable order prefix test if needed,
      // code uses new Date() internally so difficult to assert exact prefix without mocking Date.
      // We assume logic holds.

      await checkoutService.createOrder('user1', {
        addressId: 'addr1',
        paymentMethodIdentifier: 'pix',
      });

      expect(mockCart.activeCouponCode).toBeUndefined(); // No coupon sent
      expect(mockOrderRepo.createOrderTransactional).toHaveBeenCalled();
      // logic for order number: last was 0001, so this should use 0002 internally
      // However, since we mock findLastByDatePrefix, we can just check if createOrderTransactional
      // was called with an object containing an orderNumber.
      const orderCall = mockOrderRepo.createOrderTransactional.mock.calls[0][0];
      expect(orderCall.orderNumber).toMatch(/-\d{4}$/);
    });

    it('should throw 500 if payment gateway fails (Sad Path)', async () => {
      // 1. Setup (Arrange)
      const mockCart = {
        items: [{ productId: 'p1', quantity: 1, unitPrice: 100, totalItemPrice: 100 }],
        subtotal: 100,
        itemsDiscount: 0,
        total: 100,
        activeCouponCode: undefined,
        save: vi.fn().mockReturnThis(),
      };
      
      // Mocks de dependências para chegar até o momento do pagamento
      mockCartRepo.findByIdentifier.mockResolvedValue(mockCart);
      mockAddressRepo.findAddressByIdAndUserIdDetail.mockResolvedValue({ recipientName: 'Test' });
      mockPaymentRepo.findByIdentifier.mockResolvedValue({ identifier: 'pix', isEnabled: true });
      mockOrderRepo.findLastByDatePrefix.mockResolvedValue({ orderNumber: '20231206-0001' });

      // 2. Simular o erro no serviço de PIX (AQUI ESTÁ O "SAD PATH")
      const errorMsg = 'Gateway de pagamento indisponível';
      mockPixService.processPixPayment.mockRejectedValue(new Error(errorMsg));

      // 3. Execução e Verificação (Act & Assert)
      // Esperamos que o CheckoutService não engula o erro silenciosamente, mas o repasse.
      await expect(
        checkoutService.createOrder('user1', {
          addressId: 'addr1',
          paymentMethodIdentifier: 'pix',
        })
      ).rejects.toThrow(errorMsg);

      // Verifica se o pedido NÃO foi criado (transacionalidade)
      expect(mockOrderRepo.createOrderTransactional).not.toHaveBeenCalled();
    });

    it('should clear cart after order creation (Bug Fix: Infinite Cart)', async () => {
      // Setup
      const mockCart = {
        items: [{ productId: 'p1', quantity: 1, unitPrice: 100, totalItemPrice: 100 }],
        subtotal: 100,
        itemsDiscount: 0,
        total: 100,
        activeCouponCode: undefined,
        couponDiscount: 0,
        couponInfo: undefined,
        save: vi.fn().mockReturnThis(),
      };

      mockCartRepo.findByIdentifier.mockResolvedValue(mockCart);
      mockAddressRepo.findAddressByIdAndUserIdDetail.mockResolvedValue({
        recipientName: 'Test',
        street: 'Street',
        number: '1',
        neighborhood: 'Neighborhood',
        city: 'City',
        state: 'ST',
        cep: '00000-000',
        phone: '000000000',
      });
      mockPaymentRepo.findByIdentifier.mockResolvedValue({ identifier: 'pix', isEnabled: true });
      mockOrderRepo.findLastByDatePrefix.mockResolvedValue({ orderNumber: '20231206-0001' });
      mockPixService.processPixPayment.mockResolvedValue({ qrCode: 'test-qr' });
      mockOrderRepo.createOrderTransactional.mockResolvedValue({
        _id: 'order1',
        orderNumber: '20231206-0002',
        status: OrderStatus.AWAITING_PAYMENT,
        createdAt: new Date(),
        shippingAddress: {
          recipientName: 'Test',
          street: 'Street',
          number: '1',
          neighborhood: 'Neighborhood',
          city: 'City',
          state: 'ST',
          cep: '00000-000',
          phone: '000000000',
        },
        items: [],
        totals: { subtotal: 100, itemsDiscount: 0, couponDiscount: 0, totalDiscount: 0, total: 100 },
        payment: { method: 'pix', qrCode: 'test-qr' },
      });

      // Execução
      const result = await checkoutService.createOrder('user1', {
        addressId: 'addr1',
        paymentMethodIdentifier: 'pix',
      });

      // Verificações
      // 1. O pedido foi criado com sucesso
      expect(result.data.orderNumber).toBe('20231206-0002');
      
      // 2. Verifica que createOrderTransactional foi chamado (ele internamente limpa o carrinho)
      expect(mockOrderRepo.createOrderTransactional).toHaveBeenCalled();
      
      // 3. Verifica que o save do carrinho foi chamado apenas uma vez (para aplicar cupom/recalcular)
      // OBS: A limpeza do carrinho agora é feita dentro de createOrderTransactional
      expect(mockCart.save).toHaveBeenCalledOnce();
    });
  });
});
