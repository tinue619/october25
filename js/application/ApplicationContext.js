/**
 * Контекст приложения - центральный компонент, связывающий все сервисы
 * Обеспечивает dependency injection и управление жизненным циклом приложения
 */
class ApplicationContext {
    
    constructor() {
        this._repositories = this._initializeRepositories();
        this._services = this._initializeServices();
        this._currentUser = null;
        this._isInitialized = false;
    }
    
    // Инициализация репозиториев
    _initializeRepositories() {
        return {
            users: RepositoryFactory.createUserRepository(),
            processes: RepositoryFactory.createProcessRepository(),
            productTypes: RepositoryFactory.createProductTypeRepository(),
            orders: RepositoryFactory.createOrderRepository()
        };
    }
    
    // Инициализация сервисов
    _initializeServices() {
        const services = {
            users: new UserService(this._repositories.users),
            processes: new ProcessService(this._repositories.processes),
            productTypes: new ProductTypeService(
                this._repositories.productTypes, 
                this._repositories.processes
            ),
            orders: new OrderService(
                this._repositories.orders,
                this._repositories.productTypes,
                this._repositories.users
            )
        };
        
        // Создаем AdminService после основных сервисов
        services.admin = new AdminService(
            services.users,
            services.orders,
            services.processes,
            services.productTypes
        );
        
        return services;
    }
    
    // Геттеры для сервисов
    get userService() { 
        return this._services.users; 
    }
    
    get processService() { 
        return this._services.processes; 
    }
    
    get productTypeService() { 
        return this._services.productTypes; 
    }
    
    get orderService() { 
        return this._services.orders; 
    }
    
    get adminService() {
        return this._services.admin;
    }
    
    // Геттеры для репозиториев (для прямого доступа если нужен)
    get repositories() {
        return { ...this._repositories };
    }
    
    // Управление текущим пользователем
    get currentUser() {
        return this._currentUser;
    }
    
    get isAuthenticated() {
        return this._currentUser !== null;
    }
    
    get isCurrentUserAdmin() {
        return this._currentUser && this._currentUser.isAdmin();
    }
    
    // Аутентификация пользователя
    async authenticate(userName) {
        try {
            const user = await this._services.users.authenticateUser(userName);
            this._currentUser = user;
            this._saveCurrentUserSession();
            return user;
        } catch (error) {
            this._currentUser = null;
            this._clearCurrentUserSession();
            throw error;
        }
    }
    
    // Выход из системы
    logout() {
        this._currentUser = null;
        this._clearCurrentUserSession();
    }
    
    // Инициализация приложения
    async initialize() {
        if (this._isInitialized) {
            return;
        }
        
        try {
            // Восстанавливаем сессию пользователя
            await this._restoreUserSession();
            
            // Создаем администратора по умолчанию, если его нет
            await this._ensureDefaultAdmin();
            
            this._isInitialized = true;
            console.log('✅ Приложение инициализировано');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации приложения:', error);
            throw error;
        }
    }
    
    // Проверка прав текущего пользователя
    requireAuth() {
        if (!this.isAuthenticated) {
            throw new Error('Требуется авторизация');
        }
        return this._currentUser;
    }
    
    requireAdmin() {
        const user = this.requireAuth();
        if (!user.isAdmin()) {
            throw new Error('Требуются права администратора');
        }
        return user;
    }
    
    requireOrderCreationRights() {
        const user = this.requireAuth();
        if (!user.canCreateOrders()) {
            throw new Error('Нет прав на создание заказов');
        }
        return user;
    }
    
    requireProcessRights(processId) {
        const user = this.requireAuth();
        if (!user.canPerformProcess(processId)) {
            throw new Error('Нет прав на выполнение этого процесса');
        }
        return user;
    }
    
    // Получение общей статистики системы
    async getSystemStats() {
        const userStats = await this._services.users.getUserStats();
        const processStats = await this._services.processes.getProcessStats();
        const productTypeStats = await this._services.productTypes.getProductTypeStats();
        const orderStats = await this._services.orders.getOrderStats();
        const processWorkload = await this._services.orders.getProcessWorkloadStats();
        
        return {
            users: userStats,
            processes: processStats,
            productTypes: productTypeStats,
            orders: orderStats,
            processWorkload: processWorkload,
            system: {
                initialized: this._isInitialized,
                currentUser: this._currentUser ? this._currentUser.name : null,
                timestamp: new Date().toISOString()
            }
        };
    }
    
    // Экспорт всех данных системы
    async exportSystemData() {
        this.requireAdmin(); // Только администратор может экспортировать
        
        return await RepositoryFactory.exportAllData();
    }
    
    // Импорт данных в систему
    async importSystemData(importData) {
        this.requireAdmin(); // Только администратор может импортировать
        
        return await RepositoryFactory.importAllData(importData);
    }
    
    // Очистка всех данных системы (ОСТОРОЖНО!)
    async clearAllData() {
        this.requireAdmin(); // Только администратор может очищать
        
        const result = await RepositoryFactory.clearAllData();
        
        // После очистки нужно пересоздать администратора
        await this._ensureDefaultAdmin();
        
        return result;
    }
    
    // Диагностика системы
    async diagnoseSystem() {
        const repositoryDiagnostics = await RepositoryFactory.diagnoseAll();
        const systemStats = await this.getSystemStats();
        
        return {
            repositories: repositoryDiagnostics,
            stats: systemStats,
            health: this._checkSystemHealth(repositoryDiagnostics, systemStats)
        };
    }
    
    // Создание демо-данных для тестирования
    async createDemoData() {
        this.requireAdmin();
        
        console.log('🎯 Создание демо-данных...');
        
        try {
            // Создаем процессы
            const process1 = await this._services.processes.createProcess({
                name: 'Прием заказа',
                description: 'Первичная обработка заказа',
                order: 1
            }, this._currentUser.id);
            
            const process2 = await this._services.processes.createProcess({
                name: 'Замер',
                description: 'Снятие размеров изделия',
                order: 2
            }, this._currentUser.id);
            
            const process3 = await this._services.processes.createProcess({
                name: 'Изготовление',
                description: 'Производство изделия',
                order: 3
            }, this._currentUser.id);
            
            const process4 = await this._services.processes.createProcess({
                name: 'Упаковка',
                description: 'Упаковка готового изделия',
                order: 4
            }, this._currentUser.id);
            
            // Создаем тип изделия
            const productType = await this._services.productTypes.createProductType({
                name: 'Тестовое изделие',
                description: 'Изделие для демонстрации системы',
                processIds: [process1.id, process2.id, process3.id, process4.id]
            }, this._currentUser.id);
            
            // Создаем сотрудника
            const employee = await this._services.users.createUser({
                name: 'Тестовый сотрудник',
                role: UserRole.EMPLOYEE
            }, this._currentUser.id);
            
            // Даем сотруднику права
            await this._services.users.grantOrderCreationRight(this._currentUser.id, employee.id);
            await this._services.users.grantProcessRight(this._currentUser.id, employee.id, process1.id);
            await this._services.users.grantProcessRight(this._currentUser.id, employee.id, process2.id);
            
            // Создаем тестовые заказы
            const order1 = await this._services.orders.createOrder({
                customerName: 'Иван Петров',
                customerPhone: '+7 999 123 45 67',
                productTypeId: productType.id
            }, this._currentUser.id);
            
            const order2 = await this._services.orders.createOrder({
                customerName: 'Мария Сидорова',
                customerPhone: '+7 999 234 56 78',
                productTypeId: productType.id
            }, this._currentUser.id);
            
            console.log('✅ Демо-данные созданы успешно');
            
            return {
                processes: [process1, process2, process3, process4],
                productTypes: [productType],
                users: [employee],
                orders: [order1, order2]
            };
            
        } catch (error) {
            console.error('❌ Ошибка создания демо-данных:', error);
            throw error;
        }
    }
    
    // Приватные методы
    
    async _restoreUserSession() {
        try {
            const savedSession = sessionStorage.getItem('oms_current_user');
            if (savedSession) {
                const userData = JSON.parse(savedSession);
                const user = await this._services.users.findUserByName(userData.name);
                if (user) {
                    this._currentUser = user;
                    console.log(`👤 Восстановлена сессия пользователя: ${user.name}`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Не удалось восстановить сессию пользователя:', error);
            this._clearCurrentUserSession();
        }
    }
    
    _saveCurrentUserSession() {
        if (this._currentUser) {
            try {
                sessionStorage.setItem('oms_current_user', JSON.stringify({
                    id: this._currentUser.id,
                    name: this._currentUser.name
                }));
            } catch (error) {
                console.warn('⚠️ Не удалось сохранить сессию пользователя:', error);
            }
        }
    }
    
    _clearCurrentUserSession() {
        try {
            sessionStorage.removeItem('oms_current_user');
        } catch (error) {
            console.warn('⚠️ Не удалось очистить сессию пользователя:', error);
        }
    }
    
    async _ensureDefaultAdmin() {
        try {
            const admin = await this._services.users.createDefaultAdmin();
            console.log(`👑 Администратор по умолчанию: ${admin.name}`);
            return admin;
        } catch (error) {
            console.warn('⚠️ Не удалось создать администратора по умолчанию:', error);
        }
    }
    
    _checkSystemHealth(diagnostics, stats) {
        const issues = [];
        const warnings = [];
        
        // Проверяем репозитории
        Object.entries(diagnostics).forEach(([name, diag]) => {
            if (diag.error) {
                issues.push(`Ошибка в репозитории ${name}: ${diag.error}`);
            }
        });
        
        // Проверяем наличие данных
        if (stats.users.total === 0) {
            issues.push('Нет пользователей в системе');
        }
        
        if (stats.users.administrators === 0) {
            issues.push('Нет администраторов в системе');
        }
        
        if (stats.processes.total === 0) {
            warnings.push('Нет процессов в системе');
        }
        
        if (stats.productTypes.total === 0) {
            warnings.push('Нет типов изделий в системе');
        }
        
        return {
            status: issues.length === 0 ? 'healthy' : 'unhealthy',
            issues: issues,
            warnings: warnings
        };
    }
}