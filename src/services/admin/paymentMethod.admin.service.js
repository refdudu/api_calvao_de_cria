const paymentMethodRepository = require('../../repositories/paymentMethod.repository');
const AppError = require('../../utils/AppError');

const listPaymentMethods = async () => {
    const methods = await paymentMethodRepository.findAll();
    return { data: methods, message: 'Métodos de pagamento retornados com sucesso.' };
};

const createPaymentMethod = async (data) => {
    const newMethod = await paymentMethodRepository.create(data);
    return { data: newMethod, message: 'Método de pagamento criado com sucesso.' };
};

const updatePaymentMethod = async (methodId, updateData) => {
    // Proíbe a alteração do campo 'identifier' após a criação
    if (updateData.identifier) {
        throw new AppError('O identificador não pode ser alterado após a criação.', 400);
    }
    
    const method = await paymentMethodRepository.updateById(methodId, updateData);
    if (!method) {
        throw new AppError('Método de pagamento não encontrado.', 404);
    }
    return { data: method, message: 'Método de pagamento atualizado com sucesso.' };
};

module.exports = {
    listPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
};