const express = require('express');
const { authMiddleware, restrictTo } = require('../../middlewares/auth.middleware');
const couponAdminController = require('../../controllers/admin/coupon.admin.controller');
const { createCouponRules, updateCouponRules } = require('../../utils/validators/admin/coupon.validator');
const { validate } = require('../../utils/validators/auth.validator');

const router = express.Router();

// Aplica segurança de admin para TODAS as rotas neste arquivo
router.use(authMiddleware, restrictTo('admin'));

router.route('/')
    .get(couponAdminController.listCoupons)
    .post(createCouponRules(), validate, couponAdminController.createCoupon);

router.route('/:couponId')
    .get(couponAdminController.getCouponDetails)
    .put(updateCouponRules(), validate, couponAdminController.updateCoupon)
    .delete(couponAdminController.deleteCoupon);

module.exports = router;