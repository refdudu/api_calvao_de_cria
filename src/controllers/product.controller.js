const productService = require('../services/product.service');
const asyncHandler = require('../utils/asyncHandler');
const ResponseBuilder = require('../utils/responseBuilder');

const getAllProducts = asyncHandler(async (req, res, next) => {
  const result = await productService.listPublicProducts(req.query);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withDetails(result.details)
    .withData(result.data)
    .build();

  res.status(200).json(response);
});

const getOneProduct = asyncHandler(async (req, res, next) => {
  const result = await productService.getPublicProductDetails(req.params.productId);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage('Detalhes do produto retornados com sucesso.')
    .withData(result.data)
    .withDetails(null)
    .build();
  res.status(200).json(response);
});

module.exports = {
  getAllProducts,
  getOneProduct,
};
