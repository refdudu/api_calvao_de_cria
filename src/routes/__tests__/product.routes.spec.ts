import request from 'supertest';
import app from '../../app';
import { describe, it, expect } from 'vitest';
import { ProductFactory } from '../../tests/factories';

describe('Product Routes Integration', () => {
  describe('GET /api/v1/products', () => {
    it('should return a paginated list of products', async () => {
      // Seed products
      await ProductFactory.create({ name: 'Product A', price: 100, isActive: true });
      await ProductFactory.create({ name: 'Product B', price: 200, isActive: true });

      const res = await request(app).get('/api/v1/products').query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.details.totalItems).toBe(2);
    });

    it('should filter products by name', async () => {
      await ProductFactory.create({ name: 'UniqueName', price: 100, isActive: true });
      await ProductFactory.create({ name: 'Other', price: 100, isActive: true });

      const res = await request(app).get('/api/v1/products').query({ search: 'Unique' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('UniqueName');
    });
  });

  describe('GET /api/v1/products/:productId', () => {
    it('should return product details for valid ID', async () => {
      const product = await ProductFactory.create({
        name: 'Detail Product',
        price: 50,
        isActive: true,
      });

      const res = await request(app).get(`/api/v1/products/${product._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Detail Product');
      expect(res.body.data.id).toBe((product._id as string).toString());
    });

    it('should return 404 for non-existent product ID', async () => {
      // Generate a valid Mongo ID that doesn't exist
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app).get(`/api/v1/products/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Produto não encontrado');
    });
  });
});
