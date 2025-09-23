const mongoose = require('mongoose');
const userRepository = require('../repositories/user.repository');
const cartRepository = require('../repositories/cart.repository'); 
const userTransformer = require('../utils/transformers/user.transformer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const Email = require('../utils/email'); //MOCK
require('dotenv').config();

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

const register = async (userData) => {
  const { password, role, ...restUserData } = userData;
  const passwordHash = await bcrypt.hash(password, 10);

  const userId = new mongoose.Types.ObjectId();

  const { accessToken, refreshToken } = generateTokens({ _id: userId, role: 'customer' });

  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const dataToSave = {
    ...restUserData,
    _id: userId,
    passwordHash,
    currentRefreshTokenHash: refreshTokenHash,
  };

  const newUser = await userRepository.createUser(dataToSave);
  await cartRepository.create({ userId: newUser._id });

  const newUserObj = newUser.toObject ? newUser.toObject() : newUser;

  return {
    data: userTransformer.loginOrRegister(newUserObj, { accessToken, refreshToken }),
    message: null,
    details: null,
  };
};

const login = async (email, password) => {
  const user = await userRepository.findByEmailWithPassword(email);
  const isPasswordValid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !isPasswordValid) {
    throw new AppError('Credenciais inválidas.', 401);
  }

  const { accessToken, refreshToken } = generateTokens(user);
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await userRepository.updateById(user._id, { currentRefreshTokenHash: refreshTokenHash });

  return {
    data: userTransformer.loginOrRegister(user, { accessToken, refreshToken }),
    message: null,
    details: null,
  };
};

const logout = async (userId) => {
  const user = await userRepository.findById(userId);
  if (user) {
    await userRepository.updateById(userId, { currentRefreshTokenHash: null });
  }
  return {
    data: null,
    message: 'Logout realizado com sucesso.',
    details: null,
  };
};

const refreshAccessToken = async (token) => {
  const decoded = jwt.decode(token);
  if (!decoded || !decoded.userId) {
    throw new AppError('Refresh token inválido.', 401);
  }

  const user = await userRepository.findByIdWithRefreshToken(decoded.userId);
  const receivedTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Valida se o token recebido corresponde ao armazenado no banco
  if (
    !user ||
    !user.currentRefreshTokenHash ||
    user.currentRefreshTokenHash !== receivedTokenHash
  ) {
    throw new AppError('Sua sessão é inválida ou expirou. Por favor, faça login novamente.', 401);
  }

  // Verifica a assinatura e expiração do refresh token
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );

  return {
    data: { accessToken, refreshToken: token },
    message: null,
    details: null,
  };
};

const forgotPassword = async (email, protocol, host) => {
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');

  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expirationDate = Date.now() + 10 * 60 * 1000;

  await userRepository.updateById(user._id, {
    resetPasswordToken: hashedToken,
    resetPasswordExpires: expirationDate,
  });

  try {
    const resetURL = `${protocol}://${host}/api/v1/auth/reset-password/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
  } catch (err) {
    await userRepository.updateById(user._id, {
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
    });
    throw new AppError(
      'Houve um erro ao enviar o e-mail. Por favor, tente novamente mais tarde.',
      500
    );
  }

  return {
    data: process.env.NODE_ENV === 'development' ? { resetToken } : null,
    message: 'Se uma conta com este e-mail existir, um link de recuperação foi enviado.',
    details: null,
  };
};

const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await userRepository.findByPasswordResetToken(hashedToken);

  if (!user) {
    throw new AppError('Token inválido ou expirado.', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const updatePayload = {
    $set: {
      passwordHash,
      currentRefreshTokenHash: null,
    },
    $unset: {
      resetPasswordToken: '',
      resetPasswordExpires: '',
    },
  };

  await userRepository.updateById(user._id, updatePayload);

  return {
    data: null,
    message: 'Senha redefinida com sucesso!',
    details: null,
  };
};

module.exports = {
  register,
  login,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
};
