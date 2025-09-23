const express = require('express');
const { authMiddleware, restrictTo } = require('../../middlewares/auth.middleware');
const userAdminController = require('../../controllers/admin/user.admin.controller');
// Não precisamos de validadores específicos para essas rotas, pois os parâmetros são da URL

const router = express.Router();

// Aplica segurança de admin para TODAS as rotas neste arquivo
router.use(authMiddleware, restrictTo('admin'));

router.route('/')
    .get(userAdminController.listCustomers);

router.route('/:userId')
    .get(userAdminController.getCustomerDetails);

router.route('/:userId/force-password-reset')
    .post(userAdminController.forcePasswordReset);

module.exports = router;