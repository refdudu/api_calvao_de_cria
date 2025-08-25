const express = require('express');
const { authMiddleware, restrictTo } = require('../../middlewares/auth.middleware');
const productAdminController = require('../../controllers/admin/product.admin.controller');
const upload = require('../../middlewares/upload.middleware');
const {
  createProductRules,
  updateProductRules,
  deleteProductRules,
  validateUpdateImages,
  validateAddImages,
  validateDeleteImages,
  validate,
} = require('../../utils/validators/product.validator');

const router = express.Router();

// Aplica segurança de admin para TODAS as rotas neste arquivo
router.use(authMiddleware, restrictTo('admin'));

router
  .route('/')
  .get(productAdminController.getAllProducts)
  .post(
    upload.array('images', 5),
    createProductRules(),
    validate,
    productAdminController.createNewProduct
  );

router
  .route('/:productId')
  .get(productAdminController.getOneProduct)
  .patch(updateProductRules(), validate, productAdminController.updateExistingProduct)
  .delete(deleteProductRules(), validate, productAdminController.deleteExistingProduct);

// Rotas para manipulação de imagens
router
  .post(
    '/:productId/images',
    upload.array('images'),
    validateAddImages(),
    validate,
    productAdminController.addProductImages
  )
  .patch(
    '/:productId/images',
    validateUpdateImages(),
    validate,
    productAdminController.updateProductImages
  )
  .delete(
    '/:productId/images',
    validateDeleteImages(),
    validate,
    productAdminController.deleteProductImages
  );

module.exports = router;
