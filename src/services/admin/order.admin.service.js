const orderRepository = require('../../repositories/order.repository');
const AppError = require('../../utils/AppError');

// Transformer local para formatar a saída conforme a documentação
const transformOrderForAdminList = (order) => ({
    id: order._id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    customer: {
        name: order.userId.name,
        email: order.userId.email,
    },
    total: order.totals.total,
    status: order.status,
});

const listAllOrders = async (queryParams) => {
    const filters = {};
    if (queryParams.status) {
        filters.status = queryParams.status.toUpperCase();
    }
    if (queryParams.search) {
        // Busca por número do pedido ou email do cliente
        filters.$or = [
            { orderNumber: { $regex: queryParams.search, $options: 'i' } },
            // A busca no email requer uma agregação mais complexa ou um campo denormalizado.
            // Por simplicidade, vamos buscar pelo número do pedido por enquanto.
        ];
    }

    const limit = parseInt(queryParams.limit, 10) || 20;
    const page = parseInt(queryParams.page, 10) || 1;
    const skip = (page - 1) * limit;

    const sortField = queryParams.sortBy || 'createdAt';
    const sortOrder = queryParams.order || 'desc';
    const options = { limit, skip, sort: { [sortField]: sortOrder } };

    const { orders, total } = await orderRepository.findAllAdmin(filters, options);
    
    const transformedOrders = orders.map(transformOrderForAdminList);

    const details = {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
    };

    return { data: transformedOrders, details, message: 'Pedidos retornados com sucesso.' };
};

const getOrderDetails = async (orderId) => {
    const order = await orderRepository.findByIdAdmin(orderId);
    if (!order) {
        throw new AppError('Pedido não encontrado.', 404);
    }
    return { data: order, message: 'Detalhes do pedido retornados com sucesso.' };
};

const updateOrder = async (orderId, updateData) => {
    const order = await orderRepository.updateByIdAdmin(orderId, updateData);
    if (!order) {
        throw new AppError('Pedido não encontrado.', 404);
    }
    return { data: order, message: 'Pedido atualizado com sucesso.' };
};

module.exports = {
    listAllOrders,
    getOrderDetails,
    updateOrder,
};