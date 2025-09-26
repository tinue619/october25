/**
 * Базовый класс для всех сущностей системы
 * Реализует общие свойства: id, даты создания/обновления, аудит
 */
class Entity {
    constructor(id = null) {
        this._id = id || this.generateId();
        this._createdAt = new Date();
        this._updatedAt = new Date();
        this._createdBy = null;
    }
    
    // Геттеры для основных свойств
    get id() { 
        return this._id; 
    }
    
    get createdAt() { 
        return this._createdAt; 
    }
    
    get updatedAt() { 
        return this._updatedAt; 
    }
    
    get createdBy() { 
        return this._createdBy; 
    }
    
    // Обновление времени последнего изменения
    touch() {
        this._updatedAt = new Date();
    }
    
    // Установка создателя сущности
    setCreatedBy(userId) {
        this._createdBy = userId;
    }
    
    // Генерация уникального ID
    generateId() {
        return Date.now() + Math.floor(Math.random() * 1000);
    }
    
    // Преобразование в JSON для сохранения
    toJSON() {
        return {
            id: this._id,
            createdAt: this._createdAt.toISOString(),
            updatedAt: this._updatedAt.toISOString(),
            createdBy: this._createdBy
        };
    }
    
    // Восстановление из JSON
    static fromJSON(data) {
        const entity = new this(data.id);
        entity._createdAt = new Date(data.createdAt);
        entity._updatedAt = new Date(data.updatedAt);
        entity._createdBy = data.createdBy;
        return entity;
    }
}