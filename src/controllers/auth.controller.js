const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const ResponseBuilder = require('../utils/responseBuilder');

const register = asyncHandler(async (req, res, next) => {
  const result = await authService.register(req.body);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withData(result.data)
    .withDetails(result.details)
    .build();
  res.status(201).json(response);
});

const login = asyncHandler(async (req, res, next) => {
  const result = await authService.login(req.body.email, req.body.password);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withData(result.data)
    .withDetails(result.details)
    .build();
  res.status(200).json(response);
});

const logout = asyncHandler(async (req, res, next) => {
  const result = await authService.logout(req.user.id);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withData(result.data)
    .withDetails(result.details)
    .build();
  res.status(200).json(response);
});

const refreshToken = asyncHandler(async (req, res, next) => {
  const result = await authService.refreshAccessToken(req.body.refreshToken);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withData(result.data)
    .withDetails(result.details)
    .build();
  res.status(200).json(response);
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const result = await authService.forgotPassword(req.body.email, req.protocol, req.get('host'));
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withData(result.data)
    .withDetails(result.details)
    .build();
  res.status(200).json(response);
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const { resetToken } = req.params;
  const result = await authService.resetPassword(resetToken, req.body.password);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withData(result.data)
    .withDetails(result.details)
    .build();
  res.status(200).json(response);
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
};
