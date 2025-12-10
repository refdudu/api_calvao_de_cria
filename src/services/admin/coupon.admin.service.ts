import couponRepository, { ICouponRepository } from '../../repositories/coupon.repository';
import AppError from '../../utils/AppError';
import { ICoupon } from '../../models/coupon.model';
import { ServiceResponse, ServiceResponseWithPagination } from '../../types/service.types';

export interface ICouponAdminService {
  listCoupons(queryParams: any): Promise<ServiceResponseWithPagination<ICoupon[]>>;
  createCoupon(couponData: Partial<ICoupon>): Promise<ServiceResponse<ICoupon>>;
  getCouponDetails(couponId: string): Promise<ServiceResponse<ICoupon>>;
  updateCoupon(couponId: string, updateData: Partial<ICoupon>): Promise<ServiceResponse<ICoupon>>;
  deleteCoupon(couponId: string): Promise<ServiceResponse<null>>;
}

export class CouponAdminService implements ICouponAdminService {
  constructor(private couponRepository: ICouponRepository) {}

  async listCoupons(queryParams: any) {
    const filters: any = {};
    if (queryParams.isActive !== undefined) {
      filters.isActive = queryParams.isActive === 'true';
    }

    const limit = parseInt(queryParams.limit, 10) || 20;
    const page = parseInt(queryParams.page, 10) || 1;
    const skip = (page - 1) * limit;
    const options = { limit, skip, sort: { createdAt: 'desc' } };

    const { coupons, total } = await this.couponRepository.findAll(filters, options);

    const details = {
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    };

    return { data: coupons, details, message: 'Cupons retornados com sucesso.' };
  }

  async createCoupon(couponData: Partial<ICoupon>) {
    const newCoupon = await this.couponRepository.create(couponData);
    return { data: newCoupon, message: 'Cupom criado com sucesso.' };
  }

  async getCouponDetails(couponId: string) {
    const coupon = await this.couponRepository.findById(couponId);
    if (!coupon) {throw new AppError('Cupom não encontrado.', 404);}
    return { data: coupon, message: 'Detalhes do cupom retornados com sucesso.' };
  }

  async updateCoupon(couponId: string, updateData: Partial<ICoupon>) {
    const coupon = await this.couponRepository.updateById(couponId, updateData);
    if (!coupon) {throw new AppError('Cupom não encontrado.', 404);}
    return { data: coupon, message: 'Cupom atualizado com sucesso.' };
  }

  async deleteCoupon(couponId: string) {
    const coupon = await this.couponRepository.deleteById(couponId);
    if (!coupon) {throw new AppError('Cupom não encontrado.', 404);}
    return { data: null, message: 'Cupom deletado com sucesso.' };
  }
}

export default new CouponAdminService(couponRepository);
