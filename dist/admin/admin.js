// admin.js - Упрощенная рабочая версия с синхронизацией
class AdminPanel {
    constructor() {
        this.db = this.getDatabase();
        this.editingMachine = null;
        this.editingToolType = null;
        
        // Инициализация после загрузки DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
            this.updateGitHubStars();
        }
    }

// Добавьте метод:
async updateGitHubStars() {
    try {
        const response = await fetch('https://api.github.com/repos/StarBugs-IO/tool-management-system');
        if (response.ok) {
            const repoData = await response.json();
            const stars = repoData.stargazers_count;
            const starsElement = document.getElementById('githubStars');
            if (starsElement) {
                starsElement.textContent = stars;
            }
        }
    } catch (error) {
        console.log('Не удалось получить данные GitHub');
    }
}

    getDatabase() {
        if (typeof window.toolDatabase !== 'undefined') {
            return window.toolDatabase;
        } else {
            console.warn('Глобальная база данных не найдена, создаем временную');
            return this.createTempDatabase();
        }
    }

    createTempDatabase() {
        return {
            getMachines: () => JSON.parse(localStorage.getItem('admin_machines')) || [],
            saveMachines: (machines) => localStorage.setItem('admin_machines', JSON.stringify(machines)),
            getToolTypes: () => JSON.parse(localStorage.getItem('admin_toolTypes')) || {},
            saveToolTypes: (toolTypes) => localStorage.setItem('admin_toolTypes', JSON.stringify(toolTypes)),
            getTools: () => JSON.parse(localStorage.getItem('tools_backup')) || [],
            saveTools: (tools) => localStorage.setItem('tools_backup', JSON.stringify(tools)),
            getActivityLog: () => JSON.parse(localStorage.getItem('admin_activity')) || [],
            addActivity: (action) => {
                const activityLog = JSON.parse(localStorage.getItem('admin_activity')) || [];
                activityLog.push({
                    action: action,
                    timestamp: new Date().toISOString()
                });
                if (activityLog.length > 100) activityLog.splice(0, activityLog.length - 100);
                localStorage.setItem('admin_activity', JSON.stringify(activityLog));
            }
        };
    }

    async init() {
        console.log('Инициализация админ-панели...');
        
        // Загружаем данные с сервера
        await this.loadDataFromServer();
        
        // Настройка базовых обработчиков
        this.setupBasicEventListeners();
        
        // Загрузка данных
        this.loadDashboard();
        this.loadMachines();
        this.loadToolTypes();
        
        this.logActivity('Админ-панель запущена');
        console.log('Админ-панель успешно инициализирована');
    }

    // НОВАЯ ФУНКЦИЯ: Загрузка данных с сервера
    async loadDataFromServer() {
        try {
            const response = await fetch(`${window.location.origin}/api/full-data`);
            if (response.ok) {
                const serverData = await response.json();
                
                // Обновляем локальную базу данными с сервера
                if (serverData.machines && serverData.machines.length > 0) {
                    this.db.saveMachines(serverData.machines);
                }
                
                if (serverData.toolTypes && Object.keys(serverData.toolTypes).length > 0) {
                    this.db.saveToolTypes(serverData.toolTypes);
                }
                
                console.log('✅ Данные админки загружены с сервера');
            }
        } catch (error) {
            console.log('⚠️ Не удалось загрузить данные админки с сервера');
        }
    }

    // НОВАЯ ФУНКЦИЯ: Синхронизация с сервером
    async syncWithServer() {
        try {
            const allData = {
                machines: this.db.getMachines(),
                toolTypes: this.db.getToolTypes(),
                tools: this.db.getTools()
            };
            
            const response = await fetch(`${window.location.origin}/api/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(allData)
            });
            
            if (response.ok) {
                console.log('✅ Настройки синхронизированы с сервером');
            }
        } catch (error) {
            console.log('⚠️ Сервер недоступен для синхронизации настроек');
        }
    }

    setupBasicEventListeners() {
        console.log('Настройка базовых обработчиков...');
        
        // Навигация
        const menuLinks = document.querySelectorAll('.admin-menu a');
        menuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    const target = link.getAttribute('href').substring(1);
                    this.showSection(target);
                }
            });
        });

        // Форма добавления станка
        const machineForm = document.getElementById('machineForm');
        if (machineForm) {
            machineForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addMachine();
            });
        }

        // Форма добавления типа инструмента
        const toolTypeForm = document.getElementById('toolTypeForm');
        if (toolTypeForm) {
            toolTypeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addToolType();
            });
        }
    }

    showSection(sectionId) {
        // Скрываем все разделы
        const sections = document.querySelectorAll('.admin-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Показываем выбранный раздел
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Обновляем активное меню
        const menuLinks = document.querySelectorAll('.admin-menu a');
        menuLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Загружаем данные для раздела
        if (sectionId === 'dashboard') {
            this.loadDashboard();
        } else if (sectionId === 'machines') {
            this.loadMachines();
        } else if (sectionId === 'tools') {
            this.loadToolTypes();
        }

        this.logActivity(`Переход в раздел: ${sectionId}`);
    }

    loadDashboard() {
        const tools = this.db.getTools();
        const machines = this.db.getMachines();
        
        const totalTools = tools.length;
        const occupiedCells = new Set(
            tools.map(tool => `${tool.machine}-${tool.cellNumber}`)
        ).size;
        
        const activeMachines = machines.filter(m => m.status === 'active').length;
        const totalCells = machines.reduce((sum, machine) => sum + machine.cells, 0);
        const freeCells = totalCells - occupiedCells;

        // Обновляем статистику если элементы существуют
        this.safeUpdateElement('totalTools', totalTools);
        this.safeUpdateElement('occupiedCells', occupiedCells);
        this.safeUpdateElement('activeMachines', activeMachines);
        this.safeUpdateElement('freeCells', freeCells);

        this.loadRecentActivity();
    }

    safeUpdateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    loadRecentActivity() {
        const activityList = document.getElementById('recentActivity');
        if (!activityList) return;
        
        const activityLog = this.db.getActivityLog();
        activityList.innerHTML = '';

        const recentActivities = activityLog.slice(-5).reverse();
        
        if (recentActivities.length === 0) {
            activityList.innerHTML = '<div class="activity-item">Нет недавних действий</div>';
            return;
        }

        recentActivities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <strong>${activity.action}</strong>
                <br>
                <small>${new Date(activity.timestamp).toLocaleString()}</small>
            `;
            activityList.appendChild(activityItem);
        });
    }

    loadMachines() {
        const machinesList = document.getElementById('machinesList');
        if (!machinesList) {
            console.log('Элемент machinesList не найден, создаем...');
            this.createMachinesSection();
            return;
        }
        
        const machines = this.db.getMachines();
        machinesList.innerHTML = '';

        if (machines.length === 0) {
            machinesList.innerHTML = '<div class="no-data">Нет добавленных станков</div>';
            return;
        }

        machines.forEach(machine => {
            const machineCard = document.createElement('div');
            machineCard.className = 'item-card';
            machineCard.innerHTML = `
                <div class="item-info">
                    <h3>${machine.name}</h3>
                    <p>Ячеек: ${machine.cells} | Статус: ${this.getStatusBadge(machine.status)}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-secondary" onclick="adminPanel.editMachine(${machine.id})">✏️ Редактировать</button>
                    <button class="btn-danger" onclick="adminPanel.deleteMachine(${machine.id})">🗑️ Удалить</button>
                </div>
            `;
            machinesList.appendChild(machineCard);
        });
    }

    createMachinesSection() {
        // Создаем раздел станков если его нет
        const machinesSection = document.getElementById('machines');
        if (!machinesSection) return;
        
        const machinesList = document.createElement('div');
        machinesList.id = 'machinesList';
        machinesList.className = 'items-list';
        machinesSection.appendChild(machinesList);
        
        this.loadMachines();
    }

    loadToolTypes() {
        const toolTypesList = document.getElementById('toolTypesList');
        if (!toolTypesList) {
            console.log('Элемент toolTypesList не найден, создаем...');
            this.createToolTypesSection();
            return;
        }
        
        const toolTypes = this.db.getToolTypes();
        toolTypesList.innerHTML = '';

        const toolTypeKeys = Object.keys(toolTypes);
        if (toolTypeKeys.length === 0) {
            toolTypesList.innerHTML = '<div class="no-data">Нет добавленных типов инструментов</div>';
            return;
        }

        toolTypeKeys.forEach(toolType => {
            const sizes = toolTypes[toolType];
            const toolTypeCard = document.createElement('div');
            toolTypeCard.className = 'item-card';
            toolTypeCard.innerHTML = `
                <div class="item-info">
                    <h3>${toolType}</h3>
                    <p>Размеры: ${sizes.length > 0 ? sizes.join(', ') : 'Не требуются'}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-secondary" onclick="adminPanel.editToolType('${toolType}')">✏️ Редактировать</button>
                    <button class="btn-danger" onclick="adminPanel.deleteToolType('${toolType}')">🗑️ Удалить</button>
                </div>
            `;
            toolTypesList.appendChild(toolTypeCard);
        });
    }

    createToolTypesSection() {
        // Создаем раздел типов инструментов если его нет
        const toolsSection = document.getElementById('tools');
        if (!toolsSection) return;
        
        const toolTypesList = document.createElement('div');
        toolTypesList.id = 'toolTypesList';
        toolTypesList.className = 'items-list';
        toolsSection.appendChild(toolTypesList);
        
        this.loadToolTypes();
    }

    getStatusBadge(status) {
        const badges = {
            'active': '🟢 Активный',
            'maintenance': '🟡 На обслуживании',
            'inactive': '🔴 Неактивный'
        };
        return badges[status] || status;
    }

    async addMachine() {
        const name = document.getElementById('machineName')?.value;
        const cells = parseInt(document.getElementById('machineCells')?.value);
        const status = document.getElementById('machineStatus')?.value;

        if (!name || !cells) {
            this.showNotification('Пожалуйста, заполните все обязательные поля', true);
            return;
        }

        const machines = this.db.getMachines();
        const newMachine = {
            id: Date.now(),
            name: name,
            cells: cells,
            status: status
        };

        machines.push(newMachine);
        this.db.saveMachines(machines);
        
        // Синхронизируем с сервером
        await this.syncWithServer();
        
        this.logActivity(`Добавлен станок: ${name}`);
        this.showNotification('Станок успешно добавлен!');
        this.closeModal('addMachineModal');
        
        // Обновляем список станков
        this.loadMachines();
    }

    async addToolType() {
        const name = document.getElementById('toolTypeName')?.value;
        const sizesInput = document.getElementById('toolTypeSizes')?.value;

        if (!name) {
            this.showNotification('Пожалуйста, укажите название типа инструмента', true);
            return;
        }

        let sizes = [];
        if (sizesInput && sizesInput.trim()) {
            sizes = sizesInput.split(',').map(size => size.trim()).filter(size => size);
        }

        const toolTypes = this.db.getToolTypes();
        toolTypes[name] = sizes;
        this.db.saveToolTypes(toolTypes);
        
        // Синхронизируем с сервером
        await this.syncWithServer();
        
        this.logActivity(`Добавлен тип инструмента: ${name}`);
        this.showNotification('Тип инструмента успешно добавлен!');
        this.closeModal('addToolTypeModal');
        
        // Обновляем список типов
        this.loadToolTypes();
    }

    editMachine(machineId) {
        const machines = this.db.getMachines();
        const machine = machines.find(m => m.id === machineId);
        
        if (machine) {
            this.showNotification('Редактирование станков временно недоступно');
        }
    }

    async deleteMachine(machineId) {
        if (confirm('Вы уверены, что хотите удалить этот станок?')) {
            const machines = this.db.getMachines();
            const machine = machines.find(m => m.id === machineId);
            const updatedMachines = machines.filter(m => m.id !== machineId);
            
            this.db.saveMachines(updatedMachines);
            
            // Синхронизируем с сервером
            await this.syncWithServer();
            
            if (machine) {
                this.logActivity(`Удален станок: ${machine.name}`);
            }
            this.showNotification('Станок успешно удален!');
            this.loadMachines();
        }
    }

    editToolType(toolType) {
        this.showNotification('Редактирование типов инструментов временно недоступно');
    }

    async deleteToolType(toolType) {
        if (confirm(`Вы уверены, что хотите удалить тип "${toolType}"?`)) {
            const toolTypes = this.db.getToolTypes();
            delete toolTypes[toolType];
            
            this.db.saveToolTypes(toolTypes);
            
            // Синхронизируем с сервером
            await this.syncWithServer();
            
            this.logActivity(`Удален тип инструмента: ${toolType}`);
            this.showNotification('Тип инструмента успешно удален!');
            this.loadToolTypes();
        }
    }

    logActivity(action) {
        this.db.addActivity(action);
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Сбрасываем формы
        if (modalId === 'addMachineModal') {
            document.getElementById('machineForm')?.reset();
        }
        if (modalId === 'addToolTypeModal') {
            document.getElementById('toolTypeForm')?.reset();
        }
    }

    showNotification(message, isError = false) {
        // Создаем или находим уведомление
        let notification = document.getElementById('adminNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'adminNotification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.className = isError ? 'notification error' : 'notification';
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// Глобальные функции для модальных окон
function showAddMachineModal() {
    const modal = document.getElementById('addMachineModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function showAddToolTypeModal() {
    const modal = document.getElementById('addToolTypeModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
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

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    window.adminPanel = new AdminPanel();
});

console.log('Admin Panel script loaded');

