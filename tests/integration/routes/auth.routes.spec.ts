import request from 'supertest';
import app from '../../../src/app';
import { describe, it, expect } from 'vitest';
import { UserFactory } from '../../factories';
import mongoose from 'mongoose';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';

describe('Rotas de Autenticação - Integração', () => {
  describe('POST /api/v1/auth/register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const userData = {
        name: 'Test Register',
        email: 'register@test.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        cpf: cpfValidator.generate(), // Gera um CPF válido
        phone: '11999999999',
        birthDate: '1990-01-01',
      };

      const res = await request(app).post('/api/v1/auth/register').send(userData);

      expect(res.status).toBe(201);
      expect(res.body.data.user.userId).toBeDefined();
      expect(res.body.data.user.email).toBe(userData.email);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      // Verifica efeito colateral: Usuário salvo no banco
      const createdUser = await mongoose.model('User').findOne({ email: userData.email });
      expect(createdUser).toBeDefined();
      expect(createdUser!.name).toBe(userData.name);
      expect(createdUser!.passwordHash).not.toBe(userData.password); // Deve estar criptografado
    });

    it('deve falhar com email duplicado', async () => {
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

    it('deve falhar quando campos obrigatórios estão faltando', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'missing-pass@test.com' });

      expect(res.status).toBe(422);
      expect(res.body.status).toBe('fail');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('deve fazer login com credenciais válidas', async () => {
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

    it('deve falhar com credenciais inválidas', async () => {
      await UserFactory.create({ email: 'wrongpass@test.com' });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'wrongpass@test.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Credenciais inválidas');
    });
  });

  describe('Segurança: Token de Usuário Deletado', () => {
    it('deve rejeitar token de usuário que foi deletado (401)', async () => {
      // 1. Criar usuário e fazer login para obter token válido
      const user = await UserFactory.create({ email: 'tobeDeleted@test.com' });

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'tobeDeleted@test.com',
        password: 'password123',
      });

      const { accessToken } = loginRes.body.data;
      expect(accessToken).toBeDefined();

      // 2. Deletar o usuário do banco de dados (simulando demissão/exclusão)
      await mongoose.model('User').findByIdAndDelete(user._id);

      // 3. Tentar acessar rota protegida com o token ainda não expirado
      // O middleware auth DEVE rejeitar porque o usuário não existe mais
      const res = await request(app)
        .get('/api/v1/user/me')
        .set('Authorization', `Bearer ${accessToken}`);

      // 4. Verificações de segurança
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('não existe mais');
    });
  });
});
