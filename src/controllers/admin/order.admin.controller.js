const adminOrderService = require('../../services/admin/order.admin.service');
const asyncHandler = require('../../utils/asyncHandler');
const ResponseBuilder = require('../../utils/responseBuilder');

const listOrders = asyncHandler(async (req, res, next) => {
    const result = await adminOrderService.listAllOrders(req.query);
    const response = new ResponseBuilder()
        .withStatus('success')
        .withMessage(result.message)
        .withPagination(result.details)
        .withData(result.data)
        .build();
    res.status(200).json(response);
});

const getOrderDetails = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;
    const result = await adminOrderService.getOrderDetails(orderId);
    const response = new ResponseBuilder()
        .withStatus('success')
        .withMessage(result.message)
        .withData(result.data)
        .build();
    res.status(200).json(response);
});

const updateOrder = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;
    const result = await adminOrderService.updateOrder(orderId, req.body);
    const response = new ResponseBuilder()
        .withStatus('success')
        .withMessage(result.message)
        .withData(result.data)
        .build();
    res.status(200).json(response);
});

module.exports = {
    listOrders,
    getOrderDetails,
    updateOrder,
};