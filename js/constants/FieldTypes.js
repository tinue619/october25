/**
 * Типы настраиваемых полей и их конфигурации
 * @module FieldTypes
 */

/**
 * Перечисление типов настраиваемых полей
 * @readonly
 * @enum {string}
 */
const FIELD_TYPES = {
    TEXT: 'text',
    PHONE: 'phone',
    EMAIL: 'email',
    NUMBER: 'number',
    SELECT: 'select',
    CHECKBOX: 'checkbox',
    DATE: 'date',
    TEXTAREA: 'textarea'
};

/**
 * Конфигурации по умолчанию для каждого типа поля
 * @readonly
 */
const FIELD_TYPE_CONFIGS = {
    [FIELD_TYPES.TEXT]: {
        label: 'Текстовое поле',
        defaultSettings: {
            placeholder: '',
            maxLength: 255,
            minLength: 0,
            pattern: null
        },
        validationRules: {
            type: 'string',
            maxLength: 255,
            minLength: 0
        }
    },
    
    [FIELD_TYPES.PHONE]: {
        label: 'Номер телефона',
        defaultSettings: {
            placeholder: '+7 (___) ___-__-__',
            mask: '+7 (999) 999-99-99',
            format: 'russian'
        },
        validationRules: {
            type: 'string',
            pattern: /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/
        }
    },
    
    [FIELD_TYPES.EMAIL]: {
        label: 'Email адрес',
        defaultSettings: {
            placeholder: 'example@domain.com',
            validateDomain: false
        },
        validationRules: {
            type: 'string',
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        }
    },
    
    [FIELD_TYPES.NUMBER]: {
        label: 'Числовое поле',
        defaultSettings: {
            placeholder: '0',
            min: null,
            max: null,
            step: 1,
            allowDecimals: false,
            decimalPlaces: 2
        },
        validationRules: {
            type: 'number',
            min: null,
            max: null
        }
    },
    
    [FIELD_TYPES.SELECT]: {
        label: 'Выпадающий список',
        defaultSettings: {
            placeholder: 'Выберите значение...',
            options: [],
            allowEmpty: true,
            multiple: false
        },
        validationRules: {
            type: 'string',
            enum: []
        }
    },
    
    [FIELD_TYPES.CHECKBOX]: {
        label: 'Флажок',
        defaultSettings: {
            defaultValue: false,
            label: 'Да/Нет'
        },
        validationRules: {
            type: 'boolean'
        }
    },
    
    [FIELD_TYPES.DATE]: {
        label: 'Дата',
        defaultSettings: {
            placeholder: 'дд.мм.гггг',
            format: 'DD.MM.YYYY',
            minDate: null,
            maxDate: null,
            showTime: false
        },
        validationRules: {
            type: 'date',
            minDate: null,
            maxDate: null
        }
    },
    
    [FIELD_TYPES.TEXTAREA]: {
        label: 'Многострочный текст',
        defaultSettings: {
            placeholder: '',
            rows: 4,
            maxLength: 1000,
            minLength: 0,
            allowResize: true
        },
        validationRules: {
            type: 'string',
            maxLength: 1000,
            minLength: 0
        }
    }
};

/**
 * Получить конфигурацию типа поля
 * @param {string} fieldType - Тип поля
 * @returns {Object} Конфигурация типа поля
 * @throws {Error} Если тип поля не поддерживается
 */
function getFieldTypeConfig(fieldType) {
    if (!FIELD_TYPE_CONFIGS[fieldType]) {
        throw new Error(`Неподдерживаемый тип поля: ${fieldType}`);
    }
    return FIELD_TYPE_CONFIGS[fieldType];
}

/**
 * Получить все доступные типы полей
 * @returns {Array<Object>} Массив объектов с информацией о типах полей
 */
function getAllFieldTypes() {
    return Object.entries(FIELD_TYPE_CONFIGS).map(([type, config]) => ({
        type,
        label: config.label,
        defaultSettings: { ...config.defaultSettings },
        validationRules: { ...config.validationRules }
    }));
}

/**
 * Проверить, поддерживается ли тип поля
 * @param {string} fieldType - Тип поля для проверки
 * @returns {boolean} true, если тип поля поддерживается
 */
function isFieldTypeSupported(fieldType) {
    return Object.prototype.hasOwnProperty.call(FIELD_TYPE_CONFIGS, fieldType);
}

/**
 * Получить настройки по умолчанию для типа поля
 * @param {string} fieldType - Тип поля
 * @returns {Object} Настройки по умолчанию
 */
function getDefaultSettings(fieldType) {
    const config = getFieldTypeConfig(fieldType);
    return { ...config.defaultSettings };
}

/**
 * Получить правила валидации для типа поля
 * @param {string} fieldType - Тип поля
 * @returns {Object} Правила валидации
 */
function getValidationRules(fieldType) {
    const config = getFieldTypeConfig(fieldType);
    return { ...config.validationRules };
}

// Глобальная доступность
window.FIELD_TYPES = FIELD_TYPES;
window.FIELD_TYPE_CONFIGS = FIELD_TYPE_CONFIGS;
window.getFieldTypeConfig = getFieldTypeConfig;
window.getAllFieldTypes = getAllFieldTypes;
window.isFieldTypeSupported = isFieldTypeSupported;
window.getDefaultSettings = getDefaultSettings;
window.getValidationRules = getValidationRules;
