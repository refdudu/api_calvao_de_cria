import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ICartItem } from '../../models/cart.model';
import { ProductFactory } from '../../tests/factories';

// Mock dependencies BEFORE import to prevent side-effects during module load
vi.mock('../repositories/cart.repository', () => ({
  default: {},
  CartRepository: class { },
}));
vi.mock('../repositories/product.repository', () => ({
  default: {},
  ProductRepository: class { },
}));
vi.mock('../repositories/coupon.repository', () => ({
  default: {},
  CouponRepository: class { },
}));

import { CartService } from '../cart.service';
import AppError from '../../utils/AppError';

// Mocks
const mockCartRepo = {
  findByIdentifier: vi.fn(),
  create: vi.fn(),
  findByGuestCartId: vi.fn(),
  deleteByGuestCartId: vi.fn(),
};

const mockProductRepo = {
  findByIdPublic: vi.fn(),
};

const mockCouponRepo = {
  findByCode: vi.fn(),
};

describe('CartService', () => {
  let cartService: CartService;

  beforeEach(() => {
    vi.clearAllMocks();
    cartService = new CartService(
      mockCartRepo as any,
      mockProductRepo as any,
      mockCouponRepo as any
    );
  });

  describe('addItemToCart', () => {
    it('should calculate totals correctly when adding item', async () => {
      const mockProduct = ProductFactory.build({
        _id: 'prod1' as any,
        name: 'Product 1',
        price: 100,
        promotionalPrice: 90,
        isPromotionActive: true,
        stockQuantity: 10,
        mainImageUrl: 'url',
      });
      mockProductRepo.findByIdPublic.mockResolvedValue(mockProduct);

      const mockCart = {
        items: [] as ICartItem[],
        couponDiscount: 0,
        activeCouponCode: undefined,
        save: vi.fn().mockReturnThis(),
      };
      mockCartRepo.findByIdentifier.mockResolvedValue(mockCart);


      const result = await cartService.addItemToCart(
        { userId: 'user1' },
        { productId: 'prod1', quantity: 2 }
      );

      // Verify item was added with all correct properties
      expect(mockCart.items).toHaveLength(1);
      expect(mockCart.items[0]).toMatchObject({
        productId: 'prod1',
        name: 'Product 1',
        mainImageUrl: 'url',
        quantity: 2,
        price: 100,
        promotionalPrice: 90,
        unitPrice: 90, // Promotional price
        totalItemPrice: 180,
      });

      // Verify cart was saved
      expect(mockCart.save).toHaveBeenCalled();

      // Verify return structure
      expect(result).toHaveProperty('data');
      expect(result.details).toBeFalsy(); // No coupon removed (can be null or undefined)
    });

    it('should throw 409 if stock is insufficient', async () => {
      const mockProduct = ProductFactory.build({
        _id: 'prod1' as any,
        stockQuantity: 1,
      });
      mockProductRepo.findByIdPublic.mockResolvedValue(mockProduct);

      const mockCart = {
        items: [],
        save: vi.fn(),
      };
      mockCartRepo.findByIdentifier.mockResolvedValue(mockCart);

      await expect(
        cartService.addItemToCart({ userId: 'user1' }, { productId: 'prod1', quantity: 2 })
      ).rejects.toThrow(/excede o estoque/i);
    });
  });

  describe('mergeCarts', () => {
    it('should merge guest cart items into user cart', async () => {
      const guestCart = {
        items: [{ productId: 'prod1', quantity: 1, unitPrice: 100, totalItemPrice: 100 }],
      };
      mockCartRepo.findByGuestCartId.mockResolvedValue(guestCart);

      const userCart = {
        items: [{ productId: 'prod1', quantity: 1, unitPrice: 100, totalItemPrice: 100 }] as any[],
        couponDiscount: 0,
        activeCouponCode: undefined,
        save: vi.fn().mockReturnThis(),
      };

      // Mock getOrCreateCart behavior by mocking findByIdentifier for userId
      mockCartRepo.findByIdentifier.mockResolvedValue(userCart);

      const result = await cartService.mergeCarts('user1', 'guest1');

      // Verify merge behavior
      expect(userCart.items).toHaveLength(1); // Should merge into existing item
      expect(userCart.items[0].quantity).toBe(2);
      expect(userCart.items[0].totalItemPrice).toBe(200);
      expect(mockCartRepo.deleteByGuestCartId).toHaveBeenCalledWith('guest1');

      // Verify return structure
      expect(result).toHaveProperty('data');
      expect(userCart.save).toHaveBeenCalled();
    });
  });
});
