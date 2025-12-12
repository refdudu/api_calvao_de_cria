import request from 'supertest';
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import app from '../../../src/app';
import jwt from 'jsonwebtoken';
import { ProductFactory, UserFactory } from '../../factories';
import Cart from '../../../src/models/cart.model';
import mongoose from 'mongoose';

// Since we have src/services/storage/__mocks__/cloudinaryStorage.ts, we can use vi.mock.
vi.mock('../../../src/services/storage/cloudinaryStorage');

const TEST_SECRET = 'testsecret';

describe('Rotas de Carrinho - Integração', () => {
  let productId: string;

  beforeAll(() => {
    process.env.ACCESS_TOKEN_SECRET = TEST_SECRET;
  });

  beforeEach(async () => {
    // Criar produto usando factory
    const product = await ProductFactory.create({
      name: 'Integration Test Product',
      price: 100,
      stockQuantity: 50,
      description: 'Test Desc',
      mainImageUrl: 'http://img.com/1.jpg',
      isActive: true,
    });
    productId = (product._id as mongoose.Types.ObjectId).toString();
  });

  const generateToken = (userId: string) => {
    return jwt.sign({ userId, role: 'customer' }, TEST_SECRET, { expiresIn: '1h' });
  };

  describe('POST /api/v1/cart/items', () => {
    it('deve criar carrinho de visitante quando não há token', async () => {
      const res = await request(app).post('/api/v1/cart/items').send({ productId, quantity: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      // expect(res.body.guestCartId).toBeDefined(); // Dependendo da implementação
      // Verifica header ou propriedade extra
      const guestCartId =
        res.body.data.guestCartId || res.body.guestCartId || res.headers['x-guest-cart-id-created'];
      expect(guestCartId).toBeDefined();

      // Verifica no banco
      const cart = await Cart.findOne({ guestCartId });
      expect(cart).toBeDefined();
      expect(cart?.items[0].productId.toString()).toBe(productId);
    });

    it('deve adicionar item ao carrinho do usuário logado', async () => {
      // Criar usuário usando factory
      const user = await UserFactory.create({
        email: 'carttest@example.com',
      });
      const token = generateToken((user._id as mongoose.Types.ObjectId).toString());

      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId, quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].quantity).toBe(2);

      // Verifica no banco
      const cart = await Cart.findOne({ userId: user._id });
      expect(cart).toBeDefined();
    });
  });
});

