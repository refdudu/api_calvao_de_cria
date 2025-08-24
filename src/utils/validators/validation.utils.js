const { body } = require('express-validator');

const REGEX = {
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  NAME: /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/,
};

const ERROR_MESSAGES = {
  name: {
    required: 'O nome é obrigatório.',
    min: 'O nome deve ter no mínimo 3 caracteres.',
    max: 'O nome deve ter no máximo 100 caracteres.',
    invalid: 'O nome deve conter apenas letras e espaços.',
  },
  email: {
    required: 'O e-mail é obrigatório.',
    invalid: 'Forneça um e-mail válido.',
    taken: 'E-mail já cadastrado.',
    max: 'O e-mail deve ter no máximo 150 caracteres.',
  },
  cpf: {
    required: 'O cpf é obrigatório.',
    invalid: 'CPF inválido.',
    taken: 'CPF já cadastrado.',
    format: 'O CPF deve ser enviado como texto.',
    length: 'O CPF deve conter exatamente 11 dígitos.',
    numeric: 'O CPF deve conter apenas números.',
  },
  birthDate: {
    required: 'A data de nascimento é obrigatória.',
    invalidFormat: 'Formato de data inválido. Use YYYY-MM-DD.',
    futureDate: 'Data de nascimento não pode ser no futuro.',
    minAge: 'Você deve ter no mínimo 16 anos para se cadastrar.',
  },
  phone: {
    required: 'O phone é obrigatório.',
    invalid: 'Formato de telefone inválido.',
    max: 'O telefone deve ter no máximo 20 caracteres.',
  },
  password: {
    required: 'A senha é obrigatória.',
    min: 'A senha deve ter no mínimo 8 caracteres.',
    weak: 'A senha deve conter uma letra maiúscula, uma minúscula, um número e um caractere especial.',
    mismatch: 'As senhas não coincidem.',
    confirmRequired: 'A confirmação de senha é obrigatória.',
  },
  resetToken: {
    required: 'O token de redefinição é obrigatório.',
    invalid: 'O token de redefinição é inválido.',
    length: 'O token de redefinição possui um formato inválido.',
  },
};

const ALLOWLISTS = {
  REGISTER: [
    'name',
    'email',
    'cpf',
    'birthDate',
    'phone',
    'password',
    'passwordConfirm',
    // 'termsAcceptedVersion' // Futura implementação
  ],
  LOGIN: ['email', 'password'],
  FORGOT_PASSWORD: ['email'],
  RESET_PASSWORD: ['password', 'passwordConfirm'],
};

const nameRule = () =>
  body('name')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.name.required)
    .bail()
    .trim()
    .isLength({ min: 3 })
    .withMessage(ERROR_MESSAGES.name.min)
    .isLength({ max: 100 })
    .withMessage(ERROR_MESSAGES.name.max)
    .matches(REGEX.NAME)
    .withMessage(ERROR_MESSAGES.name.invalid);

const phoneRule = () =>
  body('phone')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.phone.required)
    .bail()
    .trim()
    .isLength({ max: 20 })
    .withMessage(ERROR_MESSAGES.phone.max)
    .isMobilePhone('pt-BR')
    .withMessage(ERROR_MESSAGES.phone.invalid);

const birthDateRule = () =>
  body('birthDate')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.birthDate.required)
    .bail()
    .isISO8601()
    .withMessage(ERROR_MESSAGES.birthDate.invalidFormat)
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      if (birthDate > today) throw new Error(ERROR_MESSAGES.birthDate.futureDate);

      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 16) {
        throw new Error(ERROR_MESSAGES.birthDate.minAge);
      }
      return true;
    });

const passwordRule = () =>
  body('password')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.password.required)
    .bail()
    .isLength({ min: 8 })
    .withMessage(ERROR_MESSAGES.password.min)
    .matches(REGEX.PASSWORD)
    .withMessage(ERROR_MESSAGES.password.weak);

const passwordConfirmRule = () =>
  body('passwordConfirm')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.password.confirmRequired)
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error(ERROR_MESSAGES.password.mismatch);
      }
      return true;
    });

const fieldWhitelistRule = (allowedFields) =>
  body('invalidFields').custom((_, { req }) => {
    const receivedFields = Object.keys(req.body);
    const unknownFields = receivedFields.filter((field) => !allowedFields.includes(field));

    if (unknownFields.length > 0) {
      throw new Error(`Campos não permitidos: ${unknownFields.join(', ')}`);
    }
    return true;
  });

module.exports = {
  ERROR_MESSAGES,
  ALLOWLISTS,
  nameRule,
  phoneRule,
  birthDateRule,
  passwordRule,
  passwordConfirmRule,
  fieldWhitelistRule,
};
