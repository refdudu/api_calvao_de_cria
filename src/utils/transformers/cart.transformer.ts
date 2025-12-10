import { ICart, ICartItem } from '../../models/cart.model';

/**
 * Formata os campos do sumário de um carrinho.
 */
const transformSummary = (cart: ICart) => ({
  subtotal: cart.subtotal,
  itemsDiscount: cart.itemsDiscount,
  couponDiscount: cart.couponDiscount,
  totalDiscount: cart.totalDiscount,
  total: cart.total,
  totalItems: cart.totalItems,
});

/**
 * Formata a lista de itens de um carrinho.
 */
const transformItems = (items: ICartItem[] = []) =>
  items.map((item) => ({
    productId: item.productId,
    name: item.name,
    mainImageUrl: item.mainImageUrl,
    quantity: item.quantity,
    price: item.price,
    promotionalPrice: item.promotionalPrice || null,
    unitPrice: item.unitPrice,
    totalItemPrice: item.totalItemPrice,
  }));

/**
 * Formata as informações do cupom ativo.
 */
const transformCouponInfo = (cart: ICart) => {
  if (!cart.activeCouponCode || !cart.couponInfo) {
    return null;
  }
  return {
    code: cart.couponInfo.code,
    description: cart.couponInfo.description,
  };
};

const cartTransformer = {
  /**
   * Transforma o objeto de carrinho completo do Mongoose em uma
   * estrutura limpa para a resposta da API.
   */
  transform: (cart: ICart | null) => {
    if (!cart) {return null;}

    // --- LÓGICA REORDENADA ---
    // 1. Começa com o ID principal do carrinho.
    const transformedCart: Record<string, any> = {
      //   cartId: cart._id,
    };

    // 2. Adiciona o identificador de dono (usuário ou convidado) logo no topo.
    if (cart.userId) {
      transformedCart.userId = cart.userId;
    } else if (cart.guestCartId) {
      transformedCart.guestCartId = cart.guestCartId;
    }

    // 3. Adiciona o resto dos dados estruturados.
    transformedCart.summary = transformSummary(cart);
    transformedCart.coupon = transformCouponInfo(cart);
    transformedCart.items = transformItems(cart.items);
    // --- FIM DA LÓGICA REORDENADA ---

    return transformedCart;
  },
};

export default cartTransformer;
