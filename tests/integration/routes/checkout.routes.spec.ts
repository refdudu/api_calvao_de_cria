import request from 'supertest';
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { OrderStatus } from '../../../src/enums/order.enum';
import app from '../../../src/app';
import jwt from 'jsonwebtoken';
import {
  UserFactory,
  ProductFactory,
  AddressFactory,
  CartFactory,
  PaymentMethodFactory,
} from '../../factories';
import Cart from '../../../src/models/cart.model';
import Order from '../../../src/models/order.model';
import mongoose from 'mongoose';

// Ensure cloudinary is mocked
vi.mock('../../../src/services/storage/cloudinaryStorage');
// Mock PixService module to return fake qrcode.
vi.mock('../../../src/services/payment/pix.service', () => ({
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

describe('Rotas de Checkout - Integração', () => {
  let productId: string;
  let userId: string;
  let token: string;
  let addressId: string;

  beforeAll(() => {
    process.env.ACCESS_TOKEN_SECRET = TEST_SECRET;
  });

  beforeEach(async () => {
    // 1. Criar usuário
    const user = await UserFactory.create();
    userId = (user._id as mongoose.Types.ObjectId).toString();
    token = jwt.sign({ userId, role: 'customer' }, TEST_SECRET, { expiresIn: '1h' });

    // 2. Criar endereço
    const address = await AddressFactory.create(user._id as mongoose.Types.ObjectId);
    addressId = (address._id as mongoose.Types.ObjectId).toString();

    // 3. Criar método de pagamento
    await PaymentMethodFactory.create({ identifier: 'pix', name: 'Pix' });

    // 4. Criar produto
    const product = await ProductFactory.create({ price: 50.0, stockQuantity: 100 });
    productId = (product._id as mongoose.Types.ObjectId).toString();

    // 5. Criar carrinho com item
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
    it('deve criar um pedido com sucesso', async () => {
      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          addressId,
          paymentMethodIdentifier: 'pix',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.orderNumber).toBeDefined();
      expect(res.body.data.status).toBe(OrderStatus.AWAITING_PAYMENT);
      expect(res.body.data.totals.total).toBe(100.0);

      // Verifica efeitos colaterais
      // 1. Carrinho deve estar vazio
      const updatedCart = await Cart.findOne({ userId });
      expect(updatedCart).toBeTruthy();
      expect(updatedCart?.items.length).toBe(0);
      expect(updatedCart?.subtotal).toBe(0);

      // 2. Pedido deve existir no banco
      const order = await Order.findOne({ orderNumber: res.body.data.orderNumber });
      expect(order).toBeTruthy();
      expect(order?.userId.toString()).toBe(userId);
      expect(order?.payment.method).toBe('pix');
    });

    it('deve falhar quando o carrinho está vazio', async () => {
      // Limpar carrinho primeiro
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
