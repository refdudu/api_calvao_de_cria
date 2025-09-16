const Cart = require('../models/cart.model');

/**
 * Encontra um carrinho pelo seu identificador (userId ou guestCartId).
 * @param {object} identifier - O objeto { userId, guestCartId }.
 * @returns {Promise<Document|null>} O documento do carrinho ou nulo.
 */
const findByIdentifier = async ({ userId, guestCartId }) => {
  if (userId) {
    return Cart.findOne({ userId });
  }
  if (guestCartId) {
    return Cart.findOne({ guestCartId });
  }
  return null;
};

/**
 * Encontra um carrinho pelo ID de convidado.
 * @param {string} guestCartId - O UUID do carrinho de convidado.
 * @returns {Promise<Document|null>}
 */
const findByGuestCartId = async (guestCartId) => {
  return Cart.findOne({ guestCartId });
};

/**
 * Cria um novo carrinho no banco de dados.
 * @param {object} cartData - Os dados iniciais do carrinho ({ userId } ou { guestCartId }).
 * @returns {Promise<Document>} O novo documento do carrinho.
 */
const create = async (cartData) => {
  return Cart.create(cartData);
};

/**
 * Deleta um carrinho de convidado pelo seu ID.
 * @param {string} guestCartId - O UUID do carrinho a ser deletado.
 * @returns {Promise<object>} O resultado da operação de deleção.
 */
const deleteByGuestCartId = async (guestCartId) => {
  return Cart.deleteOne({ guestCartId });
};

module.exports = {
  findByIdentifier,
  findByGuestCartId,
  create,
  deleteByGuestCartId,
};