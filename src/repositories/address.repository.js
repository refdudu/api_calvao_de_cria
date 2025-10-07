const Address = require('../models/address.model');

const createAddress = async (addressData) => {
  return Address.create(addressData);
};

// Retorna apenas os campos necessários para a listagem
const findAllAddressesByUserIdSummary = async (userId) => {
  const summaryFields = 'alias street number city neighborhood';
  return Address.find({ userId })
  // .select(summaryFields);

};

// Retorna todos os campos de um endereço específico
const findAddressByIdAndUserIdDetail = async (addressId, userId) => {
  return Address.findOne({ _id: addressId, userId });
};

const updateAddress = async (addressId, userId, updateData) => {
  return Address.findOneAndUpdate({ _id: addressId, userId }, updateData, {
    new: true,
    runValidators: true,
  });
};

const deleteAddress = async (addressId, userId) => {
  return Address.findOneAndDelete({ _id: addressId, userId });
};

module.exports = {
  createAddress,
  findAllAddressesByUserIdSummary,
  findAddressByIdAndUserIdDetail,
  updateAddress,
  deleteAddress,
};
