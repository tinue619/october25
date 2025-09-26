/**
 * Сущность настраиваемого поля
 * Представляет пользовательское поле, которое можно добавить к типу изделия
 * 
 * @class CustomField
 * @extends Entity
 */
class CustomField extends Entity {
    /**
     * Создает экземпляр настраиваемого поля
     * @param {Object} data - Данные поля
     * @param {string} data.name - Внутреннее имя поля (для хранения данных)
     * @param {string} data.label - Отображаемое название поля
     * @param {string} data.type - Тип поля (из FIELD_TYPES)
     * @param {boolean} [data.required=false] - Обязательность поля
     * @param {Object} [data.settings={}] - Дополнительные настройки поля
     * @param {number} [data.order=0] - Порядок отображения поля
     * @param {string} [data.description=''] - Описание поля
     * @param {boolean} [data.active=true] - Активность поля
     */
    constructor(data) {
        super(data);
        
        this.name = this._validateName(data.name);
        this.label = this._validateLabel(data.label);
        this.type = this._validateType(data.type);
        this.required = Boolean(data.required || false);
        this.settings = this._mergeSettings(data.type, data.settings || {});
        this.order = Number(data.order || 0);
        this.description = String(data.description || '');
        this.active = Boolean(data.active !== undefined ? data.active : true);
        
        // Правила валидации для значений этого поля
        this.validationRules = this._buildValidationRules();
    }

    /**
     * Валидирует внутреннее имя поля
     * @private
     * @param {string} name - Имя поля
     * @returns {string} Валидное имя поля
     * @throws {Error} Если имя невалидно
     */
    _validateName(name) {
        if (!name || typeof name !== 'string') {
            throw new Error('Имя поля обязательно и должно быть строкой');
        }
        
        const trimmedName = name.trim();
        
        if (trimmedName.length === 0) {
            throw new Error('Имя поля не может быть пустым');
        }
        
        if (trimmedName.length > 50) {
            throw new Error('Имя поля не может быть длиннее 50 символов');
        }
        
        // Проверка на допустимые символы (латиница, цифры, подчеркивание)
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmedName)) {
            throw new Error('Имя поля должно начинаться с буквы и содержать только латинские буквы, цифры и подчеркивания');
        }
        
        return trimmedName;
    }

    /**
     * Валидирует отображаемое название поля
     * @private
     * @param {string} label - Название поля
     * @returns {string} Валидное название поля
     * @throws {Error} Если название невалидно
     */
    _validateLabel(label) {
        if (!label || typeof label !== 'string') {
            throw new Error('Название поля обязательно и должно быть строкой');
        }
        
        const trimmedLabel = label.trim();
        
        if (trimmedLabel.length === 0) {
            throw new Error('Название поля не может быть пустым');
        }
        
        if (trimmedLabel.length > 100) {
            throw new Error('Название поля не может быть длиннее 100 символов');
        }
        
        return trimmedLabel;
    }

    /**
     * Валидирует тип поля
     * @private
     * @param {string} type - Тип поля
     * @returns {string} Валидный тип поля
     * @throws {Error} Если тип невалиден
     */
    _validateType(type) {
        if (!type || typeof type !== 'string') {
            throw new Error('Тип поля обязателен и должен быть строкой');
        }
        
        if (!Object.values(FIELD_TYPES).includes(type)) {
            throw new Error(`Неподдерживаемый тип поля: ${type}. Доступные типы: ${Object.values(FIELD_TYPES).join(', ')}`);
        }
        
        return type;
    }

    /**
     * Объединяет настройки по умолчанию с пользовательскими настройками
     * @private
     * @param {string} fieldType - Тип поля
     * @param {Object} userSettings - Пользовательские настройки
     * @returns {Object} Объединенные настройки
     */
    _mergeSettings(fieldType, userSettings) {
        const defaultSettings = getDefaultSettings(fieldType);
        const mergedSettings = { ...defaultSettings, ...userSettings };
        
        // Специальная валидация для списков (select)
        if (fieldType === FIELD_TYPES.SELECT) {
            mergedSettings.options = this._validateSelectOptions(mergedSettings.options);
        }
        
        return mergedSettings;
    }

    /**
     * Валидирует опции для поля типа SELECT
     * @private
     * @param {Array} options - Опции для выбора
     * @returns {Array} Валидные опции
     */
    _validateSelectOptions(options) {
        if (!Array.isArray(options)) {
            return [];
        }
        
        return options.map((option, index) => {
            if (typeof option === 'string') {
                return {
                    value: option,
                    label: option,
                    active: true
                };
            }
            
            if (typeof option === 'object' && option !== null) {
                if (!option.value) {
                    throw new Error(`Опция ${index + 1} должна содержать значение (value)`);
                }
                
                return {
                    value: String(option.value),
                    label: String(option.label || option.value),
                    active: Boolean(option.active !== undefined ? option.active : true)
                };
            }
            
            throw new Error(`Опция ${index + 1} должна быть строкой или объектом`);
        });
    }

    /**
     * Строит правила валидации для значений этого поля
     * @private
     * @returns {Object} Правила валидации
     */
    _buildValidationRules() {
        const baseRules = getValidationRules(this.type);
        const rules = { ...baseRules };
        
        // Добавляем правило обязательности
        rules.required = this.required;
        
        // Специфичные правила в зависимости от типа поля и настроек
        switch (this.type) {
            case FIELD_TYPES.TEXT:
            case FIELD_TYPES.TEXTAREA:
                if (this.settings.maxLength) {
                    rules.maxLength = this.settings.maxLength;
                }
                if (this.settings.minLength) {
                    rules.minLength = this.settings.minLength;
                }
                if (this.settings.pattern) {
                    rules.pattern = new RegExp(this.settings.pattern);
                }
                break;
                
            case FIELD_TYPES.NUMBER:
                if (this.settings.min !== null && this.settings.min !== undefined) {
                    rules.min = this.settings.min;
                }
                if (this.settings.max !== null && this.settings.max !== undefined) {
                    rules.max = this.settings.max;
                }
                rules.allowDecimals = Boolean(this.settings.allowDecimals);
                if (rules.allowDecimals && this.settings.decimalPlaces) {
                    rules.decimalPlaces = this.settings.decimalPlaces;
                }
                break;
                
            case FIELD_TYPES.SELECT:
                rules.enum = this.settings.options
                    .filter(option => option.active)
                    .map(option => option.value);
                rules.multiple = Boolean(this.settings.multiple);
                break;
                
            case FIELD_TYPES.DATE:
                if (this.settings.minDate) {
                    rules.minDate = new Date(this.settings.minDate);
                }
                if (this.settings.maxDate) {
                    rules.maxDate = new Date(this.settings.maxDate);
                }
                break;
        }
        
        return rules;
    }

    /**
     * Валидирует значение поля
     * @param {*} value - Значение для валидации
     * @returns {Object} Результат валидации { isValid: boolean, errors: string[] }
     */
    validateValue(value) {
        const errors = [];
        
        // Проверка обязательности
        if (this.required && (value === null || value === undefined || value === '')) {
            errors.push(`Поле "${this.label}" обязательно для заполнения`);
            return { isValid: false, errors };
        }
        
        // Если поле не обязательное и значение пустое - считаем валидным
        if (!this.required && (value === null || value === undefined || value === '')) {
            return { isValid: true, errors: [] };
        }
        
        // Валидация по типу поля
        try {
            this._validateByType(value, errors);
        } catch (error) {
            errors.push(error.message);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Валидирует значение по типу поля
     * @private
     * @param {*} value - Значение для валидации
     * @param {Array} errors - Массив для добавления ошибок
     */
    _validateByType(value, errors) {
        switch (this.type) {
            case FIELD_TYPES.TEXT:
            case FIELD_TYPES.TEXTAREA:
                this._validateStringValue(value, errors);
                break;
                
            case FIELD_TYPES.PHONE:
                this._validatePhoneValue(value, errors);
                break;
                
            case FIELD_TYPES.EMAIL:
                this._validateEmailValue(value, errors);
                break;
                
            case FIELD_TYPES.NUMBER:
                this._validateNumberValue(value, errors);
                break;
                
            case FIELD_TYPES.SELECT:
                this._validateSelectValue(value, errors);
                break;
                
            case FIELD_TYPES.CHECKBOX:
                this._validateBooleanValue(value, errors);
                break;
                
            case FIELD_TYPES.DATE:
                this._validateDateValue(value, errors);
                break;
        }
    }

    /**
     * Валидирует строковое значение
     * @private
     */
    _validateStringValue(value, errors) {
        if (typeof value !== 'string') {
            errors.push(`Поле "${this.label}" должно быть строкой`);
            return;
        }
        
        if (this.settings.minLength && value.length < this.settings.minLength) {
            errors.push(`Поле "${this.label}" должно содержать не менее ${this.settings.minLength} символов`);
        }
        
        if (this.settings.maxLength && value.length > this.settings.maxLength) {
            errors.push(`Поле "${this.label}" должно содержать не более ${this.settings.maxLength} символов`);
        }
        
        if (this.settings.pattern && !new RegExp(this.settings.pattern).test(value)) {
            errors.push(`Поле "${this.label}" не соответствует требуемому формату`);
        }
    }

    /**
     * Валидирует телефон
     * @private
     */
    _validatePhoneValue(value, errors) {
        if (typeof value !== 'string') {
            errors.push(`Поле "${this.label}" должно быть строкой`);
            return;
        }
        
        if (!this.validationRules.pattern.test(value)) {
            errors.push(`Поле "${this.label}" должно быть в формате +7 (999) 999-99-99`);
        }
    }

    /**
     * Валидирует email
     * @private
     */
    _validateEmailValue(value, errors) {
        if (typeof value !== 'string') {
            errors.push(`Поле "${this.label}" должно быть строкой`);
            return;
        }
        
        if (!this.validationRules.pattern.test(value)) {
            errors.push(`Поле "${this.label}" должно быть корректным email адресом`);
        }
    }

    /**
     * Валидирует числовое значение
     * @private
     */
    _validateNumberValue(value, errors) {
        const numValue = Number(value);
        
        if (isNaN(numValue)) {
            errors.push(`Поле "${this.label}" должно быть числом`);
            return;
        }
        
        if (!this.settings.allowDecimals && !Number.isInteger(numValue)) {
            errors.push(`Поле "${this.label}" должно быть целым числом`);
        }
        
        if (this.settings.min !== null && this.settings.min !== undefined && numValue < this.settings.min) {
            errors.push(`Поле "${this.label}" должно быть не менее ${this.settings.min}`);
        }
        
        if (this.settings.max !== null && this.settings.max !== undefined && numValue > this.settings.max) {
            errors.push(`Поле "${this.label}" должно быть не более ${this.settings.max}`);
        }
        
        if (this.settings.allowDecimals && this.settings.decimalPlaces) {
            const decimalParts = value.toString().split('.');
            if (decimalParts.length > 1 && decimalParts[1].length > this.settings.decimalPlaces) {
                errors.push(`Поле "${this.label}" может содержать не более ${this.settings.decimalPlaces} знаков после запятой`);
            }
        }
    }

    /**
     * Валидирует значение списка
     * @private
     */
    _validateSelectValue(value, errors) {
        const allowedValues = this.settings.options
            .filter(option => option.active)
            .map(option => option.value);
        
        if (this.settings.multiple) {
            if (!Array.isArray(value)) {
                errors.push(`Поле "${this.label}" должно быть массивом`);
                return;
            }
            
            for (const val of value) {
                if (!allowedValues.includes(val)) {
                    errors.push(`Значение "${val}" не является допустимым для поля "${this.label}"`);
                }
            }
        } else {
            if (!allowedValues.includes(value)) {
                errors.push(`Значение "${value}" не является допустимым для поля "${this.label}"`);
            }
        }
    }

    /**
     * Валидирует булево значение
     * @private
     */
    _validateBooleanValue(value, errors) {
        if (typeof value !== 'boolean') {
            errors.push(`Поле "${this.label}" должно быть булевым значением (true/false)`);
        }
    }

    /**
     * Валидирует дату
     * @private
     */
    _validateDateValue(value, errors) {
        let date;
        
        if (value instanceof Date) {
            date = value;
        } else if (typeof value === 'string') {
            date = new Date(value);
        } else {
            errors.push(`Поле "${this.label}" должно быть датой`);
            return;
        }
        
        if (isNaN(date.getTime())) {
            errors.push(`Поле "${this.label}" содержит некорректную дату`);
            return;
        }
        
        if (this.settings.minDate) {
            const minDate = new Date(this.settings.minDate);
            if (date < minDate) {
                errors.push(`Дата в поле "${this.label}" не может быть ранее ${minDate.toLocaleDateString('ru-RU')}`);
            }
        }
        
        if (this.settings.maxDate) {
            const maxDate = new Date(this.settings.maxDate);
            if (date > maxDate) {
                errors.push(`Дата в поле "${this.label}" не может быть позднее ${maxDate.toLocaleDateString('ru-RU')}`);
            }
        }
    }

    /**
     * Получить конфигурацию поля для UI
     * @returns {Object} Конфигурация поля
     */
    getUIConfig() {
        return {
            id: this.id,
            name: this.name,
            label: this.label,
            type: this.type,
            required: this.required,
            description: this.description,
            settings: { ...this.settings },
            order: this.order,
            active: this.active
        };
    }

    /**
     * Обновить настройки поля
     * @param {Object} newSettings - Новые настройки
     * @throws {Error} Если настройки невалидны
     */
    updateSettings(newSettings) {
        this.settings = this._mergeSettings(this.type, { ...this.settings, ...newSettings });
        this.validationRules = this._buildValidationRules();
        this.updatedAt = new Date();
    }

    /**
     * Изменить порядок поля
     * @param {number} newOrder - Новый порядок
     */
    changeOrder(newOrder) {
        this.order = Number(newOrder);
        this.updatedAt = new Date();
    }

    /**
     * Активировать/деактивировать поле
     * @param {boolean} isActive - Статус активности
     */
    setActive(isActive) {
        this.active = Boolean(isActive);
        this.updatedAt = new Date();
    }

    /**
     * Создать копию поля с новым именем
     * @param {string} newName - Новое имя поля
     * @param {string} [newLabel] - Новое название поля
     * @returns {CustomField} Копия поля
     */
    clone(newName, newLabel) {
        return new CustomField({
            name: newName,
            label: newLabel || `${this.label} (копия)`,
            type: this.type,
            required: this.required,
            settings: { ...this.settings },
            order: this.order,
            description: this.description,
            active: this.active
        });
    }

    /**
     * Преобразовать в объект для сериализации
     * @returns {Object} Объект для сериализации
     */
    toJSON() {
        return {
            ...super.toJSON(),
            name: this.name,
            label: this.label,
            type: this.type,
            required: this.required,
            settings: this.settings,
            order: this.order,
            description: this.description,
            active: this.active,
            validationRules: this.validationRules
        };
    }
}

// Глобальная доступность
window.CustomField = CustomField;
