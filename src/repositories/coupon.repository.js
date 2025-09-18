const Coupon = require('../models/coupon.model');

/**
 * [PUBLIC] Encontra um cupom ativo pelo seu código.
 * @param {string} code - O código do cupom.
 * @returns {Promise<Document|null>}
 */
const findByCode = async (code) => {
  return Coupon.findOne({ code, isActive: true, expiresAt: { $gt: new Date() } });
};

/**
 * [ADMIN] Encontra um cupom pelo código, independentemente do status.
 * @param {string} code - O código do cupom.
 * @returns {Promise<Document|null>}
 */
const findByCodeAdmin = async (code) => {
    return Coupon.findOne({ code });
};

/**
 * [ADMIN] Cria um novo cupom.
 * @param {object} couponData - Os dados do cupom.
 * @returns {Promise<Document>}
 */
const create = async (couponData) => {
    return Coupon.create(couponData);
};

/**
 * [ADMIN] Retorna todos os cupons com filtros e paginação.
 * @param {object} filters - Filtros de busca.
 * @param {object} options - Opções de paginação e ordenação.
 * @returns {Promise<{coupons: Document[], total: number}>}
 */
const findAll = async (filters, options) => {
    const query = Coupon.find(filters).sort(options.sort).skip(options.skip).limit(options.limit);
    const coupons = await query;
    const total = await Coupon.countDocuments(filters);
    return { coupons, total };
};

/**
 * [ADMIN] Encontra um cupom pelo seu ID.
 * @param {string} id - O ID do cupom.
 * @returns {Promise<Document|null>}
 */
const findById = async (id) => {
    return Coupon.findById(id);
};

/**
 * [ADMIN] Atualiza um cupom pelo seu ID.
 * @param {string} id - O ID do cupom.
 * @param {object} updateData - Os dados a serem atualizados.
 * @returns {Promise<Document|null>}
 */
const updateById = async (id, updateData) => {
    return Coupon.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

/**
 * [ADMIN] Deleta um cupom pelo seu ID.
 * @param {string} id - O ID do cupom.
 * @returns {Promise<Document|null>}
 */
const deleteById = async (id) => {
    return Coupon.findByIdAndDelete(id);
};

module.exports = {
  findByCode,
  findByCodeAdmin,
  create,
  findAll,
  findById,
  updateById,
  deleteById,
};