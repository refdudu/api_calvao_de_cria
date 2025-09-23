const couponRepository = require('../../repositories/coupon.repository');
const AppError = require('../../utils/AppError');

const listCoupons = async (queryParams) => {
    const filters = {};
    if (queryParams.isActive !== undefined) {
        filters.isActive = queryParams.isActive === 'true';
    }

    const limit = parseInt(queryParams.limit, 10) || 20;
    const page = parseInt(queryParams.page, 10) || 1;
    const skip = (page - 1) * limit;
    const options = { limit, skip, sort: { createdAt: 'desc' } };

    const { coupons, total } = await couponRepository.findAll(filters, options);
    
    const details = {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
    };

    return { data: coupons, details, message: 'Cupons retornados com sucesso.' };
};

const createCoupon = async (couponData) => {
    const newCoupon = await couponRepository.create(couponData);
    return { data: newCoupon, message: 'Cupom criado com sucesso.' };
};

const getCouponDetails = async (couponId) => {
    const coupon = await couponRepository.findById(couponId);
    if (!coupon) throw new AppError('Cupom não encontrado.', 404);
    return { data: coupon, message: 'Detalhes do cupom retornados com sucesso.' };
};

const updateCoupon = async (couponId, updateData) => {
    const coupon = await couponRepository.updateById(couponId, updateData);
    if (!coupon) throw new AppError('Cupom não encontrado.', 404);
    return { data: coupon, message: 'Cupom atualizado com sucesso.' };
};

const deleteCoupon = async (couponId) => {
    const coupon = await couponRepository.deleteById(couponId);
    if (!coupon) throw new AppError('Cupom não encontrado.', 404);
    return { data: null, message: 'Cupom deletado com sucesso.' };
};

module.exports = {
    listCoupons,
    createCoupon,
    getCouponDetails,
    updateCoupon,
    deleteCoupon,
};