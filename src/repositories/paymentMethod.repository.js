const PaymentMethod = require('../models/paymentMethod.model');

/**
 * Retorna todos os métodos de pagamento ativos para os clientes.
 */
const findAllEnabled = async () => {
  return PaymentMethod.find({ isEnabled: true }).sort({ name: 1 });
};

/**
 * Retorna todos os métodos de pagamento para o painel de admin.
 */
const findAll = async () => {
    return PaymentMethod.find().sort({ name: 1 });
};

/**
 * [ADMIN] Encontra um método de pagamento pelo seu ID.
 * @param {string} id - O ID do método de pagamento.
 * @returns {Promise<Document|null>}
 */
const findById = async (id) => {
    return PaymentMethod.findById(id);
};

/**
 * [ADMIN] Encontra um método de pagamento pelo seu identificador único.
 * @param {string} identifier - O identificador (ex: "pix").
 * @returns {Promise<Document|null>}
 */
const findByIdentifier = async (identifier) => {
    return PaymentMethod.findOne({ identifier });
};

/**
 * [ADMIN] Cria um novo método de pagamento.
 * @param {object} data - Os dados do novo método.
 * @returns {Promise<Document>}
 */
const create = async (data) => {
    return PaymentMethod.create(data);
};

/**
 * [ADMIN] Atualiza um método de pagamento pelo seu ID.
 * @param {string} id - O ID do método.
 * @param {object} updateData - Os dados a serem atualizados.
 * @returns {Promise<Document|null>}
 */
const updateById = async (id, updateData) => {
    return PaymentMethod.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

module.exports = {
  findAllEnabled,
  findAll,
  findById,
  findByIdentifier,
  create,
  updateById
};