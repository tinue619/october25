/**
 * Статусы заказов в системе
 */
const OrderStatus = {
    DRAFT: 'Черновик',
    IN_PROGRESS: 'В работе',
    COMPLETED: 'Завершен',
    CANCELLED: 'Отменен'
};

// Константа для совместимости с Order.js
const ORDER_STATUS = OrderStatus;

// Проверка валидности статуса
OrderStatus.isValid = (status) => {
    return Object.values(OrderStatus).includes(status);
};

// Проверка активности заказа
OrderStatus.isActive = (status) => {
    return status === OrderStatus.IN_PROGRESS;
};

// Проверка завершенности заказа
OrderStatus.isFinished = (status) => {
    return status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED;
};

// Глобальная доступность
window.OrderStatus = OrderStatus;
window.ORDER_STATUS = ORDER_STATUS;