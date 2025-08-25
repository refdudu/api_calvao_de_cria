const adminProductService = require('../../services/admin/product.admin.service');
const asyncHandler = require('../../utils/asyncHandler');
const ResponseBuilder = require('../../utils/responseBuilder');

const createNewProduct = asyncHandler(async (req, res, next) => {
  const files = req.files;
  const result = await adminProductService.createProduct(req.body, files);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withDetails(result.details)
    .withMessage(result.message)
    .withData(result.data)
    .build();

  res.status(201).json(response);
});

const getAllProducts = asyncHandler(async (req, res, next) => {
  const result = await adminProductService.listProducts(req.query);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withDetails(result.details)
    .withData(result.data)
    .build();

  res.status(200).json(response);
});

const getOneProduct = asyncHandler(async (req, res, next) => {
  const result = await adminProductService.productDetails(req.params.productId);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withData(result.data)
    .withDetails(null)
    .build();
  res.status(200).json(response);
});

const updateExistingProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const result = await adminProductService.updateProduct(productId, req.body);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withData(result.data)
    .withDetails(result.details)
    .build();

  res.status(200).json(response);
});

const deleteExistingProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const result = await adminProductService.deleteProduct(productId);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(null)
    .withData(result.data)
    .withDetails(result.details)
    .build();

  res.status(204).json(response);
});

const addProductImages = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const files = req.files;
  const result = await adminProductService.addProductImages(productId, req.body, files);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withData(result.data)
    .build();

  res.status(201).json(response);
});

const updateProductImages = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const result = await adminProductService.updateProductImages(productId, req.body);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(result.message)
    .withData(result.data)
    .build();

  res.status(200).json(response);
});

const deleteProductImages = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const result = await adminProductService.deleteProductImages(productId, req.body);
  const response = new ResponseBuilder()
    .withStatus('success')
    .withMessage(null)
    .withData(result.data)
    .build();

  res.status(200).json(response);
});

module.exports = {
  createNewProduct,
  getAllProducts,
  getOneProduct,
  updateExistingProduct,
  deleteExistingProduct,
  addProductImages,
  updateProductImages,
  deleteProductImages,
};
