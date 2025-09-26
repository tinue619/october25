/**
 * Сервис для управления процессами (этапами)
 * Содержит бизнес-логику работы с этапами производства
 */
class ProcessService {
    
    constructor(processRepository) {
        this._processRepository = processRepository;
    }
    
    // Создание нового процесса
    async createProcess(processData, createdBy = null) {
        // Валидация данных
        if (!processData.name || processData.name.trim() === '') {
            throw new Error('Название процесса обязательно');
        }
        
        // Проверка уникальности названия
        const existingProcesses = await this._processRepository.findBy({ name: processData.name });
        if (existingProcesses.length > 0) {
            throw new Error('Процесс с таким названием уже существует');
        }
        
        // Определяем порядок для нового процесса
        const order = processData.order !== undefined ? processData.order : await this._getNextOrder();
        
        // Создание процесса
        const process = new Process({
            name: processData.name,
            description: processData.description || '',
            order: order
        });
        
        if (createdBy) {
            process.setCreatedBy(createdBy);
        }
        
        return await this._processRepository.save(process);
    }
    
    // Обновление процесса
    async updateProcess(processId, processData, updatedBy = null) {
        const process = await this._processRepository.findById(processId);
        if (!process) {
            throw new Error('Процесс не найден');
        }
        
        // Обновляем поля
        if (processData.name) {
            // Проверяем уникальность нового названия
            const existingProcesses = await this._processRepository.findBy({ name: processData.name });
            const duplicateProcess = existingProcesses.find(p => p.id !== processId);
            if (duplicateProcess) {
                throw new Error('Процесс с таким названием уже существует');
            }
            process.setName(processData.name);
        }
        
        if (processData.description !== undefined) {
            process.setDescription(processData.description);
        }
        
        if (processData.order !== undefined) {
            process.setOrder(processData.order);
        }
        
        return await this._processRepository.save(process);
    }
    
    // Удаление процесса
    async deleteProcess(processId, deletedBy = null) {
        const process = await this._processRepository.findById(processId);
        if (!process) {
            throw new Error('Процесс не найден');
        }
        
        // TODO: Проверить, используется ли процесс в типах изделий или заказах
        // Пока что разрешаем удаление
        
        return await this._processRepository.delete(processId);
    }
    
    // Получение всех процессов
    async getAllProcesses() {
        const processes = await this._processRepository.findAll();
        // Сортируем по порядку
        return processes.sort((a, b) => a.order - b.order);
    }
    
    // Получение процесса по ID
    async getProcessById(processId) {
        return await this._processRepository.findById(processId);
    }
    
    // Поиск процесса по ID (синоним для совместимости)
    findById(processId) {
        return this._processRepository.findById(processId);
    }
    
    // Поиск процесса по названию
    async findProcessByName(name) {
        const processes = await this._processRepository.findBy({ name: name });
        return processes.length > 0 ? processes[0] : null;
    }
    
    // Получение процессов, созданных конкретным администратором
    async getProcessesCreatedBy(adminId) {
        return await this._processRepository.findBy({ createdBy: adminId });
    }
    
    // Переупорядочивание процессов
    async reorderProcesses(newOrderMapping, updatedBy = null) {
        // newOrderMapping: { processId: newOrder, ... }
        const processes = await this.getAllProcesses();
        const updatedProcesses = [];
        
        for (const process of processes) {
            if (newOrderMapping[process.id] !== undefined) {
                process.setOrder(newOrderMapping[process.id]);
                updatedProcesses.push(process);
            }
        }
        
        // Сохраняем все обновленные процессы
        for (const process of updatedProcesses) {
            await this._processRepository.save(process);
        }
        
        return await this.getAllProcesses();
    }
    
    // Массовое обновление порядка процессов
    async updateProcessOrder(processIds, updatedBy = null) {
        // processIds - массив ID в нужном порядке
        const newOrderMapping = {};
        
        processIds.forEach((processId, index) => {
            newOrderMapping[processId] = index + 1;
        });
        
        return await this.reorderProcesses(newOrderMapping, updatedBy);
    }
    
    // Перемещение процесса вверх по списку
    async moveProcessUp(processId, updatedBy = null) {
        const processes = await this.getAllProcesses();
        const currentIndex = processes.findIndex(p => p.id === processId);
        
        if (currentIndex <= 0) {
            return processes; // Уже первый или не найден
        }
        
        // Меняем местами с предыдущим
        const newOrder = [...processes];
        [newOrder[currentIndex - 1], newOrder[currentIndex]] = [newOrder[currentIndex], newOrder[currentIndex - 1]];
        
        const processIds = newOrder.map(p => p.id);
        return await this.updateProcessOrder(processIds, updatedBy);
    }
    
    // Перемещение процесса вниз по списку
    async moveProcessDown(processId, updatedBy = null) {
        const processes = await this.getAllProcesses();
        const currentIndex = processes.findIndex(p => p.id === processId);
        
        if (currentIndex === -1 || currentIndex >= processes.length - 1) {
            return processes; // Последний или не найден
        }
        
        // Меняем местами со следующим
        const newOrder = [...processes];
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
        
        const processIds = newOrder.map(p => p.id);
        return await this.updateProcessOrder(processIds, updatedBy);
    }
    
    // Клонирование процесса
    async cloneProcess(processId, newName, createdBy = null) {
        const originalProcess = await this._processRepository.findById(processId);
        if (!originalProcess) {
            throw new Error('Процесс для клонирования не найден');
        }
        
        return await this.createProcess({
            name: newName,
            description: `${originalProcess.description} (копия)`,
            order: await this._getNextOrder()
        }, createdBy);
    }
    
    // Статистика процессов
    async getProcessStats() {
        const processes = await this.getAllProcesses();
        
        return {
            total: processes.length,
            recentlyCreated: processes.filter(p => {
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return p.createdAt > dayAgo;
            }).length,
            withDescription: processes.filter(p => p.description && p.description.trim() !== '').length,
            averageNameLength: processes.length > 0 ? 
                Math.round(processes.reduce((sum, p) => sum + p.name.length, 0) / processes.length) : 0
        };
    }
    
    // Валидация последовательности процессов
    async validateProcessSequence(processIds) {
        const issues = [];
        
        // Проверяем существование всех процессов
        for (const processId of processIds) {
            const process = await this._processRepository.findById(processId);
            if (!process) {
                issues.push(`Процесс с ID ${processId} не найден`);
            }
        }
        
        // Проверяем уникальность
        const uniqueIds = [...new Set(processIds)];
        if (uniqueIds.length !== processIds.length) {
            issues.push('В последовательности есть дублирующиеся процессы');
        }
        
        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }
    
    // Получение процессов с пагинацией
    async getProcessesPaginated(page = 1, limit = 10) {
        const allProcesses = await this.getAllProcesses();
        const total = allProcesses.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        return {
            data: allProcesses.slice(startIndex, endIndex),
            pagination: {
                page: page,
                limit: limit,
                total: total,
                totalPages: Math.ceil(total / limit),
                hasNext: endIndex < total,
                hasPrev: page > 1
            }
        };
    }
    
    // Приватные методы
    
    async _getNextOrder() {
        const processes = await this._processRepository.findAll();
        if (processes.length === 0) {
            return 1;
        }
        
        const maxOrder = Math.max(...processes.map(p => p.order || 0));
        return maxOrder + 1;
    }
}