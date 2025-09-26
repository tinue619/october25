/**
 * Сущность типа изделия (расширенная версия)
 * Определяет последовательность процессов и настраиваемые поля для изготовления изделия
 * 
 * @class ProductType
 * @extends Entity
 */
class ProductType extends Entity {
    /**
     * Создает экземпляр типа изделия
     * @param {Object} data - Данные типа изделия
     * @param {string} data.name - Название типа изделия
     * @param {string} [data.description=''] - Описание типа изделия
     * @param {Array<ProcessStep>} [data.processSteps=[]] - Шаги процессов
     * @param {Array<CustomField>} [data.customFields=[]] - Настраиваемые поля
     * @param {boolean} [data.active=true] - Активность типа изделия
     * @param {string} [data.category=''] - Категория типа изделия
     * @param {Object} [data.settings={}] - Дополнительные настройки
     */
    constructor(data = {}) {
        super(data);
        
        this._name = this._validateName(data.name);
        this._description = data.description ? String(data.description).trim() : '';
        this._processSteps = this._validateProcessSteps(data.processSteps || []);
        this._customFields = this._validateCustomFields(data.customFields || []);
        this._active = Boolean(data.active !== undefined ? data.active : true);
        this._category = data.category ? String(data.category).trim() : '';
        this._settings = typeof data.settings === 'object' ? { ...data.settings } : {};
        
        // Кэш для быстрого поиска
        this._processStepsCache = new Map();
        this._customFieldsCache = new Map();
        this._rebuildCaches();
    }

    /**
     * Валидирует название типа изделия
     * @private
     * @param {string} name - Название
     * @returns {string} Валидное название
     * @throws {Error} Если название невалидно
     */
    _validateName(name) {
        if (!name || typeof name !== 'string') {
            throw new Error('Название типа изделия обязательно и должно быть строкой');
        }
        
        const trimmedName = name.trim();
        
        if (trimmedName.length === 0) {
            throw new Error('Название типа изделия не может быть пустым');
        }
        
        if (trimmedName.length > 100) {
            throw new Error('Название типа изделия не может быть длиннее 100 символов');
        }
        
        return trimmedName;
    }

    /**
     * Валидирует массив шагов процессов
     * @private
     * @param {Array} processSteps - Шаги процессов
     * @returns {Array<ProcessStep>} Валидные шаги процессов
     * @throws {Error} Если шаги невалидны
     */
    _validateProcessSteps(processSteps) {
        if (!Array.isArray(processSteps)) {
            return [];
        }
        
        // Проверяем, что все элементы являются ProcessStep
        const validSteps = processSteps.filter(step => step instanceof ProcessStep);
        
        if (validSteps.length !== processSteps.length) {
            throw new Error('Все шаги процессов должны быть экземплярами ProcessStep');
        }
        
        // Сортируем по порядку
        return validSteps.sort((a, b) => a.order - b.order);
    }

    /**
     * Валидирует массив настраиваемых полей
     * @private
     * @param {Array} customFields - Настраиваемые поля
     * @returns {Array<CustomField>} Валидные поля
     * @throws {Error} Если поля невалидны
     */
    _validateCustomFields(customFields) {
        if (!Array.isArray(customFields)) {
            return [];
        }
        
        // Проверяем, что все элементы являются CustomField
        const validFields = customFields.filter(field => field instanceof CustomField);
        
        if (validFields.length !== customFields.length) {
            throw new Error('Все настраиваемые поля должны быть экземплярами CustomField');
        }
        
        // Проверяем уникальность имен полей
        const fieldNames = validFields.map(field => field.name);
        const uniqueNames = new Set(fieldNames);
        
        if (fieldNames.length !== uniqueNames.size) {
            throw new Error('Имена настраиваемых полей должны быть уникальными');
        }
        
        // Сортируем по порядку
        return validFields.sort((a, b) => a.order - b.order);
    }

    /**
     * Перестраивает кэши для быстрого поиска
     * @private
     */
    _rebuildCaches() {
        this._processStepsCache.clear();
        this._customFieldsCache.clear();
        
        // Кэш шагов процессов
        for (const step of this._processSteps) {
            this._processStepsCache.set(step.processId, step);
        }
        
        // Кэш настраиваемых полей
        for (const field of this._customFields) {
            this._customFieldsCache.set(field.name, field);
        }
    }

    // ===== ГЕТТЕРЫ =====

    /**
     * Получить название типа изделия
     * @returns {string} Название
     */
    get name() {
        return this._name;
    }

    /**
     * Получить описание типа изделия
     * @returns {string} Описание
     */
    get description() {
        return this._description;
    }

    /**
     * Получить шаги процессов
     * @returns {Array<ProcessStep>} Копия массива шагов процессов
     */
    get processSteps() {
        return [...this._processSteps];
    }

    /**
     * Получить настраиваемые поля
     * @returns {Array<CustomField>} Копия массива настраиваемых полей
     */
    get customFields() {
        return [...this._customFields];
    }

    /**
     * Проверить активность типа изделия
     * @returns {boolean} true, если активен
     */
    get active() {
        return this._active;
    }

    /**
     * Получить категорию типа изделия
     * @returns {string} Категория
     */
    get category() {
        return this._category;
    }

    /**
     * Получить настройки типа изделия
     * @returns {Object} Копия настроек
     */
    get settings() {
        return { ...this._settings };
    }

    // ===== МЕТОДЫ УПРАВЛЕНИЯ ОСНОВНЫМИ СВОЙСТВАМИ =====

    /**
     * Установить название типа изделия
     * @param {string} name - Новое название
     * @throws {Error} Если название невалидно
     */
    setName(name) {
        this._name = this._validateName(name);
        this.updatedAt = new Date();
    }

    /**
     * Установить описание типа изделия
     * @param {string} description - Новое описание
     */
    setDescription(description) {
        this._description = description ? String(description).trim() : '';
        this.updatedAt = new Date();
    }

    /**
     * Установить категорию типа изделия
     * @param {string} category - Новая категория
     */
    setCategory(category) {
        this._category = category ? String(category).trim() : '';
        this.updatedAt = new Date();
    }

    /**
     * Активировать/деактивировать тип изделия
     * @param {boolean} isActive - Статус активности
     */
    setActive(isActive) {
        this._active = Boolean(isActive);
        this.updatedAt = new Date();
    }

    /**
     * Обновить настройки типа изделия
     * @param {Object} newSettings - Новые настройки
     */
    updateSettings(newSettings) {
        if (typeof newSettings === 'object' && newSettings !== null) {
            this._settings = { ...this._settings, ...newSettings };
            this.updatedAt = new Date();
        }
    }

    // ===== МЕТОДЫ УПРАВЛЕНИЯ ШАГАМИ ПРОЦЕССОВ =====

    /**
     * Добавить шаг процесса к типу изделия
     * @param {ProcessStep} processStep - Шаг процесса
     * @throws {Error} Если шаг уже существует или невалиден
     */
    addProcessStep(processStep) {
        if (!(processStep instanceof ProcessStep)) {
            throw new Error('Шаг процесса должен быть экземпляром ProcessStep');
        }
        
        if (this._processStepsCache.has(processStep.processId)) {
            throw new Error(`Шаг процесса с ID ${processStep.processId} уже существует`);
        }
        
        // Проверяем уникальность порядка
        const existingOrders = this._processSteps.map(step => step.order);
        if (existingOrders.includes(processStep.order)) {
            throw new Error(`Шаг процесса с порядком ${processStep.order} уже существует`);
        }
        
        this._processSteps.push(processStep);
        this._processSteps.sort((a, b) => a.order - b.order);
        this._processStepsCache.set(processStep.processId, processStep);
        this.updatedAt = new Date();
    }

    /**
     * Удалить шаг процесса
     * @param {string} processId - ID процесса для удаления
     * @returns {boolean} true, если шаг был удален
     */
    removeProcessStep(processId) {
        const index = this._processSteps.findIndex(step => step.processId === processId);
        
        if (index === -1) {
            return false;
        }
        
        this._processSteps.splice(index, 1);
        this._processStepsCache.delete(processId);
        this.updatedAt = new Date();
        return true;
    }

    /**
     * Обновить шаг процесса
     * @param {string} processId - ID процесса
     * @param {ProcessStep} newProcessStep - Новый шаг процесса
     * @throws {Error} Если процесс не найден
     */
    updateProcessStep(processId, newProcessStep) {
        if (!(newProcessStep instanceof ProcessStep)) {
            throw new Error('Новый шаг процесса должен быть экземпляром ProcessStep');
        }
        
        const index = this._processSteps.findIndex(step => step.processId === processId);
        
        if (index === -1) {
            throw new Error(`Шаг процесса с ID ${processId} не найден`);
        }
        
        // Проверяем, что новый processId не конфликтует с существующими
        if (newProcessStep.processId !== processId && this._processStepsCache.has(newProcessStep.processId)) {
            throw new Error(`Шаг процесса с ID ${newProcessStep.processId} уже существует`);
        }
        
        // Обновляем шаг
        this._processSteps[index] = newProcessStep;
        this._processSteps.sort((a, b) => a.order - b.order);
        
        // Обновляем кэш
        if (newProcessStep.processId !== processId) {
            this._processStepsCache.delete(processId);
        }
        this._processStepsCache.set(newProcessStep.processId, newProcessStep);
        
        this.updatedAt = new Date();
    }

    /**
     * Изменить порядок шагов процессов
     * @param {Array<{processId: string, order: number}>} newOrder - Новый порядок
     */
    reorderProcessSteps(newOrder) {
        if (!Array.isArray(newOrder)) {
            throw new Error('Новый порядок должен быть массивом');
        }
        
        // Создаем карту нового порядка
        const orderMap = new Map();
        for (const item of newOrder) {
            if (typeof item.processId !== 'string' || typeof item.order !== 'number') {
                throw new Error('Каждый элемент порядка должен содержать processId (string) и order (number)');
            }
            orderMap.set(item.processId, item.order);
        }
        
        // Обновляем порядок существующих шагов
        for (let i = 0; i < this._processSteps.length; i++) {
            const step = this._processSteps[i];
            if (orderMap.has(step.processId)) {
                this._processSteps[i] = step.changeOrder(orderMap.get(step.processId));
            }
        }
        
        // Сортируем по новому порядку
        this._processSteps.sort((a, b) => a.order - b.order);
        this._rebuildCaches();
        this.updatedAt = new Date();
    }

    /**
     * Получить шаг процесса по ID
     * @param {string} processId - ID процесса
     * @returns {ProcessStep|null} Шаг процесса или null
     */
    getProcessStep(processId) {
        return this._processStepsCache.get(processId) || null;
    }

    /**
     * Проверить, есть ли шаг процесса
     * @param {string} processId - ID процесса
     * @returns {boolean} true, если шаг существует
     */
    hasProcessStep(processId) {
        return this._processStepsCache.has(processId);
    }

    /**
     * Получить следующий шаг процесса
     * @param {string} currentProcessId - ID текущего процесса
     * @returns {ProcessStep|null} Следующий шаг или null
     */
    getNextProcessStep(currentProcessId) {
        const currentStep = this.getProcessStep(currentProcessId);
        if (!currentStep) {
            return null;
        }
        
        const nextIndex = this._processSteps.findIndex(step => step.order > currentStep.order);
        return nextIndex !== -1 ? this._processSteps[nextIndex] : null;
    }

    /**
     * Получить первый шаг процесса
     * @returns {ProcessStep|null} Первый шаг или null
     */
    getFirstProcessStep() {
        return this._processSteps.length > 0 ? this._processSteps[0] : null;
    }

    /**
     * Получить последний шаг процесса
     * @returns {ProcessStep|null} Последний шаг или null
     */
    getLastProcessStep() {
        return this._processSteps.length > 0 ? this._processSteps[this._processSteps.length - 1] : null;
    }

    /**
     * Получить обязательные шаги процессов
     * @returns {Array<ProcessStep>} Обязательные шаги
     */
    getRequiredProcessSteps() {
        return this._processSteps.filter(step => step.required && step.active);
    }

    /**
     * Получить опциональные шаги процессов
     * @returns {Array<ProcessStep>} Опциональные шаги
     */
    getOptionalProcessSteps() {
        return this._processSteps.filter(step => !step.required && step.active);
    }

    // ===== МЕТОДЫ УПРАВЛЕНИЯ НАСТРАИВАЕМЫМИ ПОЛЯМИ =====

    /**
     * Добавить настраиваемое поле
     * @param {CustomField} customField - Настраиваемое поле
     * @throws {Error} Если поле уже существует или невалидно
     */
    addCustomField(customField) {
        if (!(customField instanceof CustomField)) {
            throw new Error('Настраиваемое поле должно быть экземпляром CustomField');
        }
        
        if (this._customFieldsCache.has(customField.name)) {
            throw new Error(`Поле с именем ${customField.name} уже существует`);
        }
        
        // Проверяем уникальность порядка
        const existingOrders = this._customFields.map(field => field.order);
        if (existingOrders.includes(customField.order)) {
            // Автоматически назначаем следующий доступный порядок
            const maxOrder = existingOrders.length > 0 ? Math.max(...existingOrders) : -1;
            customField.changeOrder(maxOrder + 1);
        }
        
        this._customFields.push(customField);
        this._customFields.sort((a, b) => a.order - b.order);
        this._customFieldsCache.set(customField.name, customField);
        this.updatedAt = new Date();
    }

    /**
     * Удалить настраиваемое поле
     * @param {string} fieldName - Имя поля для удаления
     * @returns {boolean} true, если поле было удалено
     */
    removeCustomField(fieldName) {
        const index = this._customFields.findIndex(field => field.name === fieldName);
        
        if (index === -1) {
            return false;
        }
        
        this._customFields.splice(index, 1);
        this._customFieldsCache.delete(fieldName);
        this.updatedAt = new Date();
        return true;
    }

    /**
     * Обновить настраиваемое поле
     * @param {string} fieldName - Имя поля
     * @param {CustomField} newCustomField - Новое поле
     * @throws {Error} Если поле не найдено
     */
    updateCustomField(fieldName, newCustomField) {
        if (!(newCustomField instanceof CustomField)) {
            throw new Error('Новое настраиваемое поле должно быть экземпляром CustomField');
        }
        
        const index = this._customFields.findIndex(field => field.name === fieldName);
        
        if (index === -1) {
            throw new Error(`Поле с именем ${fieldName} не найдено`);
        }
        
        // Проверяем, что новое имя не конфликтует с существующими
        if (newCustomField.name !== fieldName && this._customFieldsCache.has(newCustomField.name)) {
            throw new Error(`Поле с именем ${newCustomField.name} уже существует`);
        }
        
        // Обновляем поле
        this._customFields[index] = newCustomField;
        this._customFields.sort((a, b) => a.order - b.order);
        
        // Обновляем кэш
        if (newCustomField.name !== fieldName) {
            this._customFieldsCache.delete(fieldName);
        }
        this._customFieldsCache.set(newCustomField.name, newCustomField);
        
        this.updatedAt = new Date();
    }

    /**
     * Изменить порядок настраиваемых полей
     * @param {Array<{fieldName: string, order: number}>} newOrder - Новый порядок
     */
    reorderCustomFields(newOrder) {
        if (!Array.isArray(newOrder)) {
            throw new Error('Новый порядок должен быть массивом');
        }
        
        // Создаем карту нового порядка
        const orderMap = new Map();
        for (const item of newOrder) {
            if (typeof item.fieldName !== 'string' || typeof item.order !== 'number') {
                throw new Error('Каждый элемент порядка должен содержать fieldName (string) и order (number)');
            }
            orderMap.set(item.fieldName, item.order);
        }
        
        // Обновляем порядок существующих полей
        for (let i = 0; i < this._customFields.length; i++) {
            const field = this._customFields[i];
            if (orderMap.has(field.name)) {
                this._customFields[i] = field.clone(field.name);
                this._customFields[i].changeOrder(orderMap.get(field.name));
            }
        }
        
        // Сортируем по новому порядку
        this._customFields.sort((a, b) => a.order - b.order);
        this._rebuildCaches();
        this.updatedAt = new Date();
    }

    /**
     * Получить настраиваемое поле по имени
     * @param {string} fieldName - Имя поля
     * @returns {CustomField|null} Поле или null
     */
    getCustomField(fieldName) {
        return this._customFieldsCache.get(fieldName) || null;
    }

    /**
     * Проверить, есть ли настраиваемое поле
     * @param {string} fieldName - Имя поля
     * @returns {boolean} true, если поле существует
     */
    hasCustomField(fieldName) {
        return this._customFieldsCache.has(fieldName);
    }

    /**
     * Получить обязательные поля
     * @returns {Array<CustomField>} Обязательные поля
     */
    getRequiredCustomFields() {
        return this._customFields.filter(field => field.required && field.active);
    }

    /**
     * Получить опциональные поля
     * @returns {Array<CustomField>} Опциональные поля
     */
    getOptionalCustomFields() {
        return this._customFields.filter(field => !field.required && field.active);
    }

    /**
     * Получить активные поля
     * @returns {Array<CustomField>} Активные поля
     */
    getActiveCustomFields() {
        return this._customFields.filter(field => field.active);
    }

    // ===== МЕТОДЫ ВАЛИДАЦИИ =====

    /**
     * Валидировать данные заказа согласно настройкам типа изделия
     * @param {Object} orderData - Данные заказа
     * @returns {ValidationResult} Результат валидации
     */
    validateOrderData(orderData) {
        let result = ValidationResult.success();
        
        if (!orderData || typeof orderData !== 'object') {
            return result.addError('Данные заказа должны быть объектом');
        }
        
        // Валидируем настраиваемые поля
        const activeFields = this.getActiveCustomFields();
        
        for (const field of activeFields) {
            const fieldValue = orderData[field.name];
            const fieldValidation = field.validateValue(fieldValue);
            
            if (!fieldValidation.isValid) {
                for (const error of fieldValidation.errors) {
                    result = result.addFieldError(field.name, error);
                }
            }
        }
        
        return result;
    }

    /**
     * Проверить валидность типа изделия
     * @returns {ValidationResult} Результат валидации
     */
    validate() {
        let result = ValidationResult.success();
        
        // Проверяем основные поля
        if (!this._name || this._name.trim().length === 0) {
            result = result.addError('Название типа изделия обязательно');
        }
        
        // Проверяем наличие процессов
        if (this._processSteps.length === 0) {
            result = result.addError('Тип изделия должен содержать хотя бы один процесс');
        }
        
        // Проверяем уникальность порядков процессов
        const processOrders = this._processSteps.map(step => step.order);
        const uniqueProcessOrders = new Set(processOrders);
        if (processOrders.length !== uniqueProcessOrders.size) {
            result = result.addError('Шаги процессов должны иметь уникальные порядковые номера');
        }
        
        // Проверяем уникальность имен полей
        const fieldNames = this._customFields.map(field => field.name);
        const uniqueFieldNames = new Set(fieldNames);
        if (fieldNames.length !== uniqueFieldNames.size) {
            result = result.addError('Настраиваемые поля должны иметь уникальные имена');
        }
        
        return result;
    }

    // ===== СЛУЖЕБНЫЕ МЕТОДЫ =====

    /**
     * Получить краткую информацию о типе изделия
     * @returns {Object} Краткая информация
     */
    getSummary() {
        return {
            id: this.id,
            name: this._name,
            description: this._description,
            category: this._category,
            active: this._active,
            processStepsCount: this._processSteps.length,
            customFieldsCount: this._customFields.length,
            requiredProcessSteps: this.getRequiredProcessSteps().length,
            optionalProcessSteps: this.getOptionalProcessSteps().length,
            requiredCustomFields: this.getRequiredCustomFields().length,
            optionalCustomFields: this.getOptionalCustomFields().length
        };
    }

    /**
     * Клонировать тип изделия с новым именем
     * @param {string} newName - Новое имя
     * @returns {ProductType} Клон типа изделия
     */
    clone(newName) {
        return new ProductType({
            name: newName,
            description: this._description,
            processSteps: this._processSteps.map(step => step.clone()),
            customFields: this._customFields.map(field => field.clone(field.name, field.label)),
            active: this._active,
            category: this._category,
            settings: { ...this._settings }
        });
    }

    /**
     * Преобразовать в объект для сериализации
     * @returns {Object} Объект для сериализации
     */
    toJSON() {
        return {
            ...super.toJSON(),
            name: this._name,
            description: this._description,
            processSteps: this._processSteps.map(step => step.toJSON()),
            customFields: this._customFields.map(field => field.toJSON()),
            active: this._active,
            category: this._category,
            settings: this._settings
        };
    }

    /**
     * Создать ProductType из JSON объекта
     * @param {Object} json - JSON объект
     * @returns {ProductType} Новый экземпляр ProductType
     */
    static fromJSON(json) {
        return new ProductType({
            ...json,
            processSteps: json.processSteps ? json.processSteps.map(step => ProcessStep.fromJSON(step)) : [],
            customFields: json.customFields ? json.customFields.map(field => CustomField.fromJSON ? CustomField.fromJSON(field) : new CustomField(field)) : []
        });
    }
}

// Глобальная доступность
window.ProductType = ProductType;
