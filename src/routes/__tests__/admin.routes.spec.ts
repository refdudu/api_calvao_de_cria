import request from 'supertest';
import app from '../../app';
import { describe, it, expect, beforeEach } from 'vitest';
import { UserFactory, ProductFactory } from '../../tests/factories';
import mongoose from 'mongoose';

describe('Admin Routes Integration', () => {
  let adminToken: string;
  let customerToken: string;

  beforeEach(async () => {
    // Create Admin
    await UserFactory.create({
      email: 'admin@test.com',
      role: 'admin',
    });

    // Create Customer
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

    // Login Customer
    const customerLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'customer@test.com',
      password: 'password123',
    });
    customerToken = customerLogin.body.data.accessToken;
  });

  describe('RBAC / Security', () => {
    it('should deny access if not authenticated (401)', async () => {
      const res = await request(app).get('/api/v1/admin/products');
      expect(res.status).toBe(401);
    });

    it('should deny access if user is not admin (403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('permissão');
    });

    it('should allow access if user is admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Product Management (CRUD)', () => {
    it('should list products for admin', async () => {
      await ProductFactory.create({ name: 'Admin Product' });

      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create a new product', async () => {
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

      // Side-effect: Product persisted in DB
      const createdProduct = await mongoose.model('Product').findOne({ name: newProduct.name });
      expect(createdProduct).toBeDefined();
      expect(createdProduct!.price).toBe(newProduct.price);
    });

    it('should delete a product', async () => {
      const product = await ProductFactory.create({ name: 'To Delete' });

      const res = await request(app)
        .delete(`/api/v1/admin/products/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Verify deletion via API
      const check = await request(app).get(`/api/v1/products/${product._id}`);
      expect(check.status).toBe(404);

      // Verify deletion in DB
      const deletedProduct = await mongoose.model('Product').findById(product._id);
      expect(deletedProduct).toBeNull();
    });
  });
});
