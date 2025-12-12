import { describe, it, expect, vi, beforeEach } from 'vitest';
// Mock Dependencies
vi.mock('../../../src/repositories/user.repository');
vi.mock('../../../src/repositories/cart.repository');
vi.mock('../../../src/utils/email'); // Mock Email class
import authService from '../../../src/services/auth.service';
import userRepository from '../../../src/repositories/user.repository';
import cartRepository from '../../../src/repositories/cart.repository';
import { UserFactory } from '../../factories';
import AppError from '../../../src/utils/AppError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Email from '../../../src/utils/email';

describe('AuthService', () => {
  // Config vars
  process.env.ACCESS_TOKEN_SECRET = 'access_secret';
  process.env.REFRESH_TOKEN_SECRET = 'refresh_secret';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      // Arrange
      const userData = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
        cpf: '12345678901',
        phone: '11999999999',
      };

      const createdUser = UserFactory.build({
        ...userData,
        _id: 'userId123' as any,
      });

      // Mock Repositories
      vi.mocked(userRepository.createUser).mockResolvedValue(createdUser);
      vi.mocked(cartRepository.create).mockResolvedValue({} as any);

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(userRepository.createUser).toHaveBeenCalledTimes(1);
      expect(cartRepository.create).toHaveBeenCalledWith({ userId: expect.anything() });
      expect(result.data.user).toBeDefined();
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.user.email).toBe(userData.email);
    });

    it('deve lançar erro quando repositório falha (ex: email duplicado)', async () => {
      const userData = { email: 'duplicate@test.com', password: '123', name: 'New User' };
      vi.mocked(userRepository.createUser).mockRejectedValue(new Error('Duplicate key'));

      await expect(authService.register(userData)).rejects.toThrow('Duplicate key');
    });
  });

  describe('login', () => {
    it('deve fazer login com credenciais corretas', async () => {
      // Arrange
      const passwordPlain = 'password123';
      const passwordHash = await bcrypt.hash(passwordPlain, 10);
      const user = UserFactory.build({ email: 'test@example.com', passwordHash });

      vi.mocked(userRepository.findByEmailWithPassword).mockResolvedValue(user);
      vi.mocked(userRepository.updateById).mockResolvedValue(user);

      // Act
      const result = await authService.login('test@example.com', passwordPlain);

      // Assert
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
      expect(userRepository.updateById).toHaveBeenCalled(); // Deve atualizar o hash do refresh token
    });

    it('deve retornar 401 com senha incorreta', async () => {
      const user = UserFactory.build({ passwordHash: 'hashed_real_password' });
      vi.mocked(userRepository.findByEmailWithPassword).mockResolvedValue(user);

      // Act & Assert
      await expect(authService.login('test@example.com', 'wrong_password')).rejects.toThrow(
        'Credenciais inválidas.'
      ); // Verifica mensagem do AppError
    });

    it('deve retornar 401 quando usuário não existe', async () => {
      vi.mocked(userRepository.findByEmailWithPassword).mockResolvedValue(null);

      await expect(authService.login('nonexistent@test.com', '123')).rejects.toThrow(
        'Credenciais inválidas.'
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('deve renovar token com sucesso', async () => {
      // Arrange
      const userId = 'userId123';
      const role = 'customer';
      const validRefreshToken = jwt.sign(
        { userId, role },
        process.env.REFRESH_TOKEN_SECRET as string,
        { expiresIn: '1h' }
      );

      const tokenHash = crypto.createHash('sha256').update(validRefreshToken).digest('hex');
      const user = UserFactory.build({
        _id: userId as any,
        role: role as any,
        currentRefreshTokenHash: tokenHash,
      });

      vi.mocked(userRepository.findByIdWithRefreshToken).mockResolvedValue(user);

      // Act
      const result = await authService.refreshAccessToken(validRefreshToken);

      // Assert
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.refreshToken).toBe(validRefreshToken);
    });

    it('deve falhar quando hash do refresh token não confere (Detecção de Reuso)', async () => {
      const validRefreshToken = jwt.sign(
        { userId: 'u1', role: 'customer' },
        process.env.REFRESH_TOKEN_SECRET as string
      );
      const user = UserFactory.build({ currentRefreshTokenHash: 'old_hash' }); // Hash diferente

      vi.mocked(userRepository.findByIdWithRefreshToken).mockResolvedValue(user);

      await expect(authService.refreshAccessToken(validRefreshToken)).rejects.toThrow(
        'Sua sessão é inválida ou expirou'
      );
    });
  });
});
