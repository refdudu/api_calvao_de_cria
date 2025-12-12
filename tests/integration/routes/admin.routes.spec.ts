import request from 'supertest';
import app from '../../../src/app';
import { describe, it, expect, beforeEach } from 'vitest';
import { UserFactory, ProductFactory } from '../../factories';
import mongoose from 'mongoose';

describe('Rotas de Admin - Integração', () => {
  let adminToken: string;
  let customerToken: string;

  beforeEach(async () => {
    // Criar Admin
    await UserFactory.create({
      email: 'admin@test.com',
      role: 'admin',
    });

    // Criar Cliente
    await UserFactory.create({
      email: 'customer@test.com',
      role: 'customer',
    });

    // Login Admin
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@test.com',
      password: 'password123',
    });
    adminToken = adminLogin.body.data.accessToken;

    // Login Cliente
    const customerLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'customer@test.com',
      password: 'password123',
    });
    customerToken = customerLogin.body.data.accessToken;
  });

  describe('Controle de Acesso e Segurança', () => {
    it('deve negar acesso sem autenticação (401)', async () => {
      const res = await request(app).get('/api/v1/admin/products');
      expect(res.status).toBe(401);
    });

    it('deve negar acesso para usuário não-admin (403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('permissão');
    });

    it('deve permitir acesso para usuário admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Gerenciamento de Produtos (CRUD)', () => {
    it('deve listar produtos para o admin', async () => {
      await ProductFactory.create({ name: 'Admin Product' });

      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('deve criar um novo produto', async () => {
      const newProduct = {
        name: 'New Created Product',
        description: 'Desc',
        price: 99.99,
        stockQuantity: 50,
        isActive: true,
        category: '64aca0b5f1b1c12345678901', // Mock ID
      };

      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProduct);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe(newProduct.name);

      // Efeito colateral: Produto salvo no banco
      const createdProduct = await mongoose.model('Product').findOne({ name: newProduct.name });
      expect(createdProduct).toBeDefined();
      expect(createdProduct!.price).toBe(newProduct.price);
    });

    it('deve deletar um produto', async () => {
      const product = await ProductFactory.create({ name: 'To Delete' });

      const res = await request(app)
        .delete(`/api/v1/admin/products/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Verifica deleção via API
      const check = await request(app).get(`/api/v1/products/${product._id}`);
      expect(check.status).toBe(404);

      // Verifica deleção no banco
      const deletedProduct = await mongoose.model('Product').findById(product._id);
      expect(deletedProduct).toBeNull();
    });
  });
});
