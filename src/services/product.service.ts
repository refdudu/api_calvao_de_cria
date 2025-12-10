import productRepository, { IProductRepository } from '../repositories/product.repository';
import AppError from '../utils/AppError';
import productTransformer from '../utils/transformers/product.transformer';
import { ServiceResponse, ServiceResponseWithPagination } from '../types/service.types';

export interface IProductService {
  listPublicProducts(queryParams: any): Promise<ServiceResponseWithPagination<any[]>>;
  getPublicProductDetails(productId: string): Promise<ServiceResponse<any>>;
}

export class ProductService implements IProductService {
  constructor(private productRepository: IProductRepository) {}

  async listPublicProducts(queryParams: any) {
    // === FILTROS ===
    const filters: any = {};
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
      const priceRangeQuery: any = {};
      if (queryParams.minPrice) {priceRangeQuery.$gte = parseFloat(queryParams.minPrice);}
      if (queryParams.maxPrice) {priceRangeQuery.$lte = parseFloat(queryParams.maxPrice);}

      // Condição 1: Verifica o promotionalPrice se a promoção estiver ativa
      const condition1 = {
        isPromotionActive: true,
        promotionalPrice: priceRangeQuery,
      };

      // Condição 2: Verifica o price normal se a promoção estiver inativa
      const condition2 = {
        isPromotionActive: { $ne: true }, // $ne: true cobre false e null/undefined
        price: priceRangeQuery,
      };

      priceFilterConditions.push(condition1);
      priceFilterConditions.push(condition2);

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
    const { products, total } = await this.productRepository.findAllPublic(filters, options);

    // === TRANSFORMAÇÃO DOS DADOS ===
    const productsTransformed = products.map(productTransformer.transformProductForPublicList);

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
  }

  async getPublicProductDetails(productId: string) {
    const product = await this.productRepository.findByIdPublic(productId);
    if (!product) {
      throw new AppError('Produto não encontrado.', 404);
    }

    const productObject = productTransformer.transformProductForPublicDetail(product);

    return {
      data: productObject,
      message: 'Detalhes do produto retornados com sucesso.',
      details: null,
    };
  }
}

export default new ProductService(productRepository);
