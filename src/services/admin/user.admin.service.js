const userRepository = require('../../repositories/user.repository');
const addressRepository = require('../../repositories/address.repository');
const orderRepository = require('../../repositories/order.repository');
const authService = require('../auth.service');
const AppError = require('../../utils/AppError');
const userTransformer = require('../../utils/transformers/user.transformer');

const listCustomers = async (queryParams) => {
const filters = {};
if (queryParams.search) {
    const searchRegex = { $regex: queryParams.search, $options: 'i' };
    filters.$or = [{ name: searchRegex }, { email: searchRegex }];
}

const limit = parseInt(queryParams.limit, 10) || 20;
const page = parseInt(queryParams.page, 10) || 1;
const skip = (page - 1) * limit;
const options = { limit, skip, sort: { createdAt: 'desc' } };

const { users, total } = await userRepository.findAllCustomers(filters, options);

const transformedUsers = users.map(user => ({
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
}));

const details = {
    totalItems: total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    limit,
};

    return { data: transformedUsers, details, message: 'Clientes retornados com sucesso.' };
};

const getCustomerDetails360 = async (userId) => {
    const user = await userRepository.findByIdWithRole(userId);

    if (!user || user.role !== 'customer') {
    throw new AppError('Cliente não encontrado.', 404);
    }

    const addresses = await addressRepository.findAllAddressesByUserIdSummary(userId);
    const ordersSummary = await orderRepository.findSummaryByUserId(userId);

    const responseData = {
    profile: userTransformer.detailed(user),
    addresses: addresses.map(addr => ({
        id: addr._id,
        alias: addr.alias,
        street: addr.street,
        city: addr.city,
    })),
    orders: {
        totalCount: ordersSummary.totalCount,
        totalValue: ordersSummary.totalValue,
        lastOrders: ordersSummary.lastOrders,
    },
    };

    return { data: responseData, message: 'Detalhes do cliente retornados com sucesso.' };
};

const forcePasswordResetForUser = async (userId, protocol, host) => {
    const user = await userRepository.findByIdWithRole(userId);
    if (!user || user.role !== 'customer') {
    throw new AppError('Cliente não encontrado.', 404);
}

await authService.forgotPassword(user.email, protocol, host);
    return {
    data: null,
    message: 'E-mail de redefinição de senha foi enviado para o usuário.',
    };
};

module.exports = {
    listCustomers,
    getCustomerDetails360,
    forcePasswordResetForUser,
};