import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError';
import asyncHandler from '../utils/asyncHandler';
import userRepository from '../repositories/user.repository';
import dotenv from 'dotenv';
import { AuthenticatedUser } from '../types/express';

dotenv.config();

export const authMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('Você não está logado. Por favor, faça o login para obter acesso.', 401)
      );
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as any;

      // const currentUser = await userRepository.findById(decoded.userId);
      // if (!currentUser) {
      //   return next(new AppError('O usuário pertencente a este token não existe mais.', 401));
      // }
      // req.user = currentUser;

      req.user = { id: decoded.userId, role: decoded.role };

      next();
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Sua sessão expirou. Por favor, faça login novamente.', 401));
      }
      // Para outros erros de JWT (assinatura inválida, etc.)
      return next(new AppError('Token inválido ou corrompido.', 401));
    }
  }
);

export const restrictTo = (...roles: string[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Você não tem permissão para realizar esta ação.', 403));
    }

    const freshUser = await userRepository.findByIdWithRole(req.user.id);

    if (!freshUser || !roles.includes(freshUser.role)) {
      return next(
        new AppError(
          'Sessão inválida ou permissões alteradas. Por favor, faça login novamente.',
          401
        )
      );
    }

    req.user = freshUser as AuthenticatedUser;
    next();
  });
};
