const addressRepository = require('../repositories/address.repository');
const AppError = require('../utils/AppError');
const addressTransformer = require('../utils/transformers/address.transformer');

const addAddress = async (userId, addressData) => {
  const address = await addressRepository.createAddress({ ...addressData, userId });

  return {
    data: addressTransformer.detailed(address),
    message: 'Endereço adicionado com sucesso.',
    details: null,
  };
};

const listAddressesSummary = async (userId) => {
  const addresses = await addressRepository.findAllAddressesByUserIdSummary(userId);
  const quantity = addresses.length;

  return {
    data: addresses.map(addressTransformer.summary),
    message: `Endereços retornados com sucesso`,
    details: { totalItens: quantity },
  };
};

const getAddressDetails = async (addressId, userId) => {
  const address = await addressRepository.findAddressByIdAndUserIdDetail(addressId, userId);
  if (!address) throw new AppError('Endereço não encontrado ou não pertence a este usuário.', 404);
  return {
    data: addressTransformer.detailed(address),
    message: 'Detalhes do endereço obtidos com sucesso.',
    details: null,
  };
};

const updateAddress = async (addressId, userId, updateData) => {
  const address = await addressRepository.updateAddress(addressId, userId, updateData);
  if (!address) throw new AppError('Endereço não encontrado ou não pertence a este usuário.', 404);
  return {
    data: addressTransformer.detailed(address),
    message: 'Endereço atualizado com sucesso.',
    details: null,
  };
};

const removeAddress = async (addressId, userId) => {
  const deleted = await addressRepository.deleteAddress(addressId, userId);
  if (!deleted) throw new AppError('Endereço não encontrado ou não pertence a este usuário.', 404);
  return {
    data: null,
    message: 'Endereço removido com sucesso.',
    details: null,
  };
};

module.exports = {
  addAddress,
  listAddressesSummary,
  getAddressDetails,
  updateAddress,
  removeAddress,
};
