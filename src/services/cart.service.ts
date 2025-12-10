import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';
import cartRepository, { ICartRepository } from '../repositories/cart.repository';
import productRepository, { IProductRepository } from '../repositories/product.repository';
import couponRepository, { ICouponRepository } from '../repositories/coupon.repository';
import AppError from '../utils/AppError';
import cartTransformer from '../utils/transformers/cart.transformer';
import { ICart } from '../models/cart.model';
import { ServiceResponse } from '../types/service.types';

export interface CartIdentifier {
  userId?: string;
  guestCartId?: string;
}

export interface ICartService {
  getCart(identifier: CartIdentifier): Promise<ServiceResponse<any>>;
  addItemToCart(
    identifier: CartIdentifier,
    item: { productId: string; quantity: number }
  ): Promise<ServiceResponse<any> & { newGuestCartId?: string }>;
  updateItemQuantity(
    identifier: CartIdentifier,
    productId: string,
    quantity: number
  ): Promise<ServiceResponse<any>>;
  removeItemFromCart(identifier: CartIdentifier, productId: string): Promise<ServiceResponse<any>>;
  mergeCarts(userId: string, guestCartId: string): Promise<ServiceResponse<any>>;
  applyCoupon(identifier: CartIdentifier, couponCode: string): Promise<ServiceResponse<any>>;
  removeCoupon(identifier: CartIdentifier): Promise<ServiceResponse<any>>;
}

export class CartService implements ICartService {
  constructor(
    private cartRepository: ICartRepository,
    private productRepository: IProductRepository,
    private couponRepository: ICouponRepository
  ) {}

  /**
   * Obtém ou cria um carrinho com base no identificador (userId ou guestCartId).
   */
  private async getOrCreateCart(
    identifier: CartIdentifier
  ): Promise<{ cart: ICart; newGuestCartId?: string }> {
    let cart = await this.cartRepository.findByIdentifier(identifier);
    let newGuestCartId: string | undefined = undefined;

    if (!cart) {
      if (identifier.userId) {
        cart = await this.cartRepository.create({ userId: new Types.ObjectId(identifier.userId) });
      } else {
        newGuestCartId = uuidv4();
        cart = await this.cartRepository.create({ guestCartId: newGuestCartId });
      }
    }
    return { cart, newGuestCartId };
  }

  /**
   * Revalida o cupom ativo em um carrinho e ajusta os descontos.
   */
  private async revalidateCouponOnCart(
    cart: ICart
  ): Promise<{ isValid: boolean; reason?: string }> {
    if (!cart.activeCouponCode) {
      return { isValid: true };
    }

    const coupon = await this.couponRepository.findByCode(cart.activeCouponCode);
    const subtotalAfterItemDiscounts = cart.items.reduce(
      (sum, item) => sum + item.totalItemPrice,
      0
    );

    if (!coupon || subtotalAfterItemDiscounts < coupon.minPurchaseValue) {
      cart.couponDiscount = 0;
      cart.activeCouponCode = undefined;
      cart.couponInfo = undefined;

      return {
        isValid: false,
        reason: 'O cupom foi removido pois os requisitos de compra não são mais atendidos.',
      };
    }

    if (coupon.type === 'fixed') {
      cart.couponDiscount = Math.min(coupon.value, subtotalAfterItemDiscounts);
    } else {
      cart.couponDiscount = (subtotalAfterItemDiscounts * coupon.value) / 100;
    }
    return { isValid: true };
  }

  async getCart(identifier: CartIdentifier) {
    const { cart } = await this.getOrCreateCart(identifier);
    return { data: cartTransformer.transform(cart), message: '' };
  }

  async addItemToCart(
    identifier: CartIdentifier,
    { productId, quantity }: { productId: string; quantity: number }
  ) {
    const product = await this.productRepository.findByIdPublic(productId);
    if (!product) {
      throw new AppError('Produto não encontrado.', 404);
    }

    const { cart, newGuestCartId } = await this.getOrCreateCart(identifier);
    let details: any = null;

    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (existingItemIndex > -1) {
      const item = cart.items[existingItemIndex];
      const newQuantity = item.quantity + quantity;
      if (product.stockQuantity < newQuantity) {
        throw new AppError('Estoque insuficiente para a quantidade desejada.', 409);
      }
      item.quantity = newQuantity;
      item.totalItemPrice = newQuantity * item.unitPrice;
    } else {
      if (product.stockQuantity < quantity) {
        throw new AppError('Quantidade solicitada excede o estoque disponível.', 409);
      }
      const unitPrice =
        product.isPromotionActive && product.promotionalPrice
          ? product.promotionalPrice
          : product.price;
      cart.items.push({
        productId: product._id as any,
        name: product.name,
        mainImageUrl: product.mainImageUrl,
        quantity,
        price: product.price,
        promotionalPrice: product.promotionalPrice,
        unitPrice,
        totalItemPrice: quantity * unitPrice,
      });
    }

    const couponValidation = await this.revalidateCouponOnCart(cart);
    if (!couponValidation.isValid) {
      details = { couponStatus: 'REMOVED', reason: couponValidation.reason };
    }

    const updatedCart = await cart.save();

    return { data: cartTransformer.transform(updatedCart), newGuestCartId, details, message: '' };
  }

  async updateItemQuantity(identifier: CartIdentifier, productId: string, quantity: number) {
    const { cart } = await this.getOrCreateCart(identifier);
    let details: any = null;

    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
    if (itemIndex === -1) {
      throw new AppError('Produto não encontrado no carrinho.', 404);
    }

    const product = await this.productRepository.findByIdPublic(productId);
    if (!product) {
      throw new AppError('Produto não existe mais no catálogo.', 404);
    }
    if (product.stockQuantity < quantity) {
      throw new AppError('A nova quantidade excede o estoque disponível.', 409);
    }

    const item = cart.items[itemIndex];
    item.quantity = quantity;
    item.totalItemPrice = quantity * item.unitPrice;

    const couponValidation = await this.revalidateCouponOnCart(cart);
    if (!couponValidation.isValid) {
      details = { couponStatus: 'REMOVED', reason: couponValidation.reason };
    }

    const updatedCart = await cart.save();

    return { data: cartTransformer.transform(updatedCart), details, message: '' };
  }

  async removeItemFromCart(identifier: CartIdentifier, productId: string) {
    const { cart } = await this.getOrCreateCart(identifier);
    let details: any = null;

    const initialLength = cart.items.length;
    cart.items = cart.items.filter((item) => item.productId.toString() !== productId);

    if (cart.items.length === initialLength) {
      throw new AppError('Produto não encontrado no carrinho.', 404);
    }

    const couponValidation = await this.revalidateCouponOnCart(cart);
    if (!couponValidation.isValid) {
      details = { couponStatus: 'REMOVED', reason: couponValidation.reason };
    }

    const updatedCart = await cart.save();

    return { data: cartTransformer.transform(updatedCart), details, message: '' };
  }

  async mergeCarts(userId: string, guestCartId: string) {
    const guestCart = await this.cartRepository.findByGuestCartId(guestCartId);
    if (!guestCart || guestCart.items.length === 0) {
      const { cart: userCart } = await this.getOrCreateCart({ userId });
      return { data: cartTransformer.transform(userCart), message: '' };
    }

    const { cart: userCart } = await this.getOrCreateCart({ userId });

    for (const guestItem of guestCart.items) {
      const existingItemIndex = userCart.items.findIndex(
        (item) => item.productId.toString() === guestItem.productId.toString()
      );
      if (existingItemIndex > -1) {
        const userItem = userCart.items[existingItemIndex];
        userItem.quantity += guestItem.quantity;
        userItem.totalItemPrice = userItem.quantity * userItem.unitPrice;
      } else {
        userCart.items.push(guestItem);
      }
    }

    await this.revalidateCouponOnCart(userCart);
    const updatedUserCart = await userCart.save();
    await this.cartRepository.deleteByGuestCartId(guestCartId);

    return { data: cartTransformer.transform(updatedUserCart), message: '' };
  }

  async applyCoupon(identifier: CartIdentifier, couponCode: string) {
    const { cart } = await this.getOrCreateCart(identifier);
    const coupon = await this.couponRepository.findByCode(couponCode);

    const subtotalAfterItemDiscounts = cart.items.reduce(
      (sum, item) => sum + item.totalItemPrice,
      0
    );

    if (!coupon) {
      throw new AppError('Cupom inválido ou expirado.', 404);
    }
    if (subtotalAfterItemDiscounts < coupon.minPurchaseValue) {
      throw new AppError(
        `O valor mínimo da compra para usar este cupom é de R$ ${coupon.minPurchaseValue.toFixed(2)}.`,
        400
      );
    }

    cart.activeCouponCode = coupon.code;
    cart.couponInfo = { code: coupon.code, description: coupon.description };

    if (coupon.type === 'fixed') {
      cart.couponDiscount = Math.min(coupon.value, subtotalAfterItemDiscounts);
    } else {
      cart.couponDiscount = (subtotalAfterItemDiscounts * coupon.value) / 100;
    }

    const updatedCart = await cart.save();

    return { data: cartTransformer.transform(updatedCart) };
  }

  async removeCoupon(identifier: CartIdentifier) {
    const { cart } = await this.getOrCreateCart(identifier);

    cart.couponDiscount = 0;
    cart.couponCode = null;
    cart.couponDiscount = 0;
    const updatedCart = await cart.save();

    return { data: cartTransformer.transform(updatedCart), message: '' };
  }
}

export default new CartService(cartRepository, productRepository, couponRepository);
