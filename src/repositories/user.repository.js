const User = require('../models/user.model');

const findByEmail = async (email) => {
  return User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
};

const findById = async (id) => {
  return User.findById(id);
};

const createUser = async (userData) => {
  const user = await User.create(userData);
  return user;
};

module.exports = {
  findByEmail,
  findById,
  createUser,
};
