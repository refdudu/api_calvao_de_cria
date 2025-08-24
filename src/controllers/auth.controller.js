const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res, next) => {
  const data = await authService.register(req.body);
  res.status(201).json({ status: 'success', data });
});

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const data = await authService.login(email, password);
  res.status(200).json({ status: 'success', data });
});

const logout = asyncHandler(async (req, res, next) => {
  const data = await authService.logout(req.user.id);
  res.status(200).json({ status: 'success', data });
});

const refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new AppError('Refresh token não fornecido.', 400);
  }
  const data = await authService.refreshAccessToken(refreshToken);
  res.status(200).json({ status: 'success', data });
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const result = await authService.forgotPassword(req.body.email, req);

  res.status(200).json({
    status: 'success',
    message: 'Se uma conta com este e-mail existir, um link de recuperação foi enviado.',
    // Apenas para facilitar os testes em desenvolvimento
    data: result,
  });
});

const resetPassword = asyncHandler(async (req, res, next) => {
  await authService.resetPassword(req.params.token, req.body.password);
  res.status(200).json({ status: 'success', message: 'Senha redefinida com sucesso!' });
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
};
