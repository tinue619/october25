/**
 * Роли пользователей в системе
 */
const UserRole = {
    ADMIN: 'Администратор',
    EMPLOYEE: 'Сотрудник'
};

// Проверка валидности роли
UserRole.isValid = (role) => {
    return Object.values(UserRole).includes(role);
};

// Проверка прав администратора
UserRole.isAdmin = (role) => {
    return role === UserRole.ADMIN;
};

// Глобальная доступность
window.UserRole = UserRole;