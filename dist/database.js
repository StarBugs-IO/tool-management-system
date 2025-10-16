// database.js - База данных без default значений
class ToolDatabase {
    constructor() {
        this.dbName = 'tool_management_db';
        this.init();
    }

    init() {
        // Инициализация базы данных со стандартными типами
        if (!localStorage.getItem(this.dbName)) {
            const initialData = {
                version: '1.0.0',
                machines: [],
                toolTypes: {
                    "Торцевая фреза": [],
                    "Концевая фреза": [],
                    "Фасонная фреза": [],
                    "Сверло спиральное": [],
                    "Зенковка": [],
                    "Развертка": [],
                    "Резьбофреза": [],
                    "Расточной резец": [],
                    "Фреза червячная": [],
                    "Дисковая фреза": []
                },
                tools: [],
                activityLog: [],
                settings: {
                    autoBackup: true,
                    syncInterval: 3000
                }
            };
            this.save(initialData);
        } else {
            // Убедимся, что стандартные типы существуют в существующей базе
            this.ensureStandardToolTypes();
        }
    }

    ensureStandardToolTypes() {
        const data = this.getAll();
        if (!data) {
            console.error('Данные базы не найдены');
            return;
        }
        
        const standardTypes = [
            "Торцевая фреза", "Концевая фреза", "Фасонная фреза", "Сверло спиральное",
            "Зенковка", "Развертка", "Резьбофреза", "Расточной резец",
            "Фреза червячная", "Дисковая фреза"
        ];

        let needsUpdate = false;
        
        // Убедимся, что toolTypes существует
        if (!data.toolTypes) {
            data.toolTypes = {};
            needsUpdate = true;
        }
        
        standardTypes.forEach(type => {
            if (!data.toolTypes[type]) {
                data.toolTypes[type] = [];
                needsUpdate = true;
                console.log(`✅ Добавлен стандартный тип в базу: ${type}`);
            }
        });

        if (needsUpdate) {
            this.save(data);
            console.log('✅ База данных обновлена со стандартными типами');
        }
    }

    // Получить все данные
    getAll() {
        try {
            const data = localStorage.getItem(this.dbName);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Ошибка получения данных:', error);
            return null;
        }
    }

    // Сохранить все данные
    save(data) {
        try {
            localStorage.setItem(this.dbName, JSON.stringify(data));
            // Триггерим событие обновления для синхронизации
            window.dispatchEvent(new CustomEvent('databaseUpdate'));
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
        }
    }

    // Получить станки
    getMachines() {
        try {
            const data = this.getAll();
            return data?.machines || [];
        } catch (error) {
            console.error('Ошибка получения станков:', error);
            return [];
        }
    }

    // Сохранить станки
    saveMachines(machines) {
        try {
            const data = this.getAll();
            if (data) {
                data.machines = machines;
                this.save(data);
            }
        } catch (error) {
            console.error('Ошибка сохранения станков:', error);
        }
    }

    // Получить типы инструментов
    getToolTypes() {
        try {
            const data = this.getAll();
            return data?.toolTypes || {};
        } catch (error) {
            console.error('Ошибка получения типов инструментов:', error);
            return {};
        }
    }

    // Сохранить типы инструментов
    saveToolTypes(toolTypes) {
        try {
            const data = this.getAll();
            if (data) {
                data.toolTypes = toolTypes;
                this.save(data);
            }
        } catch (error) {
            console.error('Ошибка сохранения типов инструментов:', error);
        }
    }

    // Получить инструменты
    getTools() {
        try {
            const data = this.getAll();
            return data?.tools || [];
        } catch (error) {
            console.error('Ошибка получения инструментов:', error);
            return [];
        }
    }

    // Сохранить инструменты
    saveTools(tools) {
        try {
            const data = this.getAll();
            if (data) {
                data.tools = tools;
                this.save(data);
            }
        } catch (error) {
            console.error('Ошибка сохранения инструментов:', error);
        }
    }

    // Добавить инструмент
    addTool(tool) {
        try {
            const tools = this.getTools();
            tools.push({
                ...tool,
                id: Date.now(),
                dateAdded: new Date().toISOString()
            });
            this.saveTools(tools);
        } catch (error) {
            console.error('Ошибка добавления инструмента:', error);
        }
    }

    // Удалить инструмент
    deleteTool(cellNumber, machine) {
        try {
            const tools = this.getTools();
            const updatedTools = tools.filter(tool => 
                !(tool.cellNumber === cellNumber && tool.machine === machine)
            );
            this.saveTools(updatedTools);
        } catch (error) {
            console.error('Ошибка удаления инструмента:', error);
        }
    }

    // Получить лог активности
    getActivityLog() {
        try {
            const data = this.getAll();
            return data?.activityLog || [];
        } catch (error) {
            console.error('Ошибка получения лога активности:', error);
            return [];
        }
    }

    // Добавить запись в лог
    addActivity(action) {
        try {
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
            if (data) {
                data.activityLog = activityLog;
                this.save(data);
            }
        } catch (error) {
            console.error('Ошибка добавления активности:', error);
        }
    }

    // Получить настройки
    getSettings() {
        try {
            const data = this.getAll();
            return data?.settings || {};
        } catch (error) {
            console.error('Ошибка получения настроек:', error);
            return {};
        }
    }

    // Сохранить настройки
    saveSettings(settings) {
        try {
            const data = this.getAll();
            if (data) {
                data.settings = settings;
                this.save(data);
            }
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
        }
    }

    // Экспорт базы данных
    export() {
        try {
            return this.getAll();
        } catch (error) {
            console.error('Ошибка экспорта данных:', error);
            return null;
        }
    }

    // Импорт базы данных
    import(importData) {
        try {
            if (importData && importData.version) {
                this.save(importData);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Ошибка импорта данных:', error);
            return false;
        }
    }

    // Очистить базу данных
    clear() {
        try {
            const initialData = {
                version: '1.0.0',
                machines: [],
                toolTypes: {
                    "Торцевая фреза": [],
                    "Концевая фреза": [],
                    "Фасонная фреза": [],
                    "Сверло спиральное": [],
                    "Зенковка": [],
                    "Развертка": [],
                    "Резьбофреза": [],
                    "Расточной резец": [],
                    "Фреза червячная": [],
                    "Дисковая фреза": []
                },
                tools: [],
                activityLog: [],
                settings: {
                    autoBackup: true,
                    syncInterval: 3000
                }
            };
            this.save(initialData);
        } catch (error) {
            console.error('Ошибка очистки базы данных:', error);
        }
    }
}

// Создаем глобальный экземпляр базы данных
window.toolDatabase = new ToolDatabase();