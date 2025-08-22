const userRepository = require('../repositories/user.repository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
require('dotenv').config();

const register = async (userData) => {
  const { password } = userData;
  const passwordHash = await bcrypt.hash(password, 10);

  const dataToSave = { ...userData, passwordHash };
  delete dataToSave.password;

  const newUser = await userRepository.createUser(dataToSave);

  const tokens = generateTokens(newUser);

  return {
    tokens,
    user: { _id: newUser._id, name: newUser.name, email: newUser.email },
  };
};

const login = async (email, password) => {
  const user = await userRepository.findByEmail(email);

  const isPasswordValid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !isPasswordValid) {
    throw new AppError('Credenciais inválidas.', 401);
  }

  const tokens = generateTokens(user);

  return {
    tokens,
    user: { _id: user._id, name: user.name, email: user.email },
  };
};

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

module.exports = {
  register,
  login,
};
