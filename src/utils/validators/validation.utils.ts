import { body, param, ValidationChain, Meta } from 'express-validator';

export const REGEX = {
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  NAME: /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/,
};

export const ERROR_MESSAGES = {
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

export const ALLOWLISTS = {
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
  ADD_ITEM: ['productId', 'quantity'],
  UPDATE_ITEM: ['quantity'],
  MERGE_CART: ['guestCartId'],
  APPLY_COUPON: ['couponCode'],
  PREVIEW_COUPON: ['couponCode'],
  CHECKOUT: ['addressId', 'paymentMethodIdentifier', 'couponCode'],
};

export const nameRule = (name: string = 'name'): ValidationChain =>
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

export const phoneRule = (): ValidationChain =>
  body('phone')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.user.phone.required)
    .bail()
    .trim()
    .isLength({ max: 20 })
    .withMessage(ERROR_MESSAGES.user.phone.max)
    .isMobilePhone('pt-BR')
    .withMessage(ERROR_MESSAGES.user.phone.invalid);

export const birthDateRule = (): ValidationChain =>
  body('birthDate')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.user.birthDate.required)
    .bail()
    .isISO8601()
    .withMessage(ERROR_MESSAGES.user.birthDate.invalidFormat)
    .custom((value: string) => {
      const birthDate = new Date(value);
      const today = new Date();
      if (birthDate > today) {throw new Error(ERROR_MESSAGES.user.birthDate.futureDate);}

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

export const passwordRule = (): ValidationChain =>
  body('password')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.user.password.required)
    .bail()
    .isLength({ min: 8 })
    .withMessage(ERROR_MESSAGES.user.password.min)
    .matches(REGEX.PASSWORD)
    .withMessage(ERROR_MESSAGES.user.password.weak);

export const passwordConfirmRule = (): ValidationChain =>
  body('passwordConfirm')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.user.password.confirmRequired)
    .custom((value: string, { req }: Meta) => {
      if (value !== req.body.password) {
        throw new Error(ERROR_MESSAGES.user.password.mismatch);
      }
      return true;
    });

export const cepRule = (): ValidationChain =>
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

export const stateRule = (): ValidationChain =>
  body('state')
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.address.state.required)
    .bail()
    .isString()
    .toUpperCase()
    .matches(/^[A-Z]{2}$/)
    .withMessage(ERROR_MESSAGES.address.state.format);

export const mongoIdRule = (paramName: string, message: string): ValidationChain =>
  param(paramName).isMongoId().withMessage(message);

export const mongoIdRuleBody = (fieldName: string, message: string): ValidationChain =>
  body(fieldName).isMongoId().withMessage(message);

export const fieldWhitelistRule = (allowedFields: string[]): ValidationChain =>
  body('invalidFields').custom((_: any, { req }: Meta) => {
    const receivedFields = Object.keys(req.body);
    const unknownFields = receivedFields.filter((field) => !allowedFields.includes(field));

    if (unknownFields.length > 0) {
      throw new Error(`Campos não permitidos: ${unknownFields.join(', ')}`);
    }
    return true;
  });
