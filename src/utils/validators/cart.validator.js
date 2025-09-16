const { body, param } = require('express-validator');
const { mongoIdRuleBody, fieldWhitelistRule } = require('./validation.utils');

// Adicionando uma allowlist para o corpo das requisições do carrinho
const ALLOWLISTS = {
  ADD_ITEM: ['productId', 'quantity'],
  UPDATE_ITEM: ['quantity'],
  MERGE_CART: ['guestCartId'],
  APPLY_COUPON: ['couponCode'],
};

const addItemRules = () => [
  mongoIdRuleBody('productId', 'O ID do produto é inválido.'),

  body('quantity')
    .notEmpty().withMessage('A quantidade é obrigatória.')
    .isInt({ min: 1 })
    .withMessage('A quantidade deve ser um número inteiro maior ou igual a 1.'),
  fieldWhitelistRule(ALLOWLISTS.ADD_ITEM),
];

const updateItemRules = () => [
  param('productId').isMongoId().withMessage('O ID do produto na URL é inválido.'),
  body('quantity')
    .notEmpty().withMessage('A quantidade é obrigatória.')
    .isInt({ min: 1 })
    .withMessage('A quantidade deve ser no mínimo 1. Para remover, utilize a rota DELETE.'),
  fieldWhitelistRule(ALLOWLISTS.UPDATE_ITEM),
];

const removeItemRules = () => [
  param('productId').isMongoId().withMessage('O ID do produto na URL é inválido.'),
];

const mergeCartRules = () => [
  body('guestCartId')
    .notEmpty().withMessage('O guestCartId é obrigatório.')
    .isUUID().withMessage('O ID do carrinho de convidado é inválido.'),
  fieldWhitelistRule(ALLOWLISTS.MERGE_CART),
];

const applyCouponRules = () => [
    body('couponCode')
      .notEmpty().withMessage('O código do cupom é obrigatório.')
      .isString().withMessage('O código do cupom deve ser um texto.')
      .trim()
      .toUpperCase(),
    fieldWhitelistRule(ALLOWLISTS.APPLY_COUPON),
];


module.exports = {
  addItemRules,
  updateItemRules,
  removeItemRules,
  mergeCartRules,
  applyCouponRules
};