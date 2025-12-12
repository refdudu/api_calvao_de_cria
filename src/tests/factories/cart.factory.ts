import mongoose from 'mongoose';
import Cart, { ICart, ICartItem } from '../../models/cart.model';

/**
 * Cart Factory
 * Provides methods to create cart instances for testing
 */

export const CartFactory = {
  create: async (userId: mongoose.Types.ObjectId, overrides: any = {}) => {
    const defaultCart = {
      userId,
      items: [],
      subtotal: 0,
      total: 0,
      ...overrides,
    };
    return Cart.create(defaultCart);
  },

  // Build a mock cart object without saving to DB (for unit tests)
  build: (overrides: Partial<ICart> = {}) => {
    return {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      items: [] as ICartItem[],
      subtotal: 0,
      total: 0,
      itemsDiscount: 0,
      couponDiscount: 0,
      activeCouponCode: undefined,
      guestCartId: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: () => Promise.resolve(this),
      ...overrides,
    } as unknown as ICart & { save: () => Promise<ICart> };
  },
};
