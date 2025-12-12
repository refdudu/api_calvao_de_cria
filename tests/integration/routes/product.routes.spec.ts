import request from 'supertest';
import app from '../../../src/app';
import { describe, it, expect } from 'vitest';
import { ProductFactory } from '../../factories';

describe('Rotas de Produtos - Integração', () => {
  describe('GET /api/v1/products', () => {
    it('deve retornar lista paginada de produtos', async () => {
      // Criar produtos
      await ProductFactory.create({ name: 'Product A', price: 100, isActive: true });
      await ProductFactory.create({ name: 'Product B', price: 200, isActive: true });

      const res = await request(app).get('/api/v1/products').query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.details.totalItems).toBe(2);
    });

    it('deve filtrar produtos pelo nome', async () => {
      await ProductFactory.create({ name: 'UniqueName', price: 100, isActive: true });
      await ProductFactory.create({ name: 'Other', price: 100, isActive: true });

      const res = await request(app).get('/api/v1/products').query({ search: 'Unique' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('UniqueName');
    });
  });

  describe('GET /api/v1/products/:productId', () => {
    it('deve retornar detalhes do produto com ID válido', async () => {
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

    it('deve retornar 404 para ID inexistente', async () => {
      // Gerar um ID Mongo válido que não existe
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app).get(`/api/v1/products/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Produto não encontrado');
    });
  });
});
