/**
 * Сущность этапа процесса
 * Представляет один шаг в производственной цепочке
 */
class Process extends Entity {
    constructor(data = {}) {
        super(data.id);
        this._name = data.name || '';
        this._description = data.description || '';
        this._order = data.order || 0;
        
        if (data.createdBy) {
            this.setCreatedBy(data.createdBy);
        }
    }
    
    // Геттеры
    get name() { 
        return this._name; 
    }
    
    get description() { 
        return this._description; 
    }
    
    get order() { 
        return this._order; 
    }
    
    // Установка названия
    setName(name) {
        if (!name || name.trim() === '') {
            throw new Error('Название процесса не может быть пустым');
        }
        this._name = name.trim();
        this.touch();
    }
    
    // Установка описания
    setDescription(description) {
        this._description = description ? description.trim() : '';
        this.touch();
    }
    
    // Установка порядка
    setOrder(order) {
        if (typeof order !== 'number' || order < 0) {
            throw new Error('Порядок должен быть положительным числом');
        }
        this._order = order;
        this.touch();
    }
    
    // Проверка валидности процесса
    isValid() {
        return this._name && this._name.trim() !== '';
    }
    
    // Преобразование в JSON
    toJSON() {
        return {
            ...super.toJSON(),
            name: this._name,
            description: this._description,
            order: this._order
        };
    }
    
    // Восстановление из JSON
    static fromJSON(data) {
        return new Process(data);
    }
}