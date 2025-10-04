class AdminPanel {
    constructor() {
        this.machines = JSON.parse(localStorage.getItem('admin_machines')) || [
            { id: 1, name: "ТСЗ-Ф13-70", status: "active", cells: 24 },
            { id: 2, name: "KVL-1361A", status: "active", cells: 24 },
            { id: 3, name: "KVL-1260A", status: "active", cells: 24 }
        ];

        this.toolTypes = JSON.parse(localStorage.getItem('admin_toolTypes')) || {
            'Фреза': Array.from({ length: 24 - 1.5 + 1 }, (_, i) => (1.5 + i * 0.5).toFixed(1)),
            'Сверло': [3, 4, 5, 5.5, 5.8, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18],
            'Резьбофреза': [],
            "Дисковая фреза": [],
            "Расточной инструмент": [],
            'Развертка': Array.from({ length: 24 }, (_, i) => i + 1),
            'Центровка': []
        };

        this.activityLog = JSON.parse(localStorage.getItem('admin_activity')) || [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
        this.loadMachines();
        this.loadToolTypes();
        this.logActivity('Админ-панель запущена');
    }

    setupEventListeners() {
        // Навигация по разделам
        document.querySelectorAll('.admin-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    const target = link.getAttribute('href').substring(1);
                    this.showSection(target);
                }
            });
        });

        // Форма добавления станка
        document.getElementById('machineForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMachine();
        });

        // Форма добавления типа инструмента
        document.getElementById('toolTypeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addToolType();
        });
    }

    showSection(sectionId) {
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        
        document.getElementById(sectionId).classList.add('active');
        
        document.querySelectorAll('.admin-menu a').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.logActivity(`Переход в раздел: ${sectionId}`);
    }

    loadDashboard() {
        const tools = JSON.parse(localStorage.getItem('tools')) || [];
        const totalTools = tools.length;
        
        const occupiedCells = new Set(
            tools.map(tool => `${tool.machine}-${tool.cellNumber}`)
        ).size;
        
        const activeMachines = this.machines.filter(m => m.status === 'active').length;
        const totalCells = this.machines.reduce((sum, machine) => sum + machine.cells, 0);
        const freeCells = totalCells - occupiedCells;

        document.getElementById('totalTools').textContent = totalTools;
        document.getElementById('occupiedCells').textContent = occupiedCells;
        document.getElementById('activeMachines').textContent = activeMachines;
        document.getElementById('freeCells').textContent = freeCells;

        this.loadRecentActivity();
    }

    loadRecentActivity() {
        const activityList = document.getElementById('recentActivity');
        activityList.innerHTML = '';

        const recentActivities = this.activityLog.slice(-5).reverse();
        
        if (recentActivities.length === 0) {
            activityList.innerHTML = '<div class="activity-item">Нет recent activity</div>';
            return;
        }

        recentActivities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            const time = new Date(activity.timestamp).toLocaleString();
            activityItem.innerHTML = `
                <strong>${activity.action}</strong>
                <br>
                <small>${time}</small>
            `;
            
            activityList.appendChild(activityItem);
        });
    }

    loadMachines() {
        const machinesList = document.getElementById('machinesList');
        machinesList.innerHTML = '';

        this.machines.forEach(machine => {
            const machineCard = document.createElement('div');
            machineCard.className = 'item-card';
            
            const statusBadge = this.getStatusBadge(machine.status);
            
            machineCard.innerHTML = `
                <div class="item-info">
                    <h3>${machine.name}</h3>
                    <p>Ячеек: ${machine.cells} | Статус: ${statusBadge}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-secondary" onclick="adminPanel.editMachine(${machine.id})">✏️</button>
                    <button class="btn-danger" onclick="adminPanel.deleteMachine(${machine.id})">🗑️</button>
                </div>
            `;
            
            machinesList.appendChild(machineCard);
        });
    }

    loadToolTypes() {
        const toolTypesList = document.getElementById('toolTypesList');
        toolTypesList.innerHTML = '';

        Object.keys(this.toolTypes).forEach(toolType => {
            const sizes = this.toolTypes[toolType];
            const toolTypeCard = document.createElement('div');
            toolTypeCard.className = 'item-card';
            
            toolTypeCard.innerHTML = `
                <div class="item-info">
                    <h3>${toolType}</h3>
                    <p>Доступные размеры: ${sizes.length > 0 ? sizes.join(', ') : 'Не требуются'}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-secondary" onclick="adminPanel.editToolType('${toolType}')">✏️</button>
                    <button class="btn-danger" onclick="adminPanel.deleteToolType('${toolType}')">🗑️</button>
                </div>
            `;
            
            toolTypesList.appendChild(toolTypeCard);
        });
    }

    getStatusBadge(status) {
        const badges = {
            'active': '🟢 Активный',
            'maintenance': '🟡 На обслуживании',
            'inactive': '🔴 Неактивный'
        };
        return badges[status] || status;
    }

    addMachine() {
        const name = document.getElementById('machineName').value;
        const cells = parseInt(document.getElementById('machineCells').value);
        const status = document.getElementById('machineStatus').value;

        const newMachine = {
            id: Date.now(),
            name: name,
            cells: cells,
            status: status
        };

        this.machines.push(newMachine);
        this.saveData();
        this.loadMachines();
        this.loadDashboard();
        this.closeModal('addMachineModal');
        this.logActivity(`Добавлен станок: ${name}`);
        
        this.syncWithMainApp();
    }

    addToolType() {
        const name = document.getElementById('toolTypeName').value;
        const sizesInput = document.getElementById('toolTypeSizes').value;
        
        let sizes = [];
        if (sizesInput.trim()) {
            sizes = sizesInput.split(',').map(size => size.trim()).filter(size => size);
        }

        this.toolTypes[name] = sizes;
        this.saveData();
        this.loadToolTypes();
        this.closeModal('addToolTypeModal');
        this.logActivity(`Добавлен тип инструмента: ${name}`);
        
        this.syncWithMainApp();
    }

    editMachine(machineId) {
        const machine = this.machines.find(m => m.id === machineId);
        if (machine) {
            document.getElementById('machineName').value = machine.name;
            document.getElementById('machineCells').value = machine.cells;
            document.getElementById('machineStatus').value = machine.status;
            
            // Здесь можно открыть модальное окно редактирования
            this.logActivity(`Редактирование станка: ${machine.name}`);
        }
    }

    deleteMachine(machineId) {
        if (confirm('Вы уверены, что хотите удалить этот станок?')) {
            const machine = this.machines.find(m => m.id === machineId);
            this.machines = this.machines.filter(m => m.id !== machineId);
            this.saveData();
            this.loadMachines();
            this.loadDashboard();
            this.logActivity(`Удален станок: ${machine.name}`);
            
            this.syncWithMainApp();
        }
    }

    editToolType(toolType) {
        const sizes = this.toolTypes[toolType];
        document.getElementById('toolTypeName').value = toolType;
        document.getElementById('toolTypeSizes').value = sizes.join(', ');
        
        // Здесь можно открыть модальное окно редактирования
        this.logActivity(`Редактирование типа инструмента: ${toolType}`);
    }

    deleteToolType(toolType) {
        if (confirm(`Вы уверены, что хотите удалить тип "${toolType}"?`)) {
            delete this.toolTypes[toolType];
            this.saveData();
            this.loadToolTypes();
            this.logActivity(`Удален тип инструмента: ${toolType}`);
            
            this.syncWithMainApp();
        }
    }

    syncWithMainApp() {
        // Сохраняем данные для основного приложения
        localStorage.setItem('admin_machines', JSON.stringify(this.machines));
        localStorage.setItem('admin_toolTypes', JSON.stringify(this.toolTypes));
        
        this.logActivity('Синхронизация данных с главным приложением');
    }

    saveData() {
        localStorage.setItem('admin_machines', JSON.stringify(this.machines));
        localStorage.setItem('admin_toolTypes', JSON.stringify(this.toolTypes));
        localStorage.setItem('admin_activity', JSON.stringify(this.activityLog));
    }

    logActivity(action) {
        const activity = {
            action: action,
            timestamp: new Date().toISOString()
        };
        
        this.activityLog.push(activity);
        
        // Сохраняем только последние 50 записей
        if (this.activityLog.length > 50) {
            this.activityLog = this.activityLog.slice(-50);
        }
        
        localStorage.setItem('admin_activity', JSON.stringify(this.activityLog));
        
        // Обновляем активность на дашборде
        if (document.getElementById('dashboard').classList.contains('active')) {
            this.loadRecentActivity();
        }
    }

    // Генерация отчетов
    generateUsageReport() {
        const tools = JSON.parse(localStorage.getItem('tools')) || [];
        const report = {
            title: 'Отчет по использованию инструментов',
            generated: new Date().toLocaleString(),
            totalTools: tools.length,
            toolsByMachine: {},
            toolsByType: {}
        };

        tools.forEach(tool => {
            // Группировка по станкам
            if (!report.toolsByMachine[tool.machine]) {
                report.toolsByMachine[tool.machine] = 0;
            }
            report.toolsByMachine[tool.machine]++;

            // Группировка по типам
            if (!report.toolsByType[tool.toolType]) {
                report.toolsByType[tool.toolType] = 0;
            }
            report.toolsByType[tool.toolType]++;
        });

        console.log('Отчет по использованию:', report);
        alert('Отчет сгенерирован в консоли разработчика');
        this.logActivity('Сгенерирован отчет по использованию');
    }

    generateInventoryReport() {
        const tools = JSON.parse(localStorage.getItem('tools')) || [];
        const csvContent = this.convertToCSV(tools);
        this.downloadCSV(csvContent, 'inventory_report.csv');
        this.logActivity('Сгенерирован отчет инвентаризации');
    }

    convertToCSV(data) {
        const headers = ['Станок', 'Тип инструмента', 'Размер', 'Ячейка', 'Дата добавления'];
        const csv = [headers.join(',')];
        
        data.forEach(item => {
            const row = [
                item.machine,
                item.toolType,
                item.toolSize || '',
                item.cellNumber,
                new Date(item.dateAdded).toLocaleDateString()
            ];
            csv.push(row.join(','));
        });
        
        return csv.join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    backupData() {
        const backup = {
            tools: JSON.parse(localStorage.getItem('tools')) || [],
            machines: this.machines,
            toolTypes: this.toolTypes,
            timestamp: new Date().toISOString()
        };

        const backupStr = JSON.stringify(backup, null, 2);
        const blob = new Blob([backupStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.logActivity('Создан backup данных');
        alert('Backup успешно создан!');
    }

    restoreData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = event => {
                try {
                    const backup = JSON.parse(event.target.result);
                    
                    if (confirm('Восстановить данные из backup? Текущие данные будут заменены.')) {
                        localStorage.setItem('tools', JSON.stringify(backup.tools || []));
                        this.machines = backup.machines || [];
                        this.toolTypes = backup.toolTypes || {};
                        
                        this.saveData();
                        this.loadDashboard();
                        this.loadMachines();
                        this.loadToolTypes();
                        
                        this.logActivity('Данные восстановлены из backup');
                        alert('Данные успешно восстановлены!');
                    }
                } catch (error) {
                    alert('Ошибка при чтении backup файла');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    clearAllData() {
        if (confirm('ВНИМАНИЕ! Это действие удалит ВСЕ данные. Продолжить?')) {
            localStorage.removeItem('tools');
            localStorage.removeItem('admin_machines');
            localStorage.removeItem('admin_toolTypes');
            localStorage.removeItem('admin_activity');
            
            this.machines = [
                { id: 1, name: "ТСЗ-Ф13-70", status: "active", cells: 24 },
                { id: 2, name: "KVL-1361A", status: "active", cells: 24 },
                { id: 3, name: "KVL-1260A", status: "active", cells: 24 }
            ];
            
            this.toolTypes = {
                'Фреза': Array.from({ length: 24 - 1.5 + 1 }, (_, i) => (1.5 + i * 0.5).toFixed(1)),
                'Сверло': [3, 4, 5, 5.5, 5.8, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18],
                'Развертка': Array.from({ length: 24 }, (_, i) => i + 1)
            };
            
            this.activityLog = [];
            
            this.saveData();
            this.loadDashboard();
            this.loadMachines();
            this.loadToolTypes();
            
            this.logActivity('Все данные очищены');
            alert('Все данные успешно очищены!');
        }
    }
}

// Глобальные функции для модальных окон
function showAddMachineModal() {
    document.getElementById('addMachineModal').style.display = 'block';
    document.getElementById('machineForm').reset();
}

function showAddToolTypeModal() {
    document.getElementById('addToolTypeModal').style.display = 'block';
    document.getElementById('toolTypeForm').reset();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Закрытие модальных окон при клике вне их
window.onclick = function(event) {
    const modals = document.getElementsByClassName('modal');
    for (let modal of modals) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
}

// Инициализация админ-панели
const adminPanel = new AdminPanel();

// Глобальные функции для кнопок
function generateUsageReport() {
    adminPanel.generateUsageReport();
}

function generateInventoryReport() {
    adminPanel.generateInventoryReport();
}

function backupData() {
    adminPanel.backupData();
}

function restoreData() {
    adminPanel.restoreData();
}

function clearAllData() {
    adminPanel.clearAllData();
}