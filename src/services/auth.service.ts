import mongoose from 'mongoose';
import userRepository, { IUserRepository } from '../repositories/user.repository';
import cartRepository, { ICartRepository } from '../repositories/cart.repository';
import userTransformer from '../utils/transformers/user.transformer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import AppError from '../utils/AppError';
import Email from '../utils/email'; //MOCK
import { IUser } from '../models/user.model';
import dotenv from 'dotenv';
import { Types } from 'mongoose';

import { ServiceResponse } from '../types/service.types';
import {
  IRegisterDTO,
  IUserWithTokens,
  ITokens,
  IResetPasswordTokenResponse,
} from '../dtos/auth.dto';

dotenv.config();

export interface IAuthService {
  register(userData: IRegisterDTO): Promise<ServiceResponse<IUserWithTokens>>;
  login(email: string, password: string): Promise<ServiceResponse<IUserWithTokens>>;
  logout(userId: string): Promise<ServiceResponse<null>>;
  refreshAccessToken(token: string): Promise<ServiceResponse<ITokens>>;
  forgotPassword(
    email: string,
    protocol: string,
    host: string
  ): Promise<ServiceResponse<IResetPasswordTokenResponse> | undefined>;
  resetPassword(token: string, newPassword: string): Promise<ServiceResponse<null>>;
}

export class AuthService implements IAuthService {
  constructor(
    private userRepository: IUserRepository,
    private cartRepository: ICartRepository
  ) {}

  private generateTokens(user: IUser) {
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.REFRESH_TOKEN_SECRET as string,
      { expiresIn: '7d' }
    );
    return { accessToken, refreshToken };
  }

  async register(userData: IRegisterDTO) {
    const { password, ...restUserData } = userData;
    const passwordHash = await bcrypt.hash(password, 10);

    const userId = new mongoose.Types.ObjectId();

    const tempUser = { _id: userId, role: 'customer' } as IUser;
    const { accessToken, refreshToken } = this.generateTokens(tempUser);

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const dataToSave = {
      ...restUserData,
      _id: userId,
      passwordHash,
      currentRefreshTokenHash: refreshTokenHash,
    };

    const newUser = await this.userRepository.createUser(dataToSave);
    await this.cartRepository.create({ userId: new Types.ObjectId(newUser.id) });

    return {
      data: {
        user: userTransformer.summary(newUser),
        accessToken,
        refreshToken,
      },
      message: undefined,
      details: null,
    };
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmailWithPassword(email);
    const isPasswordValid = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !isPasswordValid) {
      throw new AppError('Credenciais inválidas.', 401);
    }

    const { accessToken, refreshToken } = this.generateTokens(user);
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await this.userRepository.updateById(user.id, { currentRefreshTokenHash: refreshTokenHash });

    return {
      data: {
        user: userTransformer.summary(user),
        accessToken,
        refreshToken,
      },
      message: null,
      details: null,
    };
  }

  async logout(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (user) {
      await this.userRepository.updateById(userId, { currentRefreshTokenHash: '' });
    }
    return {
      data: null,
      message: 'Logout realizado com sucesso.',
      details: null,
    };
  }

  async refreshAccessToken(token: string) {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.userId) {
      throw new AppError('Refresh token inválido.', 401);
    }

    const user = await this.userRepository.findByIdWithRefreshToken(decoded.userId);
    const receivedTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    if (
      !user ||
      !user.currentRefreshTokenHash ||
      user.currentRefreshTokenHash !== receivedTokenHash
    ) {
      throw new AppError('Sua sessão é inválida ou expirou. Por favor, faça login novamente.', 401);
    }

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET as string);

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '15m' }
    );

    return {
      data: {
        accessToken,
        refreshToken: token,
      },
      message: undefined,
      details: null,
    };
  }

  async forgotPassword(email: string, protocol: string, host: string) {
    const user = await this.userRepository.findUserByEmail(email);
    if (!user) {
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expirationDate = new Date(Date.now() + 10 * 60 * 1000);

    await this.userRepository.updateById(user.id, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expirationDate,
    });

    try {
      const resetURL = `${protocol}://${host}/api/v1/auth/reset-password/${resetToken}`;
      const simpleUserForEmail = { email: user.email, name: user.name };
      await new Email(simpleUserForEmail, resetURL).sendPasswordReset();
    } catch (err) {
      await this.userRepository.updateById(user.id, {
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
      });
      throw new AppError(
        'Houve um erro ao enviar o e-mail. Por favor, tente novamente mais tarde.',
        500
      );
    }

    return {
      data: process.env.NODE_ENV === 'development' ? { resetToken } : null,
      message: 'Se uma conta com este e-mail existir, um link de recuperação foi enviado.',
      details: null,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepository.findByPasswordResetToken(hashedToken);

    if (!user) {
      throw new AppError('Token inválido ou expirado.', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updatePayload: any = {
      $set: {
        passwordHash,
        currentRefreshTokenHash: null,
      },
      $unset: {
        resetPasswordToken: '',
        resetPasswordExpires: '',
      },
    };

    await this.userRepository.updateById(user.id, updatePayload);

    return {
      data: null,
      message: 'Senha redefinida com sucesso!',
      details: null,
    };
  }
}

export default new AuthService(userRepository, cartRepository);
