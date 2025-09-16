const express = require('express');
const cartController = require('../controllers/cart.controller');
const { validate } = require('../utils/validators/auth.validator');
const {
  addItemRules,
  updateItemRules,
  removeItemRules,
  mergeCartRules,
  applyCouponRules,
} = require('../utils/validators/cart.validator');
const { cartIdentifierMiddleware } = require('../middlewares/cart.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// --- Rotas de Cupom ---
// A aplicação de cupom exige um carrinho (logado ou guest), por isso usa o middleware híbrido.
router.post('/coupon', cartIdentifierMiddleware, applyCouponRules(), validate, cartController.applyCoupon);
router.delete('/coupon', cartIdentifierMiddleware, cartController.removeCoupon);


// --- Rotas do Carrinho ---

// Middleware híbrido para identificar o carrinho (logado ou guest)
router.use(cartIdentifierMiddleware);

router.get('/', cartController.getCart);

router.post('/items', addItemRules(), validate, cartController.addItemToCart);

router.put('/items/:productId', updateItemRules(), validate, cartController.updateItemQuantity);

router.delete('/items/:productId', removeItemRules(), validate, cartController.removeItemFromCart);

// A rota de merge requer autenticação estrita, por isso tem seu próprio middleware
router.post('/merge', authMiddleware, mergeCartRules(), validate, cartController.mergeCarts);


module.exports = router;