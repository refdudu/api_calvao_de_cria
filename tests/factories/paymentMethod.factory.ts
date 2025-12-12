import PaymentMethod from '../../src/models/paymentMethod.model';

/**
 * PaymentMethod Factory
 * Provides methods to create payment method instances for testing
 */

export const PaymentMethodFactory = {
  create: async (overrides: any = {}) => {
    const defaultPaymentMethod = {
      name: 'Pix',
      identifier: 'pix',
      isEnabled: true,
      description: 'Pagamento via PIX',
      ...overrides,
    };
    return PaymentMethod.create(defaultPaymentMethod);
  },
};
