#!/usr/bin/env node

/**
 * АВТОМАТИЧЕСКАЯ ПРОВЕРКА СООТВЕТСТВИЯ РОАДМАПА РЕАЛЬНОСТИ
 * 
 * Анализирует код проекта и сравнивает с заявлениями в роадмапе
 * Выявляет расхождения между планами и реализацией
 * 
 * Использование: node scripts/roadmap-checker.js
 */

const fs = require('fs');
const path = require('path');

class RoadmapChecker {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.results = {
            stubs: [],
            missing: [],
            working: [],
            partially: [],
            totalScore: 0,
            phaseScores: {}
        };
    }

    /**
     * Запуск полной проверки
     */
    async check() {
        console.log('🔍 Запуск проверки соответствия роадмапа реальности...\n');
        
        try {
            // Проверяем основные компоненты
            await this.checkUIComponents();
            await this.checkMainFunctions();
            await this.checkServices();
            await this.checkEntities();
            
            // Выводим результаты
            this.printResults();
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Ошибка при проверке:', error.message);
        }
    }

    /**
     * Проверка UI компонентов
     */
    async checkUIComponents() {
        console.log('📱 Проверка UI компонентов...');
        
        const uiComponents = [
            {
                name: 'ProductTypeDesignerUI',
                file: 'js/ui/ProductTypeDesignerUI.js',
                expected: 'Полноценный конструктор типов изделий',
                critical: true
            },
            {
                name: 'OrderFormUI', 
                file: 'js/ui/OrderFormUI.js',
                expected: 'Динамические формы заказов',
                critical: true
            }
        ];

        for (const component of uiComponents) {
            const filePath = path.join(this.projectRoot, component.file);
            
            if (!fs.existsSync(filePath)) {
                this.results.missing.push({
                    item: component.name,
                    type: 'UI Component',
                    reason: 'Файл не найден',
                    critical: component.critical
                });
                continue;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            
            // Проверяем на заглушки
            if (this.isStub(content)) {
                this.results.stubs.push({
                    item: component.name,
                    type: 'UI Component',
                    file: component.file,
                    reason: this.getStubReason(content),
                    critical: component.critical
                });
            } else if (this.isPartiallyImplemented(content)) {
                this.results.partially.push({
                    item: component.name,
                    type: 'UI Component', 
                    file: component.file,
                    reason: 'Частично реализован',
                    critical: component.critical
                });
            } else {
                this.results.working.push({
                    item: component.name,
                    type: 'UI Component',
                    file: component.file
                });
            }
        }
    }

    /**
     * Проверка основных функций в main.js
     */
    async checkMainFunctions() {
        console.log('⚙️ Проверка функций в main.js...');
        
        const mainFile = path.join(this.projectRoot, 'js/main.js');
        if (!fs.existsSync(mainFile)) {
            this.results.missing.push({
                item: 'main.js',
                type: 'Core File',
                reason: 'Главный файл не найден',
                critical: true
            });
            return;
        }

        const content = fs.readFileSync(mainFile, 'utf8');
        
        const functions = [
            {
                name: 'showCreateUserModal',
                expected: 'Рабочая форма создания пользователя',
                critical: true
            },
            {
                name: 'showCreateProcessModal', 
                expected: 'Рабочая форма создания процесса',
                critical: false // уже работает
            },
            {
                name: 'showCreateProductTypeModal',
                expected: 'Рабочая форма создания типа изделия',
                critical: true
            },
            {
                name: 'openProductTypeDesigner',
                expected: 'Открытие конструктора типов изделий',
                critical: true
            },
            {
                name: 'openOrderForm',
                expected: 'Открытие динамической формы заказа',
                critical: true
            }
        ];

        for (const func of functions) {
            if (this.isFunctionStub(content, func.name)) {
                this.results.stubs.push({
                    item: func.name,
                    type: 'Function',
                    file: 'js/main.js',
                    reason: 'Функция-заглушка',
                    critical: func.critical
                });
            } else if (this.isFunctionImplemented(content, func.name)) {
                this.results.working.push({
                    item: func.name,
                    type: 'Function',
                    file: 'js/main.js'
                });
            } else {
                this.results.missing.push({
                    item: func.name,
                    type: 'Function',
                    reason: 'Функция не найдена',
                    critical: func.critical
                });
            }
        }
    }

    /**
     * Проверка сервисов
     */
    async checkServices() {
        console.log('🔧 Проверка сервисов...');
        
        const services = [
            'UserService.js',
            'ProcessService.js', 
            'ProductTypeService.js',
            'OrderService.js',
            'AdminService.js'
        ];

        for (const service of services) {
            const filePath = path.join(this.projectRoot, 'js/application/services', service);
            
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                
                if (content.length > 1000 && !this.isStub(content)) {
                    this.results.working.push({
                        item: service.replace('.js', ''),
                        type: 'Service',
                        file: `js/application/services/${service}`
                    });
                } else {
                    this.results.partially.push({
                        item: service.replace('.js', ''),
                        type: 'Service',
                        file: `js/application/services/${service}`,
                        reason: 'Сервис слишком простой или заглушка'
                    });
                }
            } else {
                this.results.missing.push({
                    item: service.replace('.js', ''),
                    type: 'Service',
                    reason: 'Файл сервиса не найден',
                    critical: true
                });
            }
        }
    }

    /**
     * Проверка сущностей домена
     */
    async checkEntities() {
        console.log('📦 Проверка сущностей домена...');
        
        const entities = [
            'CustomField.js',
            'Order.js',
            'Process.js',
            'ProductType.js',
            'User.js'
        ];

        for (const entity of entities) {
            const filePath = path.join(this.projectRoot, 'js/domain/entities', entity);
            
            if (fs.existsSync(filePath)) {
                this.results.working.push({
                    item: entity.replace('.js', ''),
                    type: 'Entity',
                    file: `js/domain/entities/${entity}`
                });
            } else {
                this.results.missing.push({
                    item: entity.replace('.js', ''),
                    type: 'Entity',
                    reason: 'Файл сущности не найден',
                    critical: false
                });
            }
        }
    }

    /**
     * Проверка, является ли код заглушкой
     */
    isStub(content) {
        const stubPatterns = [
            /alert\s*\(\s*['"`].*следующей версии.*['"`]\s*\)/i,
            /showError\s*\(\s*['"`].*будет реализован.*['"`]\s*\)/i,
            /console\.log\s*\(\s*['"`].*заглушка.*['"`]\s*\)/i,
            /\/\*\s*TODO.*\*\//i,
            /\/\/\s*TODO/i,
            /throw new Error\s*\(\s*['"`]Not implemented['"`]\s*\)/i
        ];

        return stubPatterns.some(pattern => pattern.test(content));
    }

    /**
     * Получение причины, почему код считается заглушкой
     */
    getStubReason(content) {
        if (/alert\s*\(\s*['"`].*следующей версии.*['"`]\s*\)/i.test(content)) {
            return 'Содержит alert о будущей реализации';
        }
        if (/showError\s*\(\s*['"`].*будет реализован.*['"`]\s*\)/i.test(content)) {
            return 'Показывает ошибку о нереализованности';
        }
        return 'Обнаружены маркеры заглушки';
    }

    /**
     * Проверка частичной реализации
     */
    isPartiallyImplemented(content) {
        const lines = content.split('\n').length;
        const hasClasses = /class\s+\w+/.test(content);
        const hasMethods = /\w+\s*\([^)]*\)\s*{/.test(content);
        
        // Если есть класс и методы, но мало кода - частичная реализация
        return hasClasses && hasMethods && lines < 100;
    }

    /**
     * Проверка, является ли функция заглушкой
     */
    isFunctionStub(content, functionName) {
        const funcRegex = new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*{([^}]*)}`, 'gms');
        const match = funcRegex.exec(content);
        
        if (!match) return false;
        
        const funcBody = match[1];
        return this.isStub(funcBody) || funcBody.trim().length < 50;
    }

    /**
     * Проверка, реализована ли функция
     */
    isFunctionImplemented(content, functionName) {
        const funcRegex = new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*{([^}]*)}`, 'gms');
        const match = funcRegex.exec(content);
        
        if (!match) return false;
        
        const funcBody = match[1];
        return !this.isStub(funcBody) && funcBody.trim().length > 50;
    }

    /**
     * Вывод результатов проверки
     */
    printResults() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ РОАДМАПА');
        console.log('='.repeat(80));

        // Работающие компоненты
        if (this.results.working.length > 0) {
            console.log('\n✅ РАБОТАЮЩИЕ КОМПОНЕНТЫ:');
            this.results.working.forEach(item => {
                console.log(`  ✅ ${item.type}: ${item.item}`);
            });
        }

        // Частично работающие
        if (this.results.partially.length > 0) {
            console.log('\n⚠️  ЧАСТИЧНО РАБОТАЮЩИЕ:');
            this.results.partially.forEach(item => {
                console.log(`  ⚠️  ${item.type}: ${item.item} - ${item.reason}`);
            });
        }

        // Заглушки
        if (this.results.stubs.length > 0) {
            console.log('\n🔴 ЗАГЛУШКИ (НЕ РАБОТАЮТ):');
            this.results.stubs.forEach(item => {
                const critical = item.critical ? '🚨 КРИТИЧНО' : '';
                console.log(`  🔴 ${item.type}: ${item.item} - ${item.reason} ${critical}`);
            });
        }

        // Отсутствующие
        if (this.results.missing.length > 0) {
            console.log('\n❌ ОТСУТСТВУЮЩИЕ:');
            this.results.missing.forEach(item => {
                const critical = item.critical ? '🚨 КРИТИЧНО' : '';
                console.log(`  ❌ ${item.type}: ${item.item} - ${item.reason} ${critical}`);
            });
        }

        // Подсчет общего прогресса
        const total = this.results.working.length + this.results.partially.length + 
                     this.results.stubs.length + this.results.missing.length;
        const working = this.results.working.length + (this.results.partially.length * 0.5);
        const percentage = total > 0 ? Math.round((working / total) * 100) : 0;

        console.log('\n' + '='.repeat(80));
        console.log(`📈 ОБЩИЙ ПРОГРЕСС: ${percentage}%`);
        console.log(`   Работает: ${this.results.working.length}`);
        console.log(`   Частично: ${this.results.partially.length}`);
        console.log(`   Заглушки: ${this.results.stubs.length}`);
        console.log(`   Отсутствует: ${this.results.missing.length}`);
        console.log('='.repeat(80));

        this.results.totalScore = percentage;
    }

    /**
     * Генерация отчета в файл
     */
    generateReport() {
        const timestamp = new Date().toISOString().split('T')[0];
        const reportContent = `# 🔍 АВТОМАТИЧЕСКАЯ ПРОВЕРКА РОАДМАПА
> Дата: ${timestamp}
> Общий прогресс: ${this.results.totalScore}%

## ✅ Работающие компоненты (${this.results.working.length}):
${this.results.working.map(item => `- ✅ ${item.type}: ${item.item}`).join('\n')}

## ⚠️ Частично работающие (${this.results.partially.length}):
${this.results.partially.map(item => `- ⚠️ ${item.type}: ${item.item} - ${item.reason}`).join('\n')}

## 🔴 Заглушки (${this.results.stubs.length}):
${this.results.stubs.map(item => `- 🔴 ${item.type}: ${item.item} - ${item.reason}${item.critical ? ' 🚨 КРИТИЧНО' : ''}`).join('\n')}

## ❌ Отсутствующие (${this.results.missing.length}):
${this.results.missing.map(item => `- ❌ ${item.type}: ${item.item} - ${item.reason}${item.critical ? ' 🚨 КРИТИЧНО' : ''}`).join('\n')}

---
*Автоматически сгенерировано: ${new Date().toISOString()}*`;

        const reportPath = path.join(this.projectRoot, `AUTOMATED_ROADMAP_CHECK_${timestamp}.md`);
        fs.writeFileSync(reportPath, reportContent, 'utf8');
        
        console.log(`\n📄 Отчет сохранен: AUTOMATED_ROADMAP_CHECK_${timestamp}.md`);
    }
}

// Запуск проверки
if (require.main === module) {
    const checker = new RoadmapChecker();
    checker.check();
}

module.exports = RoadmapChecker;