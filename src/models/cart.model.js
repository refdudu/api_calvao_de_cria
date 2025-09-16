const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    mainImageUrl: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }, // Preço original "cheio" do produto
    promotionalPrice: { type: Number }, // Preço promocional, se aplicável
    unitPrice: { type: Number, required: true }, // Preço efetivo usado (promocional ou original)
    totalItemPrice: { type: Number, required: true }, // quantity * unitPrice
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      unique: true,
      sparse: true,
    },
    guestCartId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },
    items: [cartItemSchema],

    // --- SUMÁRIO COMPLETO E DETALHADO ---
    subtotal: { type: Number, default: 0 },
    itemsDiscount: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
    activeCouponCode: { type: String, default: null, trim: true, uppercase: true },
    couponInfo: {
      code: String,
      description: String,
    },
  },
  {
    timestamps: true,
    minimize: false, // Garante que o objeto couponInfo seja salvo mesmo se estiver vazio
  }
);

// Hook para recalcular o sumário ANTES de qualquer operação de save
cartSchema.pre('save', function (next) {
  const cart = this;

  // 1. Calcula os totais baseados nos itens
  let calculatedSubtotal = 0;
  let calculatedItemsDiscount = 0;
  cart.totalItems = cart.items.reduce((sum, item) => {
    calculatedSubtotal += item.price * item.quantity;
    if (item.promotionalPrice) {
      calculatedItemsDiscount += (item.price - item.promotionalPrice) * item.quantity;
    }
    return sum + item.quantity;
  }, 0);

  cart.subtotal = calculatedSubtotal;
  cart.itemsDiscount = calculatedItemsDiscount;

  // 2. O campo 'couponDiscount' é controlado pelo serviço, então apenas o usamos aqui
  cart.totalDiscount = cart.itemsDiscount + cart.couponDiscount;

  // 3. Calcula o total final
  cart.total = cart.subtotal - cart.totalDiscount;

  // 4. Garante que o couponInfo seja nulo se não houver cupom
  if (!cart.activeCouponCode) {
    cart.couponInfo = null;
  }

  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;