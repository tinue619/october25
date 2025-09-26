/**
 * Реализация Repository для работы с LocalStorage
 * Обеспечивает персистентность данных в браузере
 */
class LocalStorageRepository extends Repository {
    
    constructor(entityName, EntityClass) {
        super();
        this._entityName = entityName;
        this._EntityClass = EntityClass;
        this._storageKey = `oms_${entityName}`;
    }
    
    // Поиск сущности по ID
    async findById(id) {
        const entities = this._loadFromStorage();
        const entityData = entities.find(e => e.id === id);
        
        if (!entityData) {
            return null;
        }
        
        return this._EntityClass.fromJSON(entityData);
    }
    
    // Поиск всех сущностей
    async findAll() {
        const entities = this._loadFromStorage();
        return entities.map(entityData => this._EntityClass.fromJSON(entityData));
    }
    
    // Сохранение сущности
    async save(entity) {
        if (!entity) {
            throw new Error('Сущность для сохранения не может быть null');
        }
        
        const entities = this._loadFromStorage();
        const entityData = entity.toJSON();
        const existingIndex = entities.findIndex(e => e.id === entity.id);
        
        if (existingIndex >= 0) {
            // Обновляем существующую сущность
            entities[existingIndex] = entityData;
        } else {
            // Добавляем новую сущность
            entities.push(entityData);
        }
        
        this._saveToStorage(entities);
        return entity;
    }
    
    // Удаление сущности по ID
    async delete(id) {
        const entities = this._loadFromStorage();
        const filteredEntities = entities.filter(e => e.id !== id);
        
        if (entities.length === filteredEntities.length) {
            return false; // Сущность не найдена
        }
        
        this._saveToStorage(filteredEntities);
        return true;
    }
    
    // Обновление сущности
    async update(id, updateData) {
        const entities = this._loadFromStorage();
        const existingIndex = entities.findIndex(e => e.id === id);
        
        if (existingIndex === -1) {
            throw new Error(`Сущность с ID ${id} не найдена`);
        }
        
        // Обновляем данные
        const updatedEntity = {
            ...entities[existingIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };
        
        entities[existingIndex] = updatedEntity;
        this._saveToStorage(entities);
        
        // Возвращаем обновленную сущность
        return this._EntityClass.fromJSON(updatedEntity);
    }
    
    // Поиск по критериям
    async findBy(criteria) {
        const entities = await this.findAll();
        
        return entities.filter(entity => {
            return Object.keys(criteria).every(key => {
                const entityValue = this._getNestedValue(entity, key);
                const criteriaValue = criteria[key];
                
                // Поддержка различных типов сравнения
                if (Array.isArray(criteriaValue)) {
                    return criteriaValue.includes(entityValue);
                }
                
                if (typeof criteriaValue === 'object' && criteriaValue !== null) {
                    // Поддержка операторов сравнения
                    if (criteriaValue.$in) return criteriaValue.$in.includes(entityValue);
                    if (criteriaValue.$ne) return entityValue !== criteriaValue.$ne;
                    if (criteriaValue.$gt) return entityValue > criteriaValue.$gt;
                    if (criteriaValue.$lt) return entityValue < criteriaValue.$lt;
                    if (criteriaValue.$contains) return entityValue.includes(criteriaValue.$contains);
                }
                
                return entityValue === criteriaValue;
            });
        });
    }
    
    // Массовое сохранение сущностей
    async saveMany(entities) {
        const results = [];
        for (const entity of entities) {
            results.push(await this.save(entity));
        }
        return results;
    }
    
    // Массовое удаление по критериям
    async deleteBy(criteria) {
        const entitiesToDelete = await this.findBy(criteria);
        let deletedCount = 0;
        
        for (const entity of entitiesToDelete) {
            const deleted = await this.delete(entity.id);
            if (deleted) deletedCount++;
        }
        
        return deletedCount;
    }
    
    // Очистка всех данных
    async clear() {
        this._saveToStorage([]);
        return true;
    }
    
    // Экспорт всех данных
    async exportData() {
        return this._loadFromStorage();
    }
    
    // Импорт данных
    async importData(data) {
        if (!Array.isArray(data)) {
            throw new Error('Данные для импорта должны быть массивом');
        }
        
        this._saveToStorage(data);
        return data.length;
    }
    
    // Получение статистики
    async getStats() {
        const entities = this._loadFromStorage();
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        return {
            total: entities.length,
            createdToday: entities.filter(e => new Date(e.createdAt) > dayAgo).length,
            createdThisWeek: entities.filter(e => new Date(e.createdAt) > weekAgo).length,
            lastModified: entities.length > 0 ? 
                Math.max(...entities.map(e => new Date(e.updatedAt).getTime())) : null
        };
    }
    
    // Приватные методы
    
    _loadFromStorage() {
        try {
            const data = localStorage.getItem(this._storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Ошибка загрузки данных для ${this._entityName}:`, error);
            return [];
        }
    }
    
    _saveToStorage(entities) {
        try {
            localStorage.setItem(this._storageKey, JSON.stringify(entities));
        } catch (error) {
            console.error(`Ошибка сохранения данных для ${this._entityName}:`, error);
            throw new Error(`Не удалось сохранить данные: ${error.message}`);
        }
    }
    
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }
    
    // Метод для диагностики
    async diagnose() {
        const storageKey = this._storageKey;
        const data = localStorage.getItem(storageKey);
        
        return {
            entityName: this._entityName,
            storageKey: storageKey,
            dataExists: !!data,
            dataSize: data ? data.length : 0,
            recordCount: data ? JSON.parse(data).length : 0,
            lastAccess: new Date().toISOString()
        };
    }
}