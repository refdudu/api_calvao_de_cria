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

module.exports = {
  register,
  login,
};