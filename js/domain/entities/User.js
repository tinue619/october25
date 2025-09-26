/**
 * Сущность пользователя системы (Администратор или Сотрудник)
 * Реализует ролевую модель доступа и права на операции
 */
class User extends Entity {
    constructor(data = {}) {
        super(data.id);
        this._name = data.name || '';
        this._role = data.role || UserRole.EMPLOYEE;
        this._permissions = data.permissions ? 
            UserPermissions.fromJSON(data.permissions) : 
            new UserPermissions();
        
        if (data.createdBy) {
            this.setCreatedBy(data.createdBy);
        }
    }
    
    // Геттеры
    get name() { 
        return this._name; 
    }
    
    get role() { 
        return this._role; 
    }
    
    get permissions() { 
        return this._permissions; 
    }
    
    // Установка имени
    setName(name) {
        if (!name || name.trim() === '') {
            throw new Error('Имя пользователя не может быть пустым');
        }
        this._name = name.trim();
        this.touch();
    }
    
    // Установка роли
    setRole(role) {
        if (!UserRole.isValid(role)) {
            throw new Error(`Недопустимая роль: ${role}`);
        }
        this._role = role;
        this.touch();
    }
    
    // Проверка ролей
    isAdmin() {
        return UserRole.isAdmin(this._role);
    }
    
    isEmployee() {
        return this._role === UserRole.EMPLOYEE;
    }
    
    // Проверка прав
    canCreateOrders() {
        return this.isAdmin() || this._permissions.canCreateOrders;
    }
    
    canPerformProcess(processId) {
        return this.isAdmin() || this._permissions.canPerformProcess(processId);
    }
    
    canManageUsers() {
        return this.isAdmin();
    }
    
    canManageSystem() {
        return this.isAdmin();
    }
    
    // Управление правами (только для админов)
    grantOrderCreationRight(targetUser) {
        if (!this.isAdmin()) {
            throw new Error('Только администратор может давать права');
        }
        
        if (targetUser.isAdmin()) {
            throw new Error('Нельзя изменять права администратора');
        }
        
        targetUser._permissions.setOrderCreationRight(true);
        targetUser.touch();
    }
    
    revokeOrderCreationRight(targetUser) {
        if (!this.isAdmin()) {
            throw new Error('Только администратор может отзывать права');
        }
        
        if (targetUser.isAdmin()) {
            throw new Error('Нельзя изменять права администратора');
        }
        
        targetUser._permissions.setOrderCreationRight(false);
        targetUser.touch();
    }
    
    grantProcessRight(targetUser, processId) {
        if (!this.isAdmin()) {
            throw new Error('Только администратор может давать права');
        }
        
        if (targetUser.isAdmin()) {
            throw new Error('Нельзя изменять права администратора');
        }
        
        targetUser._permissions.addProcessRight(processId);
        targetUser.touch();
    }
    
    revokeProcessRight(targetUser, processId) {
        if (!this.isAdmin()) {
            throw new Error('Только администратор может отзывать права');
        }
        
        if (targetUser.isAdmin()) {
            throw new Error('Нельзя изменять права администратора');
        }
        
        targetUser._permissions.removeProcessRight(processId);
        targetUser.touch();
    }
    
    // Преобразование в JSON
    toJSON() {
        return {
            ...super.toJSON(),
            name: this._name,
            role: this._role,
            permissions: this._permissions.toJSON()
        };
    }
    
    // Восстановление из JSON
    static fromJSON(data) {
        return new User(data);
    }
}