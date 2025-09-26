/**
 * Сервис для управления пользователями
 * Содержит бизнес-логику работы с пользователями и правами доступа
 */
class UserService {
    
    constructor(userRepository) {
        this._userRepository = userRepository;
    }
    
    // Создание нового пользователя
    async createUser(userData, createdBy = null) {
        // Валидация данных
        if (!userData.name || userData.name.trim() === '') {
            throw new Error('Имя пользователя обязательно');
        }
        
        if (!UserRole.isValid(userData.role)) {
            throw new Error(`Недопустимая роль: ${userData.role}`);
        }
        
        // Проверка уникальности имени
        const existingUsers = await this._userRepository.findBy({ name: userData.name });
        if (existingUsers.length > 0) {
            throw new Error('Пользователь с таким именем уже существует');
        }
        
        // Создание пользователя
        const user = new User({
            name: userData.name,
            role: userData.role,
            permissions: userData.permissions || {}
        });
        
        if (createdBy) {
            user.setCreatedBy(createdBy);
        }
        
        return await this._userRepository.save(user);
    }
    
    // Обновление пользователя
    async updateUser(userId, userData, updatedBy = null) {
        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        
        // Обновляем поля
        if (userData.name) {
            // Проверяем уникальность нового имени
            const existingUsers = await this._userRepository.findBy({ name: userData.name });
            const duplicateUser = existingUsers.find(u => u.id !== userId);
            if (duplicateUser) {
                throw new Error('Пользователь с таким именем уже существует');
            }
            user.setName(userData.name);
        }
        
        if (userData.role && UserRole.isValid(userData.role)) {
            user.setRole(userData.role);
        }
        
        return await this._userRepository.save(user);
    }
    
    // Удаление пользователя
    async deleteUser(userId, deletedBy = null) {
        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        
        // Нельзя удалить единственного администратора
        if (user.isAdmin()) {
            const allAdmins = await this.getAdministrators();
            if (allAdmins.length <= 1) {
                throw new Error('Нельзя удалить единственного администратора');
            }
        }
        
        return await this._userRepository.delete(userId);
    }
    
    /**
     * Получить статистику пользователей
     */
    async getUserStats() {
        const users = await this.getAllUsers();
        
        return {
            total: users.length,
            administrators: users.filter(u => u.isAdmin()).length,
            employees: users.filter(u => !u.isAdmin()).length,
            withOrderCreationRights: users.filter(u => u.canCreateOrders()).length,
            recentlyCreated: users.filter(u => {
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return u.createdAt && u.createdAt > dayAgo;
            }).length
        };
    }
    
    // Назначение права создания заказов
    async grantOrderCreationRight(adminId, userId) {
        const admin = await this._userRepository.findById(adminId);
        const user = await this._userRepository.findById(userId);
        
        if (!admin) {
            throw new Error('Администратор не найден');
        }
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        
        admin.grantOrderCreationRight(user);
        return await this._userRepository.save(user);
    }
    
    // Отзыв права создания заказов
    async revokeOrderCreationRight(adminId, userId) {
        const admin = await this._userRepository.findById(adminId);
        const user = await this._userRepository.findById(userId);
        
        if (!admin) {
            throw new Error('Администратор не найден');
        }
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        
        admin.revokeOrderCreationRight(user);
        return await this._userRepository.save(user);
    }
    
    // Назначение права на выполнение процесса
    async grantProcessRight(adminId, userId, processId) {
        const admin = await this._userRepository.findById(adminId);
        const user = await this._userRepository.findById(userId);
        
        if (!admin) {
            throw new Error('Администратор не найден');
        }
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        
        admin.grantProcessRight(user, processId);
        return await this._userRepository.save(user);
    }
    
    // Отзыв права на выполнение процесса
    async revokeProcessRight(adminId, userId, processId) {
        const admin = await this._userRepository.findById(adminId);
        const user = await this._userRepository.findById(userId);
        
        if (!admin) {
            throw new Error('Администратор не найден');
        }
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        
        admin.revokeProcessRight(user, processId);
        return await this._userRepository.save(user);
    }
    
    // Массовое назначение прав на процессы
    async setProcessRights(adminId, userId, processIds) {
        const admin = await this._userRepository.findById(adminId);
        const user = await this._userRepository.findById(userId);
        
        if (!admin || !admin.isAdmin()) {
            throw new Error('Только администратор может назначать права');
        }
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        if (user.isAdmin()) {
            throw new Error('Нельзя изменять права администратора');
        }
        
        // Очищаем старые права и назначаем новые
        user.permissions.clearProcessRights();
        user.permissions.setAllowedProcesses(processIds);
        user.touch();
        
        return await this._userRepository.save(user);
    }
    
    // Получение всех пользователей
    async getAllUsers() {
        return await this._userRepository.findAll();
    }
    
    // Получение пользователей по роли
    async getUsersByRole(role) {
        return await this._userRepository.findBy({ role: role });
    }
    
    // Получение администраторов
    async getAdministrators() {
        return await this.getUsersByRole(UserRole.ADMIN);
    }
    
    // Получение сотрудников
    async getEmployees() {
        return await this.getUsersByRole(UserRole.EMPLOYEE);
    }
    
    // Получение пользователей, созданных конкретным администратором
    async getUsersCreatedBy(adminId) {
        return await this._userRepository.findBy({ createdBy: adminId });
    }
    
    // Получение пользователей с правом создания заказов
    async getUsersWithOrderCreationRight() {
        const users = await this.getAllUsers();
        return users.filter(user => user.canCreateOrders());
    }
    
    // Получение пользователей с правом выполнения конкретного процесса
    async getUsersWithProcessRight(processId) {
        const users = await this.getAllUsers();
        return users.filter(user => user.canPerformProcess(processId));
    }
    
    // Поиск пользователя по имени
    async findUserByName(name) {
        const users = await this._userRepository.findBy({ name: name });
        return users.length > 0 ? users[0] : null;
    }
    
    // Аутентификация пользователя (упрощенная версия)
    async authenticateUser(name) {
        const user = await this.findUserByName(name);
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        return user;
    }
    
    // Создание администратора по умолчанию
    async createDefaultAdmin() {
        const existingAdmins = await this.getAdministrators();
        if (existingAdmins.length > 0) {
            return existingAdmins[0]; // Администратор уже существует
        }
        
        return await this.createUser({
            name: 'Администратор',
            role: UserRole.ADMIN
        });
    }
    
    // Статистика пользователей
    async getUserStats() {
        const allUsers = await this.getAllUsers();
        const admins = allUsers.filter(u => u.isAdmin());
        const employees = allUsers.filter(u => u.isEmployee());
        const usersWithOrderRights = allUsers.filter(u => u.canCreateOrders());
        
        return {
            total: allUsers.length,
            administrators: admins.length,
            employees: employees.length,
            withOrderCreationRights: usersWithOrderRights.length,
            recentlyCreated: allUsers.filter(u => {
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return u.createdAt > dayAgo;
            }).length
        };
    }
    
    // Валидация прав пользователя
    validateUserPermissions(user, requiredPermissions = {}) {
        const issues = [];
        
        if (requiredPermissions.canCreateOrders && !user.canCreateOrders()) {
            issues.push('Отсутствует право создания заказов');
        }
        
        if (requiredPermissions.requiredProcessIds) {
            const missingProcesses = requiredPermissions.requiredProcessIds.filter(
                processId => !user.canPerformProcess(processId)
            );
            if (missingProcesses.length > 0) {
                issues.push(`Отсутствуют права на процессы: ${missingProcesses.join(', ')}`);
            }
        }
        
        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }
    
    // Удаление пользователя
    async deleteUser(userId, deletedBy = null) {
        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        
        // Проверяем, что не удаляем самого себя
        if (deletedBy && deletedBy === userId) {
            throw new Error('Нельзя удалить самого себя');
        }
        
        // Проверяем, что это не последний администратор
        if (user.isAdmin()) {
            const allUsers = await this.getAllUsers();
            const adminCount = allUsers.filter(u => u.isAdmin()).length;
            if (adminCount <= 1) {
                throw new Error('Нельзя удалить последнего администратора');
            }
        }
        
        return await this._userRepository.delete(userId);
    }
}