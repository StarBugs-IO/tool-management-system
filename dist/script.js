// script.js - Версия с оптимизацией для мобильных устройств
const API_BASE = `${window.location.origin}/api`;
let tools = [];
let isConnected = true;
let syncInProgress = false;
let lastSyncTime = 0;
let lastChangeTime = 0;
let isHostClient = false;
let serverIp = '';
let isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Состояние формы
let formState = {
    machine: '',
    toolType: '',
    toolSize: '',
    cellNumber: ''
};

// Состояние выпадающих списков
let selectStates = {
    machine: '',
    toolType: '',
    toolSize: '',
    cellNumber: ''
};

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    await loadDataFromServer();
    setupEventListeners();
    
    // Для мобильных устройств используем только ручное обновление
    if (!isMobileDevice) {
        startRealTimeSync();
    }
    
    restoreFormState();
    updateConnectionInfo();
}

function setupEventListeners() {
    const toolForm = document.getElementById('toolForm');
    const toolTypeSelect = document.getElementById('toolType');
    const machineSelect = document.getElementById('machine');
    const toolSizeSelect = document.getElementById('toolSize');
    const cellNumberSelect = document.getElementById('cellNumber');
    
    // Сохраняем состояние выпадающих списков при изменении
    machineSelect.addEventListener('change', function() {
        formState.machine = this.value;
        selectStates.machine = this.value;
        updateCellNumberSelect();
        updateTable();
    });

    toolTypeSelect.addEventListener('change', function() {
        formState.toolType = this.value;
        selectStates.toolType = this.value;
        updateToolSizeSelect();
    });

    toolSizeSelect.addEventListener('change', function() {
        formState.toolSize = this.value;
        selectStates.toolSize = this.value;
    });

    cellNumberSelect.addEventListener('change', function() {
        formState.cellNumber = this.value;
        selectStates.cellNumber = this.value;
    });

    toolForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        await handleToolAddition();
    });

    // Обработчик кнопки обновления
    document.getElementById('refreshBtn')?.addEventListener('click', function() {
        manualRefresh();
    });
}

function restoreFormState() {
    // Восстанавливаем значения из сохраненного состояния
    if (selectStates.machine) {
        document.getElementById('machine').value = selectStates.machine;
    }
    if (selectStates.toolType) {
        document.getElementById('toolType').value = selectStates.toolType;
        updateToolSizeSelect();
    }
    if (selectStates.toolSize) {
        document.getElementById('toolSize').value = selectStates.toolSize;
    }
    if (selectStates.cellNumber) {
        document.getElementById('cellNumber').value = selectStates.cellNumber;
    }
}

async function handleToolAddition() {
    const machine = document.getElementById('machine').value;
    const toolType = document.getElementById('toolType').value;
    const toolSize = document.getElementById('toolSize').value;
    const cellNumber = document.getElementById('cellNumber').value;

    if (!cellNumber || !machine || !toolType) {
        showNotification('Пожалуйста, заполните все поля!', true);
        return;
    }
    
    const tool = { machine, toolType, toolSize, cellNumber };
    await addTool(tool);
    
    // Сохраняем текущие значения перед сбросом
    const currentMachine = selectStates.machine;
    const currentToolType = selectStates.toolType;
    
    // Сбрасываем форму, но сохраняем выбранные станок и тип
    document.getElementById('toolForm').reset();
    formState = { machine: '', toolType: '', toolSize: '', cellNumber: '' };
    
    // Восстанавливаем станок и тип инструмента
    if (currentMachine) {
        document.getElementById('machine').value = currentMachine;
        selectStates.machine = currentMachine;
    }
    if (currentToolType) {
        document.getElementById('toolType').value = currentToolType;
        selectStates.toolType = currentToolType;
    }
    
    updateToolSizeSelect();
    updateCellNumberSelect();
}

async function loadDataFromServer() {
    try {
        const response = await fetch(`${API_BASE}/full-data`);
        if (response.ok) {
            const serverData = await response.json();
            
            // Сохраняем текущие значения перед обновлением
            saveCurrentSelectValues();
            
            // Обновляем локальную базу данными с сервера
            if (serverData.tools) {
                window.toolDatabase.saveTools(serverData.tools);
                tools = serverData.tools;
            }
            if (serverData.machines) {
                window.toolDatabase.saveMachines(serverData.machines);
            }
            if (serverData.toolTypes) {
                window.toolDatabase.saveToolTypes(serverData.toolTypes);
            }
            
            // Сохраняем информацию о клиенте
            isHostClient = serverData.is_host || false;
            serverIp = serverData.server_ip || window.location.hostname;
            
            isConnected = true;
            lastSyncTime = serverData.timestamp || Date.now() / 1000;
            updateInterface();
            
            // Восстанавливаем значения после обновления
            restoreSelectValues();
        }
    } catch (error) {
        console.log('Сервер недоступен, работаем локально');
        isConnected = false;
        loadLocalData();
    }
}

function saveCurrentSelectValues() {
    // Сохраняем текущие значения выпадающих списков
    selectStates.machine = document.getElementById('machine').value;
    selectStates.toolType = document.getElementById('toolType').value;
    selectStates.toolSize = document.getElementById('toolSize').value;
    selectStates.cellNumber = document.getElementById('cellNumber').value;
}

function restoreSelectValues() {
    // Восстанавливаем значения выпадающих списков после обновления данных
    if (selectStates.machine) {
        const machineSelect = document.getElementById('machine');
        if (Array.from(machineSelect.options).some(opt => opt.value === selectStates.machine)) {
            machineSelect.value = selectStates.machine;
        }
    }
    
    if (selectStates.toolType) {
        const toolTypeSelect = document.getElementById('toolType');
        if (Array.from(toolTypeSelect.options).some(opt => opt.value === selectStates.toolType)) {
            toolTypeSelect.value = selectStates.toolType;
            updateToolSizeSelect();
        }
    }
    
    if (selectStates.toolSize) {
        const toolSizeSelect = document.getElementById('toolSize');
        if (Array.from(toolSizeSelect.options).some(opt => opt.value === selectStates.toolSize)) {
            toolSizeSelect.value = selectStates.toolSize;
        }
    }
    
    if (selectStates.cellNumber) {
        const cellNumberSelect = document.getElementById('cellNumber');
        if (Array.from(cellNumberSelect.options).some(opt => opt.value === selectStates.cellNumber)) {
            cellNumberSelect.value = selectStates.cellNumber;
        }
    }
}

function loadLocalData() {
    tools = window.toolDatabase.getTools();
    updateInterface();
}

function updateInterface() {
    updateMachineSelect();
    updateToolTypeSelect();
    updateCellNumberSelect();
    updateTable();
    updateConnectionInfo();
}

function updateConnectionInfo() {
    const connectionInfo = document.getElementById('connectionInfo');
    if (!connectionInfo) return;

    let infoHTML = '';
    
    if (isHostClient) {
        infoHTML = `
            <div class="connection-status">
                <span class="status-indicator host">🔒 Хост</span>
                <span class="ip-address">IP: ${serverIp}</span>
                <a href="/admin/index.html" class="admin-link">Админ-панель</a>
            </div>
        `;
    } else {
        infoHTML = `
            <div class="connection-status">
                <span class="status-indicator client">🔗 Клиент</span>
                <span class="ip-address">Подключен к: ${serverIp}</span>
                ${isMobileDevice ? '<span class="mobile-badge">📱 Мобильный</span>' : ''}
            </div>
        `;
    }
    
    connectionInfo.innerHTML = infoHTML;
}

function updateMachineSelect() {
    const machineSelect = document.getElementById('machine');
    const currentValue = selectStates.machine || machineSelect.value;
    const machines = window.toolDatabase.getMachines();
    
    machineSelect.innerHTML = '<option value="" disabled selected>Выберите станок</option><option value="Все">Все станки</option>';
    
    machines.forEach(machine => {
        if (machine.status === 'active') {
            const option = document.createElement('option');
            option.value = machine.name;
            option.textContent = machine.name;
            machineSelect.appendChild(option);
        }
    });
    
    // Восстанавливаем выбранное значение если оно еще существует
    if (currentValue && Array.from(machineSelect.options).some(opt => opt.value === currentValue)) {
        machineSelect.value = currentValue;
        selectStates.machine = currentValue;
    }
}

function updateToolTypeSelect() {
    const toolTypeSelect = document.getElementById('toolType');
    const currentValue = selectStates.toolType || toolTypeSelect.value;
    const toolTypes = window.toolDatabase.getToolTypes();
    
    toolTypeSelect.innerHTML = '<option value="" disabled selected>Выберите тип</option>';
    
    Object.keys(toolTypes).forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        toolTypeSelect.appendChild(option);
    });
    
    // Восстанавливаем выбранное значение
    if (currentValue && Array.from(toolTypeSelect.options).some(opt => opt.value === currentValue)) {
        toolTypeSelect.value = currentValue;
        selectStates.toolType = currentValue;
    }
}

function updateToolSizeSelect() {
    const toolTypeSelect = document.getElementById('toolType');
    const toolSizeSelect = document.getElementById('toolSize');
    const currentValue = selectStates.toolSize || toolSizeSelect.value;
    const selectedType = toolTypeSelect.value;
    const toolTypes = window.toolDatabase.getToolTypes();
    
    toolSizeSelect.innerHTML = '<option value="" disabled selected>Выберите размер</option>';
    
    const typeSizes = toolTypes[selectedType] || [];
    if (typeSizes.length > 0) {
        toolSizeSelect.disabled = false;
        typeSizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size;
            toolSizeSelect.appendChild(option);
        });
    } else {
        toolSizeSelect.disabled = true;
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Не требуется';
        option.selected = true;
        toolSizeSelect.appendChild(option);
    }
    
    // Восстанавливаем выбранное значение
    if (currentValue && Array.from(toolSizeSelect.options).some(opt => opt.value === currentValue)) {
        toolSizeSelect.value = currentValue;
        selectStates.toolSize = currentValue;
    }
}

function updateCellNumberSelect() {
    const machineSelect = document.getElementById('machine');
    const cellNumberSelect = document.getElementById('cellNumber');
    const currentValue = selectStates.cellNumber || cellNumberSelect.value;
    const selectedMachine = machineSelect.value;
    
    cellNumberSelect.innerHTML = '<option value="" disabled selected>Выберите ячейку</option>';
    
    if (!selectedMachine || selectedMachine === 'Все') return;
    
    const machines = window.toolDatabase.getMachines();
    const selectedMachineData = machines.find(m => m.name === selectedMachine);
    const totalCells = selectedMachineData ? selectedMachineData.cells : 24;

    const occupiedCells = tools
        .filter(tool => tool.machine === selectedMachine)
        .map(tool => tool.cellNumber);

    for (let i = 1; i <= totalCells; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;

        if (occupiedCells.includes(i.toString())) {
            option.textContent = `${i} (занята)`;
            option.disabled = true;
            option.style.color = '#888888';
        }

        cellNumberSelect.appendChild(option);
    }
    
    // Восстанавливаем выбранное значение
    if (currentValue && Array.from(cellNumberSelect.options).some(opt => opt.value === currentValue)) {
        cellNumberSelect.value = currentValue;
        selectStates.cellNumber = currentValue;
    }
}

async function addTool(tool) {
    try {
        // Сохраняем состояние перед добавлением
        saveCurrentSelectValues();
        
        // Локальное добавление
        window.toolDatabase.addTool(tool);
        tools = window.toolDatabase.getTools();
        
        // Обновляем только необходимые элементы
        updateCellNumberSelect();
        updateTable();
        showNotification('✅ Инструмент добавлен!');
        
        // Синхронизация с сервером
        if (isConnected) {
            await syncWithServer();
        }
        
        // Восстанавливаем состояние после добавления
        restoreSelectValues();
        
    } catch (error) {
        showNotification('Ошибка добавления инструмента', true);
        // Восстанавливаем состояние при ошибке
        restoreSelectValues();
    }
}

async function deleteTool(cellNumber, machine) {
    if (!confirm('Удалить этот инструмент?')) return;
    
    try {
        // Сохраняем состояние перед удалением
        saveCurrentSelectValues();
        
        // Локальное удаление
        window.toolDatabase.deleteTool(cellNumber, machine);
        tools = window.toolDatabase.getTools();
        
        updateCellNumberSelect();
        updateTable();
        showNotification('🗑️ Инструмент удален!');
        
        if (isConnected) {
            await syncWithServer();
        }
        
        // Восстанавливаем состояние после удаления
        restoreSelectValues();
        
    } catch (error) {
        showNotification('Ошибка удаления инструмента', true);
        // Восстанавливаем состояние при ошибке
        restoreSelectValues();
    }
}

async function syncWithServer() {
    if (!isConnected || syncInProgress) return;
    
    syncInProgress = true;
    try {
        const allData = window.toolDatabase.getAll();
        const response = await fetch(`${API_BASE}/sync`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(allData)
        });
        
        if (response.ok) {
            const result = await response.json();
            lastSyncTime = result.timestamp || Date.now() / 1000;
        }
    } catch (error) {
        isConnected = false;
    } finally {
        syncInProgress = false;
    }
}

// Ручное обновление
async function manualRefresh() {
    showNotification('🔄 Обновление...');
    await loadDataFromServer();
    showNotification('✅ Данные обновлены!');
}

// Проверка изменений на сервере (только для ПК)
async function checkForChanges() {
    if (!isConnected || syncInProgress || isMobileDevice) return;
    
    try {
        const response = await fetch(`${API_BASE}/changes?since=${lastChangeTime}`);
        if (response.ok) {
            const changeData = await response.json();
            
            if (changeData.changes && changeData.changes.length > 0) {
                // Есть изменения - загружаем полные данные
                await loadDataFromServer();
                lastChangeTime = changeData.current_timestamp;
            }
        }
    } catch (error) {
        // Игнорируем ошибки проверки изменений
    }
}

// Реальная синхронизация в реальном времени (только для ПК)
function startRealTimeSync() {
    if (isMobileDevice) return;
    
    // Проверка изменений каждые 3 секунды для ПК
    setInterval(() => {
        if (isConnected && document.visibilityState === 'visible') {
            checkForChanges();
        }
    }, 3000);
    
    // Синхронизация каждые 10 секунд для ПК
    setInterval(() => {
        if (isConnected && document.visibilityState === 'visible' && !syncInProgress) {
            syncWithServer();
        }
    }, 10000);
    
    // Проверка изменений при возвращении на страницу
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isConnected && !isMobileDevice) {
            checkForChanges();
        }
    });
}

function formatDate(date) {
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Сегодня";
    if (diffDays === 2) return "Вчера";
    return `${diffDays - 1} дн. назад`;
}

function updateTable() {
    const toolTable = document.getElementById('toolTable');
    const machineSelect = document.getElementById('machine');
    const selectedMachine = machineSelect.value;
    
    if (!toolTable) return;
    
    const filteredTools = selectedMachine && selectedMachine !== "Все" 
        ? tools.filter(tool => tool.machine === selectedMachine)
        : tools;

    toolTable.innerHTML = '';

    // Создаем строку с информацией и кнопкой обновления
    const headerRow = document.createElement('div');
    headerRow.className = 'table-header-row';
    headerRow.innerHTML = `
        <div class="header-left">
            <div id="connectionInfo"></div>
        </div>
        <div class="header-center">
            <span class="update-time">📅 Обновлено: ${new Date().toLocaleString('ru-RU')}</span>
            ${isMobileDevice ? '<div class="mobile-hint">Используйте кнопку "Обновить" для синхронизации</div>' : ''}
        </div>
        <div class="header-right">
            <button id="refreshBtn" class="refresh-btn" title="Обновить данные">🔄 Обновить</button>
        </div>
    `;
    toolTable.appendChild(headerRow);

    // Добавляем обработчик для кнопки обновления
    document.getElementById('refreshBtn')?.addEventListener('click', manualRefresh);

    if (filteredTools.length === 0) {
        const noToolsDiv = document.createElement('div');
        noToolsDiv.className = 'no-tools';
        noToolsDiv.innerHTML = `
            <div style="font-size: 3em; margin-bottom: 10px;">📭</div>
            <h3>Инструменты отсутствуют</h3>
            <p>Добавьте первый инструмент используя форму выше</p>
        `;
        toolTable.appendChild(noToolsDiv);
        return;
    }

    const toolsByMachine = {};
    filteredTools.forEach(tool => {
        if (!toolsByMachine[tool.machine]) {
            toolsByMachine[tool.machine] = [];
        }
        toolsByMachine[tool.machine].push(tool);
    });

    Object.keys(toolsByMachine).forEach(machine => {
        const stationBlock = document.createElement('div');
        stationBlock.className = 'station-block';

        const stationName = document.createElement('div');
        stationName.className = 'station-name';
        stationName.innerHTML = `${machine}`;
        stationBlock.appendChild(stationName);
        
        const stationTable = document.createElement('table');
        stationTable.className = 'station-table';

        const headerRow = document.createElement('tr');
        ['Тип', 'Размер', 'Ячейка', 'Добавлен', ''].forEach(headerText => {
            const header = document.createElement('th');
            header.textContent = headerText;
            headerRow.appendChild(header);
        });
        stationTable.appendChild(headerRow);

        toolsByMachine[machine].forEach(tool => {
            const row = document.createElement('tr');

            const toolTypeCell = document.createElement('td');
            toolTypeCell.className = 'tool-type';
            toolTypeCell.textContent = tool.toolType;
            row.appendChild(toolTypeCell);

            const toolSizeCell = document.createElement('td');
            toolSizeCell.className = 'tool-size';
            toolSizeCell.textContent = tool.toolSize || '-';
            row.appendChild(toolSizeCell);

            const cellNumberCell = document.createElement('td');
            cellNumberCell.className = 'cell-info';
            cellNumberCell.textContent = tool.cellNumber;
            row.appendChild(cellNumberCell);

            const dateAddedCell = document.createElement('td');
            dateAddedCell.className = 'date-info';
            const daysAgo = formatDate(new Date(tool.dateAdded));
            dateAddedCell.textContent = daysAgo;
            row.appendChild(dateAddedCell);

            const deleteCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = 'Удалить инструмент';
            deleteBtn.onclick = async (e) => {
                e.preventDefault();
                await deleteTool(tool.cellNumber, tool.machine);
            };
            deleteCell.appendChild(deleteBtn);
            row.appendChild(deleteCell);

            stationTable.appendChild(row);
        });

        stationBlock.appendChild(stationTable);
        toolTable.appendChild(stationBlock);
    });
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = isError ? 'notification error' : 'notification';
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 2000);
}

// Добавьте в конец файла script.js

// Функция для получения количества звезд GitHub
async function updateGitHubStars() {
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

// Обновите функцию initializeApp():
async function initializeApp() {
    await loadDataFromServer();
    setupEventListeners();
    
    // Для мобильных устройств используем только ручное обновление
    if (!isMobileDevice) {
        startRealTimeSync();
    }
    
    restoreFormState();
    updateConnectionInfo();
    
    // Обновляем звезды GitHub
    updateGitHubStars();
}