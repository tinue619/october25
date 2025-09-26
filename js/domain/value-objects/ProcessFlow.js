/**
 * Value Object для потока процессов заказа
 * Управляет текущим состоянием прохождения процессов в заказе
 * 
 * @class ProcessFlow
 */
class ProcessFlow {
    /**
     * Создает экземпляр потока процессов
     * @param {Object} data - Данные потока процессов
     * @param {Array<ProcessStep>} data.processSteps - Шаги процессов в порядке выполнения
     * @param {number} [data.currentStepIndex=0] - Индекс текущего шага (начиная с 0)
     * @param {Array<Object>} [data.completedSteps=[]] - История выполненных шагов
     * @param {Array<Object>} [data.skippedSteps=[]] - Список пропущенных шагов
     * @param {Date} [data.startedAt] - Дата начала потока
     * @param {Date} [data.updatedAt] - Дата последнего обновления
     */
    constructor(data) {
        this.processSteps = Array.isArray(data.processSteps) ? 
            [...data.processSteps].sort((a, b) => a.order - b.order) : [];
        
        this.currentStepIndex = this._validateStepIndex(data.currentStepIndex || 0);
        this.completedSteps = Array.isArray(data.completedSteps) ? [...data.completedSteps] : [];
        this.skippedSteps = Array.isArray(data.skippedSteps) ? [...data.skippedSteps] : [];
        this.startedAt = data.startedAt instanceof Date ? data.startedAt : new Date();
        this.updatedAt = data.updatedAt instanceof Date ? data.updatedAt : new Date();
        
        // Проверяем корректность состояния
        this._validateState();
    }

    /**
     * Валидирует индекс шага
     * @private
     * @param {number} index - Индекс для валидации
     * @returns {number} Валидный индекс
     */
    _validateStepIndex(index) {
        const numIndex = Number(index);
        
        if (isNaN(numIndex) || numIndex < 0) {
            return 0;
        }
        
        return Math.floor(numIndex);
    }

    /**
     * Валидирует состояние потока
     * @private
     * @throws {Error} Если состояние некорректно
     */
    _validateState() {
        if (this.currentStepIndex >= this.processSteps.length && this.processSteps.length > 0) {
            throw new Error('Индекс текущего шага превышает количество шагов в потоке');
        }
        
        // Проверяем, что все шаги имеют уникальные порядковые номера
        const orders = this.processSteps.map(step => step.order);
        const uniqueOrders = new Set(orders);
        
        if (orders.length !== uniqueOrders.size) {
            throw new Error('Шаги процесса должны иметь уникальные порядковые номера');
        }
    }

    /**
     * Получить текущий шаг процесса
     * @returns {ProcessStep|null} Текущий шаг или null, если поток завершен
     */
    getCurrentStep() {
        if (this.currentStepIndex >= this.processSteps.length) {
            return null; // Поток завершен
        }
        
        return this.processSteps[this.currentStepIndex];
    }

    /**
     * Получить следующий шаг процесса
     * @returns {ProcessStep|null} Следующий шаг или null, если его нет
     */
    getNextStep() {
        const nextIndex = this.currentStepIndex + 1;
        
        if (nextIndex >= this.processSteps.length) {
            return null;
        }
        
        return this.processSteps[nextIndex];
    }

    /**
     * Получить предыдущий шаг процесса
     * @returns {ProcessStep|null} Предыдущий шаг или null, если его нет
     */
    getPreviousStep() {
        const prevIndex = this.currentStepIndex - 1;
        
        if (prevIndex < 0) {
            return null;
        }
        
        return this.processSteps[prevIndex];
    }

    /**
     * Завершить текущий шаг и перейти к следующему
     * @param {string} completedBy - ID пользователя, завершившего шаг
     * @param {string} [notes] - Дополнительные заметки
     * @returns {ProcessFlow} Новый экземпляр с обновленным состоянием
     */
    completeCurrentStep(completedBy, notes = '') {
        const currentStep = this.getCurrentStep();
        
        if (!currentStep) {
            throw new Error('Нет текущего шага для завершения');
        }
        
        const completionRecord = {
            processId: currentStep.processId,
            stepIndex: this.currentStepIndex,
            completedBy,
            completedAt: new Date(),
            notes: notes ? String(notes).trim() : '',
            stepTitle: currentStep.getDisplayTitle()
        };
        
        return new ProcessFlow({
            processSteps: this.processSteps,
            currentStepIndex: this.currentStepIndex + 1,
            completedSteps: [...this.completedSteps, completionRecord],
            skippedSteps: [...this.skippedSteps],
            startedAt: this.startedAt,
            updatedAt: new Date()
        });
    }

    /**
     * Пропустить текущий опциональный шаг
     * @param {string} skippedBy - ID пользователя, пропустившего шаг
     * @param {string} reason - Причина пропуска
     * @returns {ProcessFlow} Новый экземпляр с обновленным состоянием
     * @throws {Error} Если шаг нельзя пропустить
     */
    skipCurrentStep(skippedBy, reason) {
        const currentStep = this.getCurrentStep();
        
        if (!currentStep) {
            throw new Error('Нет текущего шага для пропуска');
        }
        
        if (!currentStep.canSkip) {
            throw new Error(`Шаг "${currentStep.getDisplayTitle()}" является обязательным и не может быть пропущен`);
        }
        
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            throw new Error('Причина пропуска обязательна');
        }
        
        const skipRecord = {
            processId: currentStep.processId,
            stepIndex: this.currentStepIndex,
            skippedBy,
            skippedAt: new Date(),
            reason: reason.trim(),
            stepTitle: currentStep.getDisplayTitle()
        };
        
        return new ProcessFlow({
            processSteps: this.processSteps,
            currentStepIndex: this.currentStepIndex + 1,
            completedSteps: [...this.completedSteps],
            skippedSteps: [...this.skippedSteps, skipRecord],
            startedAt: this.startedAt,
            updatedAt: new Date()
        });
    }

    /**
     * Вернуться к предыдущему шагу (если возможно)
     * @param {string} revertedBy - ID пользователя, инициировавшего возврат
     * @param {string} reason - Причина возврата
     * @returns {ProcessFlow} Новый экземпляр с обновленным состоянием
     * @throws {Error} Если возврат невозможен
     */
    revertToPreviousStep(revertedBy, reason) {
        if (this.currentStepIndex <= 0) {
            throw new Error('Нельзя вернуться назад - это первый шаг');
        }
        
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            throw new Error('Причина возврата обязательна');
        }
        
        // Удаляем последнюю запись из истории (завершенный или пропущенный шаг)
        const newCompletedSteps = [...this.completedSteps];
        const newSkippedSteps = [...this.skippedSteps];
        const previousIndex = this.currentStepIndex - 1;
        
        // Ищем и удаляем записи с индексом предыдущего шага
        const completedIndex = newCompletedSteps.findLastIndex(step => step.stepIndex === previousIndex);
        const skippedIndex = newSkippedSteps.findLastIndex(step => step.stepIndex === previousIndex);
        
        if (completedIndex >= 0) {
            newCompletedSteps.splice(completedIndex, 1);
        }
        
        if (skippedIndex >= 0) {
            newSkippedSteps.splice(skippedIndex, 1);
        }
        
        // Добавляем запись о возврате в метаданные последнего завершенного шага
        if (newCompletedSteps.length > 0) {
            const lastCompleted = newCompletedSteps[newCompletedSteps.length - 1];
            lastCompleted.revertedFrom = {
                revertedBy,
                revertedAt: new Date(),
                reason: reason.trim(),
                fromIndex: this.currentStepIndex
            };
        }
        
        return new ProcessFlow({
            processSteps: this.processSteps,
            currentStepIndex: previousIndex,
            completedSteps: newCompletedSteps,
            skippedSteps: newSkippedSteps,
            startedAt: this.startedAt,
            updatedAt: new Date()
        });
    }

    /**
     * Проверить, завершен ли поток процессов
     * @returns {boolean} true, если все шаги пройдены
     */
    isCompleted() {
        return this.currentStepIndex >= this.processSteps.length;
    }

    /**
     * Проверить, начат ли поток процессов
     * @returns {boolean} true, если есть хотя бы один завершенный или пропущенный шаг
     */
    isStarted() {
        return this.completedSteps.length > 0 || this.skippedSteps.length > 0 || this.currentStepIndex > 0;
    }

    /**
     * Получить прогресс выполнения в процентах
     * @returns {number} Прогресс от 0 до 100
     */
    getProgressPercentage() {
        if (this.processSteps.length === 0) {
            return 100;
        }
        
        const completedCount = this.completedSteps.length + this.skippedSteps.length;
        return Math.round((completedCount / this.processSteps.length) * 100);
    }

    /**
     * Получить количество завершенных шагов
     * @returns {number} Количество завершенных шагов
     */
    getCompletedStepsCount() {
        return this.completedSteps.length;
    }

    /**
     * Получить количество пропущенных шагов
     * @returns {number} Количество пропущенных шагов
     */
    getSkippedStepsCount() {
        return this.skippedSteps.length;
    }

    /**
     * Получить количество оставшихся шагов
     * @returns {number} Количество оставшихся шагов
     */
    getRemainingStepsCount() {
        return Math.max(0, this.processSteps.length - this.currentStepIndex);
    }

    /**
     * Получить список доступных для выполнения шагов
     * @returns {Array<ProcessStep>} Массив доступных шагов
     */
    getAvailableSteps() {
        const currentStep = this.getCurrentStep();
        return currentStep ? [currentStep] : [];
    }

    /**
     * Получить список пропускаемых шагов
     * @returns {Array<ProcessStep>} Массив шагов, которые можно пропустить
     */
    getSkippableSteps() {
        const currentStep = this.getCurrentStep();
        
        if (!currentStep || !currentStep.canSkip) {
            return [];
        }
        
        return [currentStep];
    }

    /**
     * Получить полную историю выполнения
     * @returns {Array<Object>} Объединенная и отсортированная история
     */
    getExecutionHistory() {
        const history = [
            ...this.completedSteps.map(step => ({ ...step, type: 'completed' })),
            ...this.skippedSteps.map(step => ({ ...step, type: 'skipped' }))
        ];
        
        // Сортируем по индексу шага
        return history.sort((a, b) => a.stepIndex - b.stepIndex);
    }

    /**
     * Получить информацию о последнем выполненном действии
     * @returns {Object|null} Информация о последнем действии или null
     */
    getLastAction() {
        const history = this.getExecutionHistory();
        return history.length > 0 ? history[history.length - 1] : null;
    }

    /**
     * Получить ориентировочное время выполнения оставшихся шагов
     * @returns {number} Время в минутах или 0, если нет данных
     */
    getEstimatedRemainingTime() {
        const remainingSteps = this.processSteps.slice(this.currentStepIndex);
        
        return remainingSteps.reduce((total, step) => {
            return total + (step.estimatedDuration || 0);
        }, 0);
    }

    /**
     * Проверить, можно ли выполнить конкретный шаг
     * @param {string} processId - ID процесса
     * @returns {boolean} true, если шаг можно выполнить
     */
    canExecuteStep(processId) {
        const currentStep = this.getCurrentStep();
        return currentStep && currentStep.processId === processId && currentStep.active;
    }

    /**
     * Найти шаг по ID процесса
     * @param {string} processId - ID процесса
     * @returns {ProcessStep|null} Найденный шаг или null
     */
    findStepByProcessId(processId) {
        return this.processSteps.find(step => step.processId === processId) || null;
    }

    /**
     * Получить краткую сводку состояния потока
     * @returns {Object} Объект с информацией о состоянии
     */
    getSummary() {
        const currentStep = this.getCurrentStep();
        
        return {
            totalSteps: this.processSteps.length,
            currentStepIndex: this.currentStepIndex,
            currentStepTitle: currentStep ? currentStep.getDisplayTitle() : null,
            completed: this.getCompletedStepsCount(),
            skipped: this.getSkippedStepsCount(),
            remaining: this.getRemainingStepsCount(),
            progress: this.getProgressPercentage(),
            isCompleted: this.isCompleted(),
            isStarted: this.isStarted(),
            estimatedTimeRemaining: this.getEstimatedRemainingTime()
        };
    }

    /**
     * Клонировать поток с новыми шагами процессов
     * @param {Array<ProcessStep>} newProcessSteps - Новые шаги процессов
     * @returns {ProcessFlow} Новый экземпляр потока
     */
    cloneWithSteps(newProcessSteps) {
        return new ProcessFlow({
            processSteps: newProcessSteps,
            currentStepIndex: 0,
            completedSteps: [],
            skippedSteps: [],
            startedAt: new Date(),
            updatedAt: new Date()
        });
    }

    /**
     * Преобразовать в объект для сериализации
     * @returns {Object} Объект для сериализации
     */
    toJSON() {
        return {
            processSteps: this.processSteps.map(step => step.toJSON()),
            currentStepIndex: this.currentStepIndex,
            completedSteps: this.completedSteps.map(step => ({
                ...step,
                completedAt: step.completedAt.toISOString(),
                revertedFrom: step.revertedFrom ? {
                    ...step.revertedFrom,
                    revertedAt: step.revertedFrom.revertedAt.toISOString()
                } : undefined
            })),
            skippedSteps: this.skippedSteps.map(step => ({
                ...step,
                skippedAt: step.skippedAt.toISOString()
            })),
            startedAt: this.startedAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }

    /**
     * Создать ProcessFlow из JSON объекта
     * @param {Object} json - JSON объект
     * @returns {ProcessFlow} Новый экземпляр ProcessFlow
     */
    static fromJSON(json) {
        return new ProcessFlow({
            processSteps: json.processSteps.map(step => ProcessStep.fromJSON(step)),
            currentStepIndex: json.currentStepIndex,
            completedSteps: json.completedSteps.map(step => ({
                ...step,
                completedAt: new Date(step.completedAt),
                revertedFrom: step.revertedFrom ? {
                    ...step.revertedFrom,
                    revertedAt: new Date(step.revertedFrom.revertedAt)
                } : undefined
            })),
            skippedSteps: json.skippedSteps.map(step => ({
                ...step,
                skippedAt: new Date(step.skippedAt)
            })),
            startedAt: new Date(json.startedAt),
            updatedAt: new Date(json.updatedAt)
        });
    }

    /**
     * Создать новый поток из массива шагов процессов
     * @param {Array<ProcessStep>} processSteps - Массив шагов процессов
     * @returns {ProcessFlow} Новый поток процессов
     */
    static create(processSteps) {
        return new ProcessFlow({
            processSteps: processSteps || []
        });
    }
}

// Глобальная доступность
window.ProcessFlow = ProcessFlow;
