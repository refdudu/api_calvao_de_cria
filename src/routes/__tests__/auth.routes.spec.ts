import request from 'supertest';
import app from '../../app';
import { describe, it, expect } from 'vitest';
import { UserFactory } from '../../tests/factories';
import mongoose from 'mongoose';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';

describe('Auth Routes Integration', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test Register',
        email: 'register@test.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        cpf: cpfValidator.generate(), // Generate a valid CPF
        phone: '11999999999',
        birthDate: '1990-01-01',
      };

      const res = await request(app).post('/api/v1/auth/register').send(userData);

      expect(res.status).toBe(201);
      expect(res.body.data.user.userId).toBeDefined();
      expect(res.body.data.user.email).toBe(userData.email);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      // Side-effect verification: User persisted in DB
      const createdUser = await mongoose.model('User').findOne({ email: userData.email });
      expect(createdUser).toBeDefined();
      expect(createdUser!.name).toBe(userData.name);
      expect(createdUser!.passwordHash).not.toBe(userData.password); // Should be hashed
    });

    it('should fail with validation error for duplicate email', async () => {
      await UserFactory.create({ email: 'duplicate@test.com' });
      const userData = {
        name: 'Duplicate',
        email: 'duplicate@test.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        cpf: '33333333333',
        phone: '11999999999',
        birthDate: '1990-01-01',
      };

      const res = await request(app).post('/api/v1/auth/register').send(userData);

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('Dados inválidos');
    });

    it('should fail if fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'missing-pass@test.com' });

      expect(res.status).toBe(422);
      expect(res.body.status).toBe('fail');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully valid credentials', async () => {
      await UserFactory.create({
        email: 'login@test.com',
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'login@test.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should fail with invalid credentials', async () => {
      await UserFactory.create({ email: 'wrongpass@test.com' });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'wrongpass@test.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Credenciais inválidas');
    });
  });
});
