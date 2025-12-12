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
    it('should return a paginated list of products', async () => {
      // Arrange
      const mockProducts = [
        ProductFactory.build({ name: 'Prod 1', price: 10 }),
        ProductFactory.build({ name: 'Prod 2', price: 20 }),
      ];
      const total = 20; // Assume 20 total for pagination checks

      vi.mocked(productRepository.findAllPublic).mockResolvedValue({
        products: mockProducts as any[],
        total,
      });

      const queryParams = { page: '1', limit: '10' };

      // Act
      const result = await productService.listPublicProducts(queryParams);

      // Assert
      expect(productRepository.findAllPublic).toHaveBeenCalledWith(
        expect.any(Object), // filters
        expect.objectContaining({ skip: 0, limit: 10 }) // options
      );
      expect(result.data).toHaveLength(2);
      expect(result.details).toEqual({
        totalItems: 20,
        totalPages: 2, // 20 / 10
        currentPage: 1,
        limit: 10,
      });
    });

    it('should apply search filter by name', async () => {
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

    it('should apply price range filters', async () => {
      const queryParams = { minPrice: '10', maxPrice: '50' };
      vi.mocked(productRepository.findAllPublic).mockResolvedValue({ products: [], total: 0 });

      await productService.listPublicProducts(queryParams);

      // Verify that complex $or logic was constructed
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
    it('should return product details if found', async () => {
      const product = ProductFactory.build({ _id: 'prod123' as any, name: 'Detail Prod' });
      vi.mocked(productRepository.findByIdPublic).mockResolvedValue(product as any);

      const result = await productService.getPublicProductDetails('prod123');

      expect(productRepository.findByIdPublic).toHaveBeenCalledWith('prod123');
      expect(result.data.name).toBe('Detail Prod');
    });

    it('should throw 404 if product not found', async () => {
      vi.mocked(productRepository.findByIdPublic).mockResolvedValue(null);

      await expect(productService.getPublicProductDetails('invalid_id')).rejects.toThrow(
        'Produto não encontrado.'
      );
    });
  });
});
