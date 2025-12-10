import { body, param, validationResult, ValidationChain, Meta } from 'express-validator';
import { cpf } from 'cpf-cnpj-validator';
import AppError from '../../utils/AppError'; // path fixed? src/utils/AppError
import userRepository from '../../repositories/user.repository';
import { Request, Response, NextFunction } from 'express';
import {
  ERROR_MESSAGES,
  ALLOWLISTS,
  nameRule,
  phoneRule,
  birthDateRule,
  passwordRule,
  passwordConfirmRule,
  fieldWhitelistRule,
} from './validation.utils';

export const registerRules = (): ValidationChain[] => [
  nameRule(),

  body('email')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.user.email.required)
    .bail()
    .isEmail()
    .withMessage(ERROR_MESSAGES.user.email.invalid)
    .isLength({ max: 80 })
    .withMessage(ERROR_MESSAGES.user.email.max)
    .normalizeEmail()
    .bail()
    .custom(async (email: string) => {
      if (await userRepository.emailExists(email)) {
        return Promise.reject(ERROR_MESSAGES.user.email.taken);
      }
    }),

  body('cpf')
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.user.cpf.required)
    .bail()
    .isString()
    .withMessage(ERROR_MESSAGES.user.cpf.format)
    .customSanitizer((value: string) => value.replace(/\D/g, ''))
    .isLength({ min: 11, max: 11 })
    .withMessage(ERROR_MESSAGES.user.cpf.length)
    .isNumeric()
    .withMessage(ERROR_MESSAGES.user.cpf.numeric)
    .bail()
    .custom((value: string) => {
      if (!cpf.isValid(value)) {throw new Error(ERROR_MESSAGES.user.cpf.invalid);}
      return true;
    })
    .bail()
    .custom(async (value: string) => {
      if (await userRepository.cpfExists(value)) {
        return Promise.reject(ERROR_MESSAGES.user.cpf.taken);
      }
    }),

  birthDateRule(),

  phoneRule(),

  passwordRule(),

  passwordConfirmRule(),

  fieldWhitelistRule(ALLOWLISTS.REGISTER),
];

export const loginRules = (): ValidationChain[] => [
  body('email').isEmail().withMessage(ERROR_MESSAGES.user.email.invalid).normalizeEmail(),
  body('password').notEmpty().withMessage(ERROR_MESSAGES.user.password.required).bail(),

  fieldWhitelistRule(ALLOWLISTS.LOGIN),
];

export const forgotPasswordRules = (): ValidationChain[] => [
  body('email')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.user.email.required)
    .bail()
    .isEmail()
    .withMessage(ERROR_MESSAGES.user.email.invalid)
    .normalizeEmail(),

  fieldWhitelistRule(ALLOWLISTS.FORGOT_PASSWORD),
];

export const resetPasswordRules = (): ValidationChain[] => [
  param('resetToken')
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.user.resetToken.required)
    .bail()
    .isHexadecimal()
    .withMessage(ERROR_MESSAGES.user.resetToken.invalid)
    .isLength({ min: 64, max: 64 })
    .withMessage(ERROR_MESSAGES.user.resetToken.length),

  passwordRule(),
  passwordConfirmRule(),

  fieldWhitelistRule(ALLOWLISTS.RESET_PASSWORD),
];

export const refreshTokenRules = (): ValidationChain[] => [
  body('refreshToken')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.auth.refreshToken.required)
    .bail()
    .isJWT()
    .withMessage(ERROR_MESSAGES.auth.refreshToken.invalid)
    .matches(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
    .withMessage(ERROR_MESSAGES.auth.refreshToken.format),

  fieldWhitelistRule(ALLOWLISTS.REFRESH_TOKEN),
];

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = errors.array().map((err: any) => ({ [err.path]: err.msg }));

  return res.status(422).json({
    status: 'fail',
    message: 'Dados inválidos.',
    errors: extractedErrors,
  });
};
