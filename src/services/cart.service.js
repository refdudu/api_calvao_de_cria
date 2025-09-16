const { v4: uuidv4 } = require('uuid');
const cartRepository = require('../repositories/cart.repository');
const productRepository = require('../repositories/product.repository');
const couponRepository = require('../repositories/coupon.repository');
const AppError = require('../utils/AppError');

// --- Funções Auxiliares Internas ---

/**
 * Obtém ou cria um carrinho com base no identificador (userId ou guestCartId).
 * Esta função garante que sempre tenhamos um carrinho para operar.
 * @param {object} identifier - O objeto de identificação { userId, guestCartId }.
 * @returns {Promise<{cart: Document, newGuestCartId?: string}>} O documento do carrinho e o ID de convidado, se um novo foi criado.
 */
const getOrCreateCart = async (identifier) => {
  let cart = await cartRepository.findByIdentifier(identifier);
  let newGuestCartId = null;

  if (!cart) {
    if (identifier.userId) {
      cart = await cartRepository.create({ userId: identifier.userId });
    } else {
      newGuestCartId = uuidv4();
      cart = await cartRepository.create({ guestCartId: newGuestCartId });
    }
  }
  return { cart, newGuestCartId };
};

/**
 * Revalida o cupom ativo em um carrinho e ajusta os descontos.
 * Esta é uma função crítica que é chamada após qualquer modificação nos itens do carrinho.
 * @param {Document} cart - O documento do carrinho (que já foi modificado em memória).
 * @returns {Promise<{isValid: boolean, reason?: string}>} Um objeto indicando se o cupom ainda é válido.
 */
const revalidateCouponOnCart = async (cart) => {
  if (!cart.activeCouponCode) {
    return { isValid: true }; // Nenhum cupom para validar, então é "válido".
  }

  const coupon = await couponRepository.findByCode(cart.activeCouponCode);

  // Calcula o subtotal pós-descontos dos itens para validar o valor mínimo do cupom.
  const subtotalAfterItemDiscounts = cart.items.reduce((sum, item) => sum + item.totalItemPrice, 0);

  if (!coupon || subtotalAfterItemDiscounts < coupon.minPurchaseValue) {
    cart.couponDiscount = 0;
    cart.activeCouponCode = null;
    cart.couponInfo = null;
    return {
      isValid: false,
      reason: 'O cupom foi removido pois os requisitos de compra não são mais atendidos.',
    };
  }

  // Se ainda for válido, recalcula o valor do desconto.
  if (coupon.type === 'fixed') {
    cart.couponDiscount = Math.min(coupon.value, subtotalAfterItemDiscounts);
  } else { // 'percentage'
    cart.couponDiscount = (subtotalAfterItemDiscounts * coupon.value) / 100;
  }

  return { isValid: true };
};


// --- Serviços Exportados ---

/**
 * Retorna o carrinho atual do usuário ou convidado.
 */
const getCart = async (identifier) => {
  const { cart } = await getOrCreateCart(identifier);
  return { data: cart };
};

/**
 * Adiciona um item ao carrinho ou atualiza sua quantidade se já existir.
 */
const addItemToCart = async (identifier, { productId, quantity }) => {
  const product = await productRepository.findByIdPublic(productId);
  if (!product) throw new AppError('Produto não encontrado.', 404);

  const { cart, newGuestCartId } = await getOrCreateCart(identifier);
  let details = null;

  const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

  if (existingItemIndex > -1) {
    // --- LÓGICA DE ATUALIZAÇÃO ---
    const item = cart.items[existingItemIndex];
    const newQuantity = item.quantity + quantity;

    if (product.stockQuantity < newQuantity) {
      throw new AppError('Estoque insuficiente para a quantidade desejada.', 409);
    }
    item.quantity = newQuantity;
    item.totalItemPrice = newQuantity * item.unitPrice; // Garante a consistência do preço do item

  } else {
    // --- LÓGICA DE ADIÇÃO DE NOVO ITEM ---
    if (product.stockQuantity < quantity) {
      throw new AppError('Quantidade solicitada excede o estoque disponível.', 409);
    }
    const unitPrice = product.isPromotionActive ? product.promotionalPrice : product.price;
    cart.items.push({
      productId,
      name: product.name,
      mainImageUrl: product.mainImageUrl,
      quantity,
      price: product.price,
      promotionalPrice: product.promotionalPrice,
      unitPrice,
      totalItemPrice: quantity * unitPrice, // Garante a consistência do preço do item
    });
  }

  const couponValidation = await revalidateCouponOnCart(cart);
  if (!couponValidation.isValid) {
    details = { couponStatus: 'REMOVED', reason: couponValidation.reason };
  }

  const updatedCart = await cart.save(); // O hook pre-save irá recalcular todos os totais

  return { data: updatedCart, newGuestCartId, details };
};

/**
 * Altera a quantidade de um item específico no carrinho.
 */
const updateItemQuantity = async (identifier, productId, quantity) => {
    const { cart } = await getOrCreateCart(identifier);
    let details = null;
  
    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
    if (itemIndex === -1) throw new AppError('Produto não encontrado no carrinho.', 404);
  
    const product = await productRepository.findByIdPublic(productId);
    if (!product) throw new AppError('Produto não existe mais no catálogo.', 404);
    if (product.stockQuantity < quantity) throw new AppError('A nova quantidade excede o estoque disponível.', 409);
  
    const item = cart.items[itemIndex];
    item.quantity = quantity;
    item.totalItemPrice = quantity * item.unitPrice; // Garante a consistência
  
    const couponValidation = await revalidateCouponOnCart(cart);
    if (!couponValidation.isValid) {
        details = { couponStatus: 'REMOVED', reason: couponValidation.reason };
    }

    const updatedCart = await cart.save();
  
    return { data: updatedCart, details };
};

/**
 * Remove um item completamente do carrinho.
 */
const removeItemFromCart = async (identifier, productId) => {
    const { cart } = await getOrCreateCart(identifier);
    let details = null;

    const initialLength = cart.items.length;
    cart.items = cart.items.filter((item) => item.productId.toString() !== productId);

    if (cart.items.length === initialLength) throw new AppError('Produto não encontrado no carrinho.', 404);

    const couponValidation = await revalidateCouponOnCart(cart);
    if (!couponValidation.isValid) {
        details = { couponStatus: 'REMOVED', reason: couponValidation.reason };
    }

    const updatedCart = await cart.save();

    return { data: updatedCart, details };
};

/**
 * Unifica o carrinho de convidado com o carrinho do usuário após o login.
 */
const mergeCarts = async (userId, guestCartId) => {
    const guestCart = await cartRepository.findByGuestCartId(guestCartId);
    if (!guestCart || guestCart.items.length === 0) {
        // Se não houver carrinho de convidado ou estiver vazio, apenas retorna o do usuário
        const { cart: userCart } = await getOrCreateCart({ userId });
        return { data: userCart };
    }

    const { cart: userCart } = await getOrCreateCart({ userId });

    for (const guestItem of guestCart.items) {
        const existingItemIndex = userCart.items.findIndex(item => item.productId.toString() === guestItem.productId.toString());
        if (existingItemIndex > -1) {
            const userItem = userCart.items[existingItemIndex];
            userItem.quantity += guestItem.quantity; // Soma as quantidades
            userItem.totalItemPrice = userItem.quantity * userItem.unitPrice; // Recalcula o total do item
        } else {
            userCart.items.push(guestItem); // Adiciona o novo item
        }
    }

    await revalidateCouponOnCart(userCart);
    const updatedUserCart = await userCart.save();
    await cartRepository.deleteByGuestCartId(guestCartId);

    return { data: updatedUserCart };
};

/**
 * Aplica um cupom de desconto ao carrinho.
 */
const applyCoupon = async (identifier, couponCode) => {
    const { cart } = await getOrCreateCart(identifier);
    const coupon = await couponRepository.findByCode(couponCode);

    // Usa o total dos itens (subtotal - descontos de promoção) para validar o valor mínimo
    const subtotalAfterItemDiscounts = cart.items.reduce((sum, item) => sum + item.totalItemPrice, 0);

    if (!coupon) throw new AppError('Cupom inválido ou expirado.', 404);
    if (subtotalAfterItemDiscounts < coupon.minPurchaseValue) {
        throw new AppError(`O valor mínimo da compra para usar este cupom é de R$ ${coupon.minPurchaseValue.toFixed(2)}.`, 400);
    }
    
    cart.activeCouponCode = coupon.code;
    cart.couponInfo = { code: coupon.code, description: coupon.description };

    // Calcula o valor do desconto do cupom
    if (coupon.type === 'fixed') {
        cart.couponDiscount = Math.min(coupon.value, subtotalAfterItemDiscounts);
    } else { // 'percentage'
        cart.couponDiscount = (subtotalAfterItemDiscounts * coupon.value) / 100;
    }
    
    const updatedCart = await cart.save();
    
    return { data: updatedCart };
};

/**
 * Remove o cupom de desconto ativo do carrinho.
 */
const removeCoupon = async (identifier) => {
    const { cart } = await getOrCreateCart(identifier);
    
    cart.couponDiscount = 0;
    cart.activeCouponCode = null;
    cart.couponInfo = null;

    const updatedCart = await cart.save();

    return { data: updatedCart };
};


module.exports = {
  getCart,
  addItemToCart,
  updateItemQuantity,
  removeItemFromCart,
  mergeCarts,
  applyCoupon,
  removeCoupon,
};