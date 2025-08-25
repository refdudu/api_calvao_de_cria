const { body, param } = require('express-validator');
const User = require('../../models/user.model');
const Address = require('../../models/address.model');

const REGEX = {
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  NAME: /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/,
};

const ERROR_MESSAGES = {
  auth: {
    refreshToken: {
      required: 'Refresh token não fornecido.',
      invalid: 'Refresh token inválido.',
      format: 'O refresh token fornecido não está em um formato válido.',
    },
  },
  user: {
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
  },
  address: {
    id: {
      invalid: 'O ID do endereço é inválido.',
    },
    cep: {
      required: 'O CEP é obrigatório.',
      format: 'O CEP deve conter exatamente 8 dígitos numéricos.',
    },
    state: {
      required: 'O estado é obrigatório.',
      format: 'O estado deve ser uma sigla de 2 letras maiúsculas.',
    },
    alias: {
      required: 'O apelido é obrigatório.',
    },
    street: {
      required: 'O logradouro é obrigatório.',
    },
    number: {
      required: 'O número é obrigatório.',
    },
    neighborhood: {
      required: 'O bairro é obrigatório.',
    },
    city: {
      required: 'A cidade é obrigatória.',
    },
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
  UPDATE_PROFILE: ['name', 'birthDate', 'phone'],
  CHANGE_PASSWORD: ['currentPassword', 'password', 'passwordConfirm'],
  ADDRESS: [
    'alias',
    'recipientName',
    'cep',
    'street',
    'number',
    'complement',
    'neighborhood',
    'city',
    'state',
    'phone',
  ],
  REFRESH_TOKEN: ['refreshToken'],
  PRODUCT: [
    'name',
    'description',
    'price',
    'promotionalPrice',
    'isPromotionActive',
    'stockQuantity',
    'isActive',
    'rating',
  ],
};

const nameRule = (name = 'name') =>
  body(name)
    .notEmpty()
    .withMessage(ERROR_MESSAGES.user.name.required)
    .bail()
    .trim()
    .isLength({ min: 3 })
    .withMessage(ERROR_MESSAGES.user.name.min)
    .isLength({ max: 100 })
    .withMessage(ERROR_MESSAGES.user.name.max)
    .matches(REGEX.NAME)
    .withMessage(ERROR_MESSAGES.user.name.invalid);

const phoneRule = () =>
  body('phone')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.user.phone.required)
    .bail()
    .trim()
    .isLength({ max: 20 })
    .withMessage(ERROR_MESSAGES.user.phone.max)
    .isMobilePhone('pt-BR')
    .withMessage(ERROR_MESSAGES.user.phone.invalid);

const birthDateRule = () =>
  body('birthDate')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.user.birthDate.required)
    .bail()
    .isISO8601()
    .withMessage(ERROR_MESSAGES.user.birthDate.invalidFormat)
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      if (birthDate > today) throw new Error(ERROR_MESSAGES.user.birthDate.futureDate);

      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 16) {
        throw new Error(ERROR_MESSAGES.user.birthDate.minAge);
      }
      return true;
    });

const passwordRule = () =>
  body('password')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.user.password.required)
    .bail()
    .isLength({ min: 8 })
    .withMessage(ERROR_MESSAGES.user.password.min)
    .matches(REGEX.PASSWORD)
    .withMessage(ERROR_MESSAGES.user.password.weak);

const passwordConfirmRule = () =>
  body('passwordConfirm')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.user.password.confirmRequired)
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error(ERROR_MESSAGES.user.password.mismatch);
      }
      return true;
    });

const cepRule = () =>
  body('cep')
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.address.cep.required)
    .bail()
    .isString()
    .isLength({ min: 8, max: 8 })
    .withMessage(ERROR_MESSAGES.address.cep.format)
    .isNumeric()
    .withMessage(ERROR_MESSAGES.address.cep.format);

const stateRule = () =>
  body('state')
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.address.state.required)
    .bail()
    .isString()
    .toUpperCase()
    .matches(/^[A-Z]{2}$/)
    .withMessage(ERROR_MESSAGES.address.state.format);

const mongoIdRule = (paramName, message) => param(paramName).isMongoId().withMessage(message);

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
  cepRule,
  stateRule,
  mongoIdRule,
  fieldWhitelistRule,
};
