import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ICartItem } from '../../../src/models/cart.model';
import { ProductFactory } from '../../factories';

// Mock dependencies BEFORE import to prevent side-effects during module load
vi.mock('../../../src/repositories/cart.repository', () => ({
  default: {},
  CartRepository: class { },
}));
vi.mock('../../../src/repositories/product.repository', () => ({
  default: {},
  ProductRepository: class { },
}));
vi.mock('../../../src/repositories/coupon.repository', () => ({
  default: {},
  CouponRepository: class { },
}));

import { CartService } from '../../../src/services/cart.service';
import AppError from '../../../src/utils/AppError';

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
    it('deve calcular totais corretamente ao adicionar item', async () => {
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

      // Verifica se o item foi adicionado com todas as propriedades corretas
      expect(mockCart.items).toHaveLength(1);
      expect(mockCart.items[0]).toMatchObject({
        productId: 'prod1',
        name: 'Product 1',
        mainImageUrl: 'url',
        quantity: 2,
        price: 100,
        promotionalPrice: 90,
        unitPrice: 90, // Preço promocional
        totalItemPrice: 180,
      });

      // Verifica se o carrinho foi salvo
      expect(mockCart.save).toHaveBeenCalled();

      // Verifica estrutura de retorno
      expect(result).toHaveProperty('data');
      expect(result.details).toBeFalsy(); // Sem cupom removido (pode ser null ou undefined)
    });

    it('deve lançar 409 quando estoque é insuficiente', async () => {
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
    it('deve mesclar itens do carrinho de visitante no carrinho do usuário', async () => {
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

      // Mocka comportamento do getOrCreateCart através do findByIdentifier para userId
      mockCartRepo.findByIdentifier.mockResolvedValue(userCart);

      const result = await cartService.mergeCarts('user1', 'guest1');

      // Verifica comportamento da mesclagem
      expect(userCart.items).toHaveLength(1); // Deve mesclar no item existente
      expect(userCart.items[0].quantity).toBe(2);
      expect(userCart.items[0].totalItemPrice).toBe(200);
      expect(mockCartRepo.deleteByGuestCartId).toHaveBeenCalledWith('guest1');

      // Verifica estrutura de retorno
      expect(result).toHaveProperty('data');
      expect(userCart.save).toHaveBeenCalled();
    });
  });
});
