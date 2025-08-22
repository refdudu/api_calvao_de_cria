const { body, validationResult } = require('express-validator');
const User = require('../../models/user.model');
const AppError = require('../AppError');

const registerRules = () => [
  body('name').notEmpty().withMessage('O nome é obrigatório.'),
  body('email')
    .isEmail()
    .withMessage('Forneça um e-mail válido.')
    .normalizeEmail()
    .custom(async (email) => {
      const user = await User.findOne({ email });
      if (user) {
        return Promise.reject();
      }
    }),
  body('cpf')
    .notEmpty()
    .withMessage('O CPF é obrigatório.')
    .custom(async (cpf) => {
      const user = await User.findOne({ cpf });
      if (user) {
        return Promise.reject();
      }
    }),
  body('password')
    .isLength({ min: 8 })
    .withMessage('A senha deve ter no mínimo 8 caracteres.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage(
      'A senha deve conter uma letra maiúscula, uma minúscula, um número e um caractere especial.'
    ),
];

const loginRules = () => [
  body('email').isEmail().withMessage('Forneça um e-mail válido.').normalizeEmail(),
  body('password').notEmpty().withMessage('A senha é obrigatória.'),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  // Para a rota de registro, sempre damos uma mensagem genérica para evitar enumeração
  if (req.path === '/register') {
    return next(
      new AppError(
        'Não foi possível realizar o cadastro. Por favor, verifique os dados informados.',
        400
      )
    );
  }

  const extractedErrors = errors.array().map((err) => ({ [err.path]: err.msg }));
  return res.status(422).json({
    status: 'error',
    message: 'Erros de validação.',
    errors: extractedErrors,
  });
};

module.exports = {
  registerRules,
  loginRules,
  validate,
};
