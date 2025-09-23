const { body } = require('express-validator');
const { mongoIdRule, fieldWhitelistRule } = require('../validation.utils');
const couponRepository = require('../../../repositories/coupon.repository');

const ALLOWLISTS = {
    COUPON: ['code', 'description', 'type', 'value', 'minPurchaseValue', 'expiresAt', 'isActive'],
};

const couponRules = (isUpdate = false) => [
    body('code')
    .optional(isUpdate)
    .notEmpty().withMessage('O código é obrigatório.')
    .trim()
    .toUpperCase()
    .isString().withMessage('O código deve ser um texto.')
    .custom(async (code, { req }) => {
        const coupon = await couponRepository.findByCodeAdmin(code);
        // Se estiver atualizando e o código encontrado for o do próprio cupom, permite.
        if (isUpdate && coupon && coupon._id.toString() === req.params.couponId) {
            return true;
        }
        if (coupon) {
            return Promise.reject('Este cupom já existe.');
        }
    }),

    body('description')
    .optional(isUpdate)
    .notEmpty().withMessage('A descrição é obrigatória.'),

    body('type')
    .optional(isUpdate)
    .notEmpty().withMessage('O tipo é obrigatório.')
    .isIn(['percentage', 'fixed']).withMessage('O tipo deve ser "percentage" ou "fixed".'),

    body('value')
    .optional(isUpdate)
    .notEmpty().withMessage('O valor é obrigatório.')
    .isFloat({ min: 0.01 }).withMessage('O valor do desconto deve ser maior que zero.'),

    body('minPurchaseValue')
    .optional()
    .isFloat({ min: 0 }).withMessage('O valor mínimo da compra deve ser um número positivo.'),

    body('expiresAt')
    .optional(isUpdate)
    .notEmpty().withMessage('A data de expiração é obrigatória.')
    .isISO8601().withMessage('Formato de data inválido. Use YYYY-MM-DD.'),

    body('isActive')
    .optional()
    .isBoolean().withMessage('O status de ativação deve ser um booleano (true/false).'),

    fieldWhitelistRule(ALLOWLISTS.COUPON),
];

const createCouponRules = () => couponRules();
const updateCouponRules = () => [
    mongoIdRule('couponId', 'ID de cupom inválido.'),
    ...couponRules(true),
];

module.exports = {
    createCouponRules,
    updateCouponRules,
};