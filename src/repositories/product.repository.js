const Product = require('../models/product.model');

const create = async (productData) => {
  return Product.create(productData);
};

const findAllAdmin = async (filters, options) => {
  const query = Product.find(filters).sort(options.sort).skip(options.skip).limit(options.limit);

  const products = await query;
  const total = await Product.countDocuments(filters);

  return { products, total };
};

const findByIdAdmin = async (productId) => {
  return Product.findById(productId).select('+isActive');
};

const updateById = async (productId, updateData) => {
  return Product.findByIdAndUpdate(productId, updateData, { new: true, runValidators: true });
};

// A função de deletar na verdade faz um soft delete
const softDeleteById = async (productId) => {
  return Product.findByIdAndUpdate(productId, { isActive: false });
};

const hardDeleteById = async (productId) => {
  return Product.findByIdAndDelete(productId);
};

const findByIdPublic = async (productId) => {
  // Busca apenas se o produto estiver ativo
  return Product.findOne({ _id: productId});
};

const findByImagePublicId = async (publicId, excludeProductId) => {
  return Product.find({
    _id: { $ne: excludeProductId },
    'images.public_id': publicId,
  }).select('_id');
};

const findAllPublic = async (filters, options) => {
  const publicFilters = { ...filters, isActive: true };

  const query = Product.find(publicFilters)
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit);

  const products = await query;
  const total = await Product.countDocuments(publicFilters);

  return { products, total };
};

module.exports = {
  create,
  findAllAdmin,
  findAllPublic,
  findByIdAdmin,
  findByIdPublic,
  updateById,
  softDeleteById,
  hardDeleteById,
  findByImagePublicId,
};
