const express = require('express');
const { authMiddleware, restrictTo } = require('../../middlewares/auth.middleware');
const paymentMethodAdminController = require('../../controllers/admin/paymentMethod.admin.controller');
const { createPaymentMethodRules, updatePaymentMethodRules } = require('../../utils/validators/admin/paymentMethod.validator');
const { validate } = require('../../utils/validators/auth.validator');

const router = express.Router();

// Aplica segurança de admin para TODAS as rotas neste arquivo
router.use(authMiddleware, restrictTo('admin'));

router.route('/')
    .get(paymentMethodAdminController.listPaymentMethods)
    .post(createPaymentMethodRules(), validate, paymentMethodAdminController.createPaymentMethod);

router.route('/:methodId')
    .put(updatePaymentMethodRules(), validate, paymentMethodAdminController.updatePaymentMethod);

// Conforme a documentação, não há rota DELETE para este recurso.
// A desativação é feita via PUT com isEnabled: false.

module.exports = router;