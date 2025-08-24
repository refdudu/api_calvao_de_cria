const User = require('../models/user.model');

const findByEmailWithPassword = async (email) => {
  return User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
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

const createUser = async (userData) => {
  const user = await User.create(userData);
  return user;
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
  return !!user; // Retorna true ou false
};

const cpfExists = async (cpf) => {
  const user = await User.findOne({ cpf });
  return !!user;
};

module.exports = {
  findUserByEmail,
  findByEmailWithPassword,
  findById,
  createUser,
  findByIdWithRefreshToken,
  findByPasswordResetToken,
  updateById,
  emailExists,
  cpfExists,
};
