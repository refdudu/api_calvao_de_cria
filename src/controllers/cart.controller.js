const cartService = require('../services/cart.service');
const asyncHandler = require('../utils/asyncHandler');
const ResponseBuilder = require('../utils/responseBuilder');

const getCart = asyncHandler(async (req, res, next) => {
  const { data } = await cartService.getCart(req.cartIdentifier);
  const response = new ResponseBuilder().withData(data).build();
  res.status(200).json(response);
});

const addItemToCart = asyncHandler(async (req, res, next) => {
  const { data, newGuestCartId, details } = await cartService.addItemToCart(req.cartIdentifier, req.body);

  const responseBuilder = new ResponseBuilder().withData(data);
  
  if (newGuestCartId) {
    // Retorna no header e no body, conforme solicitado
    res.setHeader('X-Guest-Cart-Id-Created', newGuestCartId);
    responseBuilder.withExtra('guestCartId', newGuestCartId);
  }
  if (details) {
      responseBuilder.withDetails(details);
  }

  res.status(200).json(responseBuilder.build());
});

const updateItemQuantity = asyncHandler(async (req, res, next) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    const { data, details } = await cartService.updateItemQuantity(req.cartIdentifier, productId, quantity);
    
    const responseBuilder = new ResponseBuilder().withData(data);
    if (details) {
        responseBuilder.withDetails(details);
    }

    res.status(200).json(responseBuilder.build());
});
  
const removeItemFromCart = asyncHandler(async (req, res, next) => {
    const { productId } = req.params;
    const { data, details } = await cartService.removeItemFromCart(req.cartIdentifier, productId);

    const responseBuilder = new ResponseBuilder().withData(data);
    if (details) {
        responseBuilder.withDetails(details);
    }
    
    res.status(200).json(responseBuilder.build());
});

const mergeCarts = asyncHandler(async (req, res, next) => {
    const { guestCartId } = req.body;
    const { data } = await cartService.mergeCarts(req.user.id, guestCartId);
    res.status(200).json(new ResponseBuilder().withData(data).build());
});

const applyCoupon = asyncHandler(async (req, res, next) => {
    const { couponCode } = req.body;
    const { data } = await cartService.applyCoupon(req.cartIdentifier, couponCode);
    res.status(200).json(new ResponseBuilder().withData(data).withMessage('Cupom aplicado com sucesso.').build());
});

const removeCoupon = asyncHandler(async (req, res, next) => {
    const { data } = await cartService.removeCoupon(req.cartIdentifier);
    res.status(200).json(new ResponseBuilder().withData(data).withMessage('Cupom removido com sucesso.').build());
});

module.exports = {
  getCart,
  addItemToCart,
  updateItemQuantity,
  removeItemFromCart,
  mergeCarts,
  applyCoupon,
  removeCoupon,
};