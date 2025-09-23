const adminUserService = require('../../services/admin/user.admin.service');
const asyncHandler = require('../../utils/asyncHandler');
const ResponseBuilder = require('../../utils/responseBuilder');

const listCustomers = asyncHandler(async (req, res, next) => {
const result = await adminUserService.listCustomers(req.query);
const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withPagination(result.details)
    .withData(result.data)
    .build();
    res.status(200).json(response);
});

const getCustomerDetails = asyncHandler(async (req, res, next) => {
const { userId } = req.params;
const result = await adminUserService.getCustomerDetails360(userId);
const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withData(result.data)
    .build();
    res.status(200).json(response);
});

const forcePasswordReset = asyncHandler(async (req, res, next) => {
const { userId } = req.params;
const result = await adminUserService.forcePasswordResetForUser(
    userId,
    req.protocol,
    req.get('host')
);
const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .build();
    res.status(200).json(response);
});

module.exports = {
    listCustomers,
    getCustomerDetails,
    forcePasswordReset,
};