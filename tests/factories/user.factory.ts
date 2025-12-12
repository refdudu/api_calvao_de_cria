import mongoose from 'mongoose';
import User, { IUser } from '../../src/models/user.model';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * User Factory
 * Provides methods to create and build user instances for testing
 */

export const UserFactory = {
  create: async (overrides: Partial<IUser> = {}) => {
    const defaultUser = {
      name: 'Test User',
      email: `test-${uuidv4()}@example.com`,
      cpf: generateValidCPF(),
      passwordHash: await bcrypt.hash('password123', 10),
      phone: '11999999999',
      role: 'customer',
      ...overrides,
    };
    return User.create(defaultUser);
  },

  // Creates a plain object without saving to DB (good for unit tests mocking repositories)
  build: (overrides: Partial<IUser> = {}) => {
    return {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test User',
      email: `test-${uuidv4()}@example.com`,
      cpf: '12345678909',
      passwordHash: 'hashed_password',
      phone: '11999999999',
      role: 'customer',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as unknown as IUser;
  },
};

// Helper to generate a technically valid-looking CPF
function generateValidCPF(): string {
  // Generate 11 random digits
  let cpf = '';
  for (let i = 0; i < 11; i++) {
    cpf += Math.floor(Math.random() * 10).toString();
  }
  return cpf;
}
