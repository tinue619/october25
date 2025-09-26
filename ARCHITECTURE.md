# OMS - Архитектура системы (ООП подход)

## 🎯 Цель архитектуры

Создать чистую, объектно-ориентированную систему управления заказами с полностью настраиваемыми типами изделий, гибкими процессами и пользовательскими полями для максимальной адаптации под любые бизнес-потребности.

## 🏗️ Принципы архитектуры

### SOLID принципы:
- **S** - Single Responsibility: каждый класс отвечает за одну задачу
- **O** - Open/Closed: открыт для расширения, закрыт для изменений  
- **L** - Liskov Substitution: подтипы должны заменять базовые типы
- **I** - Interface Segregation: интерфейсы должны быть специфичными
- **D** - Dependency Inversion: зависимости от абстракций, не от конкретики

### Архитектурные паттерны:
- **Repository Pattern** - абстракция доступа к данным
- **Service Layer** - бизнес-логика  
- **Factory Pattern** - создание объектов
- **Builder Pattern** - построение сложных форм
- **Strategy Pattern** - валидация различных типов полей
- **Observer Pattern** - уведомления об изменениях

## 🎨 Ключевые нововведения

### 🔧 Настраиваемые типы изделий:
- **Гибкие процессы:** обязательные и опциональные этапы
- **Пользовательские поля:** 8 типов полей с валидацией
- **Динамические формы:** автоматическая генерация UI
- **Контекстная валидация:** проверка данных по правилам

### 📋 Типы настраиваемых полей:
1. **TEXT** - текстовое поле
2. **PHONE** - номер телефона с валидацией
3. **EMAIL** - email с валидацией
4. **NUMBER** - числовое поле
5. **SELECT** - выпадающий список с опциями
6. **CHECKBOX** - чекбокс (да/нет)
7. **DATE** - дата с календарем
8. **TEXTAREA** - многострочный текст

## ✅ Преимущества новой архитектуры

1. **Максимальная гибкость** - типы изделий полностью настраиваемые
2. **Динамические формы** - автоматическая генерация UI под каждый тип изделия
3. **Валидация данных** - типизированная проверка всех полей
4. **Масштабируемость** - легко добавлять новые типы полей
5. **Переиспользование** - один тип изделия = множество заказов
6. **Бизнес-адаптация** - система подстраивается под процессы компании
7. **Контроль качества** - обязательные поля гарантируют полноту данных

## 📁 Структура файлов (обновленная)

```
js/
├── domain/
│   ├── entities/
│   │   ├── Entity.js
│   │   ├── User.js
│   │   ├── Process.js
│   │   ├── ProductType.js          # Расширенный с CustomField
│   │   ├── Order.js                # Расширенный с FieldValue
│   │   └── CustomField.js          # НОВЫЙ - настраиваемые поля
│   └── value-objects/
│       ├── UserPermissions.js
│       ├── ProcessFlow.js          # Расширенный для опциональных этапов
│       ├── ProcessStep.js          # НОВЫЙ - шаг процесса
│       ├── FieldValue.js           # НОВЫЙ - значение поля
│       └── ValidationResult.js     # НОВЫЙ - результат валидации
├── infrastructure/
│   ├── repositories/
│   │   ├── Repository.js
│   │   └── LocalStorageRepository.js
│   └── factories/
│       ├── EntityFactory.js
│       └── RepositoryFactory.js
├── application/
│   ├── services/
│   │   ├── UserService.js
│   │   ├── OrderService.js         # Расширенный для custom fields
│   │   ├── ProcessService.js
│   │   ├── ProductTypeService.js   # Расширенный для настройки
│   │   └── AdminService.js         # Расширенный для design functions
│   ├── builders/
│   │   └── FormBuilder.js          # НОВЫЙ - построитель форм
│   └── ApplicationContext.js       # Обновленный с FormBuilder
├── constants/
│   ├── UserRole.js
│   ├── OrderStatus.js
│   └── FieldTypes.js               # НОВЫЙ - типы полей
├── ui/
│   ├── AuthUI.js
│   ├── AdminUI.js                  # Расширенный для настройки типов
│   ├── BoardUI.js
│   ├── OrderFormUI.js              # НОВЫЙ - динамические формы
│   └── ProductTypeDesignerUI.js    # НОВЫЙ - конструктор типов
└── main.js
```

## 🚀 Примеры использования

### 1. Создание настраиваемого типа изделия
```javascript
// Администратор создает тип изделия "Мебель на заказ"
const productType = await adminService.designProductType({
    name: 'Мебель на заказ',
    description: 'Изготовление мебели по индивидуальным размерам'
}, adminId);

// Добавляем процессы (обязательные и опциональные)
await productTypeService.addProcessToSequence(productType.id, 1, 1, true);  // Прием - обязательный
await productTypeService.addProcessToSequence(productType.id, 2, 2, true);  // Замер - обязательный
await productTypeService.addProcessToSequence(productType.id, 3, 3, true);  // Изготовление - обязательный
await productTypeService.addProcessToSequence(productType.id, 4, 4, false); // Доставка - опциональный
await productTypeService.addProcessToSequence(productType.id, 5, 5, false); // Сборка - опциональный

// Добавляем настраиваемые поля
await adminService.configureProductTypeFields(productType.id, [
    {
        name: 'Материал',
        fieldType: 'select',
        isRequired: true,
        fieldConfig: {
            options: ['Дуб', 'Сосна', 'Береза', 'МДФ']
        },
        order: 1
    },
    {
        name: 'Размеры (ДxШxВ)',
        fieldType: 'text',
        isRequired: true,
        fieldConfig: {
            placeholder: 'Например: 200x80x75',
            maxLength: 50
        },
        order: 2
    },
    {
        name: 'Адрес доставки',
        fieldType: 'textarea',
        isRequired: false,
        fieldConfig: {
            rows: 3,
            placeholder: 'Укажите полный адрес доставки'
        },
        order: 3
    },
    {
        name: 'Нужна сборка',
        fieldType: 'checkbox',
        isRequired: false,
        fieldConfig: {
            defaultValue: false
        },
        order: 4
    }
], adminId);
```

### 2. Создание заказа с настраиваемыми полями
```javascript
// Получаем тип изделия с полями
const productTypeWithFields = await productTypeService.getProductTypeWithFields(productTypeId);

// Генерируем форму
const formBuilder = new FormBuilder();
const formHTML = formBuilder.generateFormHTML(productTypeWithFields.customFields);

// После заполнения формы пользователем
const orderData = {
    productTypeId: productTypeId,
    customerName: 'Иван Петров',
    customerPhone: '+7 999 123 45 67',
    customFields: {
        [materialFieldId]: 'Дуб',
        [sizeFieldId]: '200x80x75',
        [addressFieldId]: 'г. Москва, ул. Ленина, д. 10, кв. 5',
        [assemblyFieldId]: true
    }
};

// Валидация данных
const validation = await orderService.validateOrderData(orderData, productTypeId);
if (!validation.isValid) {
    throw new Error(`Ошибки валидации: ${validation.errors.join(', ')}`);
}

// Создание заказа
const order = await orderService.createOrder(orderData, managerId);
```

### 3. Работа с опциональными процессами
```javascript
// Сотрудник может пропустить опциональный этап "Доставка"
await orderService.skipOptionalProcess(
    orderId, 
    deliveryProcessId, 
    'Клиент самовывоз', 
    employeeId
);

// Система автоматически переходит к следующему этапу
// или завершает заказ, если это был последний этап
```

### 4. Добавление нового типа поля
```javascript
// Расширение системы - добавление поля "Файл"
class FileField extends CustomField {
    constructor(data = {}) {
        super({ ...data, fieldType: 'file' });
    }
    
    validateValue(value) {
        if (this.isRequired && !value) {
            return { isValid: false, error: `Поле "${this.name}" обязательно для заполнения` };
        }
        
        if (value && this.fieldConfig.allowedTypes) {
            const fileType = value.type;
            if (!this.fieldConfig.allowedTypes.includes(fileType)) {
                return { isValid: false, error: 'Недопустимый тип файла' };
            }
        }
        
        return { isValid: true };
    }
}

// Регистрация в FormBuilder
formBuilder.registerFieldRenderer('file', (field) => {
    const options = field.getFieldOptions();
    return `
        <div class="form-group">
            <label for="field_${field.id}">${field.name} ${field.isRequired ? '*' : ''}</label>
            <input type="file" 
                   id="field_${field.id}" 
                   name="${field.id}"
                   accept="${options.allowedTypes?.join(',') || ''}"
                   class="form-control">
        </div>
    `;
});
```

## 🔍 Сценарии использования

### Сценарий 1: Производство мебели
```javascript
// Типы изделий: Столы, Шкафы, Кухни
// Этапы: Прием → Замер → Проектирование → Изготовление → [Доставка] → [Сборка]
// Поля: Материал*, Размеры*, Цвет*, Адрес доставки, Нужна сборка
```

### Сценарий 2: Печатные услуги
```javascript
// Типы изделий: Визитки, Флаеры, Баннеры
// Этапы: Прием → Дизайн → [Согласование] → Печать → [Доставка]
// Поля: Тираж*, Размер*, Материал*, Срочность, Макет
```

### Сценарий 3: Ремонтные работы
```javascript
// Типы изделий: Косметический ремонт, Капитальный ремонт
// Этапы: Прием → Осмотр → Смета → [Согласование] → Работы → Приемка
// Поля: Адрес*, Площадь*, Тип помещения*, Бюджет, Пожелания
```

## 📊 Миграция данных

### Скрипт миграции для добавления настраиваемых полей
```javascript
class DataMigration {
    static async migrateToCustomFields() {
        console.log('🔄 Начинаем миграцию к настраиваемым полям...');
        
        // 1. Обновляем структуру ProductType
        const productTypes = await productTypeRepository.findAll();
        
        for (const productType of productTypes) {
            // Создаем стандартные поля из старой структуры
            if (!productType.customFields || productType.customFields.length === 0) {
                const standardFields = [
                    {
                        name: 'Примечания',
                        fieldType: 'textarea',
                        isRequired: false,
                        order: 0
                    }
                ];
                
                standardFields.forEach(fieldData => {
                    productType.addCustomField(fieldData);
                });
                
                await productTypeRepository.save(productType);
            }
        }
        
        // 2. Обновляем заказы
        const orders = await orderRepository.findAll();
        
        for (const order of orders) {
            if (!order.customFieldValues) {
                order._customFieldValues = new Map();
                await orderRepository.save(order);
            }
        }
        
        console.log('✅ Миграция завершена');
    }
}
```

## 🧪 Тестирование

### Тесты для CustomField
```javascript
describe('CustomField', () => {
    test('должен валидировать обязательные поля', () => {
        const field = new CustomField({
            name: 'Телефон',
            fieldType: 'phone',
            isRequired: true
        });
        
        const result = field.validateValue('');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('обязательно');
    });
    
    test('должен валидировать номер телефона', () => {
        const field = new CustomField({
            name: 'Телефон',
            fieldType: 'phone'
        });
        
        expect(field.validateValue('+7 999 123 45 67').isValid).toBe(true);
        expect(field.validateValue('invalid').isValid).toBe(false);
    });
});
```

### Тесты для ProductType
```javascript
describe('ProductType', () => {
    test('должен добавлять настраиваемые поля', () => {
        const productType = new ProductType({ name: 'Тест' });
        
        const field = productType.addCustomField({
            name: 'Тестовое поле',
            fieldType: 'text',
            isRequired: true
        });
        
        expect(productType.customFields).toHaveLength(1);
        expect(field.name).toBe('Тестовое поле');
    });
    
    test('должен валидировать данные заказа', () => {
        const productType = new ProductType({ name: 'Тест' });
        productType.addCustomField({
            name: 'Обязательное поле',
            fieldType: 'text',
            isRequired: true
        });
        
        const result = productType.validateOrderData({
            customFields: {}
        });
        
        expect(result.isValid).toBe(false);
    });
});
```

## 📋 План реализации (обновленный)

### Фаза 1: Базовые сущности ✅
- [x] Entity, User, Process, Order
- [x] Repository pattern
- [x] Базовые сервисы

### Фаза 2: Настраиваемые поля 🚧
- [ ] CustomField класс
- [ ] ProcessStep класс
- [ ] FieldValue класс
- [ ] ValidationResult класс
- [ ] Обновленный ProductType
- [ ] Обновленный Order

### Фаза 3: Построитель форм 📋
- [ ] FormBuilder класс
- [ ] Рендереры для всех типов полей
- [ ] Валидация на стороне клиента
- [ ] CSS стили для форм

### Фаза 4: Расширенные сервисы 🔧
- [ ] Обновленный ProductTypeService
- [ ] Обновленный OrderService
- [ ] Обновленный AdminService
- [ ] Система миграции данных

### Фаза 5: UI компоненты 🎨
- [ ] ProductTypeDesignerUI
- [ ] OrderFormUI (динамические формы)
- [ ] Обновленный AdminUI
- [ ] Система превью типов изделий

### Фаза 6: Тестирование и оптимизация 🧪
- [ ] Unit тесты для всех новых классов
- [ ] Integration тесты
- [ ] Performance тесты
- [ ] UX тестирование

## ⚡ Производительность

### Оптимизации:
- **Lazy loading** настраиваемых полей
- **Кэширование** сгенерированных форм
- **Batch операции** для массового обновления
- **Индексация** в LocalStorage по типам полей
- **Дебаунсинг** валидации в реальном времени

### Метрики:
- Время генерации формы: < 100ms
- Время валидации заказа: < 50ms
- Размер данных в LocalStorage: оптимизирован JSON
- Время загрузки типа изделия: < 200ms

---

## 🎯 Заключение

Обновленная архитектура превращает OMS в **универсальную платформу** для управления любыми производственными процессами. Администратор получает полный контроль над структурой данных, а система автоматически адаптируется под бизнес-потребности.

**Ключевые достижения:**
- ✅ **100% настраиваемость** типов изделий
- ✅ **Автоматическая генерация** форм и валидации
- ✅ **Гибкие процессы** с обязательными и опциональными этапами
- ✅ **Масштабируемая архитектура** для будущих расширений
- ✅ **Сохранение простоты** использования для конечных пользователей

*Система готова для реализации согласно обновленным UML диаграммам.*