const { body, param, query } = require('express-validator');
const { validate } = require('./auth.validator');
const AppError = require('../../utils/AppError');

const { ALLOWLISTS, mongoIdRule, fieldWhitelistRule } = require('./validation.utils');

const allowedQueryParams = [
  'search',
  'inPromotion',
  'minPrice',
  'maxPrice',
  'page',
  'limit',
  'sortBy',
  'order',
];

const createProductRules = () => [
  body('name').notEmpty().withMessage('O nome do produto é obrigatório.').trim(),
  body('description').notEmpty().withMessage('A descrição é obrigatória.'),
  body('price').isFloat({ gt: 0 }).withMessage('O preço deve ser um número maior que zero.'),
  body('stockQuantity')
    .isInt({ min: 0 })
    .withMessage('O estoque deve ser um número inteiro igual ou maior que zero.'),
];

const updateProductRules = () => [
  mongoIdRule('productId', 'ID do produto inválido.').bail(),
  body('name').optional().notEmpty().withMessage('O nome do produto é obrigatório.').trim(),
  body('price')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('O preço deve ser um número maior que zero.'),
  body('stockQuantity')
    .optional()
    .isInt({ min: 0 })
    .toInt()
    .withMessage('O estoque deve ser um número inteiro igual ou maior que zero.'),
  body('isPromotionActive')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('O status da promoção deve ser um booleano.'),
  body('isActive').optional().isBoolean().withMessage('O status de ativação deve ser um booleano.'),
  fieldWhitelistRule(ALLOWLISTS.PRODUCT),
];

const deleteProductRules = () => [mongoIdRule('productId', 'ID do produto inválido.').bail()];

const listProductsRules = () => [
  query().custom((_, { req }) => {
    const invalidKeys = Object.keys(req.query).filter((k) => !allowedQueryParams.includes(k));
    if (invalidKeys.length > 0) {
      throw new AppError(`Parâmetros não permitidos: ${invalidKeys.join(', ')}`, 400);
    }
    return true;
  }),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('O parâmetro "page" deve ser um número inteiro maior ou igual a 1.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 25 })
    .withMessage('limit deve ser um número inteiro entre 1 e 25.'),
  query('search')
    .optional()
    .isString()
    .trim()
    .withMessage('O parâmetro "search" deve ser uma string.'),
  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'rating'])
    .withMessage('O parâmetro "sortBy" deve ser um dos campos permitidos: name, price, rating.'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('O parâmetro "order" deve ser "asc" ou "desc".'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('O parâmetro "minPrice" deve ser um número maior ou igual a zero.'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('O parâmetro "maxPrice" deve ser um número maior ou igual a zero.'),
  query('inPromotion')
    .optional()
    .isBoolean()
    .withMessage('O parâmetro "inPromotion" deve ser um booleano (true ou false).'),
];

const validateUpdateImages = () => [
  param('productId').isMongoId().withMessage('ID do produto inválido.'),
  body('ids').isArray({ min: 1 }).withMessage('O campo "ids" deve ser um array de _ids'),
  body('ids.*').isMongoId().withMessage('Cada _id no ids deve ser válido'),
];

const validateAddImages = () => [
  param('productId').isMongoId().withMessage('ID do produto inválido.'),
  (req, res, next) => {
    if (
      (!req.files || req.files.length === 0) &&
      (!req.body.images || req.body.images.length === 0)
    ) {
      return next(new AppError('Nenhum arquivo ou URL enviado', 400));
    }
    next();
  },
];

const validateDeleteImages = () => [
  param('productId').isMongoId().withMessage('ID do produto inválido.'),
  body('ids').isArray({ min: 1 }).withMessage('O campo "ids" deve ser um array de _ids'),
  body('ids.*').isMongoId().withMessage('Cada _id no "ids" deve ser válido'),
];

module.exports = {
  createProductRules,
  updateProductRules,
  deleteProductRules,
  listProductsRules,
  validateUpdateImages,
  validateAddImages,
  validateDeleteImages,
  validate,
};
