/**
 * Value Object для результата валидации
 * Представляет результат валидации данных с ошибками и предупреждениями
 * 
 * @class ValidationResult
 */
class ValidationResult {
    /**
     * Создает экземпляр результата валидации
     * @param {Object} [data={}] - Данные результата
     * @param {Array<string>} [data.errors=[]] - Массив ошибок валидации
     * @param {Array<string>} [data.warnings=[]] - Массив предупреждений
     * @param {boolean} [data.isValid] - Статус валидации (вычисляется автоматически если не указан)
     * @param {Object} [data.fieldErrors={}] - Ошибки по полям (ключ - имя поля, значение - массив ошибок)
     * @param {Object} [data.fieldWarnings={}] - Предупреждения по полям
     * @param {Object} [data.metadata={}] - Дополнительные метаданные
     */
    constructor(data = {}) {
        this.errors = Array.isArray(data.errors) ? [...data.errors] : [];
        this.warnings = Array.isArray(data.warnings) ? [...data.warnings] : [];
        this.fieldErrors = data.fieldErrors ? { ...data.fieldErrors } : {};
        this.fieldWarnings = data.fieldWarnings ? { ...data.fieldWarnings } : {};
        this.metadata = data.metadata ? { ...data.metadata } : {};
        
        // Вычисляем статус валидации
        this.isValid = data.isValid !== undefined 
            ? Boolean(data.isValid) 
            : this._calculateValidity();
            
        // Дата создания результата
        this.createdAt = new Date();
    }

    /**
     * Вычисляет валидность на основе наличия ошибок
     * @private
     * @returns {boolean} true, если нет ошибок
     */
    _calculateValidity() {
        if (this.errors.length > 0) {
            return false;
        }
        
        // Проверяем ошибки в полях
        for (const fieldErrors of Object.values(this.fieldErrors)) {
            if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Добавить общую ошибку валидации
     * @param {string} error - Текст ошибки
     * @returns {ValidationResult} Новый экземпляр с добавленной ошибкой
     */
    addError(error) {
        if (!error || typeof error !== 'string') {
            return this;
        }
        
        const trimmedError = error.trim();
        if (trimmedError.length === 0 || this.errors.includes(trimmedError)) {
            return this;
        }
        
        return new ValidationResult({
            errors: [...this.errors, trimmedError],
            warnings: [...this.warnings],
            fieldErrors: { ...this.fieldErrors },
            fieldWarnings: { ...this.fieldWarnings },
            metadata: { ...this.metadata }
        });
    }

    /**
     * Добавить ошибку для конкретного поля
     * @param {string} fieldName - Имя поля
     * @param {string} error - Текст ошибки
     * @returns {ValidationResult} Новый экземпляр с добавленной ошибкой поля
     */
    addFieldError(fieldName, error) {
        if (!fieldName || !error || typeof fieldName !== 'string' || typeof error !== 'string') {
            return this;
        }
        
        const trimmedFieldName = fieldName.trim();
        const trimmedError = error.trim();
        
        if (trimmedFieldName.length === 0 || trimmedError.length === 0) {
            return this;
        }
        
        const newFieldErrors = { ...this.fieldErrors };
        
        if (!Array.isArray(newFieldErrors[trimmedFieldName])) {
            newFieldErrors[trimmedFieldName] = [];
        }
        
        if (newFieldErrors[trimmedFieldName].includes(trimmedError)) {
            return this;
        }
        
        newFieldErrors[trimmedFieldName] = [...newFieldErrors[trimmedFieldName], trimmedError];
        
        return new ValidationResult({
            errors: [...this.errors],
            warnings: [...this.warnings],
            fieldErrors: newFieldErrors,
            fieldWarnings: { ...this.fieldWarnings },
            metadata: { ...this.metadata }
        });
    }

    /**
     * Объединить с другим результатом валидации
     * @param {ValidationResult} other - Другой результат валидации
     * @returns {ValidationResult} Новый объединенный результат
     */
    merge(other) {
        if (!(other instanceof ValidationResult)) {
            return this;
        }
        
        const mergedErrors = [...this.errors];
        for (const error of other.errors) {
            if (!mergedErrors.includes(error)) {
                mergedErrors.push(error);
            }
        }
        
        const mergedFieldErrors = { ...this.fieldErrors };
        for (const [fieldName, errors] of Object.entries(other.fieldErrors)) {
            if (!mergedFieldErrors[fieldName]) {
                mergedFieldErrors[fieldName] = [];
            }
            
            for (const error of errors) {
                if (!mergedFieldErrors[fieldName].includes(error)) {
                    mergedFieldErrors[fieldName].push(error);
                }
            }
        }
        
        return new ValidationResult({
            errors: mergedErrors,
            warnings: [...this.warnings, ...other.warnings],
            fieldErrors: mergedFieldErrors,
            fieldWarnings: { ...this.fieldWarnings, ...other.fieldWarnings },
            metadata: { ...this.metadata, ...other.metadata }
        });
    }

    /**
     * Проверить, есть ли ошибки
     * @returns {boolean} true, если есть ошибки
     */
    hasErrors() {
        return !this.isValid;
    }

    /**
     * Получить все ошибки (общие + по полям)
     * @returns {Array<string>} Массив всех ошибок
     */
    getAllErrors() {
        const allErrors = [...this.errors];
        
        for (const [fieldName, errors] of Object.entries(this.fieldErrors)) {
            for (const error of errors) {
                allErrors.push(`${fieldName}: ${error}`);
            }
        }
        
        return allErrors;
    }

    /**
     * Получить ошибки конкретного поля
     * @param {string} fieldName - Имя поля
     * @returns {Array<string>} Массив ошибок поля
     */
    getFieldErrors(fieldName) {
        return this.fieldErrors[fieldName] ? [...this.fieldErrors[fieldName]] : [];
    }

    /**
     * Проверить, есть ли ошибки у конкретного поля
     * @param {string} fieldName - Имя поля
     * @returns {boolean} true, если у поля есть ошибки
     */
    hasFieldErrors(fieldName) {
        return this.getFieldErrors(fieldName).length > 0;
    }

    /**
     * Получить названия полей с ошибками
     * @returns {Array<string>} Массив названий полей с ошибками
     */
    getFieldsWithErrors() {
        return Object.keys(this.fieldErrors).filter(fieldName => 
            this.fieldErrors[fieldName] && this.fieldErrors[fieldName].length > 0
        );
    }

    /**
     * Получить краткую сводку результата валидации
     * @returns {Object} Объект с краткой информацией
     */
    getSummary() {
        return {
            isValid: this.isValid,
            errorCount: this.getAllErrors().length,
            fieldsWithErrors: this.getFieldsWithErrors().length,
            hasWarnings: this.warnings.length > 0
        };
    }

    /**
     * Получить форматированное сообщение об ошибках
     * @param {string} [separator='\n'] - Разделитель между ошибками
     * @returns {string} Форматированное сообщение
     */
    getErrorMessage(separator = '\n') {
        const allErrors = this.getAllErrors();
        return allErrors.length > 0 ? allErrors.join(separator) : '';
    }

    /**
     * Преобразовать в объект для сериализации
     * @returns {Object} Объект для сериализации
     */
    toJSON() {
        return {
            isValid: this.isValid,
            errors: [...this.errors],
            warnings: [...this.warnings],
            fieldErrors: { ...this.fieldErrors },
            fieldWarnings: { ...this.fieldWarnings },
            metadata: { ...this.metadata },
            createdAt: this.createdAt.toISOString()
        };
    }

    /**
     * Создать успешный результат валидации
     * @returns {ValidationResult} Успешный результат
     */
    static success() {
        return new ValidationResult({
            isValid: true,
            errors: [],
            warnings: []
        });
    }

    /**
     * Создать результат с ошибкой
     * @param {string} error - Текст ошибки
     * @returns {ValidationResult} Результат с ошибкой
     */
    static error(error) {
        return new ValidationResult({
            errors: [error]
        });
    }

    /**
     * Создать результат с ошибкой поля
     * @param {string} fieldName - Имя поля
     * @param {string} error - Текст ошибки
     * @returns {ValidationResult} Результат с ошибкой поля
     */
    static fieldError(fieldName, error) {
        return new ValidationResult({
            fieldErrors: { [fieldName]: [error] }
        });
    }
}

// Глобальная доступность
window.ValidationResult = ValidationResult;
