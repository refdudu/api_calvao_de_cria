const { body, param, validationResult } = require('express-validator');
const { cpf } = require('cpf-cnpj-validator');
const AppError = require('../AppError');
const userRepository = require('../../repositories/user.repository');
const {
  ERROR_MESSAGES,
  ALLOWLISTS,
  nameRule,
  phoneRule,
  birthDateRule,
  passwordRule,
  passwordConfirmRule,
  fieldWhitelistRule,
} = require('./validation.utils');

const registerRules = () => [
  nameRule(),

  body('email')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.email.required)
    .bail()
    .isEmail()
    .withMessage(ERROR_MESSAGES.email.invalid)
    .isLength({ max: 80 })
    .withMessage(ERROR_MESSAGES.email.max)
    .normalizeEmail()
    .bail()
    .custom(async (email) => {
      if (await userRepository.emailExists(email)) {
        return Promise.reject(ERROR_MESSAGES.email.taken);
      }
    }),

  body('cpf')
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.cpf.required)
    .bail()
    .isString()
    .withMessage(ERROR_MESSAGES.cpf.format)
    .customSanitizer((value) => value.replace(/\D/g, ''))
    .isLength({ min: 11, max: 11 })
    .withMessage(ERROR_MESSAGES.cpf.length)
    .isNumeric()
    .withMessage(ERROR_MESSAGES.cpf.numeric)
    .bail()
    .custom((value) => {
      if (!cpf.isValid(value)) throw new Error(ERROR_MESSAGES.cpf.invalid);
      return true;
    })
    .bail()
    .custom(async (value) => {
      if (await userRepository.cpfExists(value)) {
        return Promise.reject(ERROR_MESSAGES.cpf.taken);
      }
    }),

  birthDateRule(),

  phoneRule(),

  passwordRule(),

  passwordConfirmRule(),

  fieldWhitelistRule(ALLOWLISTS.REGISTER),
];

const loginRules = () => [
  body('email').isEmail().withMessage(ERROR_MESSAGES.email.invalid).normalizeEmail(),
  body('password').notEmpty().withMessage(ERROR_MESSAGES.password.required).bail(),

  fieldWhitelistRule(ALLOWLISTS.LOGIN),
];

const forgotPasswordRules = () => [
  body('email')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.email.required)
    .bail()
    .isEmail()
    .withMessage(ERROR_MESSAGES.email.invalid)
    .normalizeEmail(),

  fieldWhitelistRule(ALLOWLISTS.FORGOT_PASSWORD),
];

const resetPasswordRules = () => [
  param('token')
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.resetToken.required)
    .bail()
    .isHexadecimal()
    .withMessage(ERROR_MESSAGES.resetToken.invalid)
    .isLength({ min: 64, max: 64 })
    .withMessage(ERROR_MESSAGES.resetToken.length),

  passwordRule(),
  passwordConfirmRule(),

  fieldWhitelistRule(ALLOWLISTS.RESET_PASSWORD),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  } // Rota de registro → mensagem genérica de segurança

  // if (req.path === '/register') {
  //   return next(
  //     new AppError(
  //       'Não foi possível realizar o cadastro. Por favor, verifique os dados informados.',
  //       400
  //     )
  //   );
  // }

  // Outras rotas → erros detalhados
  const extractedErrors = errors.array().map((err) => ({ [err.path]: err.msg }));
  return res.status(422).json({
    status: 'fail',
    message: 'Dados inválidos.',
    errors: extractedErrors,
  });
};

module.exports = {
  registerRules,
  loginRules,
  validate,
  forgotPasswordRules,
  resetPasswordRules,
};
