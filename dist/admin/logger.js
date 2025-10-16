// logger.js - Система логирования операций
class OperationLogger {
    constructor() {
        this.logFileName = 'tool_management_operations.log';
        this.maxFileSize = 5 * 1024 * 1024; // 5MB максимальный размер файла
        this.init();
    }

    init() {
        // Проверяем существование файла логов
        if (!this.logFileExists()) {
            this.createLogFile();
        }
    }

    logFileExists() {
        try {
            const logFile = localStorage.getItem(this.logFileName);
            return logFile !== null;
        } catch (error) {
            console.error('Ошибка проверки файла логов:', error);
            return false;
        }
    }

    createLogFile() {
        const initialLog = {
            version: '1.0.0',
            created: new Date().toISOString(),
            entries: []
        };
        this.saveLogFile(initialLog);
        console.log('✅ Файл логов создан');
    }

    saveLogFile(logData) {
        try {
            localStorage.setItem(this.logFileName, JSON.stringify(logData));
        } catch (error) {
            console.error('Ошибка сохранения файла логов:', error);
            this.rotateLogs(); // Пытаемся очистить старые логи
        }
    }

    getLogFile() {
        try {
            const logFile = localStorage.getItem(this.logFileName);
            return logFile ? JSON.parse(logFile) : null;
        } catch (error) {
            console.error('Ошибка чтения файла логов:', error);
            return null;
        }
    }

    // Добавление записи в лог
    addEntry(action, details = {}) {
        const logEntry = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            action: action,
            details: details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        const logFile = this.getLogFile();
        if (logFile && logFile.entries) {
            logFile.entries.push(logEntry);
            
            // Ограничиваем количество записей (последние 1000)
            if (logFile.entries.length > 1000) {
                logFile.entries = logFile.entries.slice(-1000);
            }
            
            this.saveLogFile(logFile);
        } else {
            console.error('Файл логов поврежден, создаем новый');
            this.createLogFile();
            this.addEntry(action, details); // Повторяем попытку
        }

        console.log('📝 Логирована операция:', action);
    }

    // Получение логов с фильтрацией
    getLogs(options = {}) {
        const { 
            limit = 100, 
            offset = 0, 
            actionFilter = null,
            dateFrom = null,
            dateTo = null 
        } = options;

        const logFile = this.getLogFile();
        if (!logFile || !logFile.entries) {
            return [];
        }

        let filteredLogs = logFile.entries;

        // Фильтрация по действию
        if (actionFilter) {
            filteredLogs = filteredLogs.filter(entry => 
                entry.action.toLowerCase().includes(actionFilter.toLowerCase())
            );
        }

        // Фильтрация по дате
        if (dateFrom) {
            filteredLogs = filteredLogs.filter(entry => 
                new Date(entry.timestamp) >= new Date(dateFrom)
            );
        }

        if (dateTo) {
            filteredLogs = filteredLogs.filter(entry => 
                new Date(entry.timestamp) <= new Date(dateTo)
            );
        }

        // Сортировка по времени (новые сначала)
        filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Пагинация
        return filteredLogs.slice(offset, offset + limit);
    }

    // Получение статистики логов
    getLogStats() {
        const logFile = this.getLogFile();
        if (!logFile || !logFile.entries || logFile.entries.length === 0) {
            return { 
                total: 0, 
                actions: {},
                period: {
                    first: null,
                    last: null
                }
            };
        }

        const entries = logFile.entries;
        const stats = {
            total: entries.length,
            actions: {},
            period: {
                first: entries[entries.length - 1].timestamp, // Самая старая запись
                last: entries[0].timestamp // Самая новая запись
            }
        };

        // Статистика по типам действий
        entries.forEach(entry => {
            stats.actions[entry.action] = (stats.actions[entry.action] || 0) + 1;
        });

        return stats;
    }

    // Очистка старых логов
    rotateLogs() {
        const logFile = this.getLogFile();
        if (logFile && logFile.entries) {
            // Оставляем только последние 500 записей
            logFile.entries = logFile.entries.slice(-500);
            this.saveLogFile(logFile);
            console.log('🔄 Логи очищены, оставлено последних 500 записей');
        }
    }

    // Экспорт логов в файл
    exportLogs(format = 'json') {
        const logFile = this.getLogFile();
        if (!logFile) return null;

        if (format === 'json') {
            const dataStr = JSON.stringify(logFile, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            return URL.createObjectURL(dataBlob);
        } else if (format === 'csv') {
            const csv = this.convertToCSV(logFile.entries);
            const dataBlob = new Blob([csv], { type: 'text/csv' });
            return URL.createObjectURL(dataBlob);
        }

        return null;
    }

    convertToCSV(entries) {
        const headers = ['ID', 'Timestamp', 'Action', 'Details', 'URL'];
        const csvRows = [headers.join(',')];

        entries.forEach(entry => {
            const row = [
                entry.id,
                `"${entry.timestamp}"`,
                `"${entry.action}"`,
                `"${JSON.stringify(entry.details).replace(/"/g, '""')}"`,
                `"${entry.url}"`
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    // Очистка всех логов
    clearLogs() {
        this.createLogFile();
        console.log('🗑️ Все логи очищены');
    }
}

// Создаем глобальный экземпляр логгера
window.operationLogger = new OperationLogger();