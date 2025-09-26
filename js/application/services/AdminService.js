/**
 * Сервис администрирования системы
 * Предоставляет расширенные возможности управления для администраторов
 *
 * @class AdminService
 */
class AdminService {
    /**
     * @param {UserService} userService - Сервис пользователей
     * @param {OrderService} orderService - Сервис заказов
     * @param {ProcessService} processService - Сервис процессов
     * @param {ProductTypeService} productTypeService - Сервис типов изделий
     */
    constructor(userService, orderService, processService, productTypeService) {
        this.userService = userService;
        this.orderService = orderService;
        this.processService = processService;
        this.productTypeService = productTypeService;
    }

    /**
     * Проверяет, является ли пользователь администратором
     * @private
     * @param {number} userId - ID пользователя
     * @throws {Error} Если пользователь не является администратором
     */
    _validateAdminRights(userId) {
        const user = this.userService.findById(userId);
        if (!user || !user.isAdmin()) {
            throw new Error('Доступ запрещен. Требуются права администратора.');
        }
    }

    /**
     * Создает нового сотрудника
     * @param {Object} employeeData - Данные сотрудника
     * @param {string} employeeData.name - Имя сотрудника
     * @param {boolean} [employeeData.canCreateOrders=false] - Право создания заказов
     * @param {number[]} [employeeData.allowedProcessIds=[]] - Разрешенные процессы
     * @param {number} adminId - ID администратора, создающего сотрудника
     * @returns {User} Созданный сотрудник
     */
    createEmployee(employeeData, adminId) {
        this._validateAdminRights(adminId);
        
        const userData = {
            ...employeeData,
            role: UserRole.EMPLOYEE,
            createdBy: adminId
        };
        
        return this.userService.createUser(userData, adminId);
    }

    /**
     * Обновляет данные сотрудника
     * @param {number} employeeId - ID сотрудника
     * @param {Object} employeeData - Новые данные сотрудника
     * @param {number} adminId - ID администратора
     * @returns {User} Обновленный сотрудник
     */
    updateEmployee(employeeId, employeeData, adminId) {
        this._validateAdminRights(adminId);
        
        const employee = this.userService.findById(employeeId);
        if (!employee) {
            throw new Error(`Сотрудник с ID ${employeeId} не найден`);
        }
        
        if (employee.isAdmin()) {
            throw new Error('Нельзя редактировать администратора через этот метод');
        }
        
        return this.userService.updateUser(employeeId, employeeData, adminId);
    }

    /**
     * Удаляет сотрудника
     * @param {number} employeeId - ID сотрудника
     * @param {number} adminId - ID администратора
     * @returns {boolean} true если сотрудник успешно удален
     */
    deleteEmployee(employeeId, adminId) {
        this._validateAdminRights(adminId);
        
        const employee = this.userService.findById(employeeId);
        if (!employee) {
            throw new Error(`Сотрудник с ID ${employeeId} не найден`);
        }
        
        if (employee.isAdmin()) {
            throw new Error('Нельзя удалить администратора');
        }
        
        return this.userService.deleteUser(employeeId, adminId);
    }

    /**
     * Управляет правами сотрудника
     * @param {number} employeeId - ID сотрудника
     * @param {Object} rights - Новые права
     * @param {boolean} [rights.canCreateOrders] - Право создания заказов
     * @param {number[]} [rights.allowedProcessIds] - Разрешенные процессы
     * @param {number} adminId - ID администратора
     * @returns {User} Обновленный сотрудник
     */
    manageEmployeeRights(employeeId, rights, adminId) {
        this._validateAdminRights(adminId);
        
        const updateData = {};
        
        if (rights.canCreateOrders !== undefined) {
            updateData.canCreateOrders = rights.canCreateOrders;
        }
        
        if (rights.allowedProcessIds !== undefined) {
            updateData.allowedProcessIds = Array.isArray(rights.allowedProcessIds) 
                ? rights.allowedProcessIds 
                : [];
        }
        
        return this.updateEmployee(employeeId, updateData, adminId);
    }

    /**
     * Предоставляет право создания заказов сотруднику
     * @param {number} employeeId - ID сотрудника
     * @param {number} adminId - ID администратора
     * @returns {User} Обновленный сотрудник
     */
    grantOrderCreationRight(employeeId, adminId) {
        return this.manageEmployeeRights(employeeId, { canCreateOrders: true }, adminId);
    }

    /**
     * Отбирает право создания заказов у сотрудника
     * @param {number} employeeId - ID сотрудника
     * @param {number} adminId - ID администратора
     * @returns {User} Обновленный сотрудник
     */
    revokeOrderCreationRight(employeeId, adminId) {
        return this.manageEmployeeRights(employeeId, { canCreateOrders: false }, adminId);
    }

    /**
     * Предоставляет право выполнения процесса сотруднику
     * @param {number} employeeId - ID сотрудника
     * @param {number} processId - ID процесса
     * @param {number} adminId - ID администратора
     * @returns {User} Обновленный сотрудник
     */
    grantProcessRight(employeeId, processId, adminId) {
        this._validateAdminRights(adminId);
        
        const employee = this.userService.findById(employeeId);
        if (!employee) {
            throw new Error(`Сотрудник с ID ${employeeId} не найден`);
        }
        
        return this.userService.grantProcessRight(adminId, employeeId, processId);
    }

    /**
     * Отбирает право выполнения процесса у сотрудника
     * @param {number} employeeId - ID сотрудника
     * @param {number} processId - ID процесса
     * @param {number} adminId - ID администратора
     * @returns {User} Обновленный сотрудник
     */
    revokeProcessRight(employeeId, processId, adminId) {
        this._validateAdminRights(adminId);
        
        const employee = this.userService.findById(employeeId);
        if (!employee) {
            throw new Error(`Сотрудник с ID ${employeeId} не найден`);
        }
        
        return this.userService.revokeProcessRight(adminId, employeeId, processId);
    }

    /**
     * Создает заказ от имени администратора (системный заказ)
     * @param {Object} orderData - Данные заказа
     * @param {number} adminId - ID администратора
     * @returns {Order} Созданный заказ
     */
    createSystemOrder(orderData, adminId) {
        this._validateAdminRights(adminId);
        return this.orderService.createOrder(orderData, adminId);
    }

    /**
     * Проектирует новый тип изделия с настраиваемыми полями и процессами
     * @param {Object} productTypeData - Данные типа изделия
     * @param {string} productTypeData.name - Название типа изделия
     * @param {string} [productTypeData.description] - Описание
     * @param {Object[]} [productTypeData.processSequence] - Последовательность процессов
     * @param {Object[]} [productTypeData.customFields] - Настраиваемые поля
     * @param {number} adminId - ID администратора
     * @returns {ProductType} Созданный тип изделия
     */
    designProductType(productTypeData, adminId) {
        this._validateAdminRights(adminId);
        return this.productTypeService.createProductType(productTypeData, adminId);
    }

    /**
     * Настраивает поля для типа изделия
     * @param {number} productTypeId - ID типа изделия
     * @param {Object[]} fields - Массив настраиваемых полей
     * @param {number} adminId - ID администратора
     * @returns {ProductType} Обновленный тип изделия
     */
    configureProductTypeFields(productTypeId, fields, adminId) {
        this._validateAdminRights(adminId);
        
        // Сначала удаляем все существующие поля
        const productType = this.productTypeService.findById(productTypeId);
        if (!productType) {
            throw new Error(`Тип изделия с ID ${productTypeId} не найден`);
        }
        
        // Очищаем поля
        productType.customFields = [];
        
        // Добавляем новые поля
        fields.forEach((fieldData, index) => {
            this.productTypeService.addCustomField(productTypeId, {
                ...fieldData,
                order: fieldData.order || index
            });
        });
        
        return this.productTypeService.findById(productTypeId);
    }

    /**
     * Получает статистику системы
     * @param {number} adminId - ID администратора
     * @returns {Object} Объект со статистикой
     */
    getSystemStatistics(adminId) {
        this._validateAdminRights(adminId);
        
        const users = this.userService.getAllUsers();
        const orders = this.orderService.getAllOrders();
        const processes = this.processService.getAllProcesses();
        const productTypes = this.productTypeService.getAllProductTypes();
        
        const now = new Date();
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        
        return {
            users: {
                total: users.length,
                admins: users.filter(u => u.isAdmin()).length,
                employees: users.filter(u => !u.isAdmin()).length,
                activeEmployees: users.filter(u => !u.isAdmin() && u.canCreateOrders).length
            },
            orders: {
                total: orders.length,
                thisMonth: orders.filter(o => new Date(o.createdAt) >= monthAgo).length,
                thisWeek: orders.filter(o => new Date(o.createdAt) >= weekAgo).length,
                byStatus: this._getOrdersByStatus(orders)
            },
            processes: {
                total: processes.length,
                usage: this._getProcessUsage(orders, processes)
            },
            productTypes: {
                total: productTypes.length,
                withCustomFields: productTypes.filter(pt => pt.customFields && pt.customFields.length > 0).length,
                avgFieldsPerType: this._getAvgFieldsPerType(productTypes)
            },
            system: {
                dataLastUpdated: new Date().toISOString(),
                uptime: this._getSystemUptime()
            }
        };
    }

    /**
     * Экспортирует данные системы
     * @param {number} adminId - ID администратора
     * @param {Object} [options] - Опции экспорта
     * @param {string[]} [options.entities] - Какие сущности экспортировать
     * @param {boolean} [options.includeHistory] - Включать историю изменений
     * @returns {Object} Данные для экспорта
     */
    exportSystemData(adminId, options = {}) {
        this._validateAdminRights(adminId);
        
        const {
            entities = ['users', 'orders', 'processes', 'productTypes'],
            includeHistory = false
        } = options;
        
        const exportData = {
            exportedAt: new Date().toISOString(),
            exportedBy: adminId,
            version: '1.0',
            data: {}
        };
        
        if (entities.includes('users')) {
            exportData.data.users = this.userService.getAllUsers().map(u => u.toJSON());
        }
        
        if (entities.includes('orders')) {
            exportData.data.orders = this.orderService.getAllOrders().map(o => o.toJSON());
        }
        
        if (entities.includes('processes')) {
            exportData.data.processes = this.processService.getAllProcesses().map(p => p.toJSON());
        }
        
        if (entities.includes('productTypes')) {
            exportData.data.productTypes = this.productTypeService.getAllProductTypes().map(pt => pt.toJSON());
        }
        
        return exportData;
    }

    /**
     * Импортирует данные в систему
     * @param {Object} importData - Данные для импорта
     * @param {number} adminId - ID администратора
     * @param {Object} [options] - Опции импорта
     * @param {boolean} [options.overwrite=false] - Перезаписывать существующие данные
     * @param {boolean} [options.validateData=true] - Валидировать данные перед импортом
     * @returns {boolean} true если импорт прошел успешно
     */
    importSystemData(importData, adminId, options = {}) {
        this._validateAdminRights(adminId);
        
        const { overwrite = false, validateData = true } = options;
        
        if (validateData && !this._validateImportData(importData)) {
            throw new Error('Данные для импорта содержат ошибки');
        }
        
        try {
            // Импортируем в порядке зависимостей: процессы -> типы изделий -> пользователи -> заказы
            
            if (importData.data.processes) {
                this._importProcesses(importData.data.processes, adminId, overwrite);
            }
            
            if (importData.data.productTypes) {
                this._importProductTypes(importData.data.productTypes, adminId, overwrite);
            }
            
            if (importData.data.users) {
                this._importUsers(importData.data.users, adminId, overwrite);
            }
            
            if (importData.data.orders) {
                this._importOrders(importData.data.orders, adminId, overwrite);
            }
            
            return true;
            
        } catch (error) {
            console.error('Ошибка при импорте данных:', error);
            throw new Error(`Ошибка при импорте: ${error.message}`);
        }
    }

    // Приватные методы для статистики

    _getOrdersByStatus(orders) {
        const statusCounts = {};
        orders.forEach(order => {
            statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        });
        return statusCounts;
    }

    _getProcessUsage(orders, processes) {
        const usage = {};
        processes.forEach(process => {
            usage[process.id] = {
                name: process.name,
                timesUsed: 0,
                currentlyActive: 0
            };
        });
        
        orders.forEach(order => {
            if (order.processFlow && order.processFlow.completedProcesses) {
                order.processFlow.completedProcesses.forEach(processId => {
                    if (usage[processId]) {
                        usage[processId].timesUsed++;
                    }
                });
            }
            
            if (order.processFlow && order.processFlow.currentProcessId && usage[order.processFlow.currentProcessId]) {
                usage[order.processFlow.currentProcessId].currentlyActive++;
            }
        });
        
        return usage;
    }

    _getAvgFieldsPerType(productTypes) {
        if (productTypes.length === 0) return 0;
        
        const totalFields = productTypes.reduce((sum, pt) => {
            return sum + (pt.customFields ? pt.customFields.length : 0);
        }, 0);
        
        return Math.round(totalFields / productTypes.length * 10) / 10;
    }

    _getSystemUptime() {
        // Заглушка - в реальной системе это может быть время работы сервера
        return 'N/A (клиентское приложение)';
    }

    // Приватные методы для импорта

    _validateImportData(importData) {
        if (!importData || !importData.data) {
            return false;
        }
        
        // Базовая валидация структуры
        if (!importData.version || !importData.exportedAt) {
            return false;
        }
        
        return true;
    }

    _importProcesses(processes, adminId, overwrite) {
        processes.forEach(processData => {
            const existingProcess = this.processService.findById(processData.id);
            
            if (existingProcess && !overwrite) {
                return; // Пропускаем существующий процесс
            }
            
            if (existingProcess && overwrite) {
                this.processService.updateProcess(processData.id, processData, adminId);
            } else {
                // Создаем новый процесс
                delete processData.id; // Удаляем ID, чтобы сгенерировался новый
                this.processService.createProcess(processData, adminId);
            }
        });
    }

    _importProductTypes(productTypes, adminId, overwrite) {
        productTypes.forEach(productTypeData => {
            const existingProductType = this.productTypeService.findById(productTypeData.id);
            
            if (existingProductType && !overwrite) {
                return; // Пропускаем существующий тип
            }
            
            if (existingProductType && overwrite) {
                this.productTypeService.updateProductType(productTypeData.id, productTypeData, adminId);
            } else {
                // Создаем новый тип изделия
                delete productTypeData.id;
                this.productTypeService.createProductType(productTypeData, adminId);
            }
        });
    }

    _importUsers(users, adminId, overwrite) {
        users.forEach(userData => {
            // Не импортируем администраторов
            if (userData.role === UserRole.ADMIN) {
                return;
            }
            
            const existingUser = this.userService.findById(userData.id);
            
            if (existingUser && !overwrite) {
                return; // Пропускаем существующего пользователя
            }
            
            if (existingUser && overwrite) {
                this.userService.updateUser(userData.id, userData, adminId);
            } else {
                // Создаем нового пользователя
                delete userData.id;
                this.userService.createUser(userData, adminId);
            }
        });
    }

    _importOrders(orders, adminId, overwrite) {
        orders.forEach(orderData => {
            const existingOrder = this.orderService.findById(orderData.id);
            
            if (existingOrder && !overwrite) {
                return; // Пропускаем существующий заказ
            }
            
            if (existingOrder && overwrite) {
                this.orderService.updateOrder(orderData.id, orderData, adminId);
            } else {
                // Создаем новый заказ
                delete orderData.id;
                this.orderService.createOrder(orderData, adminId);
            }
        });
    }
}

// Глобальная доступность
window.AdminService = AdminService;
