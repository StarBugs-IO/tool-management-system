// database.js - База данных без default значений
class ToolDatabase {
    constructor() {
        this.dbName = 'tool_management_db';
        this.init();
    }

    init() {
        // Инициализация пустой базы данных
        if (!localStorage.getItem(this.dbName)) {
            const initialData = {
                version: '1.0.0',
                machines: [], // Пустой массив станков
                toolTypes: {}, // Пустой объект типов инструментов
                tools: [],
                activityLog: [],
                settings: {
                    autoBackup: true,
                    syncInterval: 3000
                }
            };
            this.save(initialData);
        }
    }

    // Получить все данные
    getAll() {
        const data = localStorage.getItem(this.dbName);
        return data ? JSON.parse(data) : null;
    }

    // Сохранить все данные
    save(data) {
        localStorage.setItem(this.dbName, JSON.stringify(data));
        // Триггерим событие обновления для синхронизации
        window.dispatchEvent(new CustomEvent('databaseUpdate'));
    }

    // Получить станки
    getMachines() {
        const data = this.getAll();
        return data?.machines || [];
    }

    // Сохранить станки
    saveMachines(machines) {
        const data = this.getAll();
        data.machines = machines;
        this.save(data);
    }

    // Получить типы инструментов
    getToolTypes() {
        const data = this.getAll();
        return data?.toolTypes || {};
    }

    // Сохранить типы инструментов
    saveToolTypes(toolTypes) {
        const data = this.getAll();
        data.toolTypes = toolTypes;
        this.save(data);
    }

    // Получить инструменты
    getTools() {
        const data = this.getAll();
        return data?.tools || [];
    }

    // Сохранить инструменты
    saveTools(tools) {
        const data = this.getAll();
        data.tools = tools;
        this.save(data);
    }

    // Добавить инструмент
    addTool(tool) {
        const tools = this.getTools();
        tools.push({
            ...tool,
            id: Date.now(),
            dateAdded: new Date().toISOString()
        });
        this.saveTools(tools);
    }

    // Удалить инструмент
    deleteTool(cellNumber, machine) {
        const tools = this.getTools();
        const updatedTools = tools.filter(tool => 
            !(tool.cellNumber === cellNumber && tool.machine === machine)
        );
        this.saveTools(updatedTools);
    }

    // Получить лог активности
    getActivityLog() {
        const data = this.getAll();
        return data?.activityLog || [];
    }

    // Добавить запись в лог
    addActivity(action) {
        const activityLog = this.getActivityLog();
        activityLog.push({
            action: action,
            timestamp: new Date().toISOString()
        });
        
        // Сохраняем только последние 100 записей
        if (activityLog.length > 100) {
            activityLog.splice(0, activityLog.length - 100);
        }
        
        const data = this.getAll();
        data.activityLog = activityLog;
        this.save(data);
    }

    // Получить настройки
    getSettings() {
        const data = this.getAll();
        return data?.settings || {};
    }

    // Сохранить настройки
    saveSettings(settings) {
        const data = this.getAll();
        data.settings = settings;
        this.save(data);
    }

    // Экспорт базы данных
    export() {
        return this.getAll();
    }

    // Импорт базы данных
    import(importData) {
        if (importData && importData.version) {
            this.save(importData);
            return true;
        }
        return false;
    }

    // Очистить базу данных
    clear() {
        const initialData = {
            version: '1.0.0',
            machines: [],
            toolTypes: {},
            tools: [],
            activityLog: [],
            settings: {
                autoBackup: true,
                syncInterval: 3000
            }
        };
        this.save(initialData);
    }
}

// Создаем глобальный экземпляр базы данных
window.toolDatabase = new ToolDatabase();