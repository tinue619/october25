/**
 * Фабрика репозиториев
 * Создает нужные репозитории для работы с сущностями
 */
class RepositoryFactory {
    
    // Создание репозитория для пользователей
    static createUserRepository() {
        return new LocalStorageRepository('users', User);
    }
    
    // Создание репозитория для процессов
    static createProcessRepository() {
        return new LocalStorageRepository('processes', Process);
    }
    
    // Создание репозитория для типов изделий
    static createProductTypeRepository() {
        return new LocalStorageRepository('productTypes', ProductType);
    }
    
    // Создание репозитория для заказов
    static createOrderRepository() {
        return new LocalStorageRepository('orders', Order);
    }
    
    // Создание всех репозиториев одновременно
    static createAllRepositories() {
        return {
            users: this.createUserRepository(),
            processes: this.createProcessRepository(),
            productTypes: this.createProductTypeRepository(),
            orders: this.createOrderRepository()
        };
    }
    
    // Создание репозитория по имени сущности
    static createRepository(entityName) {
        switch (entityName.toLowerCase()) {
            case 'user':
            case 'users':
                return this.createUserRepository();
                
            case 'process':
            case 'processes':
                return this.createProcessRepository();
                
            case 'producttype':
            case 'producttypes':
                return this.createProductTypeRepository();
                
            case 'order':
            case 'orders':
                return this.createOrderRepository();
                
            default:
                throw new Error(`Неизвестный тип сущности: ${entityName}`);
        }
    }
    
    // Получение информации о доступных репозиториях
    static getAvailableRepositories() {
        return [
            { name: 'users', entityClass: 'User', description: 'Пользователи системы' },
            { name: 'processes', entityClass: 'Process', description: 'Этапы процессов' },
            { name: 'productTypes', entityClass: 'ProductType', description: 'Типы изделий' },
            { name: 'orders', entityClass: 'Order', description: 'Заказы' }
        ];
    }
    
    // Диагностика всех репозиториев
    static async diagnoseAll() {
        const repositories = this.createAllRepositories();
        const diagnostics = {};
        
        for (const [name, repo] of Object.entries(repositories)) {
            try {
                diagnostics[name] = await repo.diagnose();
            } catch (error) {
                diagnostics[name] = {
                    error: error.message,
                    status: 'failed'
                };
            }
        }
        
        return diagnostics;
    }
    
    // Очистка всех данных (ОСТОРОЖНО!)
    static async clearAllData() {
        const repositories = this.createAllRepositories();
        const results = {};
        
        for (const [name, repo] of Object.entries(repositories)) {
            try {
                await repo.clear();
                results[name] = 'cleared';
            } catch (error) {
                results[name] = `error: ${error.message}`;
            }
        }
        
        return results;
    }
    
    // Экспорт всех данных
    static async exportAllData() {
        const repositories = this.createAllRepositories();
        const exportData = {};
        
        for (const [name, repo] of Object.entries(repositories)) {
            try {
                exportData[name] = await repo.exportData();
            } catch (error) {
                exportData[name] = [];
                console.warn(`Не удалось экспортировать данные для ${name}:`, error);
            }
        }
        
        return {
            exportDate: new Date().toISOString(),
            version: '1.0',
            data: exportData
        };
    }
    
    // Импорт всех данных
    static async importAllData(importData) {
        if (!importData || !importData.data) {
            throw new Error('Неверный формат данных для импорта');
        }
        
        const repositories = this.createAllRepositories();
        const results = {};
        
        for (const [name, repo] of Object.entries(repositories)) {
            try {
                const dataToImport = importData.data[name] || [];
                const count = await repo.importData(dataToImport);
                results[name] = `imported ${count} records`;
            } catch (error) {
                results[name] = `error: ${error.message}`;
            }
        }
        
        return results;
    }
}