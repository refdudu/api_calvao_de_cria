import { describe, it, expect, vi, beforeEach } from 'vitest';
// Mock Dependencies
vi.mock('../../../src/repositories/user.repository');
import userService from '../../../src/services/user.service';
import userRepository from '../../../src/repositories/user.repository';
import { UserFactory } from '../../factories';
import bcrypt from 'bcryptjs';

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
    it('deve retornar perfil do usuário quando encontrado', async () => {
      const user = UserFactory.build({ _id: 'user123' as any, name: 'John Doe' });
      vi.mocked(userRepository.findById).mockResolvedValue(user as any);

      const result = await userService.getUserProfile('user123');

      expect(userRepository.findById).toHaveBeenCalledWith('user123');
      expect(result.data.name).toBe('John Doe');
      expect(result.data).not.toHaveProperty('passwordHash');
    });

    it('deve lançar 404 quando usuário não é encontrado', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(userService.getUserProfile('invalid_id')).rejects.toThrow(
        'Usuário não encontrado.'
      );
    });
  });

  describe('updateUserProfile', () => {
    it('deve atualizar perfil do usuário com sucesso', async () => {
      const updatedUser = UserFactory.build({ _id: 'user123' as any, name: 'New Name' });
      vi.mocked(userRepository.updateById).mockResolvedValue(updatedUser as any);

      const result = await userService.updateUserProfile('user123', { name: 'New Name' });

      expect(userRepository.updateById).toHaveBeenCalledWith('user123', { name: 'New Name' });
      expect(result.message).toBe('Perfil atualizado com sucesso.');
      expect(result.data.name).toBe('New Name');
    });

    it('deve lançar 500 quando atualização falha (retorna null)', async () => {
      vi.mocked(userRepository.updateById).mockResolvedValue(null);

      await expect(userService.updateUserProfile('user123', { name: 'Fail' })).rejects.toThrow(
        'Não foi possível atualizar o perfil.'
      );
    });
  });

  describe('changePassword', () => {
    it('deve alterar senha com sucesso', async () => {
      // Mock updateById para retornar algo truthy
      vi.mocked(userRepository.updateById).mockResolvedValue({} as any);

      const result = await userService.changePassword('user123', 'NewPass123!');

      // Verifica se a senha foi criptografada
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123!', 10);

      // Verifica chamadas ao repositório
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
