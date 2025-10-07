const productRepository = require('../repositories/product.repository');
const AppError = require('../utils/AppError');
const {
  transformProductForPublicList,
  transformProductForPublicDetail,
} = require('../utils/transformers/product.transformer');

const listPublicProducts = async (queryParams) => {
  // === FILTROS ===
  const filters = {};
  const priceFilterConditions = [];

  // Filtro por busca no nome do produto (regex case-insensitive)
  if (queryParams.search) {
    filters.name = { $regex: queryParams.search, $options: 'i' };
  }

  // Filtro por promoção ativa
  if (queryParams.inPromotion === 'true') {
    filters.isPromotionActive = true;
  }

  // Filtro por preço mínimo e máximo
  if (queryParams.minPrice || queryParams.maxPrice) {
    const priceRangeQuery = {};
    if (queryParams.minPrice) priceRangeQuery.$gte = parseFloat(queryParams.minPrice);
    if (queryParams.maxPrice) priceRangeQuery.$lte = parseFloat(queryParams.maxPrice);

    // Condição 1: Verifica o promotionalPrice se a promoção estiver ativa
    priceFilterConditions.push({
      isPromotionActive: true,
      promotionalPrice: priceRangeQuery,
    });

    // Condição 2: Verifica o price normal se a promoção estiver inativa
    priceFilterConditions.push({
      isPromotionActive: { $ne: true }, // $ne: true cobre false e null/undefined
      price: priceRangeQuery,
    });

    // Adiciona a lógica $or ao filtro principal, se houver condições de preço
    if (priceFilterConditions.length > 0) {
      filters.$or = priceFilterConditions;
    }
  }

  // === PAGINAÇÃO E ORDENAÇÃO ===
  const limit = parseInt(queryParams.limit, 10) || 10; // qtd de itens por página
  const page = parseInt(queryParams.page, 10) || 1; // página atual
  const skip = (page - 1) * limit; // quantos itens pular para a página atual

  const sortField = queryParams.sortBy || 'createdAt'; // campo para ordenar
  const sortOrder = queryParams.order || 'desc'; // ascendente ou descendente
  const options = { limit, skip, sort: { [sortField]: sortOrder } };

  // === BUSCA NO REPOSITORY ===
  const { products, total } = await productRepository.findAllPublic(filters, options);

  // === TRANSFORMAÇÃO DOS DADOS ===
  const productsTransformed = products.map(transformProductForPublicList);

  // === RETORNO PADRÃO ===
  return {
    data: productsTransformed,
    message: 'Produtos retornados com sucesso.',
    details: {
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    },
  };
};

const getPublicProductDetails = async (productId) => {
  const product = await productRepository.findByIdPublic(productId);
  if (!product) {
    throw new AppError('Produto não encontrado.', 404);
  }

  const productObject = transformProductForPublicDetail(product);

  return {
    data: productObject,
    message: 'Detalhes do produto retornados com sucesso.',
    details: null,
  };
};

module.exports = {
  listPublicProducts,
  getPublicProductDetails,
};
