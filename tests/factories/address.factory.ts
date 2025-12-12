import mongoose from 'mongoose';
import Address from '../../src/models/address.model';

/**
 * Address Factory
 * Provides methods to create address instances for testing
 */

export const AddressFactory = {
  create: async (userId: mongoose.Types.ObjectId, overrides: any = {}) => {
    const defaultAddress = {
      userId,
      alias: 'Home',
      recipientName: 'Receiver Name',
      street: 'Main Street',
      number: '123',
      neighborhood: 'Downtown',
      city: 'Metropolis',
      state: 'SP',
      cep: '01000-000',
      phone: '11988888888',
      ...overrides,
    };
    return Address.create(defaultAddress);
  },
};
