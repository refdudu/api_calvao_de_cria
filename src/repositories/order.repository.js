const mongoose = require('mongoose');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Cart = require('../models/cart.model');

/**
 * Cria um pedido, abate o estoque e limpa o carrinho de forma transacional.
 * @param {object} orderData - Os dados completos do pedido a ser criado.
 * @returns {Promise<Document>} O documento do pedido recém-criado.
 */
const createOrderTransactional = async (orderData) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1. Criar o pedido
    const newOrder = new Order(orderData);
    await newOrder.save({ session });

    // 2. Abater o estoque de cada produto
    for (const item of newOrder.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stockQuantity: -item.quantity } },
        { session }
      );
    }
    
    // 3. Deletar o carrinho antigo
    await Cart.deleteOne({ userId: orderData.userId }).session(session);

    // 4. Criar um novo carrinho vazio
    await Cart.create([{ userId: orderData.userId }], { session });


    await session.commitTransaction();
    return newOrder;
  } catch (error) {
    await session.abortTransaction();
    throw error; // Propaga o erro para o service tratar
  } finally {
    session.endSession();
  }
};

/**
 * [ADMIN] Encontra todos os pedidos com filtros, paginação e dados do cliente.
 * @param {object} filters - Filtros de busca (ex: status, orderNumber).
 * @param {object} options - Opções de paginação e ordenação.
 * @returns {Promise<{orders: Document[], total: number}>}
 */
const findAllAdmin = async (filters, options) => {
  const query = Order.find(filters)
    .populate('userId', 'name email') // Popula dados do cliente
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit);

  const orders = await query;
  const total = await Order.countDocuments(filters);
  return { orders, total };
};

/**
 * [ADMIN] Encontra um pedido pelo ID com os dados do cliente.
 * @param {string} orderId - O ID do pedido.
 * @returns {Promise<Document|null>}
 */
const findByIdAdmin = async (orderId) => {
  return Order.findById(orderId).populate('userId', 'name email');
};

/**
 * [ADMIN] Atualiza um pedido pelo ID.
 * @param {string} orderId - O ID do pedido.
 * @param {object} updateData - Os dados a serem atualizados.
 * @returns {Promise<Document|null>}
 */
const updateByIdAdmin = async (orderId, updateData) => {
  return Order.findByIdAndUpdate(orderId, { $set: updateData }, { new: true, runValidators: true });
};

/**
 * [ADMIN] Retorna um resumo dos pedidos de um usuário específico.
 * @param {string} userId - O ID do usuário.
 * @returns {Promise<object>}
 */
const findSummaryByUserId = async (userId) => {
  const orders = await Order.find({ userId }).sort({ createdAt: -1 });

  if (orders.length === 0) {
    return {
      totalCount: 0,
      totalValue: 0,
      lastOrders: [],
    };
  }

  const totalValue = orders.reduce((sum, order) => sum + order.totals.total, 0);

  const lastOrders = orders.slice(0, 5).map(order => ({ // Retorna os últimos 5
    id: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.totals.total,
    createdAt: order.createdAt,
  }));

  return {
    totalCount: orders.length,
    totalValue,
    lastOrders,
  };
};

module.exports = {
  createOrderTransactional,
  findAllAdmin,
  findByIdAdmin,
  updateByIdAdmin,
  findSummaryByUserId,
};