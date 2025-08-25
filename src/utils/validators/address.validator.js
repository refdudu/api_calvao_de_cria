const { body } = require('express-validator');
const {
  ALLOWLISTS,
  ERROR_MESSAGES,
  nameRule,
  phoneRule,
  cepRule,
  stateRule,
  mongoIdRule,
  fieldWhitelistRule,
} = require('./validation.utils');

const createAddressRules = () => [
  body('alias').notEmpty().withMessage(ERROR_MESSAGES.address.alias.required).trim(),
  nameRule('recipientName').trim(),
  cepRule(),
  body('street').notEmpty().withMessage(ERROR_MESSAGES.address.street.required).trim(),
  body('number').notEmpty().withMessage(ERROR_MESSAGES.address.number.required).trim(),
  body('neighborhood').notEmpty().withMessage(ERROR_MESSAGES.address.neighborhood.required).trim(),
  body('city').notEmpty().withMessage(ERROR_MESSAGES.address.city.required).trim(),
  stateRule(),
  phoneRule(),
  fieldWhitelistRule(ALLOWLISTS.ADDRESS),
];

const updateAddressRules = () => [
  mongoIdRule('addressId', ERROR_MESSAGES.address.id.invalid).bail(),
  cepRule().optional(),
  stateRule().optional(),
  body('alias')
    .optional()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.address.alias.required)
    .trim(),
  nameRule('recipientName').optional().trim(),
  body('street')
    .optional()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.address.street.required)
    .trim(),
  body('number')
    .optional()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.address.number.required)
    .trim(),
  body('neighborhood')
    .optional()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.address.neighborhood.required)
    .trim(),
  body('city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.address.city.required)
    .trim(),
  phoneRule().optional(),
  fieldWhitelistRule(ALLOWLISTS.ADDRESS),
];

const getAddressDetailsRules = () => [mongoIdRule('addressId', ERROR_MESSAGES.address.id.invalid)];

const deleteAddressRules = () => [mongoIdRule('addressId', ERROR_MESSAGES.address.id.invalid)];

module.exports = {
  createAddressRules,
  updateAddressRules,
  getAddressDetailsRules,
  deleteAddressRules,
};
