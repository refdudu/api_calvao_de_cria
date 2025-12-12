import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Real classes - NOT mocks
import { CheckoutService } from '../../src/services/checkout.service';
import { CheckoutController } from '../../src/controllers/checkout.controller';
import { createMinimalApp } from './helpers/createMinimalApp';

// Interfaces for typing our stubs
import { ICartRepository } from '../../src/repositories/cart.repository';
import { IAddressRepository } from '../../src/repositories/address.repository';
import { IPaymentMethodRepository } from '../../src/repositories/paymentMethod.repository';
import { IOrderRepository } from '../../src/repositories/order.repository';
import { ICouponRepository } from '../../src/repositories/coupon.repository';
import { IPixService } from '../../src/services/payment/pix.service';
import { OrderStatus } from '../../src/enums/order.enum';

// Test user ID - must be defined before mock
const testUserId = new mongoose.Types.ObjectId();

// Mock the global user repository for authMiddleware
vi.mock('../../src/repositories/user.repository', () => ({
  default: {
    findById: vi.fn().mockImplementation((userId: string) => {
      // Return a mock user for auth middleware validation
      return Promise.resolve({
        _id: testUserId,
        id: userId,
        role: 'customer',
      });
    }),
    findByIdWithRole: vi.fn().mockImplementation((userId: string) => {
      return Promise.resolve({
        _id: testUserId,
        id: userId,
        role: 'customer',
      });
    }),
  },
}));

/**
 * TRUE Top-Down Integration Tests
 *
 * Pattern: Route → Real Controller → Real Service → Stub Repository
 *
 * What we test:
 * - Controller properly handles HTTP request
 * - Real service logic (coupon calculations, order totals, payment processing)
 * - Service correctly calls repository with processed data
 *
 * What we DON'T test:
 * - Database queries (stubbed)
 * - External payment APIs (stubbed)
 */
describe('Checkout Integration (True Top-Down)', () => {
  // Stubs for repositories
  let stubCartRepo: ICartRepository;
  let stubAddressRepo: IAddressRepository;
  let stubPaymentMethodRepo: IPaymentMethodRepository;
  let stubOrderRepo: IOrderRepository;
  let stubCouponRepo: ICouponRepository;
  let stubPixService: IPixService;

  // Real instances
  let checkoutService: CheckoutService;
  let checkoutController: CheckoutController;

  // Test data - testUserId is defined at module level for vi.mock
  const testAddressId = new mongoose.Types.ObjectId();
  const testProductId = new mongoose.Types.ObjectId();

  const mockAddress = {
    _id: testAddressId,
    recipientName: 'Renan Test',
    street: 'Rua Principal',
    number: '100',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    cep: '01000-000',
    phone: '11999999999',
  };

  const createMockCart = (overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    userId: testUserId,
    items: [
      {
        productId: testProductId,
        name: 'Camiseta Calvão',
        quantity: 2,
        unitPrice: 50,
        totalItemPrice: 100,
        mainImageUrl: 'http://img.com/camiseta.jpg',
      },
    ],
    subtotal: 100,
    itemsDiscount: 0,
    couponDiscount: 0,
    totalDiscount: 0,
    total: 100,
    activeCouponCode: undefined,
    couponInfo: undefined,
    save: vi.fn().mockImplementation(function (this: any) {
      // Simulate the pre('save') hook that recalculates totals
      if (this.activeCouponCode) {
        this.totalDiscount = this.itemsDiscount + this.couponDiscount;
        this.total = this.subtotal - this.totalDiscount;
      }
      return Promise.resolve(this);
    }),
    ...overrides,
  });

  // Helper to create auth token for protected routes
  const createAuthToken = () => {
    return jwt.sign(
      { userId: testUserId.toString(), role: 'customer' },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '15m' }
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup environment
    process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_12345';
    process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_12345';

    // 1. Create STUBS for all repositories
    stubCartRepo = {
      findByIdentifier: vi.fn(),
    } as unknown as ICartRepository;

    stubAddressRepo = {
      findAddressByIdAndUserIdDetail: vi.fn(),
    } as unknown as IAddressRepository;

    stubPaymentMethodRepo = {
      findByIdentifier: vi.fn(),
      findAllEnabled: vi.fn(),
    } as unknown as IPaymentMethodRepository;

    stubOrderRepo = {
      findLastByDatePrefix: vi.fn().mockResolvedValue(null),
      createOrderTransactional: vi.fn(),
    } as unknown as IOrderRepository;

    stubCouponRepo = {
      findByCode: vi.fn(),
    } as unknown as ICouponRepository;

    stubPixService = {
      processPixPayment: vi.fn().mockResolvedValue({
        method: 'pix',
        qrCodeImageUrl: 'http://pix.qr/code.png',
        qrCode: '00020126580014br.gov.bcb.pix...',
      }),
    } as unknown as IPixService;

    // 2. Instantiate REAL service with stubbed dependencies
    checkoutService = new CheckoutService(
      stubCartRepo,
      stubAddressRepo,
      stubPaymentMethodRepo,
      stubOrderRepo,
      stubCouponRepo,
      stubPixService
    );

    // 3. Instantiate REAL controller with real service
    checkoutController = new CheckoutController(checkoutService);
  });

  describe('GET /api/v1/payment-methods', () => {
    it('should return list of enabled payment methods', async () => {
      // Arrange
      const mockPaymentMethods = [
        { identifier: 'pix', name: 'PIX', isEnabled: true },
        { identifier: 'credit_card', name: 'Cartão de Crédito', isEnabled: true },
      ];

      vi.mocked(stubPaymentMethodRepo.findAllEnabled).mockResolvedValue(mockPaymentMethods as any);

      const app = createMinimalApp({ checkoutController });

      // Act
      const res = await request(app).get('/api/v1/payment-methods');

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].identifier).toBe('pix');
    });
  });

  describe('POST /api/v1/checkout (Protected Route)', () => {
    it('should create order with correct total calculation (Real Service logic)', async () => {
      // Arrange
      const mockCart = createMockCart();

      vi.mocked(stubCartRepo.findByIdentifier).mockResolvedValue(mockCart as any);
      vi.mocked(stubAddressRepo.findAddressByIdAndUserIdDetail).mockResolvedValue(
        mockAddress as any
      );
      vi.mocked(stubPaymentMethodRepo.findByIdentifier).mockResolvedValue({
        identifier: 'pix',
        name: 'PIX',
        isEnabled: true,
      } as any);

      // Mock order creation to return the order
      // @ts-ignore
      vi.mocked(stubOrderRepo.createOrderTransactional).mockImplementation(async (orderData) => ({
        _id: new mongoose.Types.ObjectId(),
        ...orderData,
        createdAt: new Date(),
      }));

      const app = createMinimalApp({ checkoutController });
      const token = createAuthToken();

      // Act
      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          addressId: testAddressId.toString(),
          paymentMethodIdentifier: 'pix',
        });

      // Assert - HTTP response
      expect(res.status).toBe(201);
      expect(res.body.data.orderNumber).toBeDefined();
      expect(res.body.data.status).toBe(OrderStatus.AWAITING_PAYMENT);
      expect(res.body.data.paymentInfo).toBeDefined();

      // Assert - Real Service calculated totals correctly
      expect(stubOrderRepo.createOrderTransactional).toHaveBeenCalledTimes(1);

      const orderCall = vi.mocked(stubOrderRepo.createOrderTransactional).mock.calls[0][0] as any;

      // Verify totals were calculated by real service
      expect(orderCall.totals.subtotal).toBe(100);
      expect(orderCall.totals.total).toBe(100);
      expect(orderCall.items).toHaveLength(1);
      expect(orderCall.items[0].quantity).toBe(2);
      expect(orderCall.items[0].priceAtTimeOfPurchase).toBe(50);

      // Verify address was copied
      expect(orderCall.shippingAddress.recipientName).toBe('Renan Test');

      // Assert - PIX payment was processed
      expect(stubPixService.processPixPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 100,
          recipientName: 'Renan Test',
        })
      );
    });

    it('should apply coupon discount correctly (Real Service calculation)', async () => {
      // Arrange - Cart with items totaling 100
      const mockCart = createMockCart();

      vi.mocked(stubCartRepo.findByIdentifier).mockResolvedValue(mockCart as any);
      vi.mocked(stubAddressRepo.findAddressByIdAndUserIdDetail).mockResolvedValue(
        mockAddress as any
      );
      vi.mocked(stubPaymentMethodRepo.findByIdentifier).mockResolvedValue({
        identifier: 'pix',
        isEnabled: true,
      } as any);

      // 10% discount coupon
      const mockCoupon = {
        code: 'DESCONTO10',
        type: 'percentage',
        value: 10,
        minPurchaseValue: 50,
        description: '10% de desconto',
      };
      vi.mocked(stubCouponRepo.findByCode).mockResolvedValue(mockCoupon as any);

      // @ts-ignore
      vi.mocked(stubOrderRepo.createOrderTransactional).mockImplementation(async (orderData) => ({
        _id: new mongoose.Types.ObjectId(),
        ...orderData,
        createdAt: new Date(),
      }));

      const app = createMinimalApp({ checkoutController });
      const token = createAuthToken();

      // Act
      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          addressId: testAddressId.toString(),
          paymentMethodIdentifier: 'pix',
          couponCode: 'DESCONTO10',
        });

      // Assert - HTTP success
      expect(res.status).toBe(201);

      // Assert - Coupon was applied by real service
      expect(stubCouponRepo.findByCode).toHaveBeenCalledWith('DESCONTO10');

      // The cart.save() was called (coupon applied to cart)
      expect(mockCart.save).toHaveBeenCalled();
      expect(mockCart.activeCouponCode).toBe('DESCONTO10');
      expect(mockCart.couponDiscount).toBe(10); // 10% of 100

      // Order total should reflect the discount
      // Note: The exact total depends on how the cart pre-save hook works
    });

    it('should reject when cart is empty (Real Service validation)', async () => {
      // Arrange - Empty cart
      const emptyCart = createMockCart({ items: [], subtotal: 0, total: 0 });

      vi.mocked(stubCartRepo.findByIdentifier).mockResolvedValue(emptyCart as any);

      const app = createMinimalApp({ checkoutController });
      const token = createAuthToken();

      // Act
      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          addressId: testAddressId.toString(),
          paymentMethodIdentifier: 'pix',
        });

      // Assert - Real service threw error for empty cart
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/vazio/i);

      // Order was NOT created
      expect(stubOrderRepo.createOrderTransactional).not.toHaveBeenCalled();
    });

    it('should reject when address not found (Real Service validation)', async () => {
      // Arrange
      vi.mocked(stubCartRepo.findByIdentifier).mockResolvedValue(createMockCart() as any);
      vi.mocked(stubAddressRepo.findAddressByIdAndUserIdDetail).mockResolvedValue(null);

      const app = createMinimalApp({ checkoutController });
      const token = createAuthToken();

      // Use valid ObjectId format (but non-existent address)
      const nonExistentAddressId = new mongoose.Types.ObjectId();

      // Act
      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          addressId: nonExistentAddressId.toString(),
          paymentMethodIdentifier: 'pix',
        });

      // Assert - Address not found is a 404 (Not Found)
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/endereço/i);
    });

    it('should reject when payment method is disabled (Real Service validation)', async () => {
      // Arrange
      vi.mocked(stubCartRepo.findByIdentifier).mockResolvedValue(createMockCart() as any);
      vi.mocked(stubAddressRepo.findAddressByIdAndUserIdDetail).mockResolvedValue(
        mockAddress as any
      );
      vi.mocked(stubPaymentMethodRepo.findByIdentifier).mockResolvedValue({
        identifier: 'pix',
        isEnabled: false, // Disabled!
      } as any);

      const app = createMinimalApp({ checkoutController });
      const token = createAuthToken();

      // Act
      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          addressId: testAddressId.toString(),
          paymentMethodIdentifier: 'pix',
        });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/indisponível/i);
    });

    it('should require authentication (returns 401 without token)', async () => {
      // Arrange
      const app = createMinimalApp({ checkoutController });

      // Act - No Authorization header
      const res = await request(app).post('/api/v1/checkout').send({
        addressId: testAddressId.toString(),
        paymentMethodIdentifier: 'pix',
      });

      // Assert
      expect(res.status).toBe(401);
    });

    it('should generate sequential order numbers (Real Service logic)', async () => {
      // Arrange
      const mockCart = createMockCart();
      vi.mocked(stubCartRepo.findByIdentifier).mockResolvedValue(mockCart as any);
      vi.mocked(stubAddressRepo.findAddressByIdAndUserIdDetail).mockResolvedValue(
        mockAddress as any
      );
      vi.mocked(stubPaymentMethodRepo.findByIdentifier).mockResolvedValue({
        identifier: 'pix',
        isEnabled: true,
      } as any);

      // Simulate existing order from today
      const today = new Date();
      const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

      vi.mocked(stubOrderRepo.findLastByDatePrefix).mockResolvedValue({
        orderNumber: `${datePrefix}-0005`,
      } as any);

      // @ts-ignore
      vi.mocked(stubOrderRepo.createOrderTransactional).mockImplementation(async (orderData) => ({
        _id: new mongoose.Types.ObjectId(),
        ...orderData,
        createdAt: new Date(),
      }));

      const app = createMinimalApp({ checkoutController });
      const token = createAuthToken();

      // Act
      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          addressId: testAddressId.toString(),
          paymentMethodIdentifier: 'pix',
        });

      // Assert - Order number should be sequential
      expect(res.status).toBe(201);

      const orderCall = vi.mocked(stubOrderRepo.createOrderTransactional).mock.calls[0][0] as any;
      expect(orderCall.orderNumber).toBe(`${datePrefix}-0006`);
    });
  });

  describe('POST /api/v1/checkout/preview (Coupon Preview)', () => {
    it('should calculate preview with discount (Real Service calculation)', async () => {
      // Arrange
      const mockCart = createMockCart();
      vi.mocked(stubCartRepo.findByIdentifier).mockResolvedValue(mockCart as any);

      // Fixed discount coupon
      const mockCoupon = {
        code: 'SAVE15',
        type: 'fixed',
        value: 15,
        minPurchaseValue: 50,
      };
      vi.mocked(stubCouponRepo.findByCode).mockResolvedValue(mockCoupon as any);

      const app = createMinimalApp({ checkoutController });
      const token = createAuthToken();

      // Act
      const res = await request(app)
        .post('/api/v1/checkout/preview')
        .set('Authorization', `Bearer ${token}`)
        .send({ couponCode: 'SAVE15' });

      // Assert - Real service calculated the preview
      expect(res.status).toBe(200);
      expect(res.body.data.subtotal).toBe(100);
      expect(res.body.data.discount).toBe(15); // Fixed 15
      expect(res.body.data.total).toBe(85); // 100 - 15
    });

    it('should reject coupon when minimum purchase not met (Real Service validation)', async () => {
      // Arrange - Cart with only 30 value
      const lowValueCart = createMockCart({
        items: [{ productId: testProductId, quantity: 1, unitPrice: 30, totalItemPrice: 30 }],
        subtotal: 30,
        total: 30,
      });
      vi.mocked(stubCartRepo.findByIdentifier).mockResolvedValue(lowValueCart as any);

      const mockCoupon = {
        code: 'SAVE10',
        minPurchaseValue: 100, // Requires 100 minimum
      };
      vi.mocked(stubCouponRepo.findByCode).mockResolvedValue(mockCoupon as any);

      const app = createMinimalApp({ checkoutController });
      const token = createAuthToken();

      // Act
      const res = await request(app)
        .post('/api/v1/checkout/preview')
        .set('Authorization', `Bearer ${token}`)
        .send({ couponCode: 'SAVE10' });

      // Assert - Real service rejected due to minimum purchase
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/valor mínimo/i);
    });
  });
});
