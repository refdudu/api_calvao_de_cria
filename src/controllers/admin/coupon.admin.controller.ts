import { Request, Response, NextFunction } from 'express';
import adminCouponService, { ICouponAdminService } from '../../services/admin/coupon.admin.service';
import asyncHandler from '../../utils/asyncHandler';
import ResponseBuilder from '../../utils/responseBuilder';

export class CouponAdminController {
  constructor(private adminCouponService: ICouponAdminService) {}

  listCoupons = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.adminCouponService.listCoupons(req.query);
    res
      .status(200)
      .json(
        new ResponseBuilder()
          .withStatus('success')
          .withMessage(result.message)
          .withPagination(result.details)
          .withData(result.data)
          .build()
      );
  });

  createCoupon = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.adminCouponService.createCoupon(req.body);
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

  getCouponDetails = asyncHandler(async (req: Request, res: Response) => {
    const { couponId } = req.params;
    const result = await this.adminCouponService.getCouponDetails(couponId);
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

  updateCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { couponId } = req.params;
    const result = await this.adminCouponService.updateCoupon(couponId, req.body);
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

  deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { couponId } = req.params;
    await this.adminCouponService.deleteCoupon(couponId);
    res.status(204).send();
  });
}

export default new CouponAdminController(adminCouponService);
