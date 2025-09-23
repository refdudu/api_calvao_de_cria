const User = require('../models/user.model');

const findByEmailWithPassword = async (email) => {
  return User.findOne({ email: email.toLowerCase() }).select('+passwordHash').select('+role');
};

const findUserByEmail = async (email) => {
  return User.findOne({ email: email.toLowerCase() });
};

const findByPasswordResetToken = async (hashedToken) => {
  return User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });
};

const findById = async (id) => {
  return User.findById(id);
};

const findByIdWithRole = async (id) => {
  return User.findById(id).select('+role');
};

const createUser = async (userData) => {
  const user = await User.create(userData);
  return user;
};

const findByIdWithPassword = async (id) => {
  return User.findById(id).select('+passwordHash');
};

const findByIdWithRefreshToken = async (id) => {
  return User.findById(id).select('+currentRefreshTokenHash');
};

const updateById = async (userId, updateData) => {
  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });
  return updatedUser;
};

const emailExists = async (email) => {
  const user = await User.findOne({ email });
  return !!user;
};

const cpfExists = async (cpf) => {
  const user = await User.findOne({ cpf });
  return !!user;
};
/**
 * [ADMIN] Encontra todos os usuários com role 'customer' com filtros e paginação.
 * @param {object} filters - Filtros de busca (ex: nome, email).
 * @param {object} options - Opções de paginação e ordenação.
 * @returns {Promise<{users: Document[], total: number}>}
 */
const findAllCustomers = async (filters, options) => {
  const customerFilters = { ...filters, role: 'customer' };

  const query = User.find(customerFilters)
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit);

  const users = await query;
  const total = await User.countDocuments(customerFilters);
  return { users, total };
};




module.exports = {
  findUserByEmail,
  findByEmailWithPassword,
  findById,
  createUser,
  findByIdWithPassword,
  findByIdWithRefreshToken,
  findByIdWithRole,
  findByPasswordResetToken,
  updateById,
  emailExists,
  cpfExists,
  findAllCustomers,
};
