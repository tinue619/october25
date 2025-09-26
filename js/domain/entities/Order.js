/**
 * Сущность заказа (расширенная версия)
 * Представляет заказ клиента с настраиваемыми полями и расширенным управлением процессами
 *
 * @class Order
 * @extends Entity
 */
class Order extends Entity {
    /**
     * Создает экземпляр заказа
     * @param {Object} data - Данные заказа
     * @param {string} [data.number] - Номер заказа (генерируется автоматически, если не указан)
     * @param {string} data.productTypeId - ID типа изделия
     * @param {string} data.customerName - Имя клиента
     * @param {string} [data.customerPhone=''] - Телефон клиента
     * @param {string} [data.status] - Статус заказа
     * @param {ProcessFlow} [data.processFlow] - Поток процессов
     * @param {Array<FieldValue>} [data.fieldValues=[]] - Значения настраиваемых полей
     * @param {Array<Object>} [data.history=[]] - История изменений
     * @param {Object} [data.metadata={}] - Дополнительные метаданные
     */
    constructor(data = {}) {
        super(data);
        
        this._number = data.number || this._generateOrderNumber();
        this._productTypeId = this._validateProductTypeId(data.productTypeId);
        this._customerName = this._validateCustomerName(data.customerName);
        this._customerPhone = data.customerPhone ? String(data.customerPhone).trim() : '';
        this._status = data.status || ORDER_STATUS.DRAFT;
        this._processFlow = data.processFlow instanceof ProcessFlow ? data.processFlow : null;
        this._fieldValues = this._validateFieldValues(data.fieldValues || []);
        this._history = Array.isArray(data.history) ? [...data.history] : [];
        this._metadata = typeof data.metadata === 'object' ? { ...data.metadata } : {};
        
        // Кэш для быстрого поиска значений полей
        this._fieldValuesCache = new Map();
        this._rebuildFieldCache();
    }

    /**
     * Валидирует ID типа изделия
     * @private
     * @param {string} productTypeId - ID типа изделия
     * @returns {string} Валидный ID
     * @throws {Error} Если ID невалиден
     */
    _validateProductTypeId(productTypeId) {
        if (!productTypeId || typeof productTypeId !== 'string') {
            throw new Error('ID типа изделия обязателен и должен быть строкой');
        }
        
        return productTypeId.trim();
    }

    /**
     * Валидирует имя клиента
     * @private
     * @param {string} customerName - Имя клиента
     * @returns {string} Валидное имя
     * @throws {Error} Если имя невалидно
     */
    _validateCustomerName(customerName) {
        if (!customerName || typeof customerName !== 'string') {
            throw new Error('Имя клиента обязательно и должно быть строкой');
        }
        
        const trimmedName = customerName.trim();
        
        if (trimmedName.length === 0) {
            throw new Error('Имя клиента не может быть пустым');
        }
        
        if (trimmedName.length > 100) {
            throw new Error('Имя клиента не может быть длиннее 100 символов');
        }
        
        return trimmedName;
    }

    /**
     * Валидирует массив значений полей
     * @private
     * @param {Array} fieldValues - Значения полей
     * @returns {Array<FieldValue>} Валидные значения полей
     */
    _validateFieldValues(fieldValues) {
        if (!Array.isArray(fieldValues)) {
            return [];
        }
        
        const validValues = fieldValues.filter(value => value instanceof FieldValue);
        
        if (validValues.length !== fieldValues.length) {
            throw new Error('Все значения полей должны быть экземплярами FieldValue');
        }
        
        // Проверяем уникальность ID полей
        const fieldIds = validValues.map(value => value.fieldId);
        const uniqueIds = new Set(fieldIds);
        
        if (fieldIds.length !== uniqueIds.size) {
            throw new Error('ID полей должны быть уникальными в рамках заказа');
        }
        
        return validValues;
    }

    /**
     * Перестраивает кэш значений полей
     * @private
     */
    _rebuildFieldCache() {
        this._fieldValuesCache.clear();
        
        for (const fieldValue of this._fieldValues) {
            this._fieldValuesCache.set(fieldValue.fieldId, fieldValue);
        }
    }

    /**
     * Генерирует номер заказа
     * @private
     * @returns {string} Новый номер заказа
     */
    _generateOrderNumber() {
        const date = new Date();
        const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
        const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${dateStr}-${randomPart}`;
    }

    /**
     * Добавляет событие в историю
     * @private
     * @param {string} type - Тип события
     * @param {string} performedBy - ID пользователя
     * @param {Object} details - Детали события
     */
    _addHistoryEvent(type, performedBy, details = {}) {
        this._history.push({
            id: this._generateEventId(),
            timestamp: new Date(),
            type: type,
            performedBy: performedBy,
            details: { ...details }
        });
    }

    /**
     * Генерирует ID события
     * @private
     * @returns {string} ID события
     */
    _generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ===== ГЕТТЕРЫ =====

    /**
     * Получить номер заказа
     * @returns {string} Номер заказа
     */
    get number() {
        return this._number;
    }

    /**
     * Получить ID типа изделия
     * @returns {string} ID типа изделия
     */
    get productTypeId() {
        return this._productTypeId;
    }

    /**
     * Получить имя клиента
     * @returns {string} Имя клиента
     */
    get customerName() {
        return this._customerName;
    }

    /**
     * Получить телефон клиента
     * @returns {string} Телефон клиента
     */
    get customerPhone() {
        return this._customerPhone;
    }

    /**
     * Получить статус заказа
     * @returns {string} Статус заказа
     */
    get status() {
        return this._status;
    }

    /**
     * Получить поток процессов
     * @returns {ProcessFlow|null} Поток процессов
     */
    get processFlow() {
        return this._processFlow;
    }

    /**
     * Получить значения полей
     * @returns {Array<FieldValue>} Копия массива значений полей
     */
    get fieldValues() {
        return [...this._fieldValues];
    }

    /**
     * Получить историю
     * @returns {Array<Object>} Копия массива истории
     */
    get history() {
        return [...this._history];
    }

    /**
     * Получить метаданные
     * @returns {Object} Копия метаданных
     */
    get metadata() {
        return { ...this._metadata };
    }

    // ===== МЕТОДЫ УПРАВЛЕНИЯ ОСНОВНЫМИ СВОЙСТВАМИ =====

    /**
     * Установить имя клиента
     * @param {string} name - Новое имя клиента
     */
    setCustomerName(name) {
        const oldName = this._customerName;
        this._customerName = this._validateCustomerName(name);
        
        this._addHistoryEvent('customer_name_changed', null, {
            oldName,
            newName: this._customerName
        });
        
        this.updatedAt = new Date();
    }

    /**
     * Установить телефон клиента
     * @param {string} phone - Новый телефон клиента
     */
    setCustomerPhone(phone) {
        const oldPhone = this._customerPhone;
        this._customerPhone = phone ? String(phone).trim() : '';
        
        this._addHistoryEvent('customer_phone_changed', null, {
            oldPhone,
            newPhone: this._customerPhone
        });
        
        this.updatedAt = new Date();
    }

    /**
     * Установить тип изделия
     * @param {string} productTypeId - ID типа изделия
     */
    setProductType(productTypeId) {
        const oldProductTypeId = this._productTypeId;
        this._productTypeId = this._validateProductTypeId(productTypeId);
        
        // При смене типа изделия сбрасываем процессы и поля
        this._processFlow = null;
        this._fieldValues = [];
        this._fieldValuesCache.clear();
        
        this._addHistoryEvent('product_type_changed', null, {
            oldProductTypeId,
            newProductTypeId: this._productTypeId
        });
        
        this.updatedAt = new Date();
    }

    /**
     * Установить статус заказа
     * @param {string} status - Новый статус
     * @param {string} [performedBy] - ID пользователя
     * @param {string} [reason] - Причина изменения статуса
     */
    setStatus(status, performedBy = null, reason = '') {
        if (!Object.values(ORDER_STATUS).includes(status)) {
            throw new Error(`Недопустимый статус заказа: ${status}`);
        }
        
        const oldStatus = this._status;
        this._status = status;
        
        this._addHistoryEvent('status_changed', performedBy, {
            oldStatus,
            newStatus: status,
            reason: reason ? String(reason).trim() : ''
        });
        
        this.updatedAt = new Date();
    }

    /**
     * Установить поток процессов
     * @param {ProcessFlow} processFlow - Новый поток процессов
     */
    setProcessFlow(processFlow) {
        if (processFlow && !(processFlow instanceof ProcessFlow)) {
            throw new Error('Поток процессов должен быть экземпляром ProcessFlow');
        }
        
        this._processFlow = processFlow;
        this.updatedAt = new Date();
    }

    /**
     * Обновить метаданные
     * @param {Object} metadata - Новые метаданные
     */
    updateMetadata(metadata) {
        if (typeof metadata === 'object' && metadata !== null) {
            this._metadata = { ...this._metadata, ...metadata };
            this.updatedAt = new Date();
        }
    }

    // ===== МЕТОДЫ РАБОТЫ С НАСТРАИВАЕМЫМИ ПОЛЯМИ =====

    /**
     * Установить значение настраиваемого поля
     * @param {string} fieldId - ID поля
     * @param {*} value - Значение поля
     * @param {string} [updatedBy] - ID пользователя
     * @returns {boolean} true, если значение было установлено
     */
    setFieldValue(fieldId, value, updatedBy = null) {
        const existingValue = this._fieldValuesCache.get(fieldId);
        
        if (existingValue) {
            // Обновляем существующее значение
            const updatedValue = existingValue.updateValue(value, updatedBy);
            
            if (updatedValue !== existingValue) {
                // Значение изменилось
                const index = this._fieldValues.findIndex(fv => fv.fieldId === fieldId);
                this._fieldValues[index] = updatedValue;
                this._fieldValuesCache.set(fieldId, updatedValue);
                
                this._addHistoryEvent('field_value_changed', updatedBy, {
                    fieldId,
                    oldValue: existingValue.getValue(),
                    newValue: value
                });
                
                this.updatedAt = new Date();
                return true;
            }
            
            return false;
        } else {
            // Создаем новое значение поля
            const newFieldValue = FieldValue.create(fieldId, value, updatedBy);
            this._fieldValues.push(newFieldValue);
            this._fieldValuesCache.set(fieldId, newFieldValue);
            
            this._addHistoryEvent('field_value_added', updatedBy, {
                fieldId,
                value
            });
            
            this.updatedAt = new Date();
            return true;
        }
    }

    /**
     * Получить значение настраиваемого поля
     * @param {string} fieldId - ID поля
     * @returns {*} Значение поля или null, если поле не найдено
     */
    getFieldValue(fieldId) {
        const fieldValue = this._fieldValuesCache.get(fieldId);
        return fieldValue ? fieldValue.getValue() : null;
    }

    /**
     * Получить объект FieldValue по ID поля
     * @param {string} fieldId - ID поля
     * @returns {FieldValue|null} Объект FieldValue или null
     */
    getFieldValueObject(fieldId) {
        return this._fieldValuesCache.get(fieldId) || null;
    }

    /**
     * Проверить, есть ли значение поля
     * @param {string} fieldId - ID поля
     * @returns {boolean} true, если значение поля существует
     */
    hasFieldValue(fieldId) {
        return this._fieldValuesCache.has(fieldId);
    }

    /**
     * Удалить значение поля
     * @param {string} fieldId - ID поля
     * @param {string} [removedBy] - ID пользователя
     * @returns {boolean} true, если значение было удалено
     */
    removeFieldValue(fieldId, removedBy = null) {
        const fieldValue = this._fieldValuesCache.get(fieldId);
        
        if (!fieldValue) {
            return false;
        }
        
        const index = this._fieldValues.findIndex(fv => fv.fieldId === fieldId);
        this._fieldValues.splice(index, 1);
        this._fieldValuesCache.delete(fieldId);
        
        this._addHistoryEvent('field_value_removed', removedBy, {
            fieldId,
            removedValue: fieldValue.getValue()
        });
        
        this.updatedAt = new Date();
        return true;
    }

    /**
     * Получить все значения полей как объект
     * @returns {Object} Объект с парами ключ-значение
     */
    getAllFieldValues() {
        const result = {};
        
        for (const fieldValue of this._fieldValues) {
            result[fieldValue.fieldId] = fieldValue.getValue();
        }
        
        return result;
    }

    /**
     * Установить несколько значений полей одновременно
     * @param {Object} fieldValuesMap - Объект с парами fieldId-value
     * @param {string} [updatedBy] - ID пользователя
     */
    setMultipleFieldValues(fieldValuesMap, updatedBy = null) {
        if (typeof fieldValuesMap !== 'object' || fieldValuesMap === null) {
            return;
        }
        
        for (const [fieldId, value] of Object.entries(fieldValuesMap)) {
            this.setFieldValue(fieldId, value, updatedBy);
        }
    }

    // ===== МЕТОДЫ РАБОТЫ С ПРОЦЕССАМИ =====

    /**
     * Получить текущий процесс
     * @returns {ProcessStep|null} Текущий процесс или null
     */
    getCurrentProcess() {
        return this._processFlow ? this._processFlow.getCurrentStep() : null;
    }

    /**
     * Завершить текущий процесс
     * @param {string} performedBy - ID пользователя
     * @param {string} [notes] - Дополнительные заметки
     * @returns {boolean} true, если процесс был завершен
     */
    completeCurrentProcess(performedBy, notes = '') {
        if (!this._processFlow) {
            throw new Error('Заказ не имеет потока процессов');
        }
        
        const currentStep = this._processFlow.getCurrentStep();
        if (!currentStep) {
            return false; // Нет текущего процесса
        }
        
        this._processFlow = this._processFlow.completeCurrentStep(performedBy, notes);
        
        this._addHistoryEvent('process_completed', performedBy, {
            processId: currentStep.processId,
            processTitle: currentStep.getDisplayTitle(),
            notes
        });
        
        // Проверяем, завершен ли весь поток
        if (this._processFlow.isCompleted()) {
            this.setStatus(ORDER_STATUS.COMPLETED, performedBy, 'Все процессы завершены');
        }
        
        this.updatedAt = new Date();
        return true;
    }

    /**
     * Пропустить текущий опциональный процесс
     * @param {string} performedBy - ID пользователя
     * @param {string} reason - Причина пропуска
     * @returns {boolean} true, если процесс был пропущен
     */
    skipCurrentProcess(performedBy, reason) {
        if (!this._processFlow) {
            throw new Error('Заказ не имеет потока процессов');
        }
        
        const currentStep = this._processFlow.getCurrentStep();
        if (!currentStep) {
            return false; // Нет текущего процесса
        }
        
        this._processFlow = this._processFlow.skipCurrentStep(performedBy, reason);
        
        this._addHistoryEvent('process_skipped', performedBy, {
            processId: currentStep.processId,
            processTitle: currentStep.getDisplayTitle(),
            reason
        });
        
        this.updatedAt = new Date();
        return true;
    }

    /**
     * Вернуться к предыдущему процессу
     * @param {string} performedBy - ID пользователя
     * @param {string} reason - Причина возврата
     * @returns {boolean} true, если возврат был выполнен
     */
    revertToPreviousProcess(performedBy, reason) {
        if (!this._processFlow) {
            throw new Error('Заказ не имеет потока процессов');
        }
        
        this._processFlow = this._processFlow.revertToPreviousStep(performedBy, reason);
        
        this._addHistoryEvent('process_reverted', performedBy, {
            reason
        });
        
        this.updatedAt = new Date();
        return true;
    }

    // ===== ПРОВЕРКИ СОСТОЯНИЯ =====

    /**
     * Проверить, находится ли заказ в работе
     * @returns {boolean} true, если заказ в работе
     */
    isInProgress() {
        return this._status === ORDER_STATUS.IN_PROGRESS;
    }

    /**
     * Проверить, завершен ли заказ
     * @returns {boolean} true, если заказ завершен
     */
    isCompleted() {
        return this._status === ORDER_STATUS.COMPLETED;
    }

    /**
     * Проверить, отменен ли заказ
     * @returns {boolean} true, если заказ отменен
     */
    isCancelled() {
        return this._status === ORDER_STATUS.CANCELLED;
    }

    /**
     * Проверить, является ли заказ черновиком
     * @returns {boolean} true, если заказ - черновик
     */
    isDraft() {
        return this._status === ORDER_STATUS.DRAFT;
    }

    /**
     * Проверить валидность заказа
     * @returns {ValidationResult} Результат валидации
     */
    validate() {
        let result = ValidationResult.success();
        
        // Проверяем основные поля
        if (!this._customerName || this._customerName.trim().length === 0) {
            result = result.addError('Имя клиента обязательно');
        }
        
        if (!this._productTypeId) {
            result = result.addError('Тип изделия обязателен');
        }
        
        return result;
    }

    /**
     * Валидировать значения полей с помощью настраиваемых полей
     * @param {Array<CustomField>} customFields - Массив настраиваемых полей
     * @returns {ValidationResult} Результат валидации
     */
    validateFieldValues(customFields) {
        let result = ValidationResult.success();
        
        if (!Array.isArray(customFields)) {
            return result;
        }
        
        for (const customField of customFields) {
            if (!customField.active) {
                continue;
            }
            
            const fieldValue = this.getFieldValue(customField.id);
            const fieldValidation = customField.validateValue(fieldValue);
            
            if (!fieldValidation.isValid) {
                for (const error of fieldValidation.errors) {
                    result = result.addFieldError(customField.name, error);
                }
            }
        }
        
        return result;
    }

    // ===== СЛУЖЕБНЫЕ МЕТОДЫ =====

    /**
     * Получить краткую информацию о заказе
     * @returns {Object} Краткая информация
     */
    getSummary() {
        const currentProcess = this.getCurrentProcess();
        
        return {
            id: this.id,
            number: this._number,
            customerName: this._customerName,
            customerPhone: this._customerPhone,
            productTypeId: this._productTypeId,
            status: this._status,
            currentProcessId: currentProcess ? currentProcess.processId : null,
            currentProcessTitle: currentProcess ? currentProcess.getDisplayTitle() : null,
            progress: this._processFlow ? this._processFlow.getProgressPercentage() : 0,
            isCompleted: this.isCompleted(),
            fieldValuesCount: this._fieldValues.length,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Завершить заказ
     * @param {string} performedBy - ID пользователя
     * @param {string} [comment] - Комментарий
     */
    complete(performedBy, comment = '') {
        this.setStatus(ORDER_STATUS.COMPLETED, performedBy, comment);
    }

    /**
     * Отменить заказ
     * @param {string} performedBy - ID пользователя
     * @param {string} [reason] - Причина отмены
     */
    cancel(performedBy, reason = '') {
        this.setStatus(ORDER_STATUS.CANCELLED, performedBy, reason);
    }

    /**
     * Запустить заказ в работу
     * @param {string} performedBy - ID пользователя
     */
    start(performedBy) {
        this.setStatus(ORDER_STATUS.IN_PROGRESS, performedBy, 'Заказ запущен в работу');
    }

    /**
     * Преобразовать в объект для сериализации
     * @returns {Object} Объект для сериализации
     */
    toJSON() {
        return {
            ...super.toJSON(),
            number: this._number,
            productTypeId: this._productTypeId,
            customerName: this._customerName,
            customerPhone: this._customerPhone,
            status: this._status,
            processFlow: this._processFlow ? this._processFlow.toJSON() : null,
            fieldValues: this._fieldValues.map(fv => fv.toJSON()),
            history: this._history.map(event => ({
                ...event,
                timestamp: event.timestamp.toISOString()
            })),
            metadata: this._metadata
        };
    }

    /**
     * Создать Order из JSON объекта
     * @param {Object} json - JSON объект
     * @returns {Order} Новый экземпляр Order
     */
    static fromJSON(json) {
        const orderData = {
            ...json,
            processFlow: json.processFlow ? ProcessFlow.fromJSON(json.processFlow) : null,
            fieldValues: json.fieldValues ? json.fieldValues.map(fv => FieldValue.fromJSON(fv)) : [],
            history: json.history ? json.history.map(event => ({
                ...event,
                timestamp: new Date(event.timestamp)
            })) : []
        };
        
        return new Order(orderData);
    }
}

// Глобальная доступность
window.Order = Order;
