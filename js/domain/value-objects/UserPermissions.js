/**
 * Value Object для прав пользователя
 * Инкапсулирует логику управления правами сотрудников
 */
class UserPermissions {
    constructor(data = {}) {
        this._canCreateOrders = data.canCreateOrders || false;
        this._allowedProcessIds = data.allowedProcessIds || [];
    }
    
    // Геттеры
    get canCreateOrders() { 
        return this._canCreateOrders; 
    }
    
    get allowedProcessIds() { 
        return [...this._allowedProcessIds]; // Возвращаем копию массива
    }
    
    // Установка права создания заказов
    setOrderCreationRight(canCreate) {
        this._canCreateOrders = canCreate;
    }
    
    // Добавление права на выполнение процесса
    addProcessRight(processId) {
        if (!this._allowedProcessIds.includes(processId)) {
            this._allowedProcessIds.push(processId);
        }
    }
    
    // Удаление права на выполнение процесса
    removeProcessRight(processId) {
        this._allowedProcessIds = this._allowedProcessIds.filter(id => id !== processId);
    }
    
    // Проверка права на выполнение процесса
    canPerformProcess(processId) {
        return this._allowedProcessIds.includes(processId);
    }
    
    // Очистка всех прав на процессы
    clearProcessRights() {
        this._allowedProcessIds = [];
    }
    
    // Установка списка разрешенных процессов
    setAllowedProcesses(processIds) {
        this._allowedProcessIds = [...processIds];
    }
    
    // Преобразование в JSON
    toJSON() {
        return {
            canCreateOrders: this._canCreateOrders,
            allowedProcessIds: [...this._allowedProcessIds]
        };
    }
    
    // Восстановление из JSON
    static fromJSON(data) {
        return new UserPermissions(data);
    }
    
    // Клонирование объекта прав
    clone() {
        return new UserPermissions(this.toJSON());
    }
}