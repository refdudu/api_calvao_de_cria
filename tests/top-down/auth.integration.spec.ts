import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Real classes - NOT mocks
import { AuthService } from '../../src/services/auth.service';
import { AuthController } from '../../src/controllers/auth.controller';
import { createMinimalApp } from './helpers/createMinimalApp';

// Interfaces for typing our stubs
import { IUserRepository } from '../../src/repositories/user.repository';
import { ICartRepository } from '../../src/repositories/cart.repository';

// Mock the email module globally to prevent actual email sending
vi.mock('../../src/utils/email', () => ({
  default: vi.fn().mockImplementation(() => ({
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
  })),
}));

/**
 * TRUE Top-Down Integration Tests
 *
 * Pattern: Route → Real Controller → Real Service → Stub Repository
 *
 * What we test:
 * - Controller properly handles HTTP request
 * - Real service logic (password hashing, validation, token generation)
 * - Service correctly calls repository with processed data
 *
 * What we DON'T test:
 * - Database queries (stubbed)
 * - External services (mocked)
 */
describe('Auth Integration (True Top-Down)', () => {
  // Stubs for repositories - these simulate the data layer
  let stubUserRepo: IUserRepository;
  let stubCartRepo: ICartRepository;

  // Real instances
  let authService: AuthService;
  let authController: AuthController;

  // Test data
  const validCpf = '529.982.247-25';
  const testUserId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup environment
    process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_12345';
    process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_12345';

    // 1. Create STUBS for repositories (lowest layer)
    stubUserRepo = {
      createUser: vi.fn().mockImplementation(async (userData) => ({
        _id: testUserId,
        id: testUserId.toString(),
        name: userData.name,
        email: userData.email,
        cpf: userData.cpf,
        phone: userData.phone,
        role: 'customer',
        passwordHash: userData.passwordHash,
        currentRefreshTokenHash: userData.currentRefreshTokenHash,
      })),
      findByEmailWithPassword: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      findByIdWithRefreshToken: vi.fn().mockResolvedValue(null),
      findUserByEmail: vi.fn().mockResolvedValue(null),
      updateById: vi.fn().mockResolvedValue({}),
      emailExists: vi.fn().mockResolvedValue(false),
      cpfExists: vi.fn().mockResolvedValue(false),
      findByPasswordResetToken: vi.fn().mockResolvedValue(null),
    } as unknown as IUserRepository;

    stubCartRepo = {
      create: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId() }),
      findByIdentifier: vi.fn().mockResolvedValue(null),
    } as unknown as ICartRepository;

    // 2. Instantiate REAL service with stubbed repositories
    authService = new AuthService(stubUserRepo, stubCartRepo);

    // 3. Instantiate REAL controller with real service
    authController = new AuthController(authService);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register user with hashed password (Real Service logic)', async () => {
      // Arrange
      const app = createMinimalApp({ authController });

      const registerPayload = {
        name: 'Renan Test',
        email: 'renan@test.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        cpf: validCpf,
        phone: '11999999999',
        birthDate: '1990-01-01',
      };

      // Act
      const res = await request(app).post('/api/v1/auth/register').send(registerPayload);

      // Assert - HTTP response
      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe('renan@test.com');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      // Assert - Real Service processed the data
      // The stubUserRepo.createUser was called with HASHED password
      expect(stubUserRepo.createUser).toHaveBeenCalledTimes(1);

      const createUserCall = vi.mocked(stubUserRepo.createUser).mock.calls[0][0] as any;

      // Critical: Verify password was HASHED by the real service
      expect(createUserCall.passwordHash).toBeDefined();
      expect(createUserCall.passwordHash).not.toBe('Password123!');
      // Verify it's a valid bcrypt hash
      expect(createUserCall.passwordHash).toMatch(/^\$2[aby]\$/);

      // Verify email normalization happened
      expect(createUserCall.email).toBe('renan@test.com');

      // Verify refresh token hash was generated
      expect(createUserCall.currentRefreshTokenHash).toBeDefined();
      expect(createUserCall.currentRefreshTokenHash.length).toBe(64); // SHA-256 hex

      // Assert - Cart was created for new user
      expect(stubCartRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should fail with 422 when validation fails', async () => {
      // Arrange
      const app = createMinimalApp({ authController });

      // Missing required fields
      const invalidPayload = { email: 'invalid' };

      // Act
      const res = await request(app).post('/api/v1/auth/register').send(invalidPayload);

      // Assert
      expect(res.status).toBe(422);
      expect(stubUserRepo.createUser).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials (Real bcrypt comparison)', async () => {
      // Arrange - Setup existing user with REAL hashed password
      const plainPassword = 'CorrectPassword123!';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const existingUser = {
        _id: testUserId,
        id: testUserId.toString(),
        name: 'Existing User',
        email: 'existing@test.com',
        passwordHash: hashedPassword,
        role: 'customer',
      };

      vi.mocked(stubUserRepo.findByEmailWithPassword).mockResolvedValue(existingUser as any);

      const app = createMinimalApp({ authController });

      // Act
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'existing@test.com',
        password: plainPassword,
      });

      // Assert - HTTP response
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('existing@test.com');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      // Assert - Real Service updated the refresh token hash
      expect(stubUserRepo.updateById).toHaveBeenCalledWith(
        testUserId.toString(),
        expect.objectContaining({
          currentRefreshTokenHash: expect.any(String),
        })
      );
    });

    it('should reject invalid password with 401', async () => {
      // Arrange - Setup user with different password
      const hashedPassword = await bcrypt.hash('RealPassword123!', 10);

      const existingUser = {
        _id: testUserId,
        id: testUserId.toString(),
        email: 'user@test.com',
        passwordHash: hashedPassword,
        role: 'customer',
      };

      vi.mocked(stubUserRepo.findByEmailWithPassword).mockResolvedValue(existingUser as any);

      const app = createMinimalApp({ authController });

      // Act - Try to login with wrong password
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'user@test.com',
        password: 'WrongPassword123!',
      });

      // Assert
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Credenciais inválidas/i);
      // updateById should NOT have been called (login failed)
      expect(stubUserRepo.updateById).not.toHaveBeenCalled();
    });

    it('should reject non-existent user with 401', async () => {
      // Arrange - User not found
      vi.mocked(stubUserRepo.findByEmailWithPassword).mockResolvedValue(null);

      const app = createMinimalApp({ authController });

      // Act
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@test.com',
        password: 'AnyPassword123!',
      });

      // Assert
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Credenciais inválidas/i);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Arrange - Create a real JWT and matching hash
      const jwt = await import('jsonwebtoken');
      const crypto = await import('crypto');

      const refreshToken = jwt.default.sign(
        { userId: testUserId.toString(), role: 'customer' },
        process.env.REFRESH_TOKEN_SECRET as string,
        { expiresIn: '7d' }
      );

      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      const userWithToken = {
        _id: testUserId,
        id: testUserId.toString(),
        role: 'customer',
        currentRefreshTokenHash: tokenHash,
      };

      vi.mocked(stubUserRepo.findByIdWithRefreshToken).mockResolvedValue(userWithToken as any);

      const app = createMinimalApp({ authController });

      // Act
      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBe(refreshToken);
    });

    it('should reject with 401 when token hash does not match (token reuse detection)', async () => {
      // Arrange - Valid JWT but with different hash stored (simulates token theft)
      const jwt = await import('jsonwebtoken');

      const refreshToken = jwt.default.sign(
        { userId: testUserId.toString(), role: 'customer' },
        process.env.REFRESH_TOKEN_SECRET as string
      );

      const userWithDifferentToken = {
        _id: testUserId,
        id: testUserId.toString(),
        role: 'customer',
        currentRefreshTokenHash: 'different_hash_from_another_session',
      };

      vi.mocked(stubUserRepo.findByIdWithRefreshToken).mockResolvedValue(
        userWithDifferentToken as any
      );

      const app = createMinimalApp({ authController });

      // Act
      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });

      // Assert - Real service detected token mismatch
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/sessão é inválida/i);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    // TODO: This test requires a more complex Email mock setup
    // The Email class is instantiated in the service, and mocking it
    // correctly requires either dependency injection or a different approach
    it.skip('should generate reset token and call email service', async () => {
      // Arrange - Existing user
      const existingUser = {
        _id: testUserId,
        id: testUserId.toString(),
        name: 'User',
        email: 'user@test.com',
      };

      vi.mocked(stubUserRepo.findUserByEmail).mockResolvedValue(existingUser as any);

      const app = createMinimalApp({ authController });

      // Act
      const res = await request(app).post('/api/v1/auth/forgot-password').send({
        email: 'user@test.com',
      });

      // Assert
      expect(res.status).toBe(200);

      // Assert - Real service generated and stored reset token
      expect(stubUserRepo.updateById).toHaveBeenCalledWith(
        testUserId.toString(),
        expect.objectContaining({
          resetPasswordToken: expect.any(String),
          resetPasswordExpires: expect.any(Date),
        })
      );

      // The stored token should be a SHA-256 hash (64 hex chars)
      const updateCall = vi.mocked(stubUserRepo.updateById).mock.calls[0][1] as any;
      expect(updateCall.resetPasswordToken.length).toBe(64);
    });

    it('should return 200 even for non-existent user (security)', async () => {
      // Arrange - User not found
      vi.mocked(stubUserRepo.findUserByEmail).mockResolvedValue(null);

      const app = createMinimalApp({ authController });

      // Act
      const res = await request(app).post('/api/v1/auth/forgot-password').send({
        email: 'nonexistent@test.com',
      });

      // Assert - Returns success to prevent email enumeration
      expect(res.status).toBe(200);
      expect(stubUserRepo.updateById).not.toHaveBeenCalled();
    });
  });
});
