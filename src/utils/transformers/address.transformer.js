const addressTransformer = {
  summary: (address) => ({
    addressId: address._id,
    alias: address.alias,
    city: address.city,
    neighborhood: address.neighborhood,
    street: address.street,
    number: address.number,
  }),

  detailed: (address) => ({
    addressId: address._id,
    userId: address.userId,
    alias: address.alias,
    recipientName: address.recipientName,
    cep: address.cep,
    street: address.street,
    number: address.number,
    complement: address.complement,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    phone: address.phone,
  }),
};

module.exports = addressTransformer;
