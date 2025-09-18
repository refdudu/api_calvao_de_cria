const express = require('express');
const { authMiddleware, restrictTo } = require('../../middlewares/auth.middleware');
const orderAdminController = require('../../controllers/admin/order.admin.controller');
const { updateOrderRules } = require('../../utils/validators/admin/order.validator');
const { validate } = require('../../utils/validators/auth.validator'); // Reutilizando a função validate

const router = express.Router();

// Aplica segurança de admin para TODAS as rotas neste arquivo
router.use(authMiddleware, restrictTo('admin'));

router.route('/')
    .get(orderAdminController.listOrders);

router.route('/:orderId')
    .get(orderAdminController.getOrderDetails)
    .patch(updateOrderRules(), validate, orderAdminController.updateOrder);

module.exports = router;