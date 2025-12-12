import mongoose from 'mongoose';
import Product, { IProduct } from '../../src/models/product.model';
import { v4 as uuidv4 } from 'uuid';

/**
 * Product Factory
 * Provides methods to create and build product instances for testing
 */

export const ProductFactory = {
  create: async (overrides: Partial<IProduct> = {}) => {
    const defaultProduct = {
      name: `Product ${uuidv4()}`,
      description: 'A great product description.',
      price: 100.0,
      stockQuantity: 10,
      isActive: true,
      mainImageUrl: 'http://example.com/image.jpg',
      category: new mongoose.Types.ObjectId(), // Mock category ID
      ...overrides,
    };
    return Product.create(defaultProduct);
  },

  build: (overrides: Partial<IProduct> = {}) => {
    return {
      _id: new mongoose.Types.ObjectId(),
      name: `Product ${uuidv4()}`,
      description: 'A great product description.',
      price: 100.0,
      stockQuantity: 10,
      isActive: true,
      mainImageUrl: 'http://example.com/image.jpg',
      category: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      slug: `product-${uuidv4()}`,
      ...overrides,
    } as unknown as IProduct;
  },
};
