# OMS - UML диаграммы системы

## Обновленная ER-диаграмма с настраиваемыми типами изделий

```mermaid
erDiagram
    ADMINISTRATOR ||--o{ EMPLOYEE : "создает/настраивает/дает права"
    ADMINISTRATOR ||--o{ PRODUCT_TYPE : "создает/настраивает"
    ADMINISTRATOR ||--o{ PROCESS : "создает/настраивает"
    ADMINISTRATOR ||--o{ ORDER : "создает/редактирует (полные права)"
    ADMINISTRATOR ||--o{ CUSTOM_FIELD : "создает настраиваемые поля"
    
    EMPLOYEE }o--o{ ORDER : "создает (если есть право)"
    EMPLOYEE }o--|| PROCESS : "выполняет (если есть право)"
    
    ORDER ||--|| PRODUCT_TYPE : "относится к"
    PRODUCT_TYPE ||--o{ PROCESS_STEP : "определяет последовательность"
    PRODUCT_TYPE ||--o{ CUSTOM_FIELD : "содержит настраиваемые поля"
    ORDER }o--o{ PROCESS : "проходит через"
    ORDER ||--o{ FIELD_VALUE : "содержит значения полей"
    
    PROCESS_STEP ||--|| PROCESS : "ссылается на"
    FIELD_VALUE ||--|| CUSTOM_FIELD : "ссылается на"
    
    ADMINISTRATOR {
        int id PK
        string name
        string role
        datetime created_at
        string admin_permissions "все права"
    }
    
    EMPLOYEE {
        int id PK
        string name
        string role
        boolean can_create_orders "назначает админ"
        int[] allowed_process_ids "назначает админ"
        int created_by_admin_id FK "кто создал"
        datetime created_at
        datetime updated_at
    }
    
    ORDER {
        int id PK
        string number
        int product_type_id FK
        string customer_name
        string customer_phone
        string status
        int current_process_id FK
        int created_by_user_id FK "кто создал"
        json custom_field_values "значения настраиваемых полей"
        datetime created_at
        datetime updated_at
    }
    
    PRODUCT_TYPE {
        int id PK
        string name
        string description
        json process_sequence "обязательные и опциональные этапы"
        json custom_fields "настраиваемые поля для заказов"
        int created_by_admin_id FK
        datetime created_at
        datetime updated_at
    }
    
    PROCESS {
        int id PK
        string name
        string description
        int order
        int created_by_admin_id FK
        datetime created_at
        datetime updated_at
    }
    
    PROCESS_STEP {
        int id PK
        int product_type_id FK
        int process_id FK
        int order "порядок в последовательности"
        boolean is_required "обязательный или опциональный"
        json step_config "дополнительные настройки"
    }
    
    CUSTOM_FIELD {
        int id PK
        int product_type_id FK
        string name "название поля"
        string field_type "text|phone|email|number|select|checkbox|date"
        boolean is_required "обязательное или опциональное"
        json field_config "опции для select, валидация и т.д."
        int order "порядок отображения"
        int created_by_admin_id FK
    }
    
    FIELD_VALUE {
        int id PK
        int order_id FK
        int custom_field_id FK
        string value "значение поля"
        datetime created_at
    }
```

## Диаграмма классов с настраиваемыми типами изделий

```mermaid
classDiagram
    class Entity {
        <<abstract>>
        -int _id
        -Date _createdAt
        -Date _updatedAt
        -int _createdBy
        +getId() int
        +touch() void
        +toJSON() object
        #generateId() int
    }
    
    class User {
        -string _name
        -string _role
        -UserPermissions _permissions
        -int _createdBy
        +isAdmin() boolean
        +canCreateOrders() boolean
        +canPerformProcess(processId) boolean
        +canManageUsers() boolean
        +canManageSystem() boolean
    }
    
    class UserPermissions {
        -boolean _canCreateOrders
        -int[] _allowedProcessIds
        +addProcessRight(processId) void
        +removeProcessRight(processId) void
        +setOrderCreationRight(canCreate) void
    }
    
    class Process {
        -string _name
        -string _description
        -int _order
        +setName(name) void
        +setDescription(description) void
        +setOrder(order) void
    }
    
    class ProcessStep {
        -int _processId
        -int _order
        -boolean _isRequired
        -object _stepConfig
        +setRequired(required) void
        +setOrder(order) void
        +updateConfig(config) void
    }
    
    class ProductType {
        -string _name
        -string _description
        -ProcessStep[] _processSequence
        -CustomField[] _customFields
        +addProcess(processId, order, isRequired) ProcessStep
        +removeProcess(processId) void
        +setProcessRequired(processId, required) void
        +reorderProcesses(newOrder) void
        +addCustomField(fieldData) CustomField
        +removeCustomField(fieldId) void
        +updateCustomField(fieldId, data) CustomField
        +getRequiredFields() CustomField[]
        +getOptionalFields() CustomField[]
        +validateOrderData(orderData) ValidationResult
    }
    
    class CustomField {
        -string _name
        -string _fieldType
        -boolean _isRequired
        -object _fieldConfig
        -int _order
        +setRequired(required) void
        +setFieldType(type) void
        +updateConfig(config) void
        +validateValue(value) boolean
        +getFieldOptions() object
    }
    
    class FieldValue {
        -int _customFieldId
        -string _value
        +setValue(value) void
        +getValue() string
        +validate(field) boolean
    }
    
    class Order {
        -string _number
        -int _productTypeId
        -string _customerName
        -string _customerPhone
        -string _status
        -ProcessFlow _processFlow
        -FieldValue[] _customFieldValues
        +moveToNextProcess(performedBy, productType) void
        +setCustomFieldValue(fieldId, value) void
        +getCustomFieldValue(fieldId) string
        +validateCustomFields(productType) ValidationResult
        +canBeEditedBy(user) boolean
    }
    
    class ProcessFlow {
        -int _currentProcessId
        -int _currentStepIndex
        -int[] _completedProcesses
        -int[] _skippedOptionalProcesses
        -HistoryEvent[] _history
        +moveToNext(nextProcess, performedBy) void
        +skipOptionalProcess(processId, reason, performedBy) void
        +addHistoryEvent(type, user, comment) void
        +canSkipProcess(processId, productType) boolean
    }
    
    class ValidationResult {
        -boolean _isValid
        -string[] _errors
        -string[] _warnings
        +addError(message) void
        +addWarning(message) void
        +isValid() boolean
        +getErrors() string[]
    }
    
    class Repository {
        <<interface>>
        +findById(id) Entity
        +findAll() Entity[]
        +save(entity) Entity
        +delete(id) boolean
        +findBy(criteria) Entity[]
    }
    
    class LocalStorageRepository {
        -string _entityName
        -Class _EntityClass
        -string _storageKey
        +findById(id) Entity
        +findAll() Entity[]
        +save(entity) Entity
        +delete(id) boolean
        +findBy(criteria) Entity[]
    }
    
    class UserService {
        -Repository _userRepository
        +createUser(userData, createdBy) User
        +updateUser(userId, userData, updatedBy) User
        +deleteUser(userId, deletedBy) boolean
        +grantOrderCreationRight(adminId, userId) User
        +revokeOrderCreationRight(adminId, userId) User
        +grantProcessRight(adminId, userId, processId) User
        +revokeProcessRight(adminId, userId, processId) User
        +getAllUsers() User[]
        +getUsersCreatedBy(adminId) User[]
    }
    
    class OrderService {
        -Repository _orderRepository
        -Repository _productTypeRepository
        -Repository _userRepository
        +createOrder(orderData, createdBy) Order
        +updateOrder(orderId, orderData, updatedBy) Order
        +deleteOrder(orderId, deletedBy) boolean
        +moveOrderToNextProcess(orderId, performedBy) Order
        +skipOptionalProcess(orderId, processId, reason, performedBy) Order
        +updateCustomFields(orderId, fieldValues, updatedBy) Order
        +getOrdersForUser(userId) Order[]
        +getAllOrders() Order[]
        +validateOrderData(orderData, productTypeId) ValidationResult
    }
    
    class ProcessService {
        -Repository _processRepository
        +createProcess(processData, createdBy) Process
        +updateProcess(processId, data, updatedBy) Process
        +deleteProcess(processId, deletedBy) boolean
        +getAllProcesses() Process[]
        +reorderProcesses(newOrder, updatedBy) Process[]
    }
    
    class ProductTypeService {
        -Repository _productTypeRepository
        -Repository _processRepository
        +createProductType(data, createdBy) ProductType
        +updateProductType(id, data, updatedBy) ProductType
        +deleteProductType(id, deletedBy) boolean
        +addProcessToSequence(productTypeId, processId, order, isRequired) ProductType
        +removeProcessFromSequence(productTypeId, processId) ProductType
        +setProcessRequired(productTypeId, processId, required) ProductType
        +addCustomField(productTypeId, fieldData) ProductType
        +updateCustomField(productTypeId, fieldId, data) ProductType
        +removeCustomField(productTypeId, fieldId) ProductType
        +getAllProductTypes() ProductType[]
        +getProductTypeWithFields(id) ProductType
    }
    
    class AdminService {
        -UserService _userService
        -OrderService _orderService
        -ProcessService _processService
        -ProductTypeService _productTypeService
        +createEmployee(employeeData, adminId) User
        +updateEmployee(employeeId, data, adminId) User
        +deleteEmployee(employeeId, adminId) boolean
        +manageEmployeeRights(employeeId, rights, adminId) User
        +createSystemOrder(orderData, adminId) Order
        +designProductType(productTypeData, adminId) ProductType
        +configureProductTypeFields(productTypeId, fields, adminId) ProductType
        +getSystemStatistics(adminId) object
        +exportSystemData(adminId) object
        +importSystemData(data, adminId) boolean
    }
    
    class FormBuilder {
        -CustomField[] _fields
        +generateFormHTML(fields) string
        +generateValidationRules(fields) object
        +validateFormData(data, fields) ValidationResult
        +getFieldDefaultValue(field) any
    }
    
    class ApplicationContext {
        -object _repositories
        -object _services
        -User _currentUser
        +authenticate(userId) User
        +logout() void
        +getUserService() UserService
        +getOrderService() OrderService
        +getProcessService() ProcessService
        +getProductTypeService() ProductTypeService
        +getAdminService() AdminService
        +getFormBuilder() FormBuilder
        +isCurrentUserAdmin() boolean
    }
    
    Entity <|-- User
    Entity <|-- Process
    Entity <|-- ProductType
    Entity <|-- Order
    Entity <|-- CustomField
    
    User *-- UserPermissions
    Order *-- ProcessFlow
    Order *-- FieldValue
    ProductType *-- ProcessStep
    ProductType *-- CustomField
    
    Repository <|.. LocalStorageRepository
    
    UserService --> Repository : uses
    OrderService --> Repository : uses
    ProcessService --> Repository : uses
    ProductTypeService --> Repository : uses
    
    AdminService --> UserService : manages
    AdminService --> OrderService : manages
    AdminService --> ProcessService : manages
    AdminService --> ProductTypeService : manages
    
    ApplicationContext *-- UserService
    ApplicationContext *-- OrderService
    ApplicationContext *-- ProcessService
    ApplicationContext *-- ProductTypeService
    ApplicationContext *-- AdminService
    ApplicationContext *-- FormBuilder
    
    FormBuilder --> CustomField : uses
    FormBuilder --> ValidationResult : creates
    
    Order --> ValidationResult : validates with
    ProductType --> ValidationResult : validates with
```

## Диаграмма последовательности - Администратор создает настраиваемый тип изделия

```mermaid
sequenceDiagram
    participant A as Администратор
    participant UI as Admin UI
    participant AC as ApplicationContext
    participant AS as AdminService
    participant PTS as ProductTypeService
    participant PTR as ProductTypeRepository
    
    A->>UI: Создать новый тип изделия
    UI->>AC: adminService.designProductType(productTypeData, adminId)
    AC->>AS: designProductType(productTypeData, adminId)
    
    AS->>AS: Проверить права администратора
    
    AS->>PTS: createProductType(data, adminId)
    PTS->>PTS: new ProductType(data)
    PTS->>PTR: save(productType)
    PTR-->>PTS: ProductType
    
    PTS-->>AS: ProductType
    AS-->>AC: ProductType
    AC-->>UI: ProductType
    UI-->>A: Тип изделия создан
    
    A->>UI: Настроить этапы процессов
    UI->>AC: productTypeService.addProcessToSequence(id, processId, order, isRequired)
    AC->>PTS: addProcessToSequence(productTypeId, processId, order, isRequired)
    
    loop Для каждого этапа
        PTS->>PTS: productType.addProcess(processId, order, isRequired)
        note right of PTS: isRequired = true/false<br/>определяет обязательность этапа
    end
    
    PTS->>PTR: save(productType)
    PTR-->>PTS: ProductType
    PTS-->>AC: ProductType
    AC-->>UI: Updated ProductType
    UI-->>A: Этапы настроены
    
    A->>UI: Добавить настраиваемые поля
    UI->>AC: productTypeService.addCustomField(productTypeId, fieldData)
    AC->>PTS: addCustomField(productTypeId, fieldData)
    
    loop Для каждого поля
        PTS->>PTS: productType.addCustomField(fieldData)
        note right of PTS: fieldData содержит:<br/>- name (название)<br/>- fieldType (text/phone/select/etc)<br/>- isRequired (обязательное/опциональное)<br/>- fieldConfig (опции для select, валидация)
    end
    
    PTS->>PTR: save(productType)
    PTR-->>PTS: ProductType
    PTS-->>AC: ProductType
    AC-->>UI: Updated ProductType
    UI-->>A: Поля добавлены
```

## Диаграмма последовательности - Создание заказа с настраиваемыми полями

```mermaid
sequenceDiagram
    participant U as Менеджер
    participant UI as Order UI
    participant FB as FormBuilder
    participant AC as ApplicationContext
    participant OS as OrderService
    participant PTS as ProductTypeService
    participant OR as OrderRepository
    
    U->>UI: Выбрать тип изделия для заказа
    UI->>AC: productTypeService.getProductTypeWithFields(productTypeId)
    AC->>PTS: getProductTypeWithFields(productTypeId)
    PTS-->>AC: ProductType с полями
    AC-->>UI: ProductType
    
    UI->>FB: generateFormHTML(productType.customFields)
    FB-->>UI: Динамическая форма HTML
    UI-->>U: Показать форму с настраиваемыми полями
    
    U->>UI: Заполнить форму и создать заказ
    UI->>FB: validateFormData(formData, productType.customFields)
    FB-->>UI: ValidationResult
    
    alt Данные невалидны
        UI-->>U: Показать ошибки валидации
    else Данные валидны
        UI->>AC: orderService.createOrder(orderData, userId)
        AC->>OS: createOrder(orderData, createdBy)
        
        OS->>OS: validateOrderData(orderData, productTypeId)
        OS->>OS: new Order(orderData)
        
        loop Для каждого настраиваемого поля
            OS->>OS: order.setCustomFieldValue(fieldId, value)
        end
        
        OS->>OR: save(order)
        OR-->>OS: Order
        OS-->>AC: Order
        AC-->>UI: Order
        UI-->>U: Заказ создан с настраиваемыми данными
    end
```

## Диаграмма типов настраиваемых полей

```mermaid
graph TD
    subgraph "Типы полей для настройки"
        TEXT[📝 Текстовое поле]
        PHONE[📞 Номер телефона]
        EMAIL[📧 Email]
        NUMBER[🔢 Число]
        SELECT[📋 Выпадающий список]
        CHECKBOX[☑️ Чекбокс]
        DATE[📅 Дата]
        TEXTAREA[📄 Многострочный текст]
    end
    
    subgraph "Настройки полей"
        REQUIRED[Обязательное поле]
        OPTIONAL[Опциональное поле]
        VALIDATION[Правила валидации]
        OPTIONS[Опции для списка]
        DEFAULT[Значение по умолчанию]
        ORDER[Порядок отображения]
    end
    
    subgraph "Примеры использования"
        EX1[Адрес доставки - TEXT, REQUIRED]
        EX2[Способ доставки - SELECT, OPTIONAL]
        EX3[Срочность - CHECKBOX, OPTIONAL]
        EX4[Дата доставки - DATE, REQUIRED]
        EX5[Телефон клиента - PHONE, REQUIRED]
        EX6[Комментарии - TEXTAREA, OPTIONAL]
    end
    
    TEXT --> REQUIRED
    TEXT --> OPTIONAL
    TEXT --> VALIDATION
    TEXT --> DEFAULT
    
    SELECT --> OPTIONS
    SELECT --> REQUIRED
    SELECT --> DEFAULT
    
    PHONE --> VALIDATION
    EMAIL --> VALIDATION
    NUMBER --> VALIDATION
    
    ALL_FIELDS[Все поля] --> ORDER
    
    classDef fieldType fill:#e1f5fe
    classDef setting fill:#f3e5f5
    classDef example fill:#e8f5e8
    
    class TEXT,PHONE,EMAIL,NUMBER,SELECT,CHECKBOX,DATE,TEXTAREA fieldType
    class REQUIRED,OPTIONAL,VALIDATION,OPTIONS,DEFAULT,ORDER setting
    class EX1,EX2,EX3,EX4,EX5,EX6 example
```

## Диаграмма настройки процессов (обязательные/опциональные)

```mermaid
graph LR
    subgraph "Тип изделия: Мебель на заказ"
        PT[ProductType: Мебель]
    end
    
    subgraph "Обязательные этапы"
        REQ1[1. Прием заказа ✅]
        REQ2[2. Замер ✅]
        REQ3[3. Изготовление ✅]
        REQ4[4. Контроль качества ✅]
    end
    
    subgraph "Опциональные этапы"
        OPT1[5. Доставка ⚪]
        OPT2[6. Сборка ⚪]
        OPT3[7. Гарантийное обслуживание ⚪]
    end
    
    subgraph "Настраиваемые поля"
        FIELD1[Адрес доставки - TEXT, OPTIONAL]
        FIELD2[Нужна ли сборка - CHECKBOX, OPTIONAL]
        FIELD3[Материал - SELECT, REQUIRED]
        FIELD4[Размеры - TEXT, REQUIRED]
        FIELD5[Дата доставки - DATE, OPTIONAL]
    end
    
    PT --> REQ1
    PT --> REQ2
    PT --> REQ3
    PT --> REQ4
    PT --> OPT1
    PT --> OPT2
    PT --> OPT3
    
    PT --> FIELD1
    PT --> FIELD2
    PT --> FIELD3
    PT --> FIELD4
    PT --> FIELD5
    
    REQ1 --> REQ2
    REQ2 --> REQ3
    REQ3 --> REQ4
    REQ4 --> OPT1
    OPT1 -.-> OPT2
    OPT2 -.-> OPT3
    
    OPT1 -.-> FIELD1
    OPT1 -.-> FIELD5
    OPT2 -.-> FIELD2
    REQ3 -.-> FIELD3
    REQ3 -.-> FIELD4
    
    classDef required fill:#ffcdd2
    classDef optional fill:#c8e6c9
    classDef field fill:#fff3e0
    
    class REQ1,REQ2,REQ3,REQ4 required
    class OPT1,OPT2,OPT3 optional
    class FIELD1,FIELD2,FIELD3,FIELD4,FIELD5 field
```

## Use Case диаграмма - Настройка типов изделий

```mermaid
graph LR
    Admin[👑 Администратор]
    
    subgraph "Управление типами изделий"
        UC1[Создать тип изделия]
        UC2[Редактировать тип изделия]
        UC3[Удалить тип изделия]
    end
    
    subgraph "Настройка процессов"
        UC4[Добавить этап в последовательность]
        UC5[Удалить этап из последовательности]
        UC6[Изменить порядок этапов]
        UC7[Сделать этап обязательным]
        UC8[Сделать этап опциональным]
    end
    
    subgraph "Настройка полей данных"
        UC9[Добавить настраиваемое поле]
        UC10[Редактировать поле]
        UC11[Удалить поле]
        UC12[Сделать поле обязательным]
        UC13[Сделать поле опциональным]
        UC14[Настроить валидацию поля]
        UC15[Добавить опции для списка]
        UC16[Изменить порядок полей]
    end
    
    subgraph "Типы полей"
        UC17[Текстовое поле]
        UC18[Номер телефона]
        UC19[Email]
        UC20[Число]
        UC21[Выпадающий список]
        UC22[Чекбокс]
        UC23[Дата]
        UC24[Многострочный текст]
    end
    
    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5
    Admin --> UC6
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
    Admin --> UC10
    Admin --> UC11
    Admin --> UC12
    Admin --> UC13
    Admin --> UC14
    Admin --> UC15
    Admin --> UC16
    
    UC9 -.->|выбирает тип| UC17
    UC9 -.->|выбирает тип| UC18
    UC9 -.->|выбирает тип| UC19
    UC9 -.->|выбирает тип| UC20
    UC9 -.->|выбирает тип| UC21
    UC9 -.->|выбирает тип| UC22
    UC9 -.->|выбирает тип| UC23
    UC9 -.->|выбирает тип| UC24
    
    UC1 -.->|включает| UC4
    UC1 -.->|включает| UC9
    UC15 -.->|для| UC21
    UC14 -.->|для| UC17
    UC14 -.->|для| UC18
    UC14 -.->|для| UC19
    UC14 -.->|для| UC20
```

---

*Обновленная архитектура поддерживает полностью настраиваемые типы изделий с гибкими процессами и пользовательскими полями*