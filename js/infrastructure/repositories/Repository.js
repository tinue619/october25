/**
 * Базовый интерфейс репозитория
 * Определяет стандартные операции CRUD для всех сущностей
 */
class Repository {
    
    // Поиск сущности по ID
    async findById(id) {
        throw new Error('Метод findById должен быть реализован в наследнике');
    }
    
    // Поиск всех сущностей
    async findAll() {
        throw new Error('Метод findAll должен быть реализован в наследнике');
    }
    
    // Сохранение сущности (создание или обновление)
    async save(entity) {
        throw new Error('Метод save должен быть реализован в наследнике');
    }
    
    // Удаление сущности по ID
    async delete(id) {
        throw new Error('Метод delete должен быть реализован в наследнике');
    }
    
    // Поиск по критериям
    async findBy(criteria) {
        throw new Error('Метод findBy должен быть реализован в наследнике');
    }
    
    // Поиск одной сущности по критериям
    async findOneBy(criteria) {
        const entities = await this.findBy(criteria);
        return entities.length > 0 ? entities[0] : null;
    }
    
    // Проверка существования сущности
    async exists(id) {
        const entity = await this.findById(id);
        return entity !== null;
    }
    
    // Подсчет общего количества сущностей
    async count() {
        const entities = await this.findAll();
        return entities.length;
    }
    
    // Подсчет по критериям
    async countBy(criteria) {
        const entities = await this.findBy(criteria);
        return entities.length;
    }
}