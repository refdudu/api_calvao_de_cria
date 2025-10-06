const cartRepository = require('../repositories/cart.repository');
const addressRepository = require('../repositories/address.repository');
const paymentMethodRepository = require('../repositories/paymentMethod.repository');
const orderRepository = require('../repositories/order.repository');
const couponRepository = require('../repositories/coupon.repository');
const AppError = require('../utils/AppError');
const orderTransformer = require('../utils/transformers/order.transformer');
const { processPixPayment } = require('./payment/pix.service');

/**
 * Gera um número de pedido sequencial e amigável.
 * Ex: 20230923-0001
 */
const generateOrderNumber = async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Esta busca pelo último pedido do dia pode ser otimizada em cenários de alta concorrência.
    const lastOrderToday = await orderRepository.findLastByDatePrefix(datePrefix);

    let sequence = 1;
    if (lastOrderToday) {
        const lastSequence = parseInt(lastOrderToday.orderNumber.split('-')[1], 10);
        sequence = lastSequence + 1;
    }

    const sequenceString = String(sequence).padStart(4, '0');

    return `${datePrefix}-${sequenceString}`;
};


const getPaymentMethods = async () => {
    const methods = await paymentMethodRepository.findAllEnabled();
    return { data: methods, message: 'Métodos de pagamento retornados com sucesso.' };
};

const previewCoupon = async (userId, couponCode) => {
    const cart = await cartRepository.findByIdentifier({ userId });
    if (!cart || cart.items.length === 0) {
        throw new AppError('Seu carrinho está vazio.', 400);
    }

    const coupon = await couponRepository.findByCode(couponCode);
    if (!coupon) {
        throw new AppError('Cupom inválido ou expirado.', 404);
    }

    const subtotal = cart.subtotal - cart.itemsDiscount;

    if (subtotal < coupon.minPurchaseValue) {
        throw new AppError(`O valor mínimo da compra para este cupom é R$ ${coupon.minPurchaseValue.toFixed(2)}.`, 400);
    }

    let discount = 0;
    if (coupon.type === 'fixed') {
        discount = Math.min(coupon.value, subtotal);
    } else { // percentage
        discount = (subtotal * coupon.value) / 100;
    }

    const total = subtotal - discount;

    return {
        data: {
            subtotal: parseFloat(subtotal.toFixed(2)),
            discount: parseFloat(discount.toFixed(2)),
            shipping: 0,
            total: parseFloat(total.toFixed(2)),
            coupon: {
                code: coupon.code,
                message: 'Cupom aplicado com sucesso!',
            },
        },
    };
};

const createOrder = async (userId, { addressId, paymentMethodIdentifier, couponCode }) => {
    // 1. Validar Carrinho
    const cart = await cartRepository.findByIdentifier({ userId });
    if (!cart || cart.items.length === 0) {
        throw new AppError('Seu carrinho está vazio para finalizar a compra.', 400, { errorCode: 'EMPTY_CART' });
    }

    // 2. Validar Endereço
    const address = await addressRepository.findAddressByIdAndUserIdDetail(addressId, userId);
    if (!address) {
        throw new AppError('Endereço de entrega não encontrado ou não pertence a este usuário.', 404);
    }

    // 3. Validar Método de Pagamento
    const paymentMethod = await paymentMethodRepository.findByIdentifier(paymentMethodIdentifier);
    if (!paymentMethod || !paymentMethod.isEnabled) {
        throw new AppError('Método de pagamento inválido ou indisponível.', 400);
    }
    
    // 4. LÓGICA REVISADA: Validar e Aplicar Cupom diretamente aqui
    if (couponCode) {
        const coupon = await couponRepository.findByCode(couponCode);
        const subtotalAfterItemDiscounts = cart.items.reduce((sum, item) => sum + item.totalItemPrice, 0);

        if (!coupon) {
            throw new AppError('Cupom inválido ou expirado.', 400);
        }
        if (subtotalAfterItemDiscounts < coupon.minPurchaseValue) {
            throw new AppError(`O valor mínimo da compra para usar este cupom é de R$ ${coupon.minPurchaseValue.toFixed(2)}.`, 400);
        }
        
        cart.activeCouponCode = coupon.code;
        cart.couponInfo = { code: coupon.code, description: coupon.description };

        if (coupon.type === 'fixed') {
            cart.couponDiscount = Math.min(coupon.value, subtotalAfterItemDiscounts);
        } else { // percentage
            cart.couponDiscount = (subtotalAfterItemDiscounts * coupon.value) / 100;
        }
    } else {
        // Garante que nenhum cupom antigo permaneça no carrinho
        cart.activeCouponCode = null;
        cart.couponInfo = null;
        cart.couponDiscount = 0;
    }

    // 5. RECALCULAR E SALVAR: Persiste as alterações e aciona o hook pre('save') do Mongoose
    // Isso garante que todos os totais sejam recalculados com o desconto do cupom.
    const finalCart = await cart.save();


    // 6. Gerar o número do pedido
    const orderNumber = await generateOrderNumber();

    // --- INTEGRAÇÃO DO PAGAMENTO PROFISSIONAL ---
    // 7. Processar Pagamento
    let paymentData;
    if (paymentMethod.identifier === 'pix') {
        paymentData = await processPixPayment({
            recipientName: address.recipientName,
            total: finalCart.total,
            orderNumber: orderNumber,
        });
    } else {
        throw new AppError('Outros métodos de pagamento ainda não implementados.', 501);
    }
    // --- FIM DA INTEGRAÇÃO ---


    // 6. Estruturar dados do pedido (usando o carrinho agora correto)
    const orderData = {
        orderNumber: orderNumber,
        userId,
        status: 'AWAITING_PAYMENT',
        items: finalCart.items.map(item => ({
            productId: item.productId,
            name: item.name,
            mainImageUrl: item.mainImageUrl,
            quantity: item.quantity,
            priceAtTimeOfPurchase: item.unitPrice,
            totalItemPrice: item.totalItemPrice,
        })),
        shippingAddress: {
            recipientName: address.recipientName,
            street: address.street,
            number: address.number,
            complement: address.complement,
            neighborhood: address.neighborhood,
            city: address.city,
            state: address.state,
            cep: address.cep,
            phone: address.phone,
        },
        totals: {
            subtotal: finalCart.subtotal,
            itemsDiscount: finalCart.itemsDiscount,
            couponDiscount: finalCart.couponDiscount,
            totalDiscount: finalCart.totalDiscount,
            total: finalCart.total,
        },
        payment: paymentData
    };

    // 7. Criar o pedido de forma transacional
    const newOrder = await orderRepository.createOrderTransactional(orderData);

    // 8. Transformar e retornar a resposta
    return {
        data: orderTransformer.transformOrderForCustomer(newOrder),
        message: 'Pedido criado com sucesso.',
    };
};



module.exports = {
    getPaymentMethods,
    previewCoupon,
    createOrder,
};