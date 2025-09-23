const adminCouponService = require('../../services/admin/coupon.admin.service');
const asyncHandler = require('../../utils/asyncHandler');
const ResponseBuilder = require('../../utils/responseBuilder');

const listCoupons = asyncHandler(async (req, res, next) => {
    const result = await adminCouponService.listCoupons(req.query);
    res.status(200).json(new ResponseBuilder()
        .withStatus('success')
        .withMessage(result.message)
        .withPagination(result.details)
        .withData(result.data)
        .build()
    );
});

const createCoupon = asyncHandler(async (req, res, next) => {
    const result = await adminCouponService.createCoupon(req.body);
    res.status(201).json(new ResponseBuilder()
        .withStatus('success')
        .withMessage(result.message)
        .withData(result.data)
        .build()
    );
});

const getCouponDetails = asyncHandler(async (req, res, next) => {
    const { couponId } = req.params;
    const result = await adminCouponService.getCouponDetails(couponId);
    res.status(200).json(new ResponseBuilder()
        .withStatus('success')
        .withMessage(result.message)
        .withData(result.data)
        .build()
    );
});

const updateCoupon = asyncHandler(async (req, res, next) => {
    const { couponId } = req.params;
    const result = await adminCouponService.updateCoupon(couponId, req.body);
    res.status(200).json(new ResponseBuilder()
        .withStatus('success')
        .withMessage(result.message)
        .withData(result.data)
        .build()
    );
});

const deleteCoupon = asyncHandler(async (req, res, next) => {
    const { couponId } = req.params;
    await adminCouponService.deleteCoupon(couponId);
    res.status(204).send();
});

module.exports = {
    listCoupons,
    createCoupon,
    getCouponDetails,
    updateCoupon,
    deleteCoupon,
};