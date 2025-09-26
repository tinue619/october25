/**
 * Динамическая форма создания заказов
 * Генерирует форму на основе настроек типа изделия
 * 
 * @class OrderFormUI
 */
class OrderFormUI {
    constructor(appContext) {
        this.app = appContext;
        this.formBuilder = new FormBuilder();
        this.currentProductType = null;
        this.isDraft = false;
        this.draftData = {};
        this.validationErrors = {};
        
        this.elements = {};
        this.init();
    }

    /**
     * Инициализация UI
     */
    init() {
        this.createElement();
        this.bindEvents();
        this.loadProductTypes();
    }

    /**
     * Создание HTML элементов
     */
    createElement() {
        const container = document.createElement('div');
        container.className = 'order-form-ui';
        container.innerHTML = `
            <div class="form-header">
                <h2>Создать новый заказ</h2>
            </div>

            <div class="form-container">
                <!-- Выбор типа изделия -->
                <div class="form-section">
                    <h3>1. Выберите тип изделия</h3>
                    <select id="productTypeSelect" class="form-control">
                        <option value="">Загрузка типов изделий...</option>
                    </select>
                </div>

                <!-- Основная информация о заказе -->
                <div class="form-section" id="basicInfoSection" style="display: none;">
                    <h3>2. Основная информация</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="customerName">Имя клиента *</label>
                            <input type="text" id="customerName" class="form-control" required>
                            <div class="field-error" id="customerName-error"></div>
                        </div>
                        <div class="form-group">
                            <label for="customerPhone">Телефон клиента *</label>
                            <input type="tel" id="customerPhone" class="form-control" placeholder="+7 (___) ___-__-__" required>
                            <div class="field-error" id="customerPhone-error"></div>
                        </div>
                    </div>
                </div>

                <!-- Настраиваемые поля -->
                <div class="form-section" id="customFieldsSection" style="display: none;">
                    <h3>3. Дополнительные данные</h3>
                    <div id="dynamicFields" class="dynamic-fields">
                        <!-- Поля будут сгенерированы динамически -->
                    </div>
                </div>

                <!-- Действия с формой -->
                <div class="form-actions" id="formActions" style="display: none;">
                    <div class="form-validation-summary" id="validationSummary"></div>
                    <div class="action-buttons">
                        <button id="cancelOrderBtn" class="btn btn-secondary">
                            ❌ Отмена
                        </button>
                        <button id="createOrderBtn" class="btn btn-primary">
                            🚀 Создать заказ
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.elements.container = container;
        this.elements.productTypeSelect = container.querySelector('#productTypeSelect');
        this.elements.basicInfoSection = container.querySelector('#basicInfoSection');
        this.elements.customFieldsSection = container.querySelector('#customFieldsSection');
        this.elements.dynamicFields = container.querySelector('#dynamicFields');
        this.elements.formActions = container.querySelector('#formActions');
        this.elements.validationSummary = container.querySelector('#validationSummary');

        return container;
    }

    /**
     * Привязка событий
     */
    bindEvents() {
        const container = this.elements.container;

        // Выбор типа изделия
        this.elements.productTypeSelect.addEventListener('change', (e) => {
            this.onProductTypeChange(e.target.value);
        });

        // Основные действия
        container.querySelector('#createOrderBtn').addEventListener('click', () => this.createOrder());
        container.querySelector('#cancelOrderBtn').addEventListener('click', () => this.cancelOrder());
    }

    /**
     * Загрузка типов изделий
     */
    async loadProductTypes() {
        try {
            const productTypes = await this.app.productTypeService.getAllProductTypes();
            console.log('📊 Получено типов изделий:', productTypes.length, productTypes);
            
            if (productTypes.length === 0) {
                this.elements.productTypeSelect.innerHTML = `
                    <option value="">Нет доступных типов изделий. Создайте их в админ-панели.</option>
                `;
                return;
            }
            
            this.elements.productTypeSelect.innerHTML = `
                <option value="">Выберите тип изделия...</option>
                ${productTypes.map(pt => {
                    console.log('📎 Обрабатываем тип:', pt.id, pt.name, typeof pt.id);
                    return `<option value="${pt.id}">${pt.name}</option>`;
                }).join('')}
            `;

        } catch (error) {
            console.error('Ошибка загрузки типов изделий:', error);
            this.elements.productTypeSelect.innerHTML = `
                <option value="">Ошибка загрузки типов изделий</option>
            `;
        }
    }

    /**
     * Обработчик изменения типа изделия
     */
    async onProductTypeChange(productTypeId) {
        console.log('🔄 onProductTypeChange called with:', productTypeId, typeof productTypeId);
        
        if (!productTypeId) {
            this.hideFormSections();
            return;
        }

        try {
            // Используем getAllProductTypes и находим нужный
            const productTypes = await this.app.productTypeService.getAllProductTypes();
            console.log('📊 Получено типов:', productTypes.length);
            console.log('📊 Ищем ID:', parseInt(productTypeId));
            console.log('📊 Список ID типов:', productTypes.map(pt => ({ id: pt.id, name: pt.name, type: typeof pt.id })));
            
            const productType = productTypes.find(pt => pt.id === parseInt(productTypeId));
            console.log('🎯 Найденный тип:', productType);
            
            if (!productType) {
                throw new Error(`Тип изделия с ID ${productTypeId} не найден`);
            }
            
            this.currentProductType = productType;
            
            this.generateCustomFields(productType.customFields || []);
            this.showFormSections();

        } catch (error) {
            console.error('Ошибка загрузки типа изделия:', error);
            alert('Ошибка загрузки типа изделия: ' + error.message);
        }
    }

    /**
     * Генерация настраиваемых полей
     */
    generateCustomFields(customFields) {
        if (customFields.length === 0) {
            this.elements.customFieldsSection.style.display = 'none';
            return;
        }

        try {
            const formHTML = this.formBuilder.generateFormHTML(customFields);
            this.elements.dynamicFields.innerHTML = formHTML;
            this.elements.customFieldsSection.style.display = 'block';

        } catch (error) {
            console.error('Ошибка генерации полей:', error);
            this.elements.dynamicFields.innerHTML = `
                <div class="error-message">
                    Ошибка генерации полей: ${error.message}
                </div>
            `;
            this.elements.customFieldsSection.style.display = 'block';
        }
    }

    /**
     * Показать секции формы
     */
    showFormSections() {
        this.elements.basicInfoSection.style.display = 'block';
        this.elements.formActions.style.display = 'block';
    }

    /**
     * Скрыть секции формы
     */
    hideFormSections() {
        this.elements.basicInfoSection.style.display = 'none';
        this.elements.customFieldsSection.style.display = 'none';
        this.elements.formActions.style.display = 'none';
    }

    /**
     * Сбор данных формы
     */
    collectFormData() {
        const formData = {
            productTypeId: parseInt(this.elements.productTypeSelect.value),
            customerName: this.elements.container.querySelector('#customerName')?.value || '',
            customerPhone: this.elements.container.querySelector('#customerPhone')?.value || '',
            customFieldValues: {}
        };

        // Собираем данные настраиваемых полей
        if (this.currentProductType?.customFields) {
            this.currentProductType.customFields.forEach(field => {
                const fieldElement = this.elements.dynamicFields.querySelector(`[name="${field.name}"]`);
                if (fieldElement) {
                    formData.customFieldValues[field.name] = this.getFieldValue(fieldElement, field.type);
                }
            });
        }

        return formData;
    }

    /**
     * Получить значение поля с учетом его типа
     */
    getFieldValue(fieldElement, fieldType) {
        if (!fieldElement) return null;
        
        switch (fieldType) {
            case 'checkbox':
                return fieldElement.checked;
            case 'select':
                if (fieldElement.multiple) {
                    return Array.from(fieldElement.selectedOptions).map(option => option.value);
                }
                return fieldElement.value;
            default:
                return fieldElement.value;
        }
    }

    /**
     * Создать заказ
     */
    async createOrder() {
        try {
            const formData = this.collectFormData();
            const currentUser = this.app.requireAuth();

            // Проверяем права на создание заказов
            if (!currentUser.canCreateOrders() && !currentUser.isAdmin()) {
                throw new Error('У вас нет прав на создание заказов');
            }

            // Базовая валидация
            if (!formData.customerName?.trim()) {
                alert('Укажите имя клиента');
                return;
            }
            
            if (!formData.customerPhone?.trim()) {
                alert('Укажите телефон клиента');
                return;
            }

            // Создаем заказ через сервис
            const newOrder = await this.app.orderService.createOrder(formData, currentUser.id);

            alert(`Заказ №${newOrder.number} успешно создан!`);
            this.resetForm();
            this.onOrderCreated(newOrder);

        } catch (error) {
            console.error('Ошибка создания заказа:', error);
            alert('Ошибка создания заказа: ' + error.message);
        }
    }

    /**
     * Отменить создание заказа
     */
    cancelOrder() {
        if (confirm('Вы уверены, что хотите отменить создание заказа?')) {
            this.resetForm();
            this.onOrderCancelled();
        }
    }

    /**
     * Сброс формы
     */
    resetForm() {
        this.elements.productTypeSelect.value = '';
        this.elements.container.querySelector('#customerName').value = '';
        this.elements.container.querySelector('#customerPhone').value = '';
        this.elements.dynamicFields.innerHTML = '';
        this.elements.validationSummary.innerHTML = '';
        
        this.currentProductType = null;
        this.validationErrors = {};
        this.hideFormSections();
    }

    /**
     * Показать UI
     */
    show() {
        const existingForm = document.querySelector('.order-form-ui');
        if (existingForm) {
            existingForm.remove();
        }

        const mainContent = document.querySelector('#main-content') || document.body;
        mainContent.appendChild(this.elements.container);
    }

    /**
     * Скрыть UI
     */
    hide() {
        if (this.elements.container.parentNode) {
            this.elements.container.parentNode.removeChild(this.elements.container);
        }
    }

    /**
     * Обработчик успешного создания заказа
     */
    onOrderCreated(order) {
        // Переопределяется в основном приложении
        console.log('Заказ создан:', order);
    }

    /**
     * Обработчик отмены создания заказа
     */
    onOrderCancelled() {
        // Переопределяется в основном приложении
        console.log('Создание заказа отменено');
    }

    /**
     * Уничтожить UI
     */
    destroy() {
        this.hide();
        this.elements = {};
        this.currentProductType = null;
        this.validationErrors = {};
    }
}
