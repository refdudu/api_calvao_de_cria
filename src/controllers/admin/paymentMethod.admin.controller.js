const adminPaymentMethodService = require('../../services/admin/paymentMethod.admin.service');
const asyncHandler = require('../../utils/asyncHandler');
const ResponseBuilder = require('../../utils/responseBuilder');

const listPaymentMethods = asyncHandler(async (req, res, next) => {
    const result = await adminPaymentMethodService.listPaymentMethods();
    res.status(200).json(new ResponseBuilder()
        .withStatus('success')
        .withMessage(result.message)
        .withData(result.data)
        .build()
    );
});

const createPaymentMethod = asyncHandler(async (req, res, next) => {
    const result = await adminPaymentMethodService.createPaymentMethod(req.body);
    res.status(201).json(new ResponseBuilder()
        .withStatus('success')
        .withMessage(result.message)
        .withData(result.data)
        .build()
    );
});

const updatePaymentMethod = asyncHandler(async (req, res, next) => {
    const { methodId } = req.params;
    const result = await adminPaymentMethodService.updatePaymentMethod(methodId, req.body);
    res.status(200).json(new ResponseBuilder()
        .withStatus('success')
        .withMessage(result.message)
        .withData(result.data)
        .build()
    );
});

module.exports = {
    listPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
};