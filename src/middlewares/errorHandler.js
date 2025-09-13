const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  // Se o erro já é um AppError que nós criamos, usamos o status e msg dele
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  console.error('ERRO INESPERADO 💥', err);

  return res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
  });
};

module.exports = errorHandler;
