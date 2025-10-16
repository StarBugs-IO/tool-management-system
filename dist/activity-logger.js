// activity-logger.js - Упрощенная система логирования действий
class ActivityLogger {
    constructor() {
        this.logFileName = 'activity_logs.json';
        this.maxEntries = 100;
        this.init();
    }

    init() {
        if (!this.logFileExists()) {
            this.createLogFile();
        }
    }

    logFileExists() {
        try {
            return localStorage.getItem(this.logFileName) !== null;
        } catch (error) {
            return false;
        }
    }

    createLogFile() {
        const initialData = {
            version: '1.0.0',
            created: new Date().toISOString(),
            entries: []
        };
        localStorage.setItem(this.logFileName, JSON.stringify(initialData));
    }

    getLogFile() {
        try {
            const logFile = localStorage.getItem(this.logFileName);
            return logFile ? JSON.parse(logFile) : null;
        } catch (error) {
            return null;
        }
    }

    logActivity(action, details = {}) {
        const logEntry = {
            id: 'act_' + Date.now(),
            timestamp: new Date().toISOString(),
            action: action,
            details: details
        };

        const logFile = this.getLogFile();
        if (logFile) {
            if (!logFile.entries) logFile.entries = [];
            logFile.entries.unshift(logEntry);
            
            if (logFile.entries.length > this.maxEntries) {
                logFile.entries = logFile.entries.slice(0, this.maxEntries);
            }
            
            localStorage.setItem(this.logFileName, JSON.stringify(logFile));
        }
    }

    getRecentActivities(limit = 5) {
        const logFile = this.getLogFile();
        
        if (!logFile || !logFile.entries || logFile.entries.length === 0) {
            return [];
        }

        return logFile.entries.slice(0, limit);
    }
}

// Создаем глобальный экземпляр логгера действий
window.activityLogger = new ActivityLogger();