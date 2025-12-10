import { describe, it, expect, vi, beforeEach } from 'vitest';
import userService from '../user.service';
import userRepository from '../../repositories/user.repository';
import { UserFactory } from '../../tests/factories';
import bcrypt from 'bcryptjs';

// Mock Dependencies
vi.mock('../../repositories/user.repository');

// Mock bcryptjs default export
vi.mock('bcryptjs', () => {
  const mockHash = vi.fn().mockResolvedValue('hashed_password_mock');
  return {
    default: {
      hash: mockHash,
      compare: vi.fn(), // if needed
    },
    hash: mockHash, // also mock named export if accessed that way
  };
});

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile if found', async () => {
      const user = UserFactory.build({ _id: 'user123' as any, name: 'John Doe' });
      vi.mocked(userRepository.findById).mockResolvedValue(user as any);

      const result = await userService.getUserProfile('user123');

      expect(userRepository.findById).toHaveBeenCalledWith('user123');
      expect(result.data.name).toBe('John Doe');
      expect(result.data).not.toHaveProperty('passwordHash');
    });

    it('should throw 404 if user not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(userService.getUserProfile('invalid_id')).rejects.toThrow(
        'Usuário não encontrado.'
      );
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = UserFactory.build({ _id: 'user123' as any, name: 'New Name' });
      vi.mocked(userRepository.updateById).mockResolvedValue(updatedUser as any);

      const result = await userService.updateUserProfile('user123', { name: 'New Name' });

      expect(userRepository.updateById).toHaveBeenCalledWith('user123', { name: 'New Name' });
      expect(result.message).toBe('Perfil atualizado com sucesso.');
      expect(result.data.name).toBe('New Name');
    });

    it('should throw 500 if update fails (returns null)', async () => {
      vi.mocked(userRepository.updateById).mockResolvedValue(null);

      await expect(userService.updateUserProfile('user123', { name: 'Fail' })).rejects.toThrow(
        'Não foi possível atualizar o perfil.'
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      // Mock updateById to return something truthy
      vi.mocked(userRepository.updateById).mockResolvedValue({} as any);

      const result = await userService.changePassword('user123', 'NewPass123!');

      // Verify password was hashed
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123!', 10);

      // Verify repository calls
      expect(userRepository.updateById).toHaveBeenCalledWith('user123', {
        passwordHash: 'hashed_password_mock',
      });
      expect(userRepository.updateById).toHaveBeenCalledWith('user123', {
        currentRefreshTokenHash: undefined,
      });

      expect(result.message).toBe('Senha alterada com sucesso.');
    });
  });
});
