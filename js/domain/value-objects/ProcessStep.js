/**
 * Value Object для шага процесса
 * Представляет связь процесса с типом изделия и его настройки
 * 
 * @class ProcessStep
 */
class ProcessStep {
    /**
     * Создает экземпляр шага процесса
     * @param {Object} data - Данные шага процесса
     * @param {string} data.processId - ID процесса
     * @param {number} data.order - Порядок выполнения (начинается с 0)
     * @param {boolean} [data.required=true] - Обязательность выполнения
     * @param {string} [data.title] - Переопределенное название процесса (если нужно)
     * @param {string} [data.description] - Дополнительное описание шага
     * @param {Object} [data.settings={}] - Дополнительные настройки шага
     * @param {boolean} [data.active=true] - Активность шага
     */
    constructor(data) {
        this.processId = this._validateProcessId(data.processId);
        this.order = this._validateOrder(data.order);
        this.required = Boolean(data.required !== undefined ? data.required : true);
        this.title = data.title ? String(data.title).trim() : null;
        this.description = data.description ? String(data.description).trim() : '';
        this.settings = this._validateSettings(data.settings || {});
        this.active = Boolean(data.active !== undefined ? data.active : true);
        
        // Дополнительные свойства для расширенной функциональности
        this.canSkip = !this.required; // Можно ли пропустить шаг
        this.autoComplete = Boolean(data.autoComplete || false); // Автозавершение
        this.estimatedDuration = this._validateDuration(data.estimatedDuration); // Ориентировочное время
    }

    /**
     * Валидирует ID процесса
     * @private
     * @param {string} processId - ID процесса
     * @returns {string} Валидный ID процесса
     * @throws {Error} Если ID невалиден
     */
    _validateProcessId(processId) {
        if (!processId || typeof processId !== 'string') {
            throw new Error('ID процесса обязателен и должен быть строкой');
        }
        
        const trimmedId = processId.trim();
        if (trimmedId.length === 0) {
            throw new Error('ID процесса не может быть пустым');
        }
        
        return trimmedId;
    }

    /**
     * Валидирует порядок выполнения
     * @private
     * @param {number} order - Порядок выполнения
     * @returns {number} Валидный порядок
     * @throws {Error} Если порядок невалиден
     */
    _validateOrder(order) {
        if (order === undefined || order === null) {
            throw new Error('Порядок выполнения обязателен');
        }
        
        const orderNum = Number(order);
        
        if (isNaN(orderNum) || !Number.isInteger(orderNum)) {
            throw new Error('Порядок выполнения должен быть целым числом');
        }
        
        if (orderNum < 0) {
            throw new Error('Порядок выполнения не может быть отрицательным');
        }
        
        return orderNum;
    }

    /**
     * Валидирует настройки шага
     * @private
     * @param {Object} settings - Настройки шага
     * @returns {Object} Валидные настройки
     */
    _validateSettings(settings) {
        if (typeof settings !== 'object' || settings === null) {
            return {};
        }
        
        // Создаем копию настроек для избежания мутаций
        return { ...settings };
    }

    /**
     * Валидирует длительность
     * @private
     * @param {number} duration - Длительность в минутах
     * @returns {number|null} Валидная длительность или null
     */
    _validateDuration(duration) {
        if (duration === undefined || duration === null) {
            return null;
        }
        
        const durationNum = Number(duration);
        
        if (isNaN(durationNum) || durationNum < 0) {
            return null;
        }
        
        return durationNum;
    }

    /**
     * Получить настройки шага для UI
     * @returns {Object} Конфигурация шага для пользовательского интерфейса
     */
    getUIConfig() {
        return {
            processId: this.processId,
            order: this.order,
            required: this.required,
            title: this.title,
            description: this.description,
            settings: { ...this.settings },
            active: this.active,
            canSkip: this.canSkip,
            autoComplete: this.autoComplete,
            estimatedDuration: this.estimatedDuration
        };
    }

    /**
     * Создать копию шага с новыми настройками
     * @param {Object} updates - Обновления для применения
     * @returns {ProcessStep} Новый экземпляр ProcessStep
     */
    clone(updates = {}) {
        return new ProcessStep({
            processId: updates.processId || this.processId,
            order: updates.order !== undefined ? updates.order : this.order,
            required: updates.required !== undefined ? updates.required : this.required,
            title: updates.title !== undefined ? updates.title : this.title,
            description: updates.description !== undefined ? updates.description : this.description,
            settings: updates.settings ? { ...this.settings, ...updates.settings } : { ...this.settings },
            active: updates.active !== undefined ? updates.active : this.active,
            autoComplete: updates.autoComplete !== undefined ? updates.autoComplete : this.autoComplete,
            estimatedDuration: updates.estimatedDuration !== undefined ? updates.estimatedDuration : this.estimatedDuration
        });
    }

    /**
     * Сделать шаг обязательным
     * @returns {ProcessStep} Новый экземпляр с обновленными настройками
     */
    makeRequired() {
        if (this.required) {
            return this;
        }
        
        return this.clone({
            required: true
        });
    }

    /**
     * Сделать шаг опциональным
     * @returns {ProcessStep} Новый экземпляр с обновленными настройками
     */
    makeOptional() {
        if (!this.required) {
            return this;
        }
        
        return this.clone({
            required: false
        });
    }

    /**
     * Изменить порядок шага
     * @param {number} newOrder - Новый порядок
     * @returns {ProcessStep} Новый экземпляр с обновленным порядком
     */
    changeOrder(newOrder) {
        if (this.order === newOrder) {
            return this;
        }
        
        return this.clone({
            order: newOrder
        });
    }

    /**
     * Активировать/деактивировать шаг
     * @param {boolean} isActive - Новое состояние активности
     * @returns {ProcessStep} Новый экземпляр с обновленным состоянием
     */
    setActive(isActive) {
        if (this.active === Boolean(isActive)) {
            return this;
        }
        
        return this.clone({
            active: Boolean(isActive)
        });
    }

    /**
     * Обновить настройки шага
     * @param {Object} newSettings - Новые настройки
     * @returns {ProcessStep} Новый экземпляр с обновленными настройками
     */
    updateSettings(newSettings) {
        return this.clone({
            settings: { ...this.settings, ...newSettings }
        });
    }

    /**
     * Установить название шага
     * @param {string|null} title - Новое название или null для сброса
     * @returns {ProcessStep} Новый экземпляр с обновленным названием
     */
    setTitle(title) {
        const newTitle = title ? String(title).trim() : null;
        
        if (this.title === newTitle) {
            return this;
        }
        
        return this.clone({
            title: newTitle
        });
    }

    /**
     * Установить описание шага
     * @param {string} description - Новое описание
     * @returns {ProcessStep} Новый экземпляр с обновленным описанием
     */
    setDescription(description) {
        const newDescription = description ? String(description).trim() : '';
        
        if (this.description === newDescription) {
            return this;
        }
        
        return this.clone({
            description: newDescription
        });
    }

    /**
     * Установить длительность шага
     * @param {number|null} duration - Длительность в минутах или null
     * @returns {ProcessStep} Новый экземпляр с обновленной длительностью
     */
    setEstimatedDuration(duration) {
        const newDuration = this._validateDuration(duration);
        
        if (this.estimatedDuration === newDuration) {
            return this;
        }
        
        return this.clone({
            estimatedDuration: newDuration
        });
    }

    /**
     * Включить/отключить автозавершение
     * @param {boolean} autoComplete - Состояние автозавершения
     * @returns {ProcessStep} Новый экземпляр с обновленным состоянием
     */
    setAutoComplete(autoComplete) {
        if (this.autoComplete === Boolean(autoComplete)) {
            return this;
        }
        
        return this.clone({
            autoComplete: Boolean(autoComplete)
        });
    }

    /**
     * Проверить, можно ли пропустить шаг
     * @returns {boolean} true, если шаг можно пропустить
     */
    isSkippable() {
        return this.canSkip && this.active;
    }

    /**
     * Проверить, является ли шаг активным
     * @returns {boolean} true, если шаг активен
     */
    isActive() {
        return this.active;
    }

    /**
     * Проверить, является ли шаг обязательным
     * @returns {boolean} true, если шаг обязателен
     */
    isRequired() {
        return this.required;
    }

    /**
     * Получить отображаемое название шага
     * @param {string} [defaultTitle] - Название по умолчанию (обычно из Process)
     * @returns {string} Отображаемое название
     */
    getDisplayTitle(defaultTitle = '') {
        return this.title || defaultTitle;
    }

    /**
     * Проверить равенство с другим шагом
     * @param {ProcessStep} other - Другой шаг процесса
     * @returns {boolean} true, если шаги одинаковы
     */
    equals(other) {
        if (!(other instanceof ProcessStep)) {
            return false;
        }
        
        return (
            this.processId === other.processId &&
            this.order === other.order &&
            this.required === other.required &&
            this.title === other.title &&
            this.description === other.description &&
            this.active === other.active &&
            this.autoComplete === other.autoComplete &&
            this.estimatedDuration === other.estimatedDuration &&
            JSON.stringify(this.settings) === JSON.stringify(other.settings)
        );
    }

    /**
     * Преобразовать в объект для сериализации
     * @returns {Object} Объект для сериализации
     */
    toJSON() {
        return {
            processId: this.processId,
            order: this.order,
            required: this.required,
            title: this.title,
            description: this.description,
            settings: this.settings,
            active: this.active,
            canSkip: this.canSkip,
            autoComplete: this.autoComplete,
            estimatedDuration: this.estimatedDuration
        };
    }

    /**
     * Создать ProcessStep из JSON объекта
     * @param {Object} json - JSON объект
     * @returns {ProcessStep} Новый экземпляр ProcessStep
     */
    static fromJSON(json) {
        return new ProcessStep({
            processId: json.processId,
            order: json.order,
            required: json.required,
            title: json.title,
            description: json.description,
            settings: json.settings,
            active: json.active,
            autoComplete: json.autoComplete,
            estimatedDuration: json.estimatedDuration
        });
    }
}

// Глобальная доступность
window.ProcessStep = ProcessStep;
