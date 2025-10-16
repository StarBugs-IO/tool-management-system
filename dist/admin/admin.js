// admin.js - Упрощенная рабочая версия
class AdminPanel {
    constructor() {
        this.db = this.getDatabase();
        this.activityLogger = this.getActivityLogger();
        this.editingMachine = null;
        this.editingToolType = null;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
            this.updateGitHubStars();
        }
    }

    getDatabase = () => {
        if (typeof window.toolDatabase !== 'undefined') {
            return window.toolDatabase;
        } else {
            console.warn('Глобальная база данных не найдена, создаем временную');
            return this.createTempDatabase();
        }
    }

    createTempDatabase = () => {
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

    getActivityLogger = () => {
        if (typeof window.activityLogger !== 'undefined') {
            return window.activityLogger;
        } else {
            console.warn('ActivityLogger не найден, используем временный');
            return {
                logActivity: (action, details) => {
                    console.log('📝 Действие:', action);
                },
                getRecentActivities: () => []
            };
        }
    }

    updateGitHubStars = async () => {
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

    init = async () => {
        console.log('🔄 Инициализация админ-панели...');
        
        try {
            // Загружаем данные с сервера
            await this.loadDataFromServer();
            
            // Настройка базовых обработчиков
            this.setupBasicEventListeners();
            
            // Загрузка данных
            this.loadDashboard();
            this.loadMachines();
            this.loadToolTypes();
            
            this.logActivity('Админ-панель запущена');
            console.log('✅ Админ-панель успешно инициализирована');
        } catch (error) {
            console.error('❌ Ошибка инициализации админ-панели:', error);
        }
    }

    loadDataFromServer = async () => {
        try {
            const response = await fetch(`${window.location.origin}/api/full-data`);
            if (response.ok) {
                const serverData = await response.json();
                console.log('📥 Данные с сервера:', serverData);
                
                // Обновляем локальную базу данными с сервера
                if (serverData.tools) {
                    this.db.saveTools(serverData.tools);
                }
                if (serverData.machines) {
                    this.db.saveMachines(serverData.machines);
                }
                if (serverData.toolTypes) {
                    this.db.saveToolTypes(serverData.toolTypes);
                }
                
                console.log('✅ Данные админки загружены с сервера');
            }
        } catch (error) {
            console.log('⚠️ Не удалось загрузить данные админки с сервера, работаем локально');
        }
    }

    setupBasicEventListeners = () => {
        console.log('🔧 Настройка обработчиков...');
        
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

    showSection = (sectionId) => {
        console.log('📂 Переход в раздел:', sectionId);
        
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

    loadDashboard = () => {
        console.log('📊 Загрузка дашборда...');
        
        const tools = this.db.getTools();
        const machines = this.db.getMachines();
        
        console.log('🔧 Инструменты:', tools);
        console.log('🏭 Станки:', machines);
        
        const totalTools = tools.length;
        const occupiedCells = new Set(
            tools.map(tool => `${tool.machine}-${tool.cellNumber}`)
        ).size;
        
        const activeMachines = machines.filter(m => m.status === 'active').length;
        const totalCells = machines.reduce((sum, machine) => sum + (machine.cells || 0), 0);
        const freeCells = totalCells - occupiedCells;

        console.log('📈 Статистика:', {
            totalTools,
            occupiedCells,
            activeMachines,
            totalCells,
            freeCells
        });

        // Обновляем статистику
        this.updateElement('totalTools', totalTools);
        this.updateElement('occupiedCells', occupiedCells);
        this.updateElement('activeMachines', activeMachines);
        this.updateElement('freeCells', freeCells);

        this.loadRecentActivity();
    }

    updateElement = (elementId, value) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            console.log(`✅ Обновлен ${elementId}: ${value}`);
        } else {
            console.warn(`❌ Элемент ${elementId} не найден`);
        }
    }

    loadRecentActivity = () => {
        const activityList = document.getElementById('recentActivity');
        if (!activityList) {
            console.warn('❌ Элемент recentActivity не найден');
            return;
        }
        
        const recentActivities = this.activityLogger.getRecentActivities(5);
        console.log('📝 Последние действия:', recentActivities);
        
        activityList.innerHTML = '';

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

    loadMachines = () => {
        const machinesList = document.getElementById('machinesList');
        if (!machinesList) {
            console.log('Элемент machinesList не найден, создаем...');
            this.createMachinesSection();
            return;
        }
        
        const machines = this.db.getMachines();
        console.log('🏭 Загрузка станков:', machines);
        
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

    loadToolTypes = () => {
        const toolTypesList = document.getElementById('toolTypesList');
        if (!toolTypesList) {
            console.log('Элемент toolTypesList не найден, создаем...');
            this.createToolTypesSection();
            return;
        }
        
        const toolTypes = this.db.getToolTypes();
        console.log('🔧 Загрузка типов инструментов:', toolTypes);
        
        toolTypesList.innerHTML = '';

        const toolTypeKeys = Object.keys(toolTypes);
        
        // Фиксированный список стандартных инструментов
        const standardTools = [
            "Торцевая фреза", "Концевая фреза", "Фасонная фреза", "Сверло спиральное", 
            "Зенковка", "Развертка", "Резьбофреза", "Расточной резец", 
            "Фреза червячная", "Дисковая фреза"
        ];

        if (toolTypeKeys.length === 0) {
            toolTypesList.innerHTML = '<div class="no-data">Нет добавленных типов инструментов</div>';
            return;
        }

        // Сначала отображаем стандартные типы
        standardTools.forEach(toolType => {
            const toolTypeCard = document.createElement('div');
            toolTypeCard.className = 'item-card standard-tool-card';
            toolTypeCard.innerHTML = `
                <div class="item-info">
                    <h3>${toolType}</h3>
                    <span class="standard-badge">Стандартный тип</span>
                </div>
                <div class="item-actions">
                    <button class="btn-secondary" onclick="adminPanel.renameToolType('${toolType}')">✏️ Переименовать</button>
                    <button class="btn-danger" onclick="adminPanel.deleteToolType('${toolType}')">🗑️ Удалить</button>
                </div>
            `;
            toolTypesList.appendChild(toolTypeCard);
        });

        // Затем пользовательские типы
        toolTypeKeys.forEach(toolType => {
            if (!standardTools.includes(toolType)) {
                const toolTypeCard = document.createElement('div');
                toolTypeCard.className = 'item-card custom-tool-card';
                toolTypeCard.innerHTML = `
                    <div class="item-info">
                        <h3>${toolType}</h3>
                        <span class="custom-badge">Пользовательский тип</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-secondary" onclick="adminPanel.renameToolType('${toolType}')">✏️ Переименовать</button>
                        <button class="btn-danger" onclick="adminPanel.deleteToolType('${toolType}')">🗑️ Удалить</button>
                    </div>
                `;
                toolTypesList.appendChild(toolTypeCard);
            }
        });
    }

    // Остальные функции остаются без изменений...
    getStatusBadge = (status) => {
        const badges = {
            'active': '🟢 Активный',
            'maintenance': '🟡 На обслуживании',
            'inactive': '🔴 Неактивный'
        };
        return badges[status] || status;
    }

    addMachine = async () => {
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
        
        this.logActivity(`Добавлен станок: ${name}`);
        this.showNotification('Станок успешно добавлен!');
        this.closeModal('addMachineModal');
        
        // Обновляем список станков
        this.loadMachines();
    }

    addToolType = async () => {
        const name = document.getElementById('toolTypeName')?.value;

        if (!name) {
            this.showNotification('Пожалуйста, укажите название типа инструмента', true);
            return;
        }

        const toolTypes = this.db.getToolTypes();
        
        // Проверяем, что тип с таким именем не существует
        if (toolTypes[name] !== undefined) {
            this.showNotification(`Тип инструмента "${name}" уже существует!`, true);
            return;
        }
        
        // Создаем новый тип с пустым массивом размеров
        toolTypes[name] = [];
        this.db.saveToolTypes(toolTypes);
        
        this.logActivity(`Добавлен тип инструмента: ${name}`);
        this.showNotification('Тип инструмента успешно добавлен!');
        this.closeModal('addToolTypeModal');
        
        // Обновляем список типов
        this.loadToolTypes();
    }

    renameToolType = (oldName) => {
        const newName = prompt(`Введите новое название для типа "${oldName}":`, oldName);
        
        if (!newName || newName.trim() === '' || newName === oldName) {
            return;
        }
        
        const toolTypes = this.db.getToolTypes();
        
        // Проверяем, что новое имя не занято
        if (toolTypes[newName] !== undefined) {
            this.showNotification(`Тип инструмента "${newName}" уже существует!`, true);
            return;
        }
        
        // Сохраняем размеры под новым именем и удаляем старое
        toolTypes[newName] = toolTypes[oldName] || [];
        delete toolTypes[oldName];
        
        this.db.saveToolTypes(toolTypes);
        
        // Обновляем все инструменты, которые используют старый тип
        this.updateToolsWithNewTypeName(oldName, newName);
        
        this.logActivity(`Переименован тип инструмента: "${oldName}" → "${newName}"`);
        this.showNotification('Тип инструмента успешно переименован!');
        this.loadToolTypes();
    }

    updateToolsWithNewTypeName = (oldName, newName) => {
        const tools = this.db.getTools();
        let updatedCount = 0;
        
        const updatedTools = tools.map(tool => {
            if (tool.toolType === oldName) {
                updatedCount++;
                return {
                    ...tool,
                    toolType: newName
                };
            }
            return tool;
        });
        
        if (updatedCount > 0) {
            this.db.saveTools(updatedTools);
            this.logActivity(`Обновлено ${updatedCount} инструментов с новым типом`);
        }
    }

    deleteToolType = async (toolType) => {
        // Проверяем, используется ли этот тип в инструментах
        const tools = this.db.getTools();
        const toolsUsingThisType = tools.filter(tool => tool.toolType === toolType);
        
        if (toolsUsingThisType.length > 0) {
            this.showNotification(`Нельзя удалить тип "${toolType}"! Он используется в ${toolsUsingThisType.length} инструментах.`, true);
            return;
        }
        
        if (confirm(`Вы уверены, что хотите удалить тип "${toolType}"?`)) {
            const toolTypes = this.db.getToolTypes();
            delete toolTypes[toolType];
            
            this.db.saveToolTypes(toolTypes);
            
            this.logActivity(`Удален тип инструмента: ${toolType}`);
            this.showNotification('Тип инструмента успешно удален!');
            this.loadToolTypes();
        }
    }

    editMachine = (machineId) => {
        const machines = this.db.getMachines();
        const machine = machines.find(m => m.id === machineId);
        
        if (machine) {
            this.showNotification('Редактирование станков временно недоступно');
        }
    }

    deleteMachine = async (machineId) => {
        if (confirm('Вы уверены, что хотите удалить этот станок?')) {
            const machines = this.db.getMachines();
            const machine = machines.find(m => m.id === machineId);
            const updatedMachines = machines.filter(m => m.id !== machineId);
            
            this.db.saveMachines(updatedMachines);
            
            if (machine) {
                this.logActivity(`Удален станок: ${machine.name}`);
            }
            this.showNotification('Станок успешно удален!');
            this.loadMachines();
        }
    }

    logActivity = (action, details = {}) => {
        this.activityLogger.logActivity(action, details);
    }

    showNotification = (message, isError = false) => {
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

    showModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeModal = (modalId) => {
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

    createMachinesSection = () => {
        const machinesSection = document.getElementById('machines');
        if (!machinesSection) return;
        
        const machinesList = document.createElement('div');
        machinesList.id = 'machinesList';
        machinesList.className = 'items-list';
        machinesSection.appendChild(machinesList);
        
        this.loadMachines();
    }

    createToolTypesSection = () => {
        const toolsSection = document.getElementById('tools');
        if (!toolsSection) return;
        
        const toolTypesList = document.createElement('div');
        toolTypesList.id = 'toolTypesList';
        toolTypesList.className = 'items-list';
        toolsSection.appendChild(toolTypesList);
        
        this.loadToolTypes();
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