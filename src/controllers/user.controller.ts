import { Request, Response, NextFunction } from 'express';
import userService, { IUserService } from '../services/user.service';
import addressService, { IAddressService } from '../services/address.service';
import orderService, { IOrderService } from '../services/order.service';
import asyncHandler from '../utils/asyncHandler';
import ResponseBuilder from '../utils/responseBuilder';
import { IUpdateUserDTO } from '../dtos/user.dto';

export class UserController {
  constructor(
    private userService: IUserService,
    private addressService: IAddressService,
    private orderService: IOrderService
  ) {}

  // --- PROFILE METHODS ---

  getMyProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // req.user is typed via src/types/express.d.ts
    const result = await this.userService.getUserProfile(req.user!.id);
    const response = new ResponseBuilder()
      .withStatus('success')
      .withData(result.data)
      .withMessage(result.message)
      .build();
    res.status(200).json(response);
  });

  updateMyProfile = asyncHandler(
    async (req: Request<{}, {}, IUpdateUserDTO>, res: Response, next: NextFunction) => {
      const { birthDate, ...otherData } = req.body;
      const updatePayload = {
        ...otherData,
        ...(birthDate && { birthDate: new Date(birthDate) }),
      };

      const result = await this.userService.updateUserProfile(req.user!.id, updatePayload);
      const response = new ResponseBuilder()
        .withStatus('success')
        .withData(result.data)
        .withMessage(result.message)
        .build();
      res.status(200).json(response);
    }
  );

  changeMyPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.userService.changePassword(req.user!.id, req.body.newPassword);
    const response = new ResponseBuilder()
      .withStatus('success')
      .withMessage(result.message)
      .build();
    res.status(200).json(response);
  });

  // --- ADDRESS METHODS ---

  listMyAddresses = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.addressService.listAddressesSummary(req.user!.id);
    const response = new ResponseBuilder()
      .withStatus('success')
      .withData(result.data)
      .withMessage(result.message)
      .withDetails(result.details)
      .build();
    res.status(200).json(response);
  });

  addMyAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.addressService.addAddress(req.user!.id, req.body);
    const response = new ResponseBuilder()
      .withStatus('success')
      .withData(result.data)
      .withMessage(result.message)
      .build();
    res.status(201).json(response);
  });

  getMyAddressDetails = asyncHandler(
    async (req: Request<{ addressId: string }>, res: Response, next: NextFunction) => {
      const result = await this.addressService.getAddressDetails(
        req.params.addressId,
        req.user!.id
      );
      const response = new ResponseBuilder()
        .withStatus('success')
        .withData(result.data)
        .withMessage(result.message)
        .build();
      res.status(200).json(response);
    }
  );

  updateMyAddress = asyncHandler(
    async (req: Request<{ addressId: string }>, res: Response, next: NextFunction) => {
      const result = await this.addressService.updateAddress(
        req.params.addressId,
        req.user!.id,
        req.body
      );
      const response = new ResponseBuilder()
        .withStatus('success')
        .withData(result.data)
        .withMessage(result.message)
        .build();
      res.status(200).json(response);
    }
  );

  deleteMyAddress = asyncHandler(
    async (req: Request<{ addressId: string }>, res: Response, next: NextFunction) => {
      await this.addressService.removeAddress(req.params.addressId, req.user!.id);
      res.status(204).send();
    }
  );

  // --- ORDER METHODS ---

  listMyOrders = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.orderService.listUserOrders(req.user!.id, req.query);
    const response = new ResponseBuilder()
      .withStatus('success')
      .withData(result.data)
      .withMessage(result.message)
      .withPagination(result.details)
      .build();
    res.status(200).json(response);
  });

  getMyOrderDetails = asyncHandler(
    async (req: Request<{ orderId: string }>, res: Response, next: NextFunction) => {
      const result = await this.orderService.getUserOrderDetails(req.user!.id, req.params.orderId);
      const response = new ResponseBuilder()
        .withStatus('success')
        .withData(result.data)
        .withMessage(result.message)
        .build();
      res.status(200).json(response);
    }
  );
}

export default new UserController(userService, addressService, orderService);
