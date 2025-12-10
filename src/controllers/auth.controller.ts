import { Request, Response, NextFunction } from 'express';
import authService, { IAuthService } from '../services/auth.service';
import asyncHandler from '../utils/asyncHandler';
import ResponseBuilder from '../utils/responseBuilder';

export class AuthController {
  constructor(private authService: IAuthService) {}

  register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.authService.register(req.body);
    const response = new ResponseBuilder()
      .withStatus('success')
      .withMessage(result.message)
      .withData(result.data)
      .withDetails(result.details)
      .build();
    res.status(201).json(response);
  });

  login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.authService.login(req.body.email, req.body.password);
    const response = new ResponseBuilder()
      .withStatus('success')
      .withMessage(result.message)
      .withData(result.data)
      .withDetails(result.details)
      .build();
    res.status(200).json(response);
  });

  logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.authService.logout(req.user!.id);
    const response = new ResponseBuilder()
      .withStatus('success')
      .withMessage(result.message)
      .withData(result.data)
      .withDetails(result.details)
      .build();
    res.status(200).json(response);
  });

  refreshToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.authService.refreshAccessToken(req.body.refreshToken);
    const response = new ResponseBuilder()
      .withStatus('success')
      .withMessage(result.message)
      .withData(result.data)
      .withDetails(result.details)
      .build();
    res.status(200).json(response);
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.authService.forgotPassword(
      req.body.email,
      req.protocol,
      req.get('host')!
    );
    const response = new ResponseBuilder()
      .withStatus('success')
      .withMessage(result?.message as string)
      .withData(result?.data)
      .withDetails(result?.details)
      .build();
    res.status(200).json(response);
  });

  resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { resetToken } = req.params;
    const result = await this.authService.resetPassword(resetToken, req.body.password);
    const response = new ResponseBuilder()
      .withStatus('success')
      .withMessage(result.message as string)
      .withData(result.data)
      .withDetails(result.details)
      .build();
    res.status(200).json(response);
  });
}

export default new AuthController(authService);
