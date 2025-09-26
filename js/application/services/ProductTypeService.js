/**
 * Сервис для управления типами изделий
 * Содержит бизнес-логику работы с типами изделий и их последовательностями процессов
 */
class ProductTypeService {
    
    constructor(productTypeRepository, processRepository) {
        this._productTypeRepository = productTypeRepository;
        this._processRepository = processRepository;
    }
    
    // Создание нового типа изделия
    async createProductType(productTypeData, createdBy = null) {
        // Валидация данных
        if (!productTypeData.name || productTypeData.name.trim() === '') {
            throw new Error('Название типа изделия обязательно');
        }
        
        // Проверка уникальности названия
        const existingProductTypes = await this._productTypeRepository.findBy({ name: productTypeData.name });
        if (existingProductTypes.length > 0) {
            throw new Error('Тип изделия с таким названием уже существует');
        }
        
        // Валидация процессов, если они указаны
        if (productTypeData.processIds && productTypeData.processIds.length > 0) {
            const validation = await this._validateProcessIds(productTypeData.processIds);
            if (!validation.isValid) {
                throw new Error(`Ошибки в процессах: ${validation.issues.join(', ')}`);
            }
        }
        
        // Создание типа изделия
        const productType = new ProductType({
            name: productTypeData.name,
            description: productTypeData.description || '',
            processIds: productTypeData.processIds || []
        });
        
        if (createdBy) {
            productType.setCreatedBy(createdBy);
        }
        
        return await this._productTypeRepository.save(productType);
    }
    
    // Обновление типа изделия
    async updateProductType(productTypeId, productTypeData, updatedBy = null) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        // Обновляем поля
        if (productTypeData.name) {
            // Проверяем уникальность нового названия
            const existingProductTypes = await this._productTypeRepository.findBy({ name: productTypeData.name });
            const duplicateProductType = existingProductTypes.find(pt => pt.id !== productTypeId);
            if (duplicateProductType) {
                throw new Error('Тип изделия с таким названием уже существует');
            }
            productType.setName(productTypeData.name);
        }
        
        if (productTypeData.description !== undefined) {
            productType.setDescription(productTypeData.description);
        }
        
        if (productTypeData.processIds) {
            const validation = await this._validateProcessIds(productTypeData.processIds);
            if (!validation.isValid) {
                throw new Error(`Ошибки в процессах: ${validation.issues.join(', ')}`);
            }
            productType.setProcessSequence(productTypeData.processIds);
        }
        
        return await this._productTypeRepository.save(productType);
    }
    
    // Удаление типа изделия
    async deleteProductType(productTypeId, deletedBy = null) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        // TODO: Проверить, используется ли тип изделия в заказах
        // Пока что разрешаем удаление
        
        return await this._productTypeRepository.delete(productTypeId);
    }
    
    // Получение всех типов изделий
    async getAllProductTypes() {
        try {
            const result = await this._productTypeRepository.findAll();
            console.log('📊 ProductTypeService.getAllProductTypes:', result.length, 'items');
            console.log('📊 Raw data from repository:', result);
            return result;
        } catch (error) {
            console.error('❌ Ошибка в ProductTypeService.getAllProductTypes:', error);
            throw error;
        }
    }
    
    // Получение типа изделия по ID
    async getProductTypeById(productTypeId) {
        return await this._productTypeRepository.findById(productTypeId);
    }
    
    // Получение типа изделия с полной информацией о процессах
    async getProductTypeWithProcesses(productTypeId) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        // Получаем информацию о процессах
        const processes = [];
        for (const processId of productType.processIds) {
            const process = await this._processRepository.findById(processId);
            if (process) {
                processes.push(process);
            }
        }
        
        return {
            productType: productType,
            processes: processes,
            isValid: processes.length === productType.processIds.length
        };
    }
    
    // Добавление процесса в последовательность
    async addProcessToSequence(productTypeId, processId, position = null) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        const process = await this._processRepository.findById(processId);
        if (!process) {
            throw new Error('Процесс не найден');
        }
        
        if (productType.hasProcess(processId)) {
            throw new Error('Процесс уже добавлен в последовательность');
        }
        
        if (position !== null && (position < 0 || position > productType.processIds.length)) {
            throw new Error('Недопустимая позиция для вставки');
        }
        
        const newProcessIds = [...productType.processIds];
        
        if (position === null) {
            // Добавляем в конец
            newProcessIds.push(processId);
        } else {
            // Вставляем в указанную позицию
            newProcessIds.splice(position, 0, processId);
        }
        
        productType.setProcessSequence(newProcessIds);
        return await this._productTypeRepository.save(productType);
    }
    
    // Удаление процесса из последовательности
    async removeProcessFromSequence(productTypeId, processId) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        if (!productType.hasProcess(processId)) {
            throw new Error('Процесс не найден в последовательности');
        }
        
        productType.removeProcess(processId);
        return await this._productTypeRepository.save(productType);
    }
    
    // Изменение порядка процессов в последовательности
    async reorderProcesses(productTypeId, newProcessOrder) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        // Проверяем, что все процессы из новой последовательности существуют в текущей
        const currentProcessIds = new Set(productType.processIds);
        const newProcessIds = new Set(newProcessOrder);
        
        if (currentProcessIds.size !== newProcessIds.size || 
            ![...currentProcessIds].every(id => newProcessIds.has(id))) {
            throw new Error('Новая последовательность должна содержать те же процессы');
        }
        
        productType.setProcessSequence(newProcessOrder);
        return await this._productTypeRepository.save(productType);
    }
    
    // Валидация типа изделия
    async validateProductType(productTypeId) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        const issues = [];
        
        // Проверяем базовые свойства
        if (!productType.name || productType.name.trim() === '') {
            issues.push('Отсутствует название типа изделия');
        }
        
        // Проверяем наличие процессов
        if (productType.processIds.length === 0) {
            issues.push('Нет процессов в последовательности');
        }
        
        // Проверяем существование всех процессов
        for (const processId of productType.processIds) {
            const process = await this._processRepository.findById(processId);
            if (!process) {
                issues.push(`Процесс с ID ${processId} не найден`);
            }
        }
        
        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }
    
    // Приватные методы
    async _validateProcessIds(processIds) {
        const issues = [];
        
        // Проверяем уникальность
        const uniqueIds = [...new Set(processIds)];
        if (uniqueIds.length !== processIds.length) {
            issues.push('В последовательности есть дублирующиеся процессы');
        }
        
        // Проверяем существование процессов
        for (const processId of processIds) {
            const process = await this._processRepository.findById(processId);
            if (!process) {
                issues.push(`Процесс с ID ${processId} не найден`);
            }
        }
        
        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }
    
    // Удаление типа изделия
    async deleteProductType(productTypeId, deletedBy = null) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        // Проверяем, нет ли ссылок на этот тип в активных заказах
        // TODO: Можно добавить проверку через OrderService
        
        return await this._productTypeRepository.delete(productTypeId);
    }
    
    // Методы для новых UI компонентов
    
    /**
     * Получить тип изделия с полной информацией о полях
     */
    async getProductTypeWithFields(productTypeId) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        return productType; // ProductType уже содержит customFields
    }
    
    /**
     * Добавить настраиваемое поле к типу изделия
     */
    async addCustomField(productTypeId, fieldData) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        try {
            const customField = productType.addCustomField(fieldData);
            await this._productTypeRepository.save(productType);
            return customField;
        } catch (error) {
            throw new Error(`Ошибка добавления поля: ${error.message}`);
        }
    }
    
    /**
     * Обновить настраиваемое поле
     */
    async updateCustomField(productTypeId, fieldId, fieldData) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        try {
            const customField = productType.updateCustomField(fieldId, fieldData);
            await this._productTypeRepository.save(productType);
            return customField;
        } catch (error) {
            throw new Error(`Ошибка обновления поля: ${error.message}`);
        }
    }
    
    /**
     * Удалить настраиваемое поле
     */
    async removeCustomField(productTypeId, fieldId) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        try {
            productType.removeCustomField(fieldId);
            await this._productTypeRepository.save(productType);
            return true;
        } catch (error) {
            throw new Error(`Ошибка удаления поля: ${error.message}`);
        }
    }
    
    /**
     * Добавить процесс в последовательность
     */
    async addProcessToSequence(productTypeId, processId, order, isRequired = true) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        // Проверяем существование процесса
        const process = await this._processRepository.findById(processId);
        if (!process) {
            throw new Error('Процесс не найден');
        }
        
        try {
            const processStep = productType.addProcess(processId, order, isRequired);
            await this._productTypeRepository.save(productType);
            return processStep;
        } catch (error) {
            throw new Error(`Ошибка добавления процесса: ${error.message}`);
        }
    }
    
    /**
     * Удалить процесс из последовательности
     */
    async removeProcessFromSequence(productTypeId, processId) {
        const productType = await this._productTypeRepository.findById(productTypeId);
        if (!productType) {
            throw new Error('Тип изделия не найден');
        }
        
        try {
            productType.removeProcess(processId);
            await this._productTypeRepository.save(productType);
            return true;
        } catch (error) {
            throw new Error(`Ошибка удаления процесса: ${error.message}`);
        }
    }
    
    /**
     * Получить статистику типов изделий
     */
    async getProductTypeStats() {
        const productTypes = await this.getAllProductTypes();
        
        return {
            total: productTypes.length,
            active: productTypes.filter(pt => pt.active !== false).length,
            withCustomFields: productTypes.filter(pt => pt.customFields && pt.customFields.length > 0).length,
            withProcesses: productTypes.filter(pt => pt.processSteps && pt.processSteps.length > 0).length,
            recentlyCreated: productTypes.filter(pt => {
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return pt.createdAt && pt.createdAt > dayAgo;
            }).length
        };
    }
}