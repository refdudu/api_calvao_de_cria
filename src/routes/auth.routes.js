const express = require('express');
const authController = require('../controllers/auth.controller');
const {
  registerRules,
  loginRules,
  validate,
  forgotPasswordRules,
  resetPasswordRules,
  refreshTokenRules,
} = require('../utils/validators/auth.validator');
const { authMiddleware } = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/register', registerRules(), validate, authController.register);
router.post('/login', loginRules(), validate, authController.login);
router.post('/refresh', refreshTokenRules(), authController.refreshToken);
router.post('/forgot-password', forgotPasswordRules(), validate, authController.forgotPassword);
router.post(
  '/reset-password/:resetToken',
  resetPasswordRules(),
  validate,
  authController.resetPassword
);

router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
