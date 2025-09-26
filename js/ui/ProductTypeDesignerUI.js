/**
 * UI компонент для конструктора типов изделий
 * Позволяет создавать и настраивать типы изделий с настраиваемыми полями
 * 
 * @class ProductTypeDesignerUI
 */
class ProductTypeDesignerUI {
    constructor(appContext) {
        this.app = appContext;
        this.modal = null;
        this.currentProductType = null;
        this.customFields = [];
        this.processSequence = [];
        this.isDirty = false;
        
        // Обработчики событий
        this.onProductTypeSaved = null;
        this.onProductTypeCancelled = null;
        
        // Счетчики для уникальных ID
        this.fieldIdCounter = 1;
        this.stepIdCounter = 1;
    }
    
    /**
     * Показать конструктор типов изделий
     * @param {ProductType} productType - Существующий тип изделия для редактирования (опционально)
     */
    show(productType = null) {
        // Устанавливаем глобальную ссылку сразу
        window.productTypeDesigner = this;
        
        this.currentProductType = productType;
        this.loadData();
        this.createModal();
        this.renderContent();
        this.attachEventListeners();
        
        console.log('🎨 Конструктор типов изделий открыт');
    }
    
    /**
     * Скрыть конструктор
     */
    hide() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        this.resetState();
    }
    
    /**
     * Загрузить данные для редактирования
     */
    loadData() {
        if (this.currentProductType) {
            // Режим редактирования
            this.customFields = [...(this.currentProductType.customFields || [])];
            this.processSequence = [...(this.currentProductType.processSequence || [])];
        } else {
            // Режим создания
            this.customFields = [];
            this.processSequence = [];
        }
        
        this.isDirty = false;
    }
    
    /**
     * Создать модальное окно
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal-overlay product-type-designer';
        this.modal.innerHTML = `
            <div class="modal-content designer-modal">
                <div class="modal-header">
                    <h2>${this.currentProductType ? 'Редактировать' : 'Создать'} тип изделия</h2>
                    <button class="modal-close" id="designer-close">&times;</button>
                </div>
                
                <div class="designer-container">
                    <!-- Основная информация -->
                    <div class="designer-section">
                        <h3>📋 Основная информация</h3>
                        <div class="form-group">
                            <label for="productTypeName">Название типа изделия *</label>
                            <input type="text" id="productTypeName" class="form-control" 
                                   placeholder="Например: Мебель на заказ" required>
                        </div>
                        <div class="form-group">
                            <label for="productTypeDescription">Описание</label>
                            <textarea id="productTypeDescription" class="form-control" rows="3"
                                      placeholder="Краткое описание типа изделия..."></textarea>
                        </div>
                    </div>
                    
                    <!-- Настройка процессов -->
                    <div class="designer-section">
                        <div class="section-header">
                            <h3>⚙️ Последовательность процессов</h3>
                            <button type="button" class="btn btn-secondary btn-small" id="add-process-btn">
                                ➕ Добавить процесс
                            </button>
                        </div>
                        <div id="process-sequence" class="sequence-container">
                            <!-- Процессы будут добавлены здесь -->
                        </div>
                        <div class="help-text">
                            Перетаскивайте процессы для изменения порядка. Отметьте обязательные этапы.
                        </div>
                    </div>
                    
                    <!-- Настраиваемые поля -->
                    <div class="designer-section">
                        <div class="section-header">
                            <h3>📝 Настраиваемые поля</h3>
                            <div class="field-type-selector">
                                <select id="field-type-select" class="form-control">
                                    <option value="">Выберите тип поля...</option>
                                    <option value="text">📄 Текстовое поле</option>
                                    <option value="phone">📞 Номер телефона</option>
                                    <option value="email">📧 Email</option>
                                    <option value="number">🔢 Число</option>
                                    <option value="select">📋 Выпадающий список</option>
                                    <option value="checkbox">☑️ Чекбокс</option>
                                    <option value="date">📅 Дата</option>
                                    <option value="textarea">📄 Многострочный текст</option>
                                </select>
                                <button type="button" class="btn btn-primary btn-small" id="add-field-btn">
                                    ➕ Добавить поле
                                </button>
                            </div>
                        </div>
                        <div id="custom-fields" class="fields-container">
                            <!-- Поля будут добавлены здесь -->
                        </div>
                        <div class="help-text">
                            Перетаскивайте поля для изменения порядка отображения в форме заказа.
                        </div>
                    </div>
                    
                    <!-- Предпросмотр -->
                    <div class="designer-section">
                        <h3>👁️ Предпросмотр формы заказа</h3>
                        <div id="form-preview" class="form-preview">
                            <!-- Предпросмотр будет отображен здесь -->
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="designer-cancel">
                        Отмена
                    </button>
                    <button type="button" class="btn btn-primary" id="designer-save">
                        ${this.currentProductType ? 'Сохранить изменения' : 'Создать тип изделия'}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        
        // Заполняем данные при редактировании
        if (this.currentProductType) {
            document.getElementById('productTypeName').value = this.currentProductType.name || '';
            document.getElementById('productTypeDescription').value = this.currentProductType.description || '';
        }
    }
    
    /**
     * Отрендерить содержимое
     */
    renderContent() {
        this.renderProcessSequence();
        this.renderCustomFields();
        this.updatePreview();
    }
    
    /**
     * Отрендерить последовательность процессов
     */
    renderProcessSequence() {
        const container = document.getElementById('process-sequence');
        
        if (this.processSequence.length === 0) {
            container.innerHTML = `
                <div class="empty-sequence">
                    Процессы не добавлены. Нажмите "Добавить процесс" для настройки последовательности.
                </div>
            `;
            return;
        }
        
        // Устанавливаем глобальную ссылку для onclick обработчиков
        window.productTypeDesigner = this;
        
        container.innerHTML = this.processSequence.map((step, index) => `
            <div class="process-step-item" data-step-id="${step.id}" draggable="true">
                <div class="step-handle">⋮⋮</div>
                <div class="step-number">${index + 1}</div>
                <div class="step-content">
                    <div class="step-name">${step.processName || 'Процесс не выбран'}</div>
                    <div class="step-controls">
                        <label class="checkbox-label">
                            <input type="checkbox" ${step.isRequired ? 'checked' : ''} 
                                   data-step-id="${step.id}" class="process-required-checkbox">
                            Обязательный
                        </label>
                    </div>
                </div>
                <button class="step-remove" data-step-id="${step.id}" class="remove-process-btn"
                        title="Удалить процесс">×</button>
            </div>
        `).join('');
        
        // Привязываем обработчики событий напрямую
        this.attachProcessEventListeners();
        this.attachProcessDragAndDrop();
    }
    
    /**
     * Привязать обработчики событий для процессов
     */
    attachProcessEventListeners() {
        const container = document.getElementById('process-sequence');
        if (!container) return;
        
        // Обработчики для чекбоксов "Обязательный"
        container.querySelectorAll('.process-required-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const stepId = e.target.dataset.stepId;
                this.toggleProcessRequired(stepId);
            });
        });
        
        // Обработчики для кнопок удаления
        container.querySelectorAll('.step-remove').forEach(button => {
            button.addEventListener('click', (e) => {
                const stepId = e.target.dataset.stepId;
                this.removeProcessStep(stepId);
            });
        });
    }
    
    /**
     * Отрендерить настраиваемые поля
     */
    renderCustomFields() {
        const container = document.getElementById('custom-fields');
        
        if (this.customFields.length === 0) {
            container.innerHTML = `
                <div class="empty-fields">
                    Настраиваемые поля не добавлены. Выберите тип поля и нажмите "Добавить поле".
                </div>
            `;
            return;
        }
        
        // Устанавливаем глобальную ссылку
        window.productTypeDesigner = this;
        
        container.innerHTML = this.customFields.map((field, index) => `
            <div class="custom-field-item" data-field-id="${field.id}" draggable="true">
                <div class="field-handle">⋮⋮</div>
                <div class="field-icon">${this.getFieldIcon(field.fieldType)}</div>
                <div class="field-content">
                    <div class="field-name">${field.name || 'Без названия'}</div>
                    <div class="field-meta">
                        ${field.fieldType} • ${field.isRequired ? 'Обязательное' : 'Опциональное'}
                    </div>
                </div>
                <div class="field-actions">
                    <button data-field-id="${field.id}" class="btn btn-secondary btn-tiny edit-field-btn" 
                            title="Редактировать">✏️</button>
                    <button data-field-id="${field.id}" class="btn btn-danger btn-tiny remove-field-btn" 
                            title="Удалить">🗑️</button>
                </div>
            </div>
        `).join('');
        
        // Привязываем обработчики напрямую
        this.attachFieldEventListeners();
        this.attachFieldDragAndDrop();
    }
    
    /**
     * Привязать обработчики событий для полей
     */
    attachFieldEventListeners() {
        const container = document.getElementById('custom-fields');
        if (!container) return;
        
        // Обработчики для кнопок редактирования
        container.querySelectorAll('.edit-field-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const fieldId = e.target.dataset.fieldId;
                this.editField(fieldId);
            });
        });
        
        // Обработчики для кнопок удаления
        container.querySelectorAll('.remove-field-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const fieldId = e.target.dataset.fieldId;
                this.removeField(fieldId);
            });
        });
    }
    
    /**
     * Получить иконку для типа поля
     */
    getFieldIcon(fieldType) {
        const icons = {
            text: '📄',
            phone: '📞', 
            email: '📧',
            number: '🔢',
            select: '📋',
            checkbox: '☑️',
            date: '📅',
            textarea: '📄'
        };
        return icons[fieldType] || '❓';
    }
    
    /**
     * Обновить предпросмотр формы
     */
    updatePreview() {
        const container = document.getElementById('form-preview');
        
        if (this.customFields.length === 0) {
            container.innerHTML = `
                <div class="preview-empty">
                    Добавьте настраиваемые поля для предпросмотра формы заказа
                </div>
            `;
            return;
        }
        
        const previewHTML = `
            <div class="preview-form">
                <h4>Форма создания заказа</h4>
                
                <!-- Стандартные поля -->
                <div class="form-group">
                    <label>Имя клиента *</label>
                    <input type="text" class="form-control" placeholder="Введите имя клиента" disabled>
                </div>
                
                <div class="form-group">
                    <label>Телефон клиента</label>
                    <input type="tel" class="form-control" placeholder="+7 999 123 45 67" disabled>
                </div>
                
                <!-- Настраиваемые поля -->
                ${this.customFields.map(field => this.renderPreviewField(field)).join('')}
                
                <div class="preview-note">
                    ℹ️ Это предпросмотр. Поля неактивны.
                </div>
            </div>
        `;
        
        container.innerHTML = previewHTML;
    }
    
    /**
     * Отрендерить поле в предпросмотре
     */
    renderPreviewField(field) {
        const required = field.isRequired ? ' *' : '';
        const disabled = ' disabled';
        
        switch (field.fieldType) {
            case 'text':
                return `
                    <div class="form-group">
                        <label>${field.name}${required}</label>
                        <input type="text" class="form-control" placeholder="${field.placeholder || ''}"${disabled}>
                    </div>
                `;
                
            case 'phone':
                return `
                    <div class="form-group">
                        <label>${field.name}${required}</label>
                        <input type="tel" class="form-control" placeholder="+7 999 123 45 67"${disabled}>
                    </div>
                `;
                
            case 'email':
                return `
                    <div class="form-group">
                        <label>${field.name}${required}</label>
                        <input type="email" class="form-control" placeholder="example@email.com"${disabled}>
                    </div>
                `;
                
            case 'number':
                return `
                    <div class="form-group">
                        <label>${field.name}${required}</label>
                        <input type="number" class="form-control" placeholder="0"${disabled}>
                    </div>
                `;
                
            case 'select':
                const options = field.options || ['Опция 1', 'Опция 2'];
                return `
                    <div class="form-group">
                        <label>${field.name}${required}</label>
                        <select class="form-control"${disabled}>
                            <option value="">Выберите...</option>
                            ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                        </select>
                    </div>
                `;
                
            case 'checkbox':
                return `
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox"${disabled}>
                            ${field.name}${required}
                        </label>
                    </div>
                `;
                
            case 'date':
                return `
                    <div class="form-group">
                        <label>${field.name}${required}</label>
                        <input type="date" class="form-control"${disabled}>
                    </div>
                `;
                
            case 'textarea':
                return `
                    <div class="form-group">
                        <label>${field.name}${required}</label>
                        <textarea class="form-control" rows="3" placeholder="${field.placeholder || ''}"${disabled}></textarea>
                    </div>
                `;
                
            default:
                return `
                    <div class="form-group">
                        <label>${field.name}${required}</label>
                        <input type="text" class="form-control"${disabled}>
                    </div>
                `;
        }
    }
    
    /**
     * Привязать обработчики событий
     */
    attachEventListeners() {
        // Закрытие модального окна
        document.getElementById('designer-close').onclick = () => this.handleCancel();
        document.getElementById('designer-cancel').onclick = () => this.handleCancel();
        
        // Сохранение
        document.getElementById('designer-save').onclick = () => this.handleSave();
        
        // Добавление процесса
        document.getElementById('add-process-btn').onclick = () => this.showAddProcessDialog();
        
        // Добавление поля
        document.getElementById('add-field-btn').onclick = () => this.addCustomField();
        
        // Отслеживание изменений
        document.getElementById('productTypeName').oninput = () => this.markDirty();
        document.getElementById('productTypeDescription').oninput = () => this.markDirty();
        
        // Закрытие по клику на фон
        this.modal.onclick = (e) => {
            if (e.target === this.modal) {
                this.handleCancel();
            }
        };
        
        // Закрытие по Escape
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    /**
     * Обработчик нажатия клавиш
     */
    handleKeyDown(e) {
        if (e.key === 'Escape' && this.modal) {
            this.handleCancel();
        }
    }
    
    /**
     * Показать диалог добавления процесса
     */
    async showAddProcessDialog() {
        try {
            const processes = await this.app.processService.getAllProcesses();
            
            if (processes.length === 0) {
                alert('Сначала создайте процессы в административной панели');
                return;
            }
            
            // Фильтруем уже добавленные процессы
            const addedProcessIds = this.processSequence.map(step => step.processId);
            const availableProcesses = processes.filter(p => !addedProcessIds.includes(p.id));
            
            if (availableProcesses.length === 0) {
                alert('Все доступные процессы уже добавлены');
                return;
            }
            
            // Создаем красивый диалог с кнопками вместо prompt
            this.showProcessSelectionDialog(availableProcesses);
            
        } catch (error) {
            console.error('Ошибка загрузки процессов:', error);
            alert('Не удалось загрузить список процессов');
        }
    }
    
    /**
     * Показать диалог выбора процессов с красивым UI
     */
    showProcessSelectionDialog(processes) {
        const dialog = document.createElement('div');
        dialog.className = 'modal-overlay process-selection-dialog';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Выберите процесс для добавления</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="process-list">
                        ${processes.map(process => `
                            <div class="process-item" data-process-id="${process.id}">
                                <div class="process-info">
                                    <div class="process-name">${process.name}</div>
                                    <div class="process-description">${process.description || 'Нет описания'}</div>
                                </div>
                                <button class="btn btn-primary btn-small select-process-btn" 
                                        data-process-id="${process.id}">
                                    Добавить
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Отмена
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Обработчики
        dialog.querySelector('.modal-close').onclick = () => dialog.remove();
        
        // Обработчики для кнопок "Добавить"
        dialog.querySelectorAll('.select-process-btn').forEach(btn => {
            btn.onclick = () => {
                const processId = parseInt(btn.dataset.processId);
                const selectedProcess = processes.find(p => p.id === processId);
                if (selectedProcess) {
                    this.addProcessStep(selectedProcess);
                    dialog.remove();
                }
            };
        });
    }
    
    /**
     * Добавить шаг процесса
     */
    addProcessStep(process) {
        const step = {
            id: `step_${this.stepIdCounter++}`,
            processId: process.id,
            processName: process.name,
            order: this.processSequence.length,
            isRequired: true
        };
        
        this.processSequence.push(step);
        this.markDirty();
        this.renderProcessSequence();
        this.updatePreview();
    }
    
    /**
     * Переключить обязательность процесса
     */
    toggleProcessRequired(stepId) {
        const step = this.processSequence.find(s => s.id === stepId);
        if (step) {
            step.isRequired = !step.isRequired;
            this.markDirty();
        }
    }
    
    /**
     * Удалить шаг процесса
     */
    removeProcessStep(stepId) {
        if (confirm('Удалить этот процесс из последовательности?')) {
            this.processSequence = this.processSequence.filter(s => s.id !== stepId);
            this.markDirty();
            this.renderProcessSequence();
            this.updatePreview();
        }
    }
    
    /**
     * Добавить настраиваемое поле
     */
    addCustomField() {
        const fieldType = document.getElementById('field-type-select').value;
        
        if (!fieldType) {
            alert('Выберите тип поля');
            return;
        }
        
        const field = {
            id: `field_${this.fieldIdCounter++}`,
            name: `Новое поле ${this.fieldIdCounter - 1}`,
            fieldType: fieldType,
            isRequired: false,
            order: this.customFields.length,
            placeholder: '',
            options: fieldType === 'select' ? ['Опция 1', 'Опция 2'] : null
        };
        
        this.customFields.push(field);
        this.markDirty();
        this.renderCustomFields();
        this.updatePreview();
        
        // Сбрасываем выбор
        document.getElementById('field-type-select').value = '';
        
        // Сразу открываем редактирование
        setTimeout(() => this.editField(field.id), 100);
    }
    
    /**
     * Редактировать поле
     */
    editField(fieldId) {
        const field = this.customFields.find(f => f.id === fieldId);
        if (!field) return;
        
        this.showFieldEditDialog(field);
    }
    
    /**
     * Показать диалог редактирования поля
     */
    showFieldEditDialog(field) {
        const dialog = document.createElement('div');
        dialog.className = 'modal-overlay field-edit-dialog';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Редактировать поле</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="form-group">
                        <label>Название поля *</label>
                        <input type="text" id="edit-field-name" class="form-control" 
                               value="${field.name}" placeholder="Название поля">
                    </div>
                    
                    <div class="form-group">
                        <label>Placeholder (подсказка)</label>
                        <input type="text" id="edit-field-placeholder" class="form-control" 
                               value="${field.placeholder || ''}" placeholder="Подсказка для пользователя">
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="edit-field-required" ${field.isRequired ? 'checked' : ''}>
                            Обязательное поле
                        </label>
                    </div>
                    
                    ${field.fieldType === 'select' ? `
                        <div class="form-group">
                            <label>Варианты выбора (по одному на строку)</label>
                            <textarea id="edit-field-options" class="form-control" rows="4">${(field.options || []).join('\n')}</textarea>
                        </div>
                    ` : ''}
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Отмена
                    </button>
                    <button type="button" class="btn btn-primary" id="save-field-btn">
                        Сохранить
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Обработчики
        dialog.querySelector('.modal-close').onclick = () => dialog.remove();
        dialog.querySelector('#save-field-btn').onclick = () => {
            this.saveFieldChanges(field, dialog);
        };
        
        // Фокус на название
        document.getElementById('edit-field-name').focus();
    }
    
    /**
     * Сохранить изменения поля
     */
    saveFieldChanges(field, dialog) {
        const name = document.getElementById('edit-field-name').value.trim();
        
        if (!name) {
            alert('Введите название поля');
            return;
        }
        
        field.name = name;
        field.placeholder = document.getElementById('edit-field-placeholder').value.trim();
        field.isRequired = document.getElementById('edit-field-required').checked;
        
        if (field.fieldType === 'select') {
            const optionsText = document.getElementById('edit-field-options').value.trim();
            field.options = optionsText ? optionsText.split('\n').map(opt => opt.trim()).filter(opt => opt) : [];
        }
        
        this.markDirty();
        this.renderCustomFields();
        this.updatePreview();
        
        dialog.remove();
    }
    
    /**
     * Удалить поле
     */
    removeField(fieldId) {
        if (confirm('Удалить это поле?')) {
            this.customFields = this.customFields.filter(f => f.id !== fieldId);
            this.markDirty();
            this.renderCustomFields();
            this.updatePreview();
        }
    }
    
    /**
     * ⚡ ИСПРАВЛЕННЫЙ: Привязать drag and drop для процессов
     */
    attachProcessDragAndDrop() {
        const container = document.getElementById('process-sequence');
        if (!container) {
            console.warn('⚠️ Контейнер process-sequence не найден');
            return;
        }
        
        // ⚡ ИСПРАВЛЕНИЕ: Убираем все старые обработчики
        const oldItems = container.querySelectorAll('.process-step-item');
        oldItems.forEach(item => {
            // Клонируем элемент чтобы удалить все обработчики
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
        });
        
        // Получаем обновленные элементы
        const items = container.querySelectorAll('.process-step-item');
        console.log(`📦 Инициализация drag&drop для процессов: ${items.length} элементов`);
        
        if (items.length === 0) {
            console.log('📦 Нет процессов для drag&drop');
            return;
        }
        
        // ⚡ ИСПРАВЛЕНИЕ: Используем bind() для правильной привязки контекста
        items.forEach((item, index) => {
            item.setAttribute('draggable', 'true');
            console.log(`   ${index + 1}. Процесс: ${item.dataset.stepId}`);
            
            let draggedElement = null;
            
            const handleDragStart = (e) => {
                console.log('🚀 Начало перетаскивания процесса:', item.dataset.stepId);
                draggedElement = item;
                item.style.opacity = '0.5';
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.dataset.stepId);
            };
            
            const handleDragEnd = (e) => {
                console.log('🏁 Конец перетаскивания процесса:', item.dataset.stepId);
                item.style.opacity = '1';
                item.classList.remove('dragging');
                draggedElement = null;
                
                // Убираем все индикаторы
                items.forEach(i => {
                    i.classList.remove('drag-over-top', 'drag-over-bottom');
                });
            };
            
            const handleDragOver = (e) => {
                e.preventDefault();
                
                if (draggedElement && draggedElement !== item) {
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    
                    // Убираем предыдущие классы
                    items.forEach(i => {
                        i.classList.remove('drag-over-top', 'drag-over-bottom');
                    });
                    
                    if (e.clientY < midY) {
                        item.classList.add('drag-over-top');
                    } else {
                        item.classList.add('drag-over-bottom');
                    }
                }
            };
            
            const handleDrop = (e) => {
                e.preventDefault();
                console.log('🎣 Сброс процесса на:', item.dataset.stepId);
                
                if (draggedElement && draggedElement !== item) {
                    const draggedId = draggedElement.dataset.stepId;
                    const targetId = item.dataset.stepId;
                    
                    console.log(`🔄 Перемещение: ${draggedId} -> ${targetId}`);
                    
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    const insertBefore = e.clientY < midY;
                    
                    // ⚡ ИСПРАВЛЕНИЕ: Прямой вызов метода с правильным контекстом
                    this.reorderProcessSteps(draggedId, targetId, insertBefore);
                }
                
                // Убираем индикаторы
                items.forEach(i => {
                    i.classList.remove('drag-over-top', 'drag-over-bottom');
                });
            };
            
            // Привязываем обработчики
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
        });
        
        // ⚡ ИСПРАВЛЕНИЕ: Перепривязываем обработчики кнопок после клонирования
        this.attachProcessEventListeners();
        
        console.log('✅ Drag & Drop для процессов активирован');
    }
    
    /**
     * Переупорядочить процессы
     */
    reorderProcessSteps(draggedId, targetId, insertBefore) {
        const draggedIndex = this.processSequence.findIndex(s => s.id === draggedId);
        const targetIndex = this.processSequence.findIndex(s => s.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // Перемещаем элемент
        const [draggedStep] = this.processSequence.splice(draggedIndex, 1);
        
        let newIndex;
        if (insertBefore) {
            newIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        } else {
            newIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
        }
        
        this.processSequence.splice(newIndex, 0, draggedStep);
        
        // Обновляем порядок
        this.processSequence.forEach((step, index) => {
            step.order = index;
        });
        
        this.markDirty();
        this.renderProcessSequence();
        
        console.log('🔄 Порядок процессов обновлён');
    }
    
    /**
     * ⚡ ИСПРАВЛЕННЫЙ: Привязать drag and drop для полей
     */
    attachFieldDragAndDrop() {
        const container = document.getElementById('custom-fields');
        if (!container) {
            console.warn('⚠️ Контейнер custom-fields не найден');
            return;
        }
        
        // ⚡ ИСПРАВЛЕНИЕ: Убираем все старые обработчики
        const oldItems = container.querySelectorAll('.custom-field-item');
        oldItems.forEach(item => {
            // Клонируем элемент чтобы удалить все обработчики
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
        });
        
        // Получаем обновленные элементы
        const items = container.querySelectorAll('.custom-field-item');
        console.log(`🎨 Инициализация drag&drop для полей: ${items.length} элементов`);
        
        if (items.length === 0) {
            console.log('🎨 Нет полей для drag&drop');
            return;
        }
        
        // ⚡ ИСПРАВЛЕНИЕ: Используем bind() для правильной привязки контекста
        items.forEach((item, index) => {
            item.setAttribute('draggable', 'true');
            console.log(`   ${index + 1}. Поле: ${item.dataset.fieldId}`);
            
            let draggedElement = null;
            
            const handleDragStart = (e) => {
                console.log('🚀 Начало перетаскивания поля:', item.dataset.fieldId);
                draggedElement = item;
                item.style.opacity = '0.5';
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.dataset.fieldId);
            };
            
            const handleDragEnd = (e) => {
                console.log('🏁 Конец перетаскивания поля:', item.dataset.fieldId);
                item.style.opacity = '1';
                item.classList.remove('dragging');
                draggedElement = null;
                
                // Убираем все индикаторы
                items.forEach(i => {
                    i.classList.remove('drag-over-top', 'drag-over-bottom');
                });
            };
            
            const handleDragOver = (e) => {
                e.preventDefault();
                
                if (draggedElement && draggedElement !== item) {
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    
                    // Убираем предыдущие классы
                    items.forEach(i => {
                        i.classList.remove('drag-over-top', 'drag-over-bottom');
                    });
                    
                    if (e.clientY < midY) {
                        item.classList.add('drag-over-top');
                    } else {
                        item.classList.add('drag-over-bottom');
                    }
                }
            };
            
            const handleDrop = (e) => {
                e.preventDefault();
                console.log('🎣 Сброс поля на:', item.dataset.fieldId);
                
                if (draggedElement && draggedElement !== item) {
                    const draggedId = draggedElement.dataset.fieldId;
                    const targetId = item.dataset.fieldId;
                    
                    console.log(`🔄 Перемещение поля: ${draggedId} -> ${targetId}`);
                    
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    const insertBefore = e.clientY < midY;
                    
                    // ⚡ ИСПРАВЛЕНИЕ: Прямой вызов метода с правильным контекстом
                    this.reorderCustomFields(draggedId, targetId, insertBefore);
                }
                
                // Убираем индикаторы
                items.forEach(i => {
                    i.classList.remove('drag-over-top', 'drag-over-bottom');
                });
            };
            
            // Привязываем обработчики
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
        });
        
        // ⚡ ИСПРАВЛЕНИЕ: Перепривязываем обработчики кнопок после клонирования
        this.attachFieldEventListeners();
        
        console.log('✅ Drag & Drop для полей активирован');
    }
    
    /**
     * Переупорядочить настраиваемые поля
     */
    reorderCustomFields(draggedId, targetId, insertBefore) {
        const draggedIndex = this.customFields.findIndex(f => f.id === draggedId);
        const targetIndex = this.customFields.findIndex(f => f.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // Перемещаем элемент
        const [draggedField] = this.customFields.splice(draggedIndex, 1);
        
        let newIndex;
        if (insertBefore) {
            newIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        } else {
            newIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
        }
        
        this.customFields.splice(newIndex, 0, draggedField);
        
        // Обновляем порядок
        this.customFields.forEach((field, index) => {
            field.order = index;
        });
        
        this.markDirty();
        this.renderCustomFields();
        this.updatePreview();
        
        console.log('🎨 Порядок полей обновлён');
    }
    
    /**
     * Отметить как измененное
     */
    markDirty() {
        this.isDirty = true;
    }
    
    /**
     * Обработать отмену
     */
    handleCancel() {
        if (this.isDirty) {
            if (!confirm('Есть несохраненные изменения. Вы уверены, что хотите закрыть?')) {
                return;
            }
        }
        
        this.hide();
        
        if (this.onProductTypeCancelled) {
            this.onProductTypeCancelled();
        }
    }
    
    /**
     * Обработать сохранение
     */
    async handleSave() {
        try {
            const name = document.getElementById('productTypeName').value.trim();
            const description = document.getElementById('productTypeDescription').value.trim();
            
            if (!name) {
                alert('Введите название типа изделия');
                document.getElementById('productTypeName').focus();
                return;
            }
            
            const productTypeData = {
                name: name,
                description: description,
                processSequence: this.processSequence,
                customFields: this.customFields
            };
            
            console.log('💾 Сохранение типа изделия:', productTypeData);
            
            let savedProductType;
            
            if (this.currentProductType) {
                // Редактирование
                savedProductType = await this.app.productTypeService.updateProductType(
                    this.currentProductType.id, 
                    productTypeData, 
                    this.app.currentUser.id
                );
            } else {
                // Создание
                savedProductType = await this.app.productTypeService.createProductType(
                    productTypeData, 
                    this.app.currentUser.id
                );
            }
            
            console.log('✅ Тип изделия сохранен:', savedProductType);
            
            this.hide();
            
            if (this.onProductTypeSaved) {
                this.onProductTypeSaved(savedProductType);
            }
            
            // Показываем сообщение об успехе
            this.showSuccess(`Тип изделия "${savedProductType.name}" успешно ${this.currentProductType ? 'обновлен' : 'создан'}!`);
            
        } catch (error) {
            console.error('❌ Ошибка сохранения типа изделия:', error);
            alert(`Ошибка сохранения: ${error.message}`);
        }
    }
    
    /**
     * Показать сообщение об успехе
     */
    showSuccess(message) {
        // Используем глобальную функцию если есть, иначе alert
        if (window.showSuccess) {
            window.showSuccess(message);
        } else {
            alert(message);
        }
    }
    
    /**
     * Сбросить состояние
     */
    resetState() {
        this.currentProductType = null;
        this.customFields = [];
        this.processSequence = [];
        this.isDirty = false;
        this.fieldIdCounter = 1;
        this.stepIdCounter = 1;
        
        // Удаляем обработчик клавиш
        document.removeEventListener('keydown', this.handleKeyDown);
    }
}

// Глобальная доступность
window.ProductTypeDesignerUI = ProductTypeDesignerUI;

// Глобальная переменная для доступа из onclick обработчиков
window.productTypeDesigner = null;