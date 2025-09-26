/**
 * Сервис для управления заказами
 * Содержит бизнес-логику работы с заказами и их жизненным циклом
 */
class OrderService {
    
    constructor(orderRepository, productTypeRepository, userRepository) {
        this._orderRepository = orderRepository;
        this._productTypeRepository = productTypeRepository;
        this._userRepository = userRepository;
    }
    
    // Создание нового заказа
    async createOrder(orderData, createdBy = null) {
        // Проверяем права пользователя
        if (createdBy) {
            const user = await this._userRepository.findById(createdBy);
            if (!user) {
                throw new Error('Пользователь не найден');
            }
            if (!user.canCreateOrders()) {
                throw new Error('Нет прав на создание заказов');
            }
        }
        
        // Валидация данных
        if (!orderData.customerName || orderData.customerName.trim() === '') {
            throw new Error('Имя клиента обязательно');
        }
        
        if (!orderData.productTypeId) {
            throw new Error('Тип изделия обязателен');
        }
        
        // Проверяем существование типа изделия
        const productType = await this._productTypeRepository.findById(orderData.productTypeId);
        if (!productType) {
            throw new Error('Указанный тип изделия не найден');
        }
        
        // Проверяем корректность типа изделия
        if (productType.processIds.length === 0) {
            throw new Error('У типа изделия не настроена последовательность процессов');
        }
        
        // Создание заказа
        const order = new Order({
            customerName: orderData.customerName,
            customerPhone: orderData.customerPhone || '',
            productTypeId: orderData.productTypeId,
            currentProcessId: productType.getFirstProcess(), // Устанавливаем первый процесс
            number: orderData.number // Если не указан, сгенерируется автоматически
        });
        
        if (createdBy) {
            order.setCreatedBy(createdBy);
        }
        
        // Добавляем событие создания в историю
        order._addHistoryEvent('order_created', createdBy, {
            productTypeName: productType.name,
            initialProcessId: order.currentProcessId
        });
        
        return await this._orderRepository.save(order);
    }
    
    // Обновление заказа
    async updateOrder(orderId, orderData, updatedBy = null) {
        const order = await this._orderRepository.findById(orderId);
        if (!order) {
            throw new Error('Заказ не найден');
        }
        
        // Проверяем права на редактирование
        if (updatedBy) {
            const user = await this._userRepository.findById(updatedBy);
            if (!user) {
                throw new Error('Пользователь не найден');
            }
            if (!user.isAdmin() && !user.canPerformProcess(order.currentProcessId)) {
                throw new Error('Нет прав на редактирование этого заказа');
            }
        }
        
        // Не разрешаем изменять завершенные или отмененные заказы
        if (!order.isInProgress()) {
            throw new Error('Нельзя редактировать завершенный или отмененный заказ');
        }
        
        // Обновляем поля
        if (orderData.customerName) {
            order.setCustomerName(orderData.customerName);
        }
        
        if (orderData.customerPhone !== undefined) {
            order.setCustomerPhone(orderData.customerPhone);
        }
        
        // Добавляем событие в историю
        order._addHistoryEvent('order_updated', updatedBy, {
            changes: Object.keys(orderData)
        });
        
        return await this._orderRepository.save(order);
    }
    
    // Удаление заказа
    async deleteOrder(orderId, deletedBy = null) {
        const order = await this._orderRepository.findById(orderId);
        if (!order) {
            throw new Error('Заказ не найден');
        }
        
        // Проверяем права (только администратор может удалять)
        if (deletedBy) {
            const user = await this._userRepository.findById(deletedBy);
            if (!user || !user.isAdmin()) {
                throw new Error('Только администратор может удалять заказы');
            }
        }
        
        return await this._orderRepository.delete(orderId);
    }
    
    // Перемещение заказа к следующему процессу
    async moveOrderToNextProcess(orderId, performedBy, comment = '') {
        const order = await this._orderRepository.findById(orderId);
        if (!order) {
            throw new Error('Заказ не найден');
        }
        
        if (!order.isInProgress()) {
            throw new Error('Заказ не находится в работе');
        }
        
        // Проверяем права пользователя
        const user = await this._userRepository.findById(performedBy);
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        
        if (!user.canPerformProcess(order.currentProcessId)) {
            throw new Error('Нет прав на выполнение текущего этапа');
        }
        
        // Получаем тип изделия для определения следующего процесса
        const productType = await this._productTypeRepository.findById(order.productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        const nextProcessId = productType.getNextProcess(order.currentProcessId);
        
        if (nextProcessId === null) {
            // Это был последний процесс - завершаем заказ
            order.complete(performedBy, comment);
        } else {
            // Перемещаем к следующему процессу
            order.moveToNextProcess(nextProcessId, performedBy, comment);
        }
        
        return await this._orderRepository.save(order);
    }
    
    // Перемещение заказа в конкретный процесс (для kanban)
    async moveOrderToProcess(orderId, targetProcessId, performedBy = null) {
        const order = await this._orderRepository.findById(orderId);
        if (!order) {
            throw new Error('Заказ не найден');
        }
        
        if (!order.isInProgress()) {
            throw new Error('Можно перемещать только заказы в работе');
        }
        
        // Проверяем права пользователя
        if (performedBy) {
            const user = await this._userRepository.findById(performedBy);
            if (!user) {
                throw new Error('Пользователь не найден');
            }
            
            // Администратор может перемещать любые заказы
            if (!user.isAdmin() && !user.canPerformProcess(order.currentProcessId)) {
                throw new Error('Нет прав на перемещение этого заказа');
            }
        }
        
        // Проверяем, что целевой процесс существует в типе изделия
        const productType = await this._productTypeRepository.findById(order.productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        if (!productType.hasProcess(targetProcessId)) {
            throw new Error('Целевой процесс не входит в состав данного типа изделия');
        }
        
        // Если это тот же процесс, ничего не делаем
        if (order.currentProcessId === targetProcessId) {
            return order;
        }
        
        const oldProcessId = order.currentProcessId;
        
        // Перемещаем заказ
        order.currentProcessId = targetProcessId;
        order.updatedAt = new Date();
        
        // Добавляем событие в историю
        order._addHistoryEvent('process_moved', performedBy, {
            fromProcessId: oldProcessId,
            toProcessId: targetProcessId,
            moveType: 'manual' // Ручное перемещение через kanban
        });
        
        return await this._orderRepository.save(order);
    }
    
    // Получение заказа по ID
    async getOrderById(orderId) {
        return await this._orderRepository.findById(orderId);
    }
    
    // Отмена заказа
    async cancelOrder(orderId, performedBy, reason = '') {
        const order = await this._orderRepository.findById(orderId);
        if (!order) {
            throw new Error('Заказ не найден');
        }
        
        // Проверяем права (только администратор или создатель могут отменять)
        const user = await this._userRepository.findById(performedBy);
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        
        if (!user.isAdmin() && order.createdBy !== performedBy) {
            throw new Error('Только администратор или создатель заказа может отменить заказ');
        }
        
        if (!order.isInProgress()) {
            throw new Error('Можно отменить только заказы в работе');
        }
        
        order.cancel(performedBy, reason);
        return await this._orderRepository.save(order);
    }
    
    // Получение всех заказов
    async getAllOrders() {
        return await this._orderRepository.findAll();
    }
    
    // Получение заказов для конкретного пользователя
    async getOrdersForUser(userId) {
        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        
        if (user.isAdmin()) {
            // Администратор видит все заказы
            return await this.getAllOrders();
        }
        
        // Сотрудник видит только заказы на своих этапах
        const allOrders = await this.getAllOrders();
        return allOrders.filter(order => 
            order.isInProgress() && user.canPerformProcess(order.currentProcessId)
        );
    }
    
    // Получение заказов по статусу
    async getOrdersByStatus(status) {
        return await this._orderRepository.findBy({ status: status });
    }
    
    // Получение активных заказов
    async getActiveOrders() {
        return await this.getOrdersByStatus(OrderStatus.IN_PROGRESS);
    }
    
    // Получение завершенных заказов
    async getCompletedOrders() {
        return await this.getOrdersByStatus(OrderStatus.COMPLETED);
    }
    
    // Получение отмененных заказов
    async getCancelledOrders() {
        return await this.getOrdersByStatus(OrderStatus.CANCELLED);
    }
    
    // Получение заказов по типу изделия
    async getOrdersByProductType(productTypeId) {
        return await this._orderRepository.findBy({ productTypeId: productTypeId });
    }
    
    // Получение заказов на конкретном этапе
    async getOrdersOnProcess(processId) {
        return await this._orderRepository.findBy({ 
            currentProcessId: processId,
            status: OrderStatus.IN_PROGRESS 
        });
    }
    
    // Получение заказов, созданных конкретным пользователем
    async getOrdersCreatedBy(userId) {
        return await this._orderRepository.findBy({ createdBy: userId });
    }
    
    // Поиск заказов по номеру
    async findOrderByNumber(orderNumber) {
        const orders = await this._orderRepository.findBy({ number: orderNumber });
        return orders.length > 0 ? orders[0] : null;
    }
    
    // Поиск заказов по имени клиента
    async searchOrdersByCustomer(customerName) {
        const allOrders = await this.getAllOrders();
        const searchTerm = customerName.toLowerCase();
        
        return allOrders.filter(order => 
            order.customerName.toLowerCase().includes(searchTerm)
        );
    }
    
    // Получение статистики заказов
    async getOrderStats() {
        const allOrders = await this.getAllOrders();
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        return {
            total: allOrders.length,
            inProgress: allOrders.filter(o => o.isInProgress()).length,
            completed: allOrders.filter(o => o.isCompleted()).length,
            cancelled: allOrders.filter(o => o.isCancelled()).length,
            createdToday: allOrders.filter(o => o.createdAt > dayAgo).length,
            createdThisWeek: allOrders.filter(o => o.createdAt > weekAgo).length,
            createdThisMonth: allOrders.filter(o => o.createdAt > monthAgo).length,
            completedThisWeek: allOrders.filter(o => 
                o.isCompleted() && o.updatedAt > weekAgo
            ).length
        };
    }
    
    // Получение статистики по процессам
    async getProcessWorkloadStats() {
        const activeOrders = await this.getActiveOrders();
        const processWorkload = {};
        
        // Подсчитываем количество заказов на каждом этапе
        for (const order of activeOrders) {
            if (order.currentProcessId) {
                processWorkload[order.currentProcessId] = (processWorkload[order.currentProcessId] || 0) + 1;
            }
        }
        
        return processWorkload;
    }
    
    // Валидация заказа
    async validateOrder(orderId) {
        const order = await this._orderRepository.findById(orderId);
        if (!order) {
            throw new Error('Заказ не найден');
        }
        
        const issues = [];
        
        // Проверяем базовые поля
        if (!order.customerName || order.customerName.trim() === '') {
            issues.push('Отсутствует имя клиента');
        }
        
        if (!order.productTypeId) {
            issues.push('Не указан тип изделия');
        } else {
            // Проверяем существование типа изделия
            const productType = await this._productTypeRepository.findById(order.productTypeId);
            if (!productType) {
                issues.push('Указанный тип изделия не существует');
            } else if (productType.processIds.length === 0) {
                issues.push('У типа изделия не настроены процессы');
            }
        }
        
        // Проверяем текущий процесс
        if (order.isInProgress() && order.currentProcessId) {
            const productType = await this._productTypeRepository.findById(order.productTypeId);
            if (productType && !productType.hasProcess(order.currentProcessId)) {
                issues.push('Текущий процесс не соответствует типу изделия');
            }
        }
        
        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }
    
    // Получение заказов с пагинацией
    async getOrdersPaginated(page = 1, limit = 20, filters = {}) {
        let orders = await this.getAllOrders();
        
        // Применяем фильтры
        if (filters.status) {
            orders = orders.filter(o => o.status === filters.status);
        }
        
        if (filters.productTypeId) {
            orders = orders.filter(o => o.productTypeId === filters.productTypeId);
        }
        
        if (filters.processId) {
            orders = orders.filter(o => o.currentProcessId === filters.processId);
        }
        
        if (filters.createdBy) {
            orders = orders.filter(o => o.createdBy === filters.createdBy);
        }
        
        // Сортируем по дате создания (новые сначала)
        orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        // Пагинация
        const total = orders.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        return {
            data: orders.slice(startIndex, endIndex),
            pagination: {
                page: page,
                limit: limit,
                total: total,
                totalPages: Math.ceil(total / limit),
                hasNext: endIndex < total,
                hasPrev: page > 1
            }
        };
    }
    
    // Методы для новых UI компонентов
    
    /**
     * Обновить настраиваемые поля заказа
     */
    async updateCustomFields(orderId, fieldValues, updatedBy) {
        const order = await this._orderRepository.findById(orderId);
        if (!order) {
            throw new Error('Заказ не найден');
        }
        
        // Проверяем права
        if (!this._canUserEditOrder(updatedBy, order)) {
            throw new Error('Недостаточно прав для редактирования заказа');
        }
        
        // Обновляем поля
        Object.entries(fieldValues).forEach(([fieldName, value]) => {
            order.setCustomFieldValue(fieldName, value);
        });
        
        order.touch();
        return await this._orderRepository.save(order);
    }
    
    /**
     * Валидация данных заказа
     */
    async validateOrderData(orderData, productTypeId) {
        try {
            const productType = await this._productTypeRepository.findById(productTypeId);
            if (!productType) {
                return {
                    isValid: false,
                    errors: ['Тип изделия не найден']
                };
            }
            
            // Валидация настраиваемых полей
            if (productType.customFields && productType.customFields.length > 0) {
                return productType.validateOrderData(orderData.customFieldValues || {});
            }
            
            return { isValid: true, errors: [] };
            
        } catch (error) {
            return {
                isValid: false,
                errors: [error.message]
            };
        }
    }
    
    /**
     * Получить заказ с настраиваемыми полями
     */
    async getOrderWithCustomFields(orderId) {
        const order = await this._orderRepository.findById(orderId);
        if (!order) {
            throw new Error('Заказ не найден');
        }
        
        // Получаем тип изделия для метаданных полей
        try {
            const productType = await this._productTypeRepository.findById(order.productTypeId);
            return {
                order,
                productType,
                customFieldsMetadata: productType?.customFields || []
            };
        } catch (error) {
            return {
                order,
                productType: null,
                customFieldsMetadata: []
            };
        }
    }
    
    // Приватные методы
    
    _canUserEditOrder(userId, order) {
        if (!userId) return false;
        
        // Простая проверка - может редактировать создатель или админ
        return order.createdBy === userId || this._isUserAdmin(userId);
    }
    
    _isUserAdmin(userId) {
        try {
            const user = this._userRepository.findById(userId);
            return user && user.isAdmin();
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Получить статистику заказов
     */
    async getOrderStats() {
        const orders = await this.getAllOrders();
        
        return {
            total: orders.length,
            inProgress: orders.filter(o => o.status === ORDER_STATUS.IN_PROGRESS).length,
            completed: orders.filter(o => o.status === ORDER_STATUS.COMPLETED).length,
            cancelled: orders.filter(o => o.status === ORDER_STATUS.CANCELLED).length,
            draft: orders.filter(o => o.status === ORDER_STATUS.DRAFT).length,
            recentlyCreated: orders.filter(o => {
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return o.createdAt && o.createdAt > dayAgo;
            }).length
        };
    }
    
    /**
     * Получить статистику загрузки процессов
     */
    async getProcessWorkloadStats() {
        const orders = await this.getAllOrders();
        const workload = {};
        
        // Подсчитываем количество заказов на каждом процессе
        orders.forEach(order => {
            if (order.currentProcessId) {
                workload[order.currentProcessId] = (workload[order.currentProcessId] || 0) + 1;
            }
        });
        
        return workload;
    }
}