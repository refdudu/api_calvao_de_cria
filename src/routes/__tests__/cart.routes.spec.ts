import request from 'supertest';
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { ProductFactory, UserFactory } from '../../tests/factories';
import Cart from '../../models/cart.model';
import mongoose from 'mongoose';

// Since we have src/services/storage/__mocks__/cloudinaryStorage.ts, we can use vi.mock.
vi.mock('../../services/storage/cloudinaryStorage');

const TEST_SECRET = 'testsecret';

describe('Cart Routes Integration', () => {
  let productId: string;

  beforeAll(() => {
    process.env.ACCESS_TOKEN_SECRET = TEST_SECRET;
  });

  beforeEach(async () => {
    // Seed Product using factory
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
    it('should create a guest cart if no token provided', async () => {
      const res = await request(app).post('/api/v1/cart/items').send({ productId, quantity: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      // expect(res.body.guestCartId).toBeDefined(); // Depending on implementation details
      // Check header or extra property
      const guestCartId =
        res.body.data.guestCartId || res.body.guestCartId || res.headers['x-guest-cart-id-created'];
      expect(guestCartId).toBeDefined();

      // Verify DB
      const cart = await Cart.findOne({ guestCartId });
      expect(cart).toBeDefined();
      expect(cart?.items[0].productId.toString()).toBe(productId);
    });

    it('should add item to user cart if token provided', async () => {
      // Create user using factory
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

      // Verify DB
      const cart = await Cart.findOne({ userId: user._id });
      expect(cart).toBeDefined();
    });
  });
});

