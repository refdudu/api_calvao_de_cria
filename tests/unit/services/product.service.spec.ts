import { describe, it, expect, vi, beforeEach } from 'vitest';
// Mock Dependencies
vi.mock('../../../src/repositories/product.repository');
import productService from '../../../src/services/product.service';
import productRepository from '../../../src/repositories/product.repository';
import { ProductFactory } from '../../factories';
import AppError from '../../../src/utils/AppError';

describe('ProductService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listPublicProducts', () => {
    it('deve retornar lista paginada de produtos', async () => {
      // Arrange
      const mockProducts = [
        ProductFactory.build({ name: 'Prod 1', price: 10 }),
        ProductFactory.build({ name: 'Prod 2', price: 20 }),
      ];
      const total = 20; // Assume 20 total para verificar paginação

      vi.mocked(productRepository.findAllPublic).mockResolvedValue({
        products: mockProducts as any[],
        total,
      });

      const queryParams = { page: '1', limit: '10' };

      // Act
      const result = await productService.listPublicProducts(queryParams);

      // Assert
      expect(productRepository.findAllPublic).toHaveBeenCalledWith(
        expect.any(Object), // filtros
        expect.objectContaining({ skip: 0, limit: 10 }) // opções
      );
      expect(result.data).toHaveLength(2);
      expect(result.details).toEqual({
        totalItems: 20,
        totalPages: 2, // 20 / 10
        currentPage: 1,
        limit: 10,
      });
    });

    it('deve aplicar filtro de busca por nome', async () => {
      const queryParams = { search: 'Test' };
      vi.mocked(productRepository.findAllPublic).mockResolvedValue({ products: [], total: 0 });

      await productService.listPublicProducts(queryParams);

      expect(productRepository.findAllPublic).toHaveBeenCalledWith(
        expect.objectContaining({
          name: { $regex: 'Test', $options: 'i' },
        }),
        expect.anything()
      );
    });

    it('deve aplicar filtros de faixa de preço', async () => {
      const queryParams = { minPrice: '10', maxPrice: '50' };
      vi.mocked(productRepository.findAllPublic).mockResolvedValue({ products: [], total: 0 });

      await productService.listPublicProducts(queryParams);

      // Verifica se a lógica complexa $or foi construída
      const expectedPriceQuery = { $gte: 10, $lte: 50 };
      expect(productRepository.findAllPublic).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            { isPromotionActive: true, promotionalPrice: expectedPriceQuery },
            { isPromotionActive: { $ne: true }, price: expectedPriceQuery },
          ]),
        }),
        expect.anything()
      );
    });
  });

  describe('getPublicProductDetails', () => {
    it('deve retornar detalhes do produto quando encontrado', async () => {
      const product = ProductFactory.build({ _id: 'prod123' as any, name: 'Detail Prod' });
      vi.mocked(productRepository.findByIdPublic).mockResolvedValue(product as any);

      const result = await productService.getPublicProductDetails('prod123');

      expect(productRepository.findByIdPublic).toHaveBeenCalledWith('prod123');
      expect(result.data.name).toBe('Detail Prod');
    });

    it('deve lançar 404 quando produto não é encontrado', async () => {
      vi.mocked(productRepository.findByIdPublic).mockResolvedValue(null);

      await expect(productService.getPublicProductDetails('invalid_id')).rejects.toThrow(
        'Produto não encontrado.'
      );
    });
  });
});
