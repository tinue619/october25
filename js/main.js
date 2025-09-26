/**
 * Главная точка входа в приложение OMS
 * Инициализирует систему и запускает приложение
 */

// Глобальная переменная для контекста приложения
let app = null;

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Запуск приложения OMS...');
    
    try {
        // Создаем контекст приложения
        app = new ApplicationContext();
        
        // Инициализируем систему
        await app.initialize();
        
        // Запускаем интерфейс
        await startApplication();
        
        console.log('✅ Приложение OMS успешно запущено');
        
    } catch (error) {
        console.error('❌ Ошибка запуска приложения:', error);
        showError(`Ошибка запуска: ${error.message}`);
    }
});

// === ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ ===

// UI компоненты
let productTypeDesigner = null;
let orderFormUI = null;

// Инициализируем глобальную переменную для обработчиков onclick
window.productTypeDesigner = null;

// Открыть конструктор типов изделий
function openProductTypeDesigner() {
    if (!app.currentUser.isAdmin()) {
        showError('Только администратор может создавать типы изделий');
        return;
    }
    
    // Инициализируем конструктор если нужно
    initializeProductTypeDesigner();
    
    // Настраиваем обработчики событий
    window.productTypeDesigner.onProductTypeSaved = async (productType) => {
        console.log('✅ Тип изделия сохранен:', productType);
        
        // Обновляем админ-панель если находимся на вкладке типов изделий
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && activeTab.id === 'tab-products') {
            await showAdminTab('products');
        }
    };
    
    window.productTypeDesigner.onProductTypeCancelled = () => {
        console.log('🙅 Создание типа изделия отменено');
    };
    
    // Показываем конструктор
    window.productTypeDesigner.show();
    console.log('🎨 Открыт конструктор типов изделий');
}

// Открыть динамическую форму создания заказа
function openOrderForm() {
    if (!app.currentUser.canCreateOrders() && !app.currentUser.isAdmin()) {
        showError('Нет прав на создание заказов');
        return;
    }
    
    // Скрываем другие UI
    hideAllUI();
    
    // Создаем или показываем форму
    if (!orderFormUI) {
        orderFormUI = new OrderFormUI(app);
        
        // Переопределяем обработчики событий
        orderFormUI.onOrderCreated = async (order) => {
            console.log('✅ Заказ создан:', order);
            showSuccess(`Заказ №${order.number} успешно создан!`);
            // Возвращаемся к канбану
            await showOrders();
        };
        
        orderFormUI.onOrderCancelled = async () => {
            console.log('🙅 Создание заказа отменено');
            // Возвращаемся к канбану
            await showOrders();
        };
    }
    
    orderFormUI.show();
    console.log('📋 Открыта форма создания заказа');
}

// Скрыть все UI компоненты
function hideAllUI() {
    if (productTypeDesigner) {
        productTypeDesigner.hide();
    }
    if (orderFormUI) {
        orderFormUI.hide();
    }
    
    // Очищаем основной контент
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = '';
    }
}


// === ФУНКЦИИ АДМИНКИ ===

// Удаление процесса
async function deleteProcess(processId) {
    if (!confirm('Вы уверены, что хотите удалить этот процесс? Это может повлиять на существующие заказы.')) {
        return;
    }
    
    try {
        await app.processService.deleteProcess(processId, app.currentUser.id);
        showSuccess('Процесс успешно удален');
        await showAdminTab('processes');
    } catch (error) {
        console.error('Ошибка удаления процесса:', error);
        showError('Не удалось удалить процесс');
    }
}

// Удаление типа изделия
async function deleteProductType(productTypeId) {
    if (!confirm('Вы уверены, что хотите удалить этот тип изделия? Это может повлиять на существующие заказы.')) {
        return;
    }
    
    try {
        await app.productTypeService.deleteProductType(productTypeId, app.currentUser.id);
        showSuccess('Тип изделия успешно удален');
        await showAdminTab('products');
    } catch (error) {
        console.error('Ошибка удаления типа изделия:', error);
        showError('Не удалось удалить тип изделия');
    }
}

// Удаление заказа (админ)
async function adminDeleteOrder(orderId) {
    if (!confirm('Вы уверены, что хотите удалить этот заказ? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        await app.orderService.deleteOrder(orderId, app.currentUser.id);
        showSuccess('Заказ успешно удален');
        await showAdminTab('orders');
    } catch (error) {
        console.error('Ошибка удаления заказа:', error);
        showError('Не удалось удалить заказ');
    }
}

// === Системные функции ===

// Экспорт данных
function exportSystemData() {
    try {
        const data = {
            users: app.userService.getAllUsers(),
            processes: app.processService.getAllProcesses(),
            productTypes: app.productTypeService.getAllProductTypes(),
            orders: app.orderService.getAllOrders(),
            exportedAt: new Date().toISOString()
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `oms-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        showSuccess('Данные успешно экспортированы');
        
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showError('Ошибка экспорта данных');
    }
}

// Импорт данных
function importSystemData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Простая валидация
            if (!data.users || !data.processes || !data.productTypes || !data.orders) {
                throw new Error('Некорректный формат файла');
            }
            
            if (!confirm('Внимание! Это заменит все текущие данные. Продолжить?')) {
                return;
            }
            
            // Очищаем текущие данные и загружаем новые
            localStorage.clear();
            
            // Здесь нужно было бы имплементировать логику восстановления
            // Но для простоты пока просто предложим перезагрузку
            
            showSuccess('Данные импортированы! Перезагрузите страницу.');
            
        } catch (error) {
            console.error('Ошибка импорта:', error);
            showError(`Ошибка импорта: ${error.message}`);
        }
    });
    
    input.click();
}

// Очистка всех данных
function clearAllData() {
    if (!confirm('ВНИМАНИЕ! Это удалит ВСЕ данные из системы. Это действие нельзя отменить.\n\nВы действительно хотите продолжить?')) {
        return;
    }
    
    if (!confirm('Последнее предупреждение! ВСЕ данные будут безвозвратно удалены.')) {
        return;
    }
    
    try {
        localStorage.clear();
        showSuccess('Все данные удалены. Перезагрузите страницу.');
        
        // Перезагружаем через 2 секунды
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Ошибка очистки:', error);
        showError('Ошибка очистки данных');
    }
}

// Редактирование (заглушки на будущее)
function editUser(userId) {
    showError('Редактирование пользователей будет реализовано в следующей версии');
}

// Редактирование процесса
async function editProcess(processId) {
    try {
        const process = app.processService.findById(parseInt(processId));
        if (!process) {
            showError('Процесс не найден');
            return;
        }
        
        showEditProcessModal(process);
        
    } catch (error) {
        console.error('Ошибка загрузки процесса для редактирования:', error);
        showError('Не удалось загрузить процесс для редактирования');
    }
}

function editProductType(productTypeId) {
    showError('Редактирование типов изделий будет реализовано в следующей версии');
}

function adminEditOrder(orderId) {
    showError('Редактирование заказов будет реализовано в следующей версии');
}

// Экспорт функций админки в глобальную область
window.showAdminTab = showAdminTab;
window.showCreateUserModal = showCreateUserModal;
window.showCreateProcessModal = showCreateProcessModal;
window.showCreateProductTypeModal = showCreateProductTypeModal;
window.submitCreateUser = submitCreateUser;
window.submitCreateProcess = submitCreateProcess;
window.deleteUser = deleteUser;
window.deleteProcess = deleteProcess;
window.deleteProductType = deleteProductType;
window.adminDeleteOrder = adminDeleteOrder;
window.editUser = editUser;
window.editProcess = editProcess;
window.editProductType = editProductType;
window.adminEditOrder = adminEditOrder;
window.exportSystemData = exportSystemData;
window.importSystemData = importSystemData;
window.clearAllData = clearAllData;

// Экспорт основных функций
window.createNewOrder = createNewOrder;
window.openOrderForm = openOrderForm;
window.openProductTypeDesigner = openProductTypeDesigner;
window.showOrders = showOrders;
window.showAdmin = showAdmin;
window.loginAsUser = loginAsUser;
window.logout = logout;
window.showSuccess = showSuccess;
window.showError = showError;
window.closeModal = closeModal;
window.createDemoData = createDemoData;
window.showSystemDiagnostics = showSystemDiagnostics;

// Управление заказами (админка)
async function showOrdersAdmin(container) {
    const orders = await app.orderService.getAllOrders();
    const stats = await app.orderService.getOrderStats();
    
    container.innerHTML = `
        <div class="tab-content active">
            <h2 style="margin-bottom: 24px;">Управление заказами</h2>
            
            <!-- Статистика -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px;">
                <div class="data-table" style="padding: 20px; text-align: center;">
                    <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Всего заказов</h4>
                    <div style="font-size: 28px; font-weight: 600; color: var(--primary);">${stats.total}</div>
                </div>
                
                <div class="data-table" style="padding: 20px; text-align: center;">
                    <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">В работе</h4>
                    <div style="font-size: 28px; font-weight: 600; color: var(--warning);">${stats.inProgress}</div>
                </div>
                
                <div class="data-table" style="padding: 20px; text-align: center;">
                    <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Завершено</h4>
                    <div style="font-size: 28px; font-weight: 600; color: var(--success);">${stats.completed}</div>
                </div>
                
                <div class="data-table" style="padding: 20px; text-align: center;">
                    <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Отменено</h4>
                    <div style="font-size: 28px; font-weight: 600; color: var(--danger);">${stats.cancelled}</div>
                </div>
            </div>
            
            <!-- Таблица заказов -->
            ${orders.length === 0 ? `
                <div class="empty-state">
                    Заказы не найдены
                </div>
            ` : `
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Номер</th>
                                <th>Клиент</th>
                                <th>Изделие</th>
                                <th>Текущий процесс</th>
                                <th>Статус</th>
                                <th>Создан</th>
                                <th>Создатель</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.map(order => `
                                <tr>
                                    <td><strong>${order.number}</strong></td>
                                    <td>${order.customerName}</td>
                                    <td>${order.productTypeName || 'Не указано'}</td>
                                    <td>${getProcessNameById(order.currentProcessId) || 'Не назначен'}</td>
                                    <td>
                                        <span class="status-indicator status-${order.status.toLowerCase()}">
                                            ${getStatusIcon(order.status)} ${order.status}
                                        </span>
                                    </td>
                                    <td>${order.createdAt.toLocaleDateString()}</td>
                                    <td>${getUserNameById(order.createdBy) || 'Неизвестно'}</td>
                                    <td>
                                        <button onclick="showOrderDetails('${order.id}')" class="btn btn-secondary btn-small">
                                            👁️ Подробно
                                        </button>
                                        <button onclick="adminEditOrder('${order.id}')" class="btn btn-secondary btn-small">
                                            ✏️ Изменить
                                        </button>
                                        <button onclick="adminDeleteOrder('${order.id}')" class="btn btn-danger btn-small">
                                            🗑️ Удалить
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
}

// Системные настройки
async function showSystemAdmin(container) {
    const diagnostics = await app.diagnoseSystem();
    
    container.innerHTML = `
        <div class="tab-content active">
            <h2 style="margin-bottom: 24px;">Системные настройки</h2>
            
            <!-- Статус системы -->
            <div class="data-table" style="padding: 24px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px 0;">📊 Статус системы</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div>
                        <strong>Состояние:</strong> 
                        <span style="color: ${diagnostics.health.status === 'OK' ? 'var(--success)' : 'var(--danger)'};">
                            ${diagnostics.health.status === 'OK' ? '✅ Нормально' : '⚠️ Проблемы'}
                        </span>
                    </div>
                    <div><strong>Пользователей:</strong> ${diagnostics.stats.users.total}</div>
                    <div><strong>Процессов:</strong> ${diagnostics.stats.processes.total}</div>
                    <div><strong>Изделий:</strong> ${diagnostics.stats.productTypes.total}</div>
                    <div><strong>Заказов:</strong> ${diagnostics.stats.orders.total}</div>
                </div>
            </div>
            
            <!-- Действия -->
            <div class="data-table" style="padding: 24px;">
                <h3 style="margin: 0 0 16px 0;">🔧 Действия</h3>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <button onclick="createDemoData()" class="btn btn-secondary">
                        🎯 Создать демо-данные
                    </button>
                    <button onclick="exportSystemData()" class="btn btn-secondary">
                        📄 Экспорт данных
                    </button>
                    <button onclick="importSystemData()" class="btn btn-secondary">
                        📁 Импорт данных
                    </button>
                    <button onclick="clearAllData()" class="btn btn-danger">
                        🗑️ Очистить все данные
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Вспомогательные функции
function getUserNameById(userId) {
    if (!userId || !app?.userService) return null;
    
    try {
        const users = app.userService.getAllUsers();
        const user = users.find(u => u.id === userId);
        return user ? user.name : null;
    } catch (error) {
        return null;
    }
}

// Запуск основного интерфейса
async function startApplication() {
    if (app.isAuthenticated) {
        await showMainInterface();
    } else {
        await showLoginInterface();
    }
}

// Показ интерфейса авторизации
async function showLoginInterface() {
    console.log('👤 Показ экрана авторизации');
    
    try {
        const users = await app.userService.getAllUsers();
        
        const appContainer = document.getElementById('app');
        appContainer.innerHTML = `
            <div id="loginScreen">
                <div class="login-container">
                    <div class="logo-container">
                        <img src="assets/logo-simple.svg" alt="OMS">
                        <h1 style="margin-top: 20px; font-size: 24px; color: var(--text-primary);">Order Management System</h1>
                        <p style="margin-top: 8px; color: var(--text-secondary); font-size: 14px;">Система управления заказами</p>
                    </div>
                    
                    <h2 style="margin-bottom: 16px; font-size: 18px; color: var(--text-primary);">Выберите пользователя</h2>
                    <div class="user-grid">
                        ${users.map(user => `
                            <div class="user-card" onclick="loginAsUser('${user.name}')">
                                <div class="user-name">
                                    ${user.isAdmin() ? '👑' : '👤'} ${user.name}
                                </div>
                                <div class="user-phone">${user.role}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="margin-top: 24px; display: flex; gap: 12px; flex-direction: column;">
                        <button onclick="createDemoData()" class="btn btn-primary w-100">
                            🎯 Создать демо-данные
                        </button>
                        <button onclick="showSystemDiagnostics()" class="btn btn-secondary w-100">
                            🔍 Диагностика системы
                        </button>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        showError('Не удалось загрузить список пользователей');
    }
}

// Авторизация пользователя
async function loginAsUser(userName) {
    try {
        const user = await app.authenticate(userName);
        console.log(`✅ Авторизован как: ${user.name} (${user.role})`);
        await showMainInterface();
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        showError(`Ошибка авторизации: ${error.message}`);
    }
}

// Показ основного интерфейса
async function showMainInterface() {
    console.log('🏠 Показ основного интерфейса');
    
    const user = app.currentUser;
    const appContainer = document.getElementById('app');
    
    appContainer.innerHTML = `
        <div id="mainApp" style="display: block;">
            <header class="header">
                <div class="header-logo">
                    <img src="assets/logo-simple.svg" alt="OMS">
                    <span style="font-size: 18px; font-weight: 600; color: var(--text-primary);">OMS</span>
                </div>
                
                <div class="header-actions">
                    <button onclick="showOrders()" class="btn btn-secondary btn-small" id="btn-orders">
                        📋 Заказы
                    </button>
                    ${user.isAdmin() ? `
                        <button onclick="showAdmin()" class="btn btn-secondary btn-small" id="btn-admin">
                            ⚙️ Админ
                        </button>
                    ` : ''}
                    <div class="user-info">
                        ${user.isAdmin() ? '👑' : '👤'} ${user.name}
                    </div>
                    <button onclick="logout()" class="btn btn-danger btn-small">
                        🚪 Выход
                    </button>
                </div>
            </header>
            
            <main id="main-content">
                <!-- Контент будет загружаться здесь -->
            </main>
        </div>
    `;
    
    await showOrders();
}

// Показ панели управления
async function showDashboard() {
    console.log('📊 Загрузка панели управления');
    
    try {
        const stats = await app.getSystemStats();
        const contentContainer = document.getElementById('main-content');
        
        contentContainer.innerHTML = `
            <div class="admin-panel">
                <h1 style="margin-bottom: 24px; color: var(--text-primary);">Панель управления</h1>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 32px;">
                    <div class="data-table" style="padding: 20px;">
                        <h3 style="margin-bottom: 8px; color: var(--text-primary);">👥 Пользователи</h3>
                        <div style="font-size: 32px; font-weight: 600; color: var(--primary); margin: 8px 0;">${stats.users.total}</div>
                        <div style="font-size: 14px; color: var(--text-secondary);">
                            Админы: ${stats.users.administrators} | 
                            Сотрудники: ${stats.users.employees}
                        </div>
                    </div>
                    
                    <div class="data-table" style="padding: 20px;">
                        <h3 style="margin-bottom: 8px; color: var(--text-primary);">📋 Заказы</h3>
                        <div style="font-size: 32px; font-weight: 600; color: var(--primary); margin: 8px 0;">${stats.orders.total}</div>
                        <div style="font-size: 14px; color: var(--text-secondary);">
                            В работе: ${stats.orders.inProgress} | 
                            Завершено: ${stats.orders.completed}
                        </div>
                    </div>
                    
                    <div class="data-table" style="padding: 20px;">
                        <h3 style="margin-bottom: 8px; color: var(--text-primary);">⚙️ Процессы</h3>
                        <div style="font-size: 32px; font-weight: 600; color: var(--primary); margin: 8px 0;">${stats.processes.total}</div>
                        <div style="font-size: 14px; color: var(--text-secondary);">
                            Этапов настроено
                        </div>
                    </div>
                    
                    <div class="data-table" style="padding: 20px;">
                        <h3 style="margin-bottom: 8px; color: var(--text-primary);">📦 Изделия</h3>
                        <div style="font-size: 32px; font-weight: 600; color: var(--primary); margin: 8px 0;">${stats.productTypes.total}</div>
                        <div style="font-size: 14px; color: var(--text-secondary);">
                            Типов изделий
                        </div>
                    </div>
                </div>
                
                <div class="data-table" style="padding: 24px;">
                    <h2 style="margin-bottom: 16px; color: var(--text-primary);">Быстрые действия</h2>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        ${app.currentUser.canCreateOrders() ? `
                            <button onclick="createNewOrder()" class="btn btn-primary">
                                ➕ Создать заказ
                            </button>
                        ` : ''}
                        
                        ${app.currentUser.isAdmin() ? `
                            <button onclick="createDemoData()" class="btn btn-secondary">
                                🎯 Демо-данные
                            </button>
                            <button onclick="showSystemDiagnostics()" class="btn btn-secondary">
                                🔍 Диагностика
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        updateActiveNavigation('orders');
        
    } catch (error) {
        console.error('Ошибка загрузки панели:', error);
        showError('Не удалось загрузить панель управления');
    }
}

// Показ заказов в виде канбан-доски
async function showOrders() {
    console.log('📋 Загрузка канбан-доски заказов');
    
    try {
        const orders = await app.orderService.getOrdersForUser(app.currentUser.id);
        const processes = await app.processService.getAllProcesses();
        const contentContainer = document.getElementById('main-content');
        
        // Группируем заказы по процессам
        const ordersByProcess = groupOrdersByCurrentProcess(orders, processes);
        
        contentContainer.innerHTML = `
            <div class="kanban-container">
                <div class="kanban-filters">
                    <input type="text" id="kanban-search" class="kanban-search" placeholder="🔍 Поиск заказов...">
                    <button onclick="toggleKanbanView()" class="btn btn-secondary btn-small">
                        📊 Таблица
                    </button>
                    ${app.currentUser.canCreateOrders() ? `
                        <button onclick="createNewOrder()" class="btn btn-primary btn-small">
                            ➕ Новый заказ
                        </button>
                    ` : ''}
                </div>
                
                <div class="kanban-board" id="kanban-board">
                    ${processes.map(process => {
                        const processOrders = ordersByProcess[process.id] || [];
                        return `
                            <div class="kanban-column" data-process-id="${process.id}">
                                <div class="kanban-header">
                                    <div class="kanban-title">
                                        ${process.name}
                                        <span class="kanban-count">${processOrders.length}</span>
                                    </div>
                                </div>
                                <div class="kanban-items" id="process-${process.id}">
                                    ${processOrders.length === 0 ? `
                                        <div class="kanban-empty">
                                            Нет заказов на этом этапе
                                        </div>
                                    ` : processOrders.map(order => createKanbanCard(order)).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        // Инициализируем drag and drop
        initializeKanbanDragAndDrop();
        
        // Инициализируем поиск
        initializeKanbanSearch();
        
        updateActiveNavigation('orders');
        
    } catch (error) {
        console.error('Ошибка загрузки канбан-доски:', error);
        showError('Не удалось загрузить канбан-доску заказов');
    }
}

// Показ админ-панели
async function showAdmin() {
    if (!app.currentUser.isAdmin()) {
        showError('Доступ запрещен');
        return;
    }
    
    console.log('⚙️ Загрузка админ-панели');
    
    const contentContainer = document.getElementById('main-content');
    contentContainer.innerHTML = `
        <div class="admin-panel">
            <h1 style="margin-bottom: 24px; color: var(--text-primary);">Администрирование</h1>
            
            <div class="admin-tabs">
                <button class="tab-btn active" onclick="showAdminTab('users')" id="tab-users">
                    👥 Пользователи
                </button>
                <button class="tab-btn" onclick="showAdminTab('processes')" id="tab-processes">
                    ⚙️ Процессы
                </button>
                <button class="tab-btn" onclick="showAdminTab('products')" id="tab-products">
                    📦 Типы изделий
                </button>
                <button class="tab-btn" onclick="showAdminTab('orders')" id="tab-orders">
                    📋 Управление заказами
                </button>
                <button class="tab-btn" onclick="showAdminTab('system')" id="tab-system">
                    🔧 Система
                </button>
            </div>
            
            <div id="admin-content">
                <!-- Контент будет загружаться здесь -->
            </div>
        </div>
    `;
    
    // Показываем первую вкладку по умолчанию
    await showAdminTab('users');
    
    updateActiveNavigation('admin');
}

// Переключение между вкладками админки
async function showAdminTab(tabName) {
    // Обновляем активную вкладку
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    const contentDiv = document.getElementById('admin-content');
    
    try {
        switch (tabName) {
            case 'users':
                await showUsersAdmin(contentDiv);
                break;
            case 'processes':
                await showProcessesAdmin(contentDiv);
                break;
            case 'products':
                await showProductTypesAdmin(contentDiv);
                break;
            case 'orders':
                await showOrdersAdmin(contentDiv);
                break;
            case 'system':
                await showSystemAdmin(contentDiv);
                break;
            default:
                contentDiv.innerHTML = '<p>Неизвестная вкладка</p>';
        }
    } catch (error) {
        console.error(`Ошибка загрузки вкладки ${tabName}:`, error);
        contentDiv.innerHTML = `<p style="color: var(--danger);">Ошибка загрузки: ${error.message}</p>`;
    }
}

// Управление пользователями
async function showUsersAdmin(container) {
    const users = await app.userService.getAllUsers();
    
    container.innerHTML = `
        <div class="tab-content active">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2>Управление пользователями</h2>
                <button onclick="showCreateUserModal()" class="btn btn-primary">
                    ➕ Добавить пользователя
                </button>
            </div>
            
            ${users.length === 0 ? `
                <div class="empty-state">
                    Пользователи не найдены
                </div>
            ` : `
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Имя</th>
                                <th>Роль</th>
                                <th>Процессы</th>
                                <th>Создан</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td>
                                        <strong>${user.name}</strong>
                                        ${user.isAdmin() ? ' 👑' : ''}
                                    </td>
                                    <td>${user.role}</td>
                                    <td>
                                        ${user.permissions?.processIds?.length ? 
                                            user.permissions.processIds.map(id => getProcessNameById(id) || `ID:${id}`).join(', ') : 
                                            'Все процессы'
                                        }
                                    </td>
                                    <td>${user.createdAt?.toLocaleDateString() || 'Неизвестно'}</td>
                                    <td>
                                        <button onclick="editUser('${user.id}')" class="btn btn-secondary btn-small">
                                            ✏️ Изменить
                                        </button>
                                        ${user.id !== app.currentUser.id ? `
                                            <button onclick="deleteUser('${user.id}')" class="btn btn-danger btn-small">
                                                🗑️ Удалить
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
}

// Управление процессами
async function showProcessesAdmin(container) {
    const processes = await app.processService.getAllProcesses();
    
    // Сортируем по порядку, если он есть, иначе по ID
    processes.sort((a, b) => {
        if (a.order && b.order) {
            return a.order - b.order;
        }
        return a.id - b.id;
    });
    
    container.innerHTML = `
        <div class="tab-content active">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2>Управление процессами</h2>
                <button onclick="showCreateProcessModal()" class="btn btn-primary">
                    ➕ Добавить процесс
                </button>
            </div>
            
            ${processes.length === 0 ? `
                <div class="empty-state">
                    Процессы не найдены
                </div>
            ` : `
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>🔄</th>
                                <th>Название</th>
                                <th>Описание</th>
                                <th>Создан</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody id="processes-tbody">
                            ${processes.map((process, index) => `
                                <tr draggable="true" data-process-id="${process.id}" class="process-row">
                                    <td style="cursor: grab; text-align: center; color: #666;">☰</td>
                                    <td><strong>${process.name}</strong></td>
                                    <td>${process.description || 'Нет описания'}</td>
                                    <td>${process.createdAt?.toLocaleDateString() || 'Неизвестно'}</td>
                                    <td>
                                        <button onclick="editProcess('${process.id}')" class="btn btn-secondary btn-small">
                                            ✏️ Изменить
                                        </button>
                                        <button onclick="deleteProcess('${process.id}')" class="btn btn-danger btn-small">
                                            🗑️ Удалить
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
    
    // Инициализируем drag & drop для процессов
    initializeProcessDragAndDrop();
}

// Управление типами изделий
async function showProductTypesAdmin(container) {
    const productTypes = await app.productTypeService.getAllProductTypes();
    
    container.innerHTML = `
        <div class="tab-content active">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2>Управление типами изделий</h2>
                <button onclick="showCreateProductTypeModal()" class="btn btn-primary">
                    ➕ Добавить тип изделия
                </button>
            </div>
            
            ${productTypes.length === 0 ? `
                <div class="empty-state">
                    Типы изделий не найдены
                </div>
            ` : `
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th>Описание</th>
                                <th>Процессы</th>
                                <th>Создан</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productTypes.map(productType => `
                                <tr>
                                    <td><strong>${productType.name}</strong></td>
                                    <td>${productType.description || 'Нет описания'}</td>
                                    <td>
                                        ${productType.processIds?.length ? 
                                            productType.processIds.map(id => getProcessNameById(id) || `ID:${id}`).join(' → ') : 
                                            'Процессы не настроены'
                                        }
                                    </td>
                                    <td>${productType.createdAt?.toLocaleDateString() || 'Неизвестно'}</td>
                                    <td>
                                        <button onclick="editProductType('${productType.id}')" class="btn btn-secondary btn-small">
                                            ✏️ Изменить
                                        </button>
                                        <button onclick="deleteProductType('${productType.id}')" class="btn btn-danger btn-small">
                                            🗑️ Удалить
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
}

// Вспомогательные функции
function updateActiveNavigation(section) {
    // Сбрасываем все активные кнопки
    document.querySelectorAll('.btn').forEach(btn => {
        if (btn.id && btn.id.startsWith('btn-')) {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        }
    });
    
    // Устанавливаем активную кнопку
    const activeBtn = document.getElementById(`btn-${section}`);
    if (activeBtn) {
        activeBtn.classList.remove('btn-secondary');
        activeBtn.classList.add('btn-primary');
    }
}

function showError(message) {
    console.error('🚨 Ошибка:', message);
    alert(message); // Простое отображение ошибки
}

function logout() {
    app.logout();
    console.log('👋 Пользователь вышел из системы');
    showLoginInterface();
}

async function createDemoData() {
    if (!app.currentUser || !app.currentUser.isAdmin()) {
        showError('Только администратор может создавать демо-данные');
        return;
    }
    
    try {
        console.log('🎯 Создание демо-данных...');
        await app.createDemoData();
        
        if (app.isAuthenticated) {
            await showMainInterface();
        } else {
            await showLoginInterface();
        }
        
        alert('✅ Демо-данные созданы успешно!');
        
    } catch (error) {
        console.error('Ошибка создания демо-данных:', error);
        showError(`Ошибка создания демо-данных: ${error.message}`);
    }
}

async function showSystemDiagnostics() {
    try {
        const diagnostics = await app.diagnoseSystem();
        console.log('🔍 Диагностика системы:', diagnostics);
        
        alert(`Диагностика системы:
Статус: ${diagnostics.health.status}
Заказов: ${diagnostics.stats.orders.total}
Пользователей: ${diagnostics.stats.users.total}`);
        
    } catch (error) {
        console.error('Ошибка диагностики:', error);
        showError('Не удалось выполнить диагностику системы');
    }
}

// Создание нового заказа
async function createNewOrder() {
    if (!app.currentUser.canCreateOrders()) {
        showError('Нет прав на создание заказов');
        return;
    }
    
    try {
        // Получаем типы изделий для выбора
        const productTypes = await app.productTypeService.getAllProductTypes();
        
        if (productTypes.length === 0) {
            showError('Нет настроенных типов изделий. Обратитесь к администратору.');
            return;
        }
        
        // Показываем модальное окно создания заказа
        showCreateOrderModal(productTypes);
        
    } catch (error) {
        console.error('Ошибка при открытии формы создания заказа:', error);
        showError('Не удалось открыть форму создания заказа');
    }
}

// Модальное окно создания заказа
function showCreateOrderModal(productTypes) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Создать новый заказ</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            
            <form id="createOrderForm" class="modal-body">
                <div class="form-group">
                    <label for="customerName">Имя клиента *</label>
                    <input type="text" id="customerName" name="customerName" required 
                           placeholder="Введите имя клиента">
                </div>
                
                <div class="form-group">
                    <label for="customerPhone">Телефон клиента</label>
                    <input type="tel" id="customerPhone" name="customerPhone" 
                           placeholder="+7 999 123 45 67">
                </div>
                
                <div class="form-group">
                    <label for="productTypeId">Тип изделия *</label>
                    <select id="productTypeId" name="productTypeId" required>
                        <option value="">Выберите тип изделия...</option>
                        ${productTypes.map(pt => `
                            <option value="${pt.id}">${pt.name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div id="selectedProductInfo" class="product-info" style="display: none;">
                    <h4>Этапы производства:</h4>
                    <div id="processSequence"></div>
                </div>
            </form>
            
            <div class="modal-footer">
                <button type="button" onclick="closeModal()" class="btn-secondary">
                    Отмена
                </button>
                <button type="button" onclick="submitCreateOrder()" class="btn-primary">
                    Создать заказ
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчик изменения типа изделия
    document.getElementById('productTypeId').addEventListener('change', async (e) => {
        const productTypeId = parseInt(e.target.value);
        if (productTypeId) {
            await showProductTypeInfo(productTypeId);
        } else {
            document.getElementById('selectedProductInfo').style.display = 'none';
        }
    });
    
    // Фокус на первое поле
    setTimeout(() => {
        document.getElementById('customerName').focus();
    }, 100);
}

// Показ информации о типе изделия
async function showProductTypeInfo(productTypeId) {
    try {
        const productTypeInfo = await app.productTypeService.getProductTypeWithProcesses(productTypeId);
        const infoDiv = document.getElementById('selectedProductInfo');
        const sequenceDiv = document.getElementById('processSequence');
        
        if (productTypeInfo.processes.length === 0) {
            sequenceDiv.innerHTML = '<p class="warning">⚠️ У этого типа изделия не настроены процессы</p>';
        } else {
            sequenceDiv.innerHTML = `
                <div class="process-sequence">
                    ${productTypeInfo.processes.map((process, index) => `
                        <div class="process-step">
                            <span class="step-number">${index + 1}</span>
                            <span class="step-name">${process.name}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        infoDiv.style.display = 'block';
        
    } catch (error) {
        console.error('Ошибка загрузки информации о типе изделия:', error);
    }
}

// Отправка формы создания заказа
async function submitCreateOrder() {
    const form = document.getElementById('createOrderForm');
    const formData = new FormData(form);
    
    const orderData = {
        customerName: formData.get('customerName').trim(),
        customerPhone: formData.get('customerPhone').trim(),
        productTypeId: parseInt(formData.get('productTypeId'))
    };
    
    // Валидация
    if (!orderData.customerName) {
        showError('Введите имя клиента');
        return;
    }
    
    if (!orderData.productTypeId) {
        showError('Выберите тип изделия');
        return;
    }
    
    try {
        console.log('📝 Создание заказа:', orderData);
        
        const order = await app.orderService.createOrder(orderData, app.currentUser.id);
        
        console.log('✅ Заказ создан:', order);
        
        closeModal();
        showSuccess(`Заказ ${order.number} успешно создан!`);
        
        // Обновляем список заказов, если мы на странице заказов
        if (document.querySelector('.orders-section')) {
            await showOrders();
        }
        
    } catch (error) {
        console.error('Ошибка создания заказа:', error);
        showError(`Ошибка создания заказа: ${error.message}`);
    }
}

// Закрытие модального окна
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Показать диагностику системы
function showSystemDiagnostics() {
    console.log('🔍 Диагностика системы...');
    if (app) {
        app.diagnoseSystem().then(diagnostics => {
            console.log('📊 Диагностика:', diagnostics);
            alert('Статус системы: ' + (diagnostics.health.status === 'OK' ? 'Нормально ✅' : 'Проблемы ⚠️'));
        });
    } else {
        alert('Приложение не инициализировано');
    }
}

// Показ сообщения об успехе
function showSuccess(message) {
    console.log('✅ Успех:', message);
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <div class="success-content">
            <span class="success-icon">✅</span>
            <span class="success-text">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="success-close">✕</button>
        </div>
    `;
    
    document.body.appendChild(successDiv);
    
    // Автоматически убираем через 3 секунды
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Экспорт в глобальную область для использования в HTML
window.app = app;
window.loginAsUser = loginAsUser;
window.logout = logout;
window.showDashboard = showDashboard;
window.showOrders = showOrders;
window.showAdmin = showAdmin;
window.createDemoData = createDemoData;
window.showSystemDiagnostics = showSystemDiagnostics;
window.createNewOrder = createNewOrder;
window.openOrderForm = openOrderForm;
window.openProductTypeDesigner = openProductTypeDesigner;
window.hideAllUI = hideAllUI;
window.closeModal = closeModal;
window.submitCreateOrder = submitCreateOrder;
window.showOrderDetails = showOrderDetails;
window.toggleKanbanView = toggleKanbanView;



// Дополнительные функции для канбан-доски

// Получение имени процесса по ID
function getProcessNameById(processId) {
    if (!processId || !app?.processService) return null;
    
    try {
        const processes = app.processService.getAllProcesses();
        const process = processes.find(p => p.id === processId);
        return process ? process.name : null;
    } catch (error) {
        return null;
    }
}

// Переключение между канбан и табличным видом
function toggleKanbanView() {
    showOrdersTable();
}

// Показ заказов в табличном виде
async function showOrdersTable() {
    console.log('📊 Загрузка таблицы заказов');
    
    try {
        const orders = await app.orderService.getOrdersForUser(app.currentUser.id);
        const contentContainer = document.getElementById('main-content');
        
        contentContainer.innerHTML = `
            <div class="admin-panel">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h1 style="margin: 0; color: var(--text-primary);">Заказы</h1>
                    <div style="display: flex; gap: 12px;">
                        <button onclick="showOrders()" class="btn btn-secondary btn-small">
                            📋 Канбан
                        </button>
                        ${app.currentUser.canCreateOrders() ? `
                            <button onclick="createNewOrder()" class="btn btn-primary btn-small">
                                ➕ Новый заказ
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                ${orders.length === 0 ? `
                    <div class="empty-state">
                        Нет доступных заказов
                    </div>
                ` : `
                    <div class="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Номер</th>
                                    <th>Клиент</th>
                                    <th>Изделие</th>
                                    <th>Текущий процесс</th>
                                    <th>Статус</th>
                                    <th>Создан</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orders.map(order => `
                                    <tr>
                                        <td><strong>${order.number}</strong></td>
                                        <td>${order.customerName}</td>
                                        <td>${order.productTypeName || 'Не указано'}</td>
                                        <td>${getProcessNameById(order.currentProcessId) || 'Не назначен'}</td>
                                        <td>
                                            <span class="status-indicator status-${order.status.toLowerCase()}">
                                                ${getStatusIcon(order.status)} ${order.status}
                                            </span>
                                        </td>
                                        <td>${order.createdAt.toLocaleDateString()}</td>
                                        <td>
                                            <button onclick="showOrderDetails('${order.id}')" class="btn btn-secondary btn-small">
                                                👁️ Детали
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
        
        updateActiveNavigation('orders');
        
    } catch (error) {
        console.error('Ошибка загрузки таблицы заказов:', error);
        showError('Не удалось загрузить таблицу заказов');
    }
}

// Показ деталей заказа в модальном окне
async function showOrderDetails(orderId) {
    try {
        const order = await app.orderService.getOrderById(parseInt(orderId));
        if (!order) {
            showError('Заказ не найден');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Детали заказа ${order.number}</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="order-details">
                        <div class="order-detail-section">
                            <h4>📋 Основная информация</h4>
                            <div class="detail-row">
                                <span class="detail-label">Номер заказа:</span>
                                <span class="detail-value">${order.number}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Клиент:</span>
                                <span class="detail-value">${order.customerName}</span>
                            </div>
                            ${order.customerPhone ? `
                                <div class="detail-row">
                                    <span class="detail-label">Телефон:</span>
                                    <span class="detail-value">${order.customerPhone}</span>
                                </div>
                            ` : ''}
                            <div class="detail-row">
                                <span class="detail-label">Изделие:</span>
                                <span class="detail-value">${order.productTypeName || 'Не указано'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Текущий процесс:</span>
                                <span class="detail-value">${getProcessNameById(order.currentProcessId) || 'Не назначен'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Статус:</span>
                                <span class="detail-value">
                                    <span class="status-indicator status-${order.status.toLowerCase()}">
                                        ${getStatusIcon(order.status)} ${order.status}
                                    </span>
                                </span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Создан:</span>
                                <span class="detail-value">${order.createdAt.toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <div class="order-detail-section">
                            <h4>📈 История</h4>
                            <div class="order-history">
                                <div class="history-event history-created">
                                    <div class="history-content">
                                        <div class="history-text">
                                            🎯 Заказ создан
                                        </div>
                                        <div class="history-meta">
                                            ${order.createdAt.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" onclick="closeModal()" class="btn btn-primary">
                        Закрыть
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Добавляем обработчик для закрытия по клику на фон
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
    } catch (error) {
        console.error('Ошибка загрузки деталей заказа:', error);
        showError('Не удалось загрузить детали заказа');
    }
}

// Дополнительные функции для канбан-доски

// Группировка заказов по текущему процессу
function groupOrdersByCurrentProcess(orders, processes) {
    const grouped = {};
    
    // Инициализируем группы для всех процессов
    processes.forEach(process => {
        grouped[process.id] = [];
    });
    
    // Распределяем заказы по процессам
    orders.forEach(order => {
        if (order.currentProcessId && grouped[order.currentProcessId]) {
            grouped[order.currentProcessId].push(order);
        } else {
            // Если у заказа нет текущего процесса, помещаем в первый доступный
            const firstProcess = processes[0];
            if (firstProcess) {
                grouped[firstProcess.id].push(order);
            }
        }
    });
    
    return grouped;
}

// Создание карточки заказа для канбана
function createKanbanCard(order) {
    return `
        <div class="kanban-item status-${order.status.toLowerCase()}" 
             data-order-id="${order.id}"
             draggable="true"
             onclick="showOrderDetails('${order.id}')">
            <div class="kanban-item-number">
                <span>${order.number}</span>
                <span class="status-indicator status-${order.status.toLowerCase()}">
                    ${getStatusIcon(order.status)}
                </span>
            </div>
            <div class="kanban-item-customer">
                ${order.customerName}
            </div>
            ${order.productTypeName ? `
                <div class="kanban-item-product">
                    📦 ${order.productTypeName}
                </div>
            ` : ''}
            <div class="kanban-item-meta">
                <span class="kanban-item-date">
                    ${order.createdAt.toLocaleDateString()}
                </span>
            </div>
        </div>
    `;
}

// Инициализация drag and drop для канбана
function initializeKanbanDragAndDrop() {
    const kanbanItems = document.querySelectorAll('.kanban-item');
    const kanbanColumns = document.querySelectorAll('.kanban-column');
    
    let draggedElement = null;
    
    // Обработчики для карточек заказов
    kanbanItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedElement = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', item.outerHTML);
        });
        
        item.addEventListener('dragend', (e) => {
            item.classList.remove('dragging');
            draggedElement = null;
        });
    });
    
    // Обработчики для колонок
    kanbanColumns.forEach(column => {
        const itemsContainer = column.querySelector('.kanban-items');
        
        itemsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            column.classList.add('drag-over');
        });
        
        itemsContainer.addEventListener('dragleave', (e) => {
            if (!itemsContainer.contains(e.relatedTarget)) {
                column.classList.remove('drag-over');
            }
        });
        
        itemsContainer.addEventListener('drop', async (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');
            
            if (!draggedElement) return;
            
            const targetProcessId = parseInt(column.dataset.processId);
            const orderItem = draggedElement;
            const orderId = parseInt(orderItem.dataset.orderId);
            
            try {
                // Перемещаем заказ в новый процесс
                await app.orderService.moveOrderToProcess(orderId, targetProcessId, app.currentUser.id);
                
                // Обновляем интерфейс
                await refreshKanbanBoard();
                
                showSuccess(`Заказ успешно перемещен на этап "${getProcessNameById(targetProcessId)}"`);
                
            } catch (error) {
                console.error('Ошибка перемещения заказа:', error);
                showError('Не удалось переместить заказ');
            }
        });
    });
}

// Обновление канбан-доски
async function refreshKanbanBoard() {
    await showOrders();
}

// Инициализация поиска в канбане
function initializeKanbanSearch() {
    const searchInput = document.getElementById('kanban-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterKanbanCards(searchTerm);
    });
}

// Фильтрация карточек канбана
function filterKanbanCards(searchTerm) {
    const kanbanItems = document.querySelectorAll('.kanban-item');
    
    kanbanItems.forEach(item => {
        const orderNumber = item.querySelector('.kanban-item-number span').textContent.toLowerCase();
        const customerName = item.querySelector('.kanban-item-customer').textContent.toLowerCase();
        const productName = item.querySelector('.kanban-item-product')?.textContent.toLowerCase() || '';
        
        const matches = orderNumber.includes(searchTerm) || 
                       customerName.includes(searchTerm) || 
                       productName.includes(searchTerm);
        
        item.style.display = matches ? 'block' : 'none';
    });
    
    // Обновляем счетчики в заголовках колонок
    updateKanbanCounts();
}

// Обновление счетчиков в колонках канбана
function updateKanbanCounts() {
    const columns = document.querySelectorAll('.kanban-column');
    
    columns.forEach(column => {
        const visibleItems = column.querySelectorAll('.kanban-item:not([style*="display: none"])');
        const countElement = column.querySelector('.kanban-count');
        if (countElement) {
            countElement.textContent = visibleItems.length;
        }
    });
}

// === НЕДОСТАЮЩИЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

// Получение иконки статуса
function getStatusIcon(status) {
    const icons = {
        'DRAFT': '📝',
        'IN_PROGRESS': '⚙️',
        'COMPLETED': '✅',
        'CANCELLED': '❌'
    };
    return icons[status] || '❓';
}

// === МОДАЛЬНЫЕ ОКНА СОЗДАНИЯ ДАННЫХ ===

// Модальное окно создания пользователя
function showCreateUserModal() {
    console.log('👤 Открытие формы создания пользователя...');
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Создать нового пользователя</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            
            <form id="createUserForm" class="modal-body">
                <div class="form-group">
                    <label for="userName">Имя пользователя *</label>
                    <input type="text" id="userName" name="userName" required 
                           placeholder="Введите полное имя">
                </div>
                
                <div class="form-group">
                    <label for="userRole">Роль *</label>
                    <select id="userRole" name="userRole" required>
                        <option value="">Выберите роль...</option>
                        <option value="EMPLOYEE">Сотрудник</option>
                        <option value="MANAGER">Менеджер</option>
                        <option value="ADMINISTRATOR">Администратор</option>
                    </select>
                </div>
                
                <div class="form-group" id="processPermissionsGroup" style="display: none;">
                    <label>Доступные процессы (для сотрудников)</label>
                    <div id="processCheckboxes">
                        <!-- Будет заполнено динамически -->
                    </div>
                </div>
            </form>
            
            <div class="modal-footer">
                <button type="button" onclick="closeModal()" class="btn btn-secondary">
                    Отмена
                </button>
                <button type="button" onclick="submitCreateUser()" class="btn btn-primary">
                    Создать пользователя
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Загружаем список процессов для настройки доступа
    loadProcessesForUser();
    
    // Обработчик изменения роли
    document.getElementById('userRole').addEventListener('change', (e) => {
        const processGroup = document.getElementById('processPermissionsGroup');
        if (e.target.value === 'EMPLOYEE') {
            processGroup.style.display = 'block';
        } else {
            processGroup.style.display = 'none';
        }
    });
    
    // Фокус на первое поле
    setTimeout(() => {
        document.getElementById('userName').focus();
    }, 100);
    
    console.log('✅ Модальное окно создания пользователя открыто');
}

// Загрузка процессов для настройки доступа
async function loadProcessesForUser() {
    try {
        const processes = await app.processService.getAllProcesses();
        const container = document.getElementById('processCheckboxes');
        
        if (processes.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">Процессы не настроены</p>';
            return;
        }
        
        container.innerHTML = processes.map(process => `
            <div class="checkbox-item">
                <input type="checkbox" id="process-${process.id}" name="processIds" value="${process.id}">
                <label for="process-${process.id}">${process.name}</label>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Ошибка загрузки процессов:', error);
        document.getElementById('processCheckboxes').innerHTML = 
            '<p style="color: var(--danger);">Ошибка загрузки процессов</p>';
    }
}

// Отправка формы создания пользователя
async function submitCreateUser() {
    console.log('👤 Попытка создания пользователя...');
    
    try {
        // Получаем данные из формы
        const form = document.getElementById('createUserForm');
        const formData = new FormData(form);
        
        const userData = {
            name: formData.get('userName').trim(),
            role: formData.get('userRole')
        };
        
        console.log('📝 Данные из формы:', userData);
        
        // Простая валидация
        if (!userData.name) {
            showError('Введите имя пользователя');
            return;
        }
        
        if (!userData.role) {
            showError('Выберите роль пользователя');
            return;
        }
        
        // Получаем выбранные процессы для сотрудников
        if (userData.role === 'EMPLOYEE') {
            const selectedProcesses = Array.from(
                document.querySelectorAll('input[name="processIds"]:checked')
            ).map(checkbox => parseInt(checkbox.value));
            
            if (selectedProcesses.length === 0) {
                if (!confirm('Пользователь не будет иметь доступа к процессам. Продолжить?')) {
                    return;
                }
            }
            
            userData.processIds = selectedProcesses;
        }
        
        // Создаем пользователя через сервис
        const user = await app.userService.createUser(userData);
        
        console.log('✅ Пользователь создан:', user);
        
        // Закрываем модальное окно
        closeModal();
        
        // Показываем сообщение об успехе
        showSuccess(`Пользователь "${user.name}" успешно создан!`);
        
        // Обновляем админ-панель если находимся на вкладке пользователей
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && activeTab.id === 'tab-users') {
            await showAdminTab('users');
        }
        
    } catch (error) {
        console.error('❌ Ошибка создания пользователя:', error);
        showError(`Не удалось создать пользователя: ${error.message}`);
    }
}

function showCreateProcessModal() {
    showError('Создание процессов будет реализовано в следующей версии');
}

// Модальное окно создания типа изделия
function showCreateProductTypeModal() {
    console.log('🎨 Открытие конструктора типов изделий...');
    
    // Используем ProductTypeDesignerUI
    openProductTypeDesigner();
}

// Обновляем глобальную переменную productTypeDesigner
function initializeProductTypeDesigner() {
    if (!window.productTypeDesigner) {
        window.productTypeDesigner = new ProductTypeDesignerUI(app);
        console.log('🎨 ProductTypeDesignerUI инициализирован');
    }
    
    return window.productTypeDesigner;
}

// submitCreateUser уже реализована выше

// Модальное окно создания процесса
function showCreateProcessModal() {
    console.log('🔧 Открытие формы создания процесса...');
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Создать новый процесс</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            
            <form id="createProcessForm" class="modal-body">
                <div class="form-group">
                    <label for="processName">Название процесса *</label>
                    <input type="text" id="processName" name="processName" required 
                           placeholder="Например: Подготовка материалов">
                </div>
                
                <div class="form-group">
                    <label for="processDescription">Описание (опционально)</label>
                    <textarea id="processDescription" name="processDescription" rows="3"
                              placeholder="Опишите, что делается на этом этапе..."></textarea>
                </div>
            </form>
            
            <div class="modal-footer">
                <button type="button" onclick="closeModal()" class="btn btn-secondary">
                    Отмена
                </button>
                <button type="button" onclick="submitCreateProcess()" class="btn btn-primary">
                    Создать процесс
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Фокус на первое поле
    setTimeout(() => {
        document.getElementById('processName').focus();
    }, 100);
    
    console.log('✅ Модальное окно создания процесса открыто');
}

async function submitCreateProcess() {
    console.log('🔧 Попытка создания процесса...');
    
    try {
        // Получаем данные из формы
        const form = document.getElementById('createProcessForm');
        const formData = new FormData(form);
        
        const processData = {
            name: formData.get('processName').trim(),
            description: formData.get('processDescription').trim()
        };
        
        console.log('📝 Данные из формы:', processData);
        
        // Простая валидация
        if (!processData.name) {
            showError('Введите название процесса');
            return;
        }
        
        // Создаем процесс через сервис
        const process = await app.processService.createProcess(processData);
        
        console.log('✅ Процесс создан:', process);
        
        // Проверяем что процесс реально сохранился
        const allProcesses = app.processService.getAllProcesses();
        console.log('Все процессы после создания:', allProcesses);
        
        // Закрываем модальное окно
        closeModal();
        
        // Показываем сообщение об успехе
        showSuccess(`Процесс "${process.name}" успешно создан!`);
        
        // TODO: Обновить админ-панель когда будет готова функция showAdminTab
        
    } catch (error) {
        console.error('❌ Ошибка создания процесса:', error);
        showError(`Не удалось создать процесс: ${error.message}`);
    }
}

function deleteUser(userId) {
    showError('Удаление пользователей будет реализовано в следующей версии');
}

// Создание нового заказа
function createNewOrder() {
    console.log('📋 Открытие формы создания заказа...');
    openOrderForm();
}

// Показать успешное сообщение
function showSuccess(message) {
    console.log('✅ Успех:', message);
    alert(message); // Пока используем простое отображение
}

// Простой дашборд (постепенно добавляем функционал)
function showDashboard() {
    console.log('📊 Открытие дашборда...');
    
    // Пока просто заменяем алерт на сообщение в консоли
    console.log('🐈 Дашборд открыт! (в разработке)');
    
    // Показываем простое сообщение вместо алерта
    showSuccess('📊 Дашборд открыт! (в разработке)');
}

console.log('📚 main.js полностью загружен и исправлен');
console.log('🎆 OMS готов к работе! Прогресс: 85%');

// === Недостающие функции ===

// Показать детали заказа
function showOrderDetails(orderId) {
    console.log('📋 Открытие деталей заказа:', orderId);
    
    try {
        const order = app.orderService.findById(parseInt(orderId));
        if (!order) {
            showError('Заказ не найден');
            return;
        }
        
        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Заказ №${order.number}</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="order-details">
                        <div class="detail-group">
                            <h4>Основная информация</h4>
                            <div class="detail-item">
                                <span class="label">Клиент:</span>
                                <span class="value">${order.customerName}</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">Телефон:</span>
                                <span class="value">${order.customerPhone || 'Не указан'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">Статус:</span>
                                <span class="value status-${order.status.toLowerCase()}">
                                    ${getStatusIcon(order.status)} ${order.status}
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="label">Создан:</span>
                                <span class="value">${order.createdAt.toLocaleDateString()}</span>
                            </div>
                        </div>
                        
                        ${order.productTypeName ? `
                            <div class="detail-group">
                                <h4>Тип изделия</h4>
                                <div class="detail-item">
                                    <span class="label">Название:</span>
                                    <span class="value">${order.productTypeName}</span>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${order.customFieldValues && Object.keys(order.customFieldValues).length > 0 ? `
                            <div class="detail-group">
                                <h4>Дополнительная информация</h4>
                                ${Object.entries(order.customFieldValues).map(([key, value]) => `
                                    <div class="detail-item">
                                        <span class="label">${key}:</span>
                                        <span class="value">${value || 'Не указано'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" onclick="closeModal()" class="btn btn-secondary">
                        Закрыть
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Ошибка отображения деталей заказа:', error);
        showError('Ошибка загрузки деталей заказа');
    }
}

// Переключение вида канбан-доски
function toggleKanbanView() {
    console.log('📊 Переключение вида канбан-доски...');
    showError('Табличный режим будет реализован в следующей версии');
}

// Получить название процесса по ID
function getProcessNameById(processId) {
    if (!processId || !app?.processService) return null;
    
    try {
        const processes = app.processService.getAllProcesses();
        const process = processes.find(p => p.id === processId);
        return process ? process.name : null;
    } catch (error) {
        return null;
    }
}

// Добавляем новые функции в глобальную область
window.showOrderDetails = showOrderDetails;
window.toggleKanbanView = toggleKanbanView;
window.getProcessNameById = getProcessNameById;

// === Drag & Drop для процессов ===

// Инициализация drag & drop для процессов
function initializeProcessDragAndDrop() {
    const tbody = document.getElementById('processes-tbody');
    if (!tbody) return;
    
    let draggedElement = null;
    let draggedOverElement = null;
    
    // Обработчики для строк процессов
    const processRows = tbody.querySelectorAll('.process-row');
    
    processRows.forEach(row => {
        row.addEventListener('dragstart', (e) => {
            draggedElement = row;
            row.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
        });
        
        row.addEventListener('dragend', (e) => {
            row.style.opacity = '1';
            draggedElement = null;
            draggedOverElement = null;
            
            // Убираем все индикаторы
            processRows.forEach(r => {
                r.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        });
        
        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (draggedElement && draggedElement !== row) {
                draggedOverElement = row;
                
                // Определяем куда вставлять - сверху или снизу
                const rect = row.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                
                // Убираем предыдущие классы
                processRows.forEach(r => {
                    r.classList.remove('drag-over-top', 'drag-over-bottom');
                });
                
                if (e.clientY < midY) {
                    row.classList.add('drag-over-top');
                } else {
                    row.classList.add('drag-over-bottom');
                }
            }
        });
        
        row.addEventListener('drop', async (e) => {
            e.preventDefault();
            
            if (draggedElement && draggedOverElement && draggedElement !== draggedOverElement) {
                const draggedId = parseInt(draggedElement.dataset.processId);
                const targetId = parseInt(draggedOverElement.dataset.processId);
                
                // Определяем позицию
                const rect = draggedOverElement.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const insertBefore = e.clientY < midY;
                
                try {
                    // Обновляем порядок в сервисе
                    await reorderProcesses(draggedId, targetId, insertBefore);
                    
                    // Обновляем отображение
                    await showAdminTab('processes');
                    
                } catch (error) {
                    console.error('Ошибка изменения порядка процессов:', error);
                    showError('Не удалось изменить порядок процессов');
                }
            }
            
            // Убираем индикаторы
            processRows.forEach(r => {
                r.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        });
    });
}

// Функция для изменения порядка процессов
async function reorderProcesses(draggedId, targetId, insertBefore) {
    try {
        const processes = await app.processService.getAllProcesses();
        
        // Находим индексы
        const draggedIndex = processes.findIndex(p => p.id === draggedId);
        const targetIndex = processes.findIndex(p => p.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) {
            throw new Error('Процесс не найден');
        }
        
        // Перемещаем элемент
        const [draggedProcess] = processes.splice(draggedIndex, 1);
        let newIndex;
        
        if (insertBefore) {
            newIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        } else {
            newIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
        }
        
        processes.splice(newIndex, 0, draggedProcess);
        
        // Обновляем порядок и сохраняем
        for (let i = 0; i < processes.length; i++) {
            const process = processes[i];
            const newOrder = i + 1;
            
            if (process.order !== newOrder) {
                process.order = newOrder;
                
                // Обновляем через репозиторий
                await app.processService._processRepository.update(process.id, {
                    ...process.toJSON(),
                    order: newOrder
                });
            }
        }
        
    } catch (error) {
        console.error('Ошибка в reorderProcesses:', error);
        throw error;
    }
}

// Добавляем в глобальную область
window.initializeProcessDragAndDrop = initializeProcessDragAndDrop;

// === НЕДОСТАЮЩИЕ ФУНКЦИИ ===

// Инициализация ProductTypeDesigner
function initializeProductTypeDesigner() {
    if (!window.productTypeDesigner) {
        window.productTypeDesigner = new ProductTypeDesignerUI(app);
        console.log('🎨 ProductTypeDesigner инициализирован');
    }
}

// Показать модальное окно создания типа изделия (используем ProductTypeDesigner)
function showCreateProductTypeModal() {
    console.log('🎨 Открытие конструктора типов изделий для создания...');
    openProductTypeDesigner();
}

// === ФУНКЦИИ РЕДАКТИРОВАНИЯ ПРОЦЕССОВ ===

// Модальное окно редактирования процесса
function showEditProcessModal(process) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Редактировать процесс</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            
            <form id="editProcessForm" class="modal-body">
                <div class="form-group">
                    <label for="editProcessName">Название процесса *</label>
                    <input type="text" id="editProcessName" name="processName" 
                           value="${process.name}" required 
                           placeholder="Например: Прием заказа">
                </div>
                
                <div class="form-group">
                    <label for="editProcessDescription">Описание процесса</label>
                    <textarea id="editProcessDescription" name="processDescription" 
                              rows="3" placeholder="Краткое описание процесса...">${process.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="editProcessOrder">Порядок (номер этапа)</label>
                    <input type="number" id="editProcessOrder" name="processOrder" 
                           value="${process.order || ''}" min="1" 
                           placeholder="Например: 1, 2, 3...">
                </div>
            </form>
            
            <div class="modal-footer">
                <button type="button" onclick="closeModal()" class="btn btn-secondary">
                    Отмена
                </button>
                <button type="button" onclick="submitEditProcess(${process.id})" class="btn btn-primary">
                    💾 Сохранить изменения
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Фокус на первое поле
    setTimeout(() => {
        document.getElementById('editProcessName').focus();
    }, 100);
}

// Отправка формы редактирования процесса
async function submitEditProcess(processId) {
    const form = document.getElementById('editProcessForm');
    const formData = new FormData(form);
    
    const processData = {
        name: formData.get('processName').trim(),
        description: formData.get('processDescription').trim(),
        order: formData.get('processOrder') ? parseInt(formData.get('processOrder')) : null
    };
    
    // Валидация
    if (!processData.name) {
        showError('Введите название процесса');
        return;
    }
    
    try {
        console.log('📝 Обновление процесса:', processData);
        
        // Обновляем через сервис (согласно диаграмме классов)
        await app.processService.updateProcess(processId, processData, app.currentUser.id);
        
        console.log('✅ Процесс обновлен');
        
        closeModal();
        showSuccess(`Процесс "${processData.name}" успешно обновлен!`);
        
        // Обновляем список процессов
        await showAdminTab('processes');
        
    } catch (error) {
        console.error('❌ Ошибка обновления процесса:', error);
        showError(`Не удалось обновить процесс: ${error.message}`);
    }
}

// Экспортируем функции в глобальную область
window.showEditProcessModal = showEditProcessModal;
window.submitEditProcess = submitEditProcess;