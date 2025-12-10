import request from 'supertest';
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import {
  UserFactory,
  ProductFactory,
  AddressFactory,
  CartFactory,
  PaymentMethodFactory,
} from '../../tests/factories';
import Cart from '../../models/cart.model';
import Order from '../../models/order.model';
import mongoose from 'mongoose';

// Ensure cloudinary is mocked
vi.mock('../../services/storage/cloudinaryStorage');
// Mock PixService module to return fake qrcode.
vi.mock('../../services/payment/pix.service', () => ({
  default: {
    processPixPayment: vi.fn().mockResolvedValue({
      method: 'pix',
      type: 'PIX',
      qrCodeImage: 'http://fake.qr/code.png',
      copyPasteCode: '00020126360014BR.GOV.BCB.PIX...',
    }),
  },
}));

const TEST_SECRET = 'testsecret';

describe('Checkout Routes Integration', () => {
  let productId: string;
  let userId: string;
  let token: string;
  let addressId: string;

  beforeAll(() => {
    process.env.ACCESS_TOKEN_SECRET = TEST_SECRET;
  });

  beforeEach(async () => {
    // 1. Seed User
    const user = await UserFactory.create();
    userId = (user._id as mongoose.Types.ObjectId).toString();
    token = jwt.sign({ userId, role: 'customer' }, TEST_SECRET, { expiresIn: '1h' });

    // 2. Seed Address
    const address = await AddressFactory.create(user._id as mongoose.Types.ObjectId);
    addressId = (address._id as mongoose.Types.ObjectId).toString();

    // 3. Seed Payment Method
    await PaymentMethodFactory.create({ identifier: 'pix', name: 'Pix' });

    // 4. Seed Product
    const product = await ProductFactory.create({ price: 50.0, stockQuantity: 100 });
    productId = (product._id as mongoose.Types.ObjectId).toString();

    // 5. Seed Cart with Item
    await CartFactory.create(user._id as mongoose.Types.ObjectId, {
      items: [
        {
          productId: product._id as mongoose.Types.ObjectId,
          name: product.name,
          quantity: 2,
          price: 50.0,
          unitPrice: 50.0,
          totalItemPrice: 100.0,
          mainImageUrl: 'http://img.com/p.png',
        },
      ],
      subtotal: 100.0,
      total: 100.0,
    });
  });

  describe('POST /api/v1/checkout', () => {
    it('should create an order successfully', async () => {
      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          addressId,
          paymentMethodIdentifier: 'pix',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.orderNumber).toBeDefined();
      expect(res.body.data.status).toBe('AWAITING_PAYMENT');
      expect(res.body.data.totals.total).toBe(100.0);

      // Verify Side Effects
      // 1. Cart should be cleared
      const updatedCart = await Cart.findOne({ userId });
      expect(updatedCart).toBeTruthy();
      expect(updatedCart?.items.length).toBe(0);
      expect(updatedCart?.subtotal).toBe(0);

      // 2. Order should exist in DB
      const order = await Order.findOne({ orderNumber: res.body.data.orderNumber });
      expect(order).toBeTruthy();
      expect(order?.userId.toString()).toBe(userId);
      expect(order?.payment.method).toBe('pix');
    });

    it('should fail if cart is empty', async () => {
      // Clear cart first
      await Cart.updateOne({ userId }, { items: [], subtotal: 0, total: 0 });

      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          addressId,
          paymentMethodIdentifier: 'pix',
        });

      expect(res.status).toBe(400); // Bad Request
      expect(res.body.message).toMatch(/vazio/i);
    });
  });
});
