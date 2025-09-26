/**
 * Value Object для значения настраиваемого поля
 * Представляет значение поля в конкретном заказе
 * 
 * @class FieldValue
 */
class FieldValue {
    /**
     * Создает экземпляр значения поля
     * @param {Object} data - Данные значения поля
     * @param {string} data.fieldId - ID настраиваемого поля
     * @param {*} data.value - Значение поля
     * @param {Date} [data.createdAt] - Дата создания значения
     * @param {Date} [data.updatedAt] - Дата последнего обновления
     * @param {string} [data.createdBy] - ID пользователя, создавшего значение
     * @param {string} [data.updatedBy] - ID пользователя, обновившего значение
     */
    constructor(data) {
        this.fieldId = this._validateFieldId(data.fieldId);
        this.value = data.value; // Значение может быть любым типом
        this.createdAt = data.createdAt instanceof Date ? data.createdAt : new Date();
        this.updatedAt = data.updatedAt instanceof Date ? data.updatedAt : this.createdAt;
        this.createdBy = data.createdBy ? String(data.createdBy) : null;
        this.updatedBy = data.updatedBy ? String(data.updatedBy) : this.createdBy;
        
        // История изменений (для аудита)
        this.changeHistory = Array.isArray(data.changeHistory) ? data.changeHistory : [];
    }

    /**
     * Валидирует ID поля
     * @private
     * @param {string} fieldId - ID поля
     * @returns {string} Валидный ID поля
     * @throws {Error} Если ID невалиден
     */
    _validateFieldId(fieldId) {
        if (!fieldId || typeof fieldId !== 'string') {
            throw new Error('ID поля обязателен и должен быть строкой');
        }
        
        const trimmedId = fieldId.trim();
        if (trimmedId.length === 0) {
            throw new Error('ID поля не может быть пустым');
        }
        
        return trimmedId;
    }

    /**
     * Обновить значение поля
     * @param {*} newValue - Новое значение
     * @param {string} [updatedBy] - ID пользователя, обновляющего значение
     * @returns {FieldValue} Новый экземпляр с обновленным значением
     */
    updateValue(newValue, updatedBy = null) {
        // Если значение не изменилось, возвращаем тот же экземпляр
        if (this._valuesEqual(this.value, newValue)) {
            return this;
        }
        
        // Создаем запись об изменении
        const changeRecord = {
            oldValue: this._cloneValue(this.value),
            newValue: this._cloneValue(newValue),
            changedAt: new Date(),
            changedBy: updatedBy || this.updatedBy
        };
        
        // Создаем новый экземпляр с обновленными данными
        return new FieldValue({
            fieldId: this.fieldId,
            value: newValue,
            createdAt: this.createdAt,
            updatedAt: new Date(),
            createdBy: this.createdBy,
            updatedBy: updatedBy || this.updatedBy,
            changeHistory: [...this.changeHistory, changeRecord]
        });
    }

    /**
     * Проверить равенство значений
     * @private
     * @param {*} value1 - Первое значение
     * @param {*} value2 - Второе значение
     * @returns {boolean} true, если значения равны
     */
    _valuesEqual(value1, value2) {
        // Простые типы
        if (value1 === value2) {
            return true;
        }
        
        // null и undefined
        if (value1 == null && value2 == null) {
            return true;
        }
        
        // Массивы
        if (Array.isArray(value1) && Array.isArray(value2)) {
            if (value1.length !== value2.length) {
                return false;
            }
            return value1.every((item, index) => this._valuesEqual(item, value2[index]));
        }
        
        // Объекты
        if (typeof value1 === 'object' && typeof value2 === 'object' && value1 !== null && value2 !== null) {
            const keys1 = Object.keys(value1);
            const keys2 = Object.keys(value2);
            
            if (keys1.length !== keys2.length) {
                return false;
            }
            
            return keys1.every(key => this._valuesEqual(value1[key], value2[key]));
        }
        
        // Даты
        if (value1 instanceof Date && value2 instanceof Date) {
            return value1.getTime() === value2.getTime();
        }
        
        return false;
    }

    /**
     * Создать глубокую копию значения
     * @private
     * @param {*} value - Значение для копирования
     * @returns {*} Копия значения
     */
    _cloneValue(value) {
        if (value === null || value === undefined) {
            return value;
        }
        
        if (typeof value !== 'object') {
            return value;
        }
        
        if (value instanceof Date) {
            return new Date(value.getTime());
        }
        
        if (Array.isArray(value)) {
            return value.map(item => this._cloneValue(item));
        }
        
        const cloned = {};
        for (const [key, val] of Object.entries(value)) {
            cloned[key] = this._cloneValue(val);
        }
        return cloned;
    }

    /**
     * Получить текущее значение поля
     * @returns {*} Текущее значение
     */
    getValue() {
        return this.value;
    }

    /**
     * Получить ID поля
     * @returns {string} ID поля
     */
    getFieldId() {
        return this.fieldId;
    }

    /**
     * Проверить, пустое ли значение
     * @returns {boolean} true, если значение пустое
     */
    isEmpty() {
        if (this.value === null || this.value === undefined) {
            return true;
        }
        
        if (typeof this.value === 'string') {
            return this.value.trim().length === 0;
        }
        
        if (Array.isArray(this.value)) {
            return this.value.length === 0;
        }
        
        return false;
    }

    /**
     * Получить историю изменений
     * @returns {Array} Массив записей об изменениях
     */
    getChangeHistory() {
        return [...this.changeHistory];
    }

    /**
     * Получить последнее изменение
     * @returns {Object|null} Последнее изменение или null, если изменений не было
     */
    getLastChange() {
        if (this.changeHistory.length === 0) {
            return null;
        }
        
        return { ...this.changeHistory[this.changeHistory.length - 1] };
    }

    /**
     * Получить количество изменений
     * @returns {number} Количество изменений значения
     */
    getChangeCount() {
        return this.changeHistory.length;
    }

    /**
     * Проверить, было ли значение изменено
     * @returns {boolean} true, если значение изменялось
     */
    hasBeenModified() {
        return this.changeHistory.length > 0;
    }

    /**
     * Получить пользователя, создавшего значение
     * @returns {string|null} ID пользователя или null
     */
    getCreatedBy() {
        return this.createdBy;
    }

    /**
     * Получить пользователя, последним обновившего значение
     * @returns {string|null} ID пользователя или null
     */
    getUpdatedBy() {
        return this.updatedBy;
    }

    /**
     * Получить дату создания
     * @returns {Date} Дата создания
     */
    getCreatedAt() {
        return new Date(this.createdAt);
    }

    /**
     * Получить дату последнего обновления
     * @returns {Date} Дата обновления
     */
    getUpdatedAt() {
        return new Date(this.updatedAt);
    }

    /**
     * Создать копию значения поля для другого поля
     * @param {string} newFieldId - ID нового поля
     * @returns {FieldValue} Новый экземпляр для другого поля
     */
    cloneForField(newFieldId) {
        return new FieldValue({
            fieldId: newFieldId,
            value: this._cloneValue(this.value),
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: this.updatedBy || this.createdBy,
            updatedBy: this.updatedBy || this.createdBy,
            changeHistory: []
        });
    }

    /**
     * Получить строковое представление значения для отображения
     * @returns {string} Строковое представление значения
     */
    getDisplayValue() {
        if (this.value === null || this.value === undefined) {
            return '';
        }
        
        if (typeof this.value === 'boolean') {
            return this.value ? 'Да' : 'Нет';
        }
        
        if (this.value instanceof Date) {
            return this.value.toLocaleDateString('ru-RU');
        }
        
        if (Array.isArray(this.value)) {
            return this.value.join(', ');
        }
        
        if (typeof this.value === 'object') {
            return JSON.stringify(this.value);
        }
        
        return String(this.value);
    }

    /**
     * Проверить равенство с другим значением поля
     * @param {FieldValue} other - Другое значение поля
     * @returns {boolean} true, если значения равны
     */
    equals(other) {
        if (!(other instanceof FieldValue)) {
            return false;
        }
        
        return (
            this.fieldId === other.fieldId &&
            this._valuesEqual(this.value, other.value)
        );
    }

    /**
     * Валидировать значение с помощью настраиваемого поля
     * @param {CustomField} customField - Настраиваемое поле для валидации
     * @returns {Object} Результат валидации { isValid: boolean, errors: string[] }
     */
    validateWith(customField) {
        if (this.fieldId !== customField.id) {
            return {
                isValid: false,
                errors: ['ID поля не соответствует настраиваемому полю']
            };
        }
        
        return customField.validateValue(this.value);
    }

    /**
     * Получить краткую информацию о значении для логирования
     * @returns {Object} Краткая информация
     */
    getLogInfo() {
        return {
            fieldId: this.fieldId,
            hasValue: !this.isEmpty(),
            valueType: typeof this.value,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            changeCount: this.changeHistory.length
        };
    }

    /**
     * Преобразовать в объект для сериализации
     * @returns {Object} Объект для сериализации
     */
    toJSON() {
        return {
            fieldId: this.fieldId,
            value: this._cloneValue(this.value),
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            createdBy: this.createdBy,
            updatedBy: this.updatedBy,
            changeHistory: this.changeHistory.map(change => ({
                ...change,
                changedAt: change.changedAt.toISOString(),
                oldValue: this._cloneValue(change.oldValue),
                newValue: this._cloneValue(change.newValue)
            }))
        };
    }

    /**
     * Создать FieldValue из JSON объекта
     * @param {Object} json - JSON объект
     * @returns {FieldValue} Новый экземпляр FieldValue
     */
    static fromJSON(json) {
        return new FieldValue({
            fieldId: json.fieldId,
            value: json.value,
            createdAt: new Date(json.createdAt),
            updatedAt: new Date(json.updatedAt),
            createdBy: json.createdBy,
            updatedBy: json.updatedBy,
            changeHistory: json.changeHistory ? json.changeHistory.map(change => ({
                ...change,
                changedAt: new Date(change.changedAt)
            })) : []
        });
    }

    /**
     * Создать пустое значение для поля
     * @param {string} fieldId - ID поля
     * @param {string} [createdBy] - ID создателя
     * @returns {FieldValue} Новое пустое значение
     */
    static createEmpty(fieldId, createdBy = null) {
        return new FieldValue({
            fieldId,
            value: null,
            createdBy,
            updatedBy: createdBy
        });
    }

    /**
     * Создать значение поля с начальным значением
     * @param {string} fieldId - ID поля
     * @param {*} value - Начальное значение
     * @param {string} [createdBy] - ID создателя
     * @returns {FieldValue} Новое значение
     */
    static create(fieldId, value, createdBy = null) {
        return new FieldValue({
            fieldId,
            value,
            createdBy,
            updatedBy: createdBy
        });
    }
}

// Глобальная доступность
window.FieldValue = FieldValue;
