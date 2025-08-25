const productRepository = require('../../repositories/product.repository');
const AppError = require('../../utils/AppError');
const storage = require('../../services/storage/storageFactory');
const {
  transformProductForPublicList,
  transformProductForAdmin,
} = require('../../utils/transformers/product.transformer');

const MAX_IMAGES = 5;

const DEFAULT_IMAGE = {
  url: 'https://res.cloudinary.com/da8t2uqtc/image/upload/v1756135821/download_on1b4w.jpg',
  public_id: 'download_on1b4w',
};

const normalizeImage = async (img) => {
  if (img.public_id) return img;
  if (img.url) return await storage.uploadFromUrl(img.url);
  throw new AppError('Imagem inválida ou URL incorreta', 400);
};

// -------------------- CREATE PRODUCT --------------------
const createProduct = async (rawProductData, files) => {
  const productData = { ...rawProductData };

  if (productData.images && typeof productData.images === 'string') {
    try {
      productData.images = JSON.parse(productData.images);
    } catch (err) {
      throw new AppError('Campo images inválido', 400);
    }
  }

  const images = [];

  const totalImagesIncoming =
    (files?.length || 0) + (Array.isArray(productData.images) ? productData.images.length : 0);
  if (totalImagesIncoming > MAX_IMAGES) {
    throw new AppError(`Produto não pode ter mais de ${MAX_IMAGES} imagens`, 400);
  }

  // Upload de arquivos
  if (files && files.length > 0) {
    const uploadedFiles = await Promise.all(
      files.map((file) => storage.uploadFromBuffer(file.buffer, Date.now().toString()))
    );
    images.push(...uploadedFiles);
  }

  // Upload de URLs
  if (productData.images && Array.isArray(productData.images)) {
    const uploadedUrls = await Promise.all(productData.images.map(normalizeImage));
    images.push(...uploadedUrls);
  }

  if (images.length === 0) images.push(DEFAULT_IMAGE);

  const newProduct = { ...productData, images };
  const product = await productRepository.create(newProduct);

  return {
    data: transformProductForAdmin(product),
    message: 'Produto criado com sucesso.',
    details: null,
  };
};

// -------------------- LIST PRODUCTS --------------------
const listProducts = async (queryParams) => {
  const filters = {};
  if (queryParams.search) filters.name = { $regex: queryParams.search, $options: 'i' };
  // if (queryParams.isActive !== undefined) filters.isActive = queryParams.isActive === 'true';

  const limit = parseInt(queryParams.limit, 10) || 10;
  const page = parseInt(queryParams.page, 10) || 1;
  const skip = (page - 1) * limit;

  const sortField = queryParams.sortBy || 'createdAt';
  const sortOrder = queryParams.order || 'desc';
  const options = { limit, skip, sort: { [sortField]: sortOrder } };

  const { products, total } = await productRepository.findAllAdmin(filters, options);
  const productsTransformed = products.map(transformProductForAdmin);

  return {
    data: productsTransformed,
    message: 'Produtos retornados com sucesso.',
    details: { totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, limit },
  };
};

// -------------------- PRODUCT DETAILS --------------------
const productDetails = async (productId) => {
  const product = await productRepository.findByIdPublic(productId);
  if (!product) throw new AppError('Produto não encontrado.', 404);

  return {
    data: transformProductForAdmin(product),
    message: 'Detalhes do produto retornados com sucesso.',
    details: null,
  };
};

// -------------------- UPDATE PRODUCT --------------------
const updateProduct = async (productId, updateData) => {
  const product = await productRepository.updateById(productId, updateData);
  if (!product) throw new AppError('Produto não encontrado.', 404);

  return {
    data: transformProductForAdmin(product),
    message: 'Produto atualizado com sucesso.',
    details: null,
  };
};

// -------------------- DELETE PRODUCT --------------------
const deleteProduct = async (productId) => {
  const product = await productRepository.hardDeleteById(productId);
  if (!product) throw new AppError('Produto não encontrado.', 404);

  return {
    data: null,
    message: 'Produto removido com sucesso.',
    details: null,
  };
};

// -------------------- UPDATE PRODUCT IMAGES --------------------
const updateProductImages = async (productId, ids) => {
  // order aqui deve ser req.body.order
  const product = await productRepository.findByIdAdmin(productId);
  if (!product) throw new AppError('Produto não encontrado', 404);

  const currentIds = product.images.map((img) => img._id.toString());

  // Se veio errado (ex: { order: [...] }), proteger:
  const idsToOrder = Array.isArray(ids) ? ids : ids.ids;

  if (!Array.isArray(idsToOrder)) {
    throw new AppError('Formato inválido para ordenação de imagens', 400);
  }

  if (currentIds.length !== idsToOrder.length) {
    throw new AppError(
      'Número de imagens enviado não corresponde ao número de imagens do produto',
      400
    );
  }

  const hasDuplicates = new Set(idsToOrder).size !== idsToOrder.length;
  if (hasDuplicates) {
    throw new AppError('Não é permitido repetir a mesma imagem na ordenação', 400);
  }

  const allExist = idsToOrder.every((id) => currentIds.includes(id));
  if (!allExist) {
    throw new AppError('Foram enviados IDs de imagens que não pertencem a este produto', 400);
  }

  const reorderedImages = idsToOrder.map((id) =>
    product.images.find((img) => img._id.toString() === id)
  );

  const updatedProduct = await productRepository.updateById(productId, {
    images: reorderedImages,
    mainImageUrl: reorderedImages[0].url,
  });

  return {
    data: transformProductForAdmin(updatedProduct),
    message: 'Imagens reordenadas com sucesso',
  };
};
// -------------------- ADD PRODUCT IMAGES --------------------
const addProductImages = async (productId, rawData, files) => {
  const product = await productRepository.findByIdAdmin(productId);
  if (!product) throw new AppError('Produto não encontrado', 404);

  const productData = { ...rawData };
  if (productData.images && typeof productData.images === 'string') {
    try {
      productData.images = JSON.parse(productData.images);
    } catch (err) {
      throw new AppError('Campo images inválido', 400);
    }
  }

  const imagesToAdd = [];
  const totalNewImages =
    (files?.length || 0) + (Array.isArray(productData.images) ? productData.images.length : 0);

  if (product.images.length + totalNewImages > MAX_IMAGES) {
    throw new AppError(`Produto não pode ter mais de ${MAX_IMAGES} imagens`, 400);
  }

  if (files && files.length > 0) {
    const uploadedFiles = await Promise.all(
      files.map((file) => storage.uploadFromBuffer(file.buffer, Date.now().toString()))
    );
    imagesToAdd.push(...uploadedFiles);
  }

  if (productData.images && Array.isArray(productData.images)) {
    const uploadedUrls = await Promise.all(productData.images.map(normalizeImage));
    imagesToAdd.push(...uploadedUrls);
  }

  if (imagesToAdd.length === 0) throw new AppError('Nenhuma imagem enviada', 400);

  product.images.push(...imagesToAdd);
  await productRepository.updateById(productId, product);

  return {
    message: 'Imagens adicionadas com sucesso',
    data: transformProductForAdmin(product),
    details: null,
  };
};

// -------------------- DELETE PRODUCT IMAGES --------------------
const deleteProductImages = async (productId, ids) => {
  const product = await productRepository.findByIdAdmin(productId);
  if (!product) throw new AppError('Produto não encontrado', 404);

  const currentIds = product.images.map((img) => img._id.toString());

  // Normalizar: aceitar tanto req.body.ids quanto array puro
  const idsToDelete = Array.isArray(ids) ? ids : ids?.ids;

  if (!Array.isArray(idsToDelete)) {
    throw new AppError(
      'Formato inválido: esperado { "ids": ["id1","id2"] } ou um array direto',
      400
    );
  }

  if (idsToDelete.length === 0) {
    throw new AppError('É necessário enviar pelo menos um _id de imagem para remover', 400);
  }

  // Garantir que todos os _ids realmente pertencem ao produto
  const allExist = idsToDelete.every((id) => currentIds.includes(id));
  if (!allExist) {
    throw new AppError('Foram enviados _ids de imagens que não pertencem a este produto', 400);
  }

  // Separar imagens removidas das restantes
  const remainingImages = [];
  const removedImages = [];

  product.images.forEach((img) => {
    if (idsToDelete.includes(img._id.toString())) {
      removedImages.push(img);
    } else {
      remainingImages.push(img);
    }
  });

  if (removedImages.length === 0) {
    throw new AppError('Nenhuma imagem encontrada para remover. Verifique os _ids enviados', 400);
  }

  // Antes de deletar do Cloudinary, verificar se outras entidades usam essa mesma public_id
  for (const img of removedImages) {
    const otherProducts = await productRepository.findByImagePublicId(img.public_id, productId);
    if (otherProducts.length === 0) {
      await storage.delete(img.public_id);
    }
  }

  // Atualizar produto no banco
  product.images = remainingImages;
  product.mainImageUrl = remainingImages[0]?.url || null;

  await productRepository.updateById(productId, product);

  return {
    message: 'Imagens removidas com sucesso',
    data: transformProductForAdmin(product),
  };
};

module.exports = {
  createProduct,
  listProducts,
  productDetails,
  updateProduct,
  deleteProduct,
  updateProductImages,
  addProductImages,
  deleteProductImages,
};
