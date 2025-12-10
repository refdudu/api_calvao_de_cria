import { Request, Response, NextFunction } from 'express';
import adminPaymentMethodService, {
  IPaymentMethodAdminService,
} from '../../services/admin/paymentMethod.admin.service';
import asyncHandler from '../../utils/asyncHandler';
import ResponseBuilder from '../../utils/responseBuilder';

export class PaymentMethodAdminController {
  constructor(private adminPaymentMethodService: IPaymentMethodAdminService) {}

  listPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.adminPaymentMethodService.listPaymentMethods();
    res
      .status(200)
      .json(
        new ResponseBuilder()
          .withStatus('success')
          .withMessage(result.message)
          .withData(result.data)
          .build()
      );
  });

  createPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.adminPaymentMethodService.createPaymentMethod(req.body);
    res
      .status(201)
      .json(
        new ResponseBuilder()
          .withStatus('success')
          .withMessage(result.message)
          .withData(result.data)
          .build()
      );
  });

  updatePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
    const { methodId } = req.params;
    const result = await this.adminPaymentMethodService.updatePaymentMethod(methodId, req.body);
    res
      .status(200)
      .json(
        new ResponseBuilder()
          .withStatus('success')
          .withMessage(result.message)
          .withData(result.data)
          .build()
      );
  });
}

export default new PaymentMethodAdminController(adminPaymentMethodService);
