const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const userRepository = require('../repositories/user.repository');
require('dotenv').config();

const authMiddleware = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('Você não está logado. Por favor, faça o login para obter acesso.', 401)
    );
  }

  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  const currentUser = await userRepository.findById(decoded.userId);
  if (!currentUser) {
    return next(new AppError('O usuário pertencente a este token não existe mais.', 401));
  }

  req.user = currentUser;
  next();
});

module.exports = authMiddleware;
