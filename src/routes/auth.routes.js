const express = require('express');
const authController = require('../controllers/auth.controller');
const { registerRules, loginRules, validate } = require('../utils/validators/auth.validator');
const router = express.Router();

router.post('/register', registerRules(), validate, authController.register);
router.post('/login', loginRules(), validate, authController.login);

module.exports = router;
