const Coupon = require('../models/coupon.model');

/**
 * Encontra um cupom pelo seu código.
 * @param {string} code - O código do cupom (ex: "BEMVINDO10").
 * @returns {Promise<Document|null>} O documento do cupom ou nulo se não encontrado.
 */
const findByCode = async (code) => {
  return Coupon.findOne({ code, isActive: true, expiresAt: { $gt: new Date() } });
};

module.exports = {
  findByCode,
};