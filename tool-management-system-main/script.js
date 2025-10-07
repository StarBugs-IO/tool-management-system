// script.js - Обновленная версия для пустой базы
// Константы и переменные
const API_BASE = `${window.location.origin}/api`;
let tools = [];
let isConnected = true;

// Получаем элементы DOM после загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('Инициализация системы управления инструментами...');
    
    // Получаем элементы DOM
    const toolForm = document.getElementById('toolForm');
    const machineSelect = document.getElementById('machine');
    const toolTypeSelect = document.getElementById('toolType');
    const toolSizeSelect = document.getElementById('toolSize');
    const cellNumberSelect = document.getElementById('cellNumber');
    
    // Заполняем выпадающие списки из базы данных
    updateMachineSelect();
    updateToolTypeSelect();
    updateCellNumberSelect();
    
    // Настраиваем обработчики событий
    toolForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const machine = machineSelect.value;
        const toolType = toolTypeSelect.value;
        const toolSize = toolSizeSelect.value;
        const cellNumber = cellNumberSelect.value;

        // Валидация формы
        if (!cellNumber || cellNumber === '') {
            showNotification('Пожалуйста, выберите ячейку!', true);
            cellNumberSelect.style.borderColor = '#333333';
            setTimeout(() => {
                cellNumberSelect.style.borderColor = '';
            }, 2000);
            return;
        }

        if (!machine || machine === '') {
            showNotification('Пожалуйста, выберите станок!', true);
            return;
        }

        if (!toolType || toolType === '') {
            showNotification('Пожалуйста, выберите тип инструмента!', true);
            return;
        }
        
        const tool = {
            machine: machine,
            toolType: toolType,
            toolSize: toolSize,
            cellNumber: cellNumber
        };
        
        await addTool(tool);
        toolForm.reset();
        updateToolSizeSelect();
    });

    toolTypeSelect.addEventListener('change', updateToolSizeSelect);
    
    machineSelect.addEventListener('change', function() {
        updateCellNumberSelect();
        updateTable();
    });

    // Загружаем данные
    loadTools();
    
    // Обновление данных в реальном времени
    setupRealTimeUpdates();
    
    // Слушаем обновления базы данных
    window.addEventListener('databaseUpdate', function() {
        loadTools();
        updateMachineSelect();
        updateToolTypeSelect();
        updateCellNumberSelect();
    });
}

function updateMachineSelect() {
    const machineSelect = document.getElementById('machine');
    
    // Загружаем станки из базы данных
    const machines = window.toolDatabase.getMachines();
    
    machineSelect.innerHTML = '<option value="" disabled selected>Выберите станок</option><option value="Все">Все станки</option>';
    
    if (machines.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Нет доступных станков';
        option.disabled = true;
        machineSelect.appendChild(option);
        return;
    }
    
    machines.forEach(machine => {
        if (machine.status === 'active') {
            const option = document.createElement('option');
            option.value = machine.name;
            option.textContent = machine.name;
            machineSelect.appendChild(option);
        }
    });
}

function updateToolTypeSelect() {
    const toolTypeSelect = document.getElementById('toolType');
    
    // Загружаем типы инструментов из базы данных
    const toolTypes = window.toolDatabase.getToolTypes();
    
    toolTypeSelect.innerHTML = '<option value="" disabled selected>Выберите тип</option>';
    
    const toolTypeKeys = Object.keys(toolTypes);
    if (toolTypeKeys.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Нет доступных типов инструментов';
        option.disabled = true;
        toolTypeSelect.appendChild(option);
        return;
    }
    
    toolTypeKeys.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        toolTypeSelect.appendChild(option);
    });
}

function updateToolSizeSelect() {
    const toolTypeSelect = document.getElementById('toolType');
    const toolSizeSelect = document.getElementById('toolSize');
    
    const selectedType = toolTypeSelect.value;
    
    // Загружаем размеры из базы данных
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
}

function updateCellNumberSelect() {
    const machineSelect = document.getElementById('machine');
    const cellNumberSelect = document.getElementById('cellNumber');
    
    const selectedMachine = machineSelect.value;
    cellNumberSelect.innerHTML = '<option value="" disabled selected>Выберите ячейку</option>';
    
    if (!selectedMachine || selectedMachine === 'Все') {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Выберите станок';
        option.disabled = true;
        cellNumberSelect.appendChild(option);
        return;
    }
    
    // Получаем количество ячеек для выбранного станка из базы данных
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
            const tool = tools.find(t => t.cellNumber === i.toString() && t.machine === selectedMachine);
            option.textContent = `${tool.toolType} (Ячейка ${i})`;
            option.disabled = true;
            option.style.color = '#888888';
            option.style.fontStyle = 'italic';
        }

        cellNumberSelect.appendChild(option);
    }
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.error('Notification element not found');
        return;
    }
    
    notification.textContent = message;
    notification.className = isError ? 'notification error' : 'notification';
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Функции работы с инструментами
function loadTools() {
    try {
        // Загружаем инструменты из базы данных
        tools = window.toolDatabase.getTools();
        updateTable();
        updateCellNumberSelect();
    } catch (error) {
        console.error('Ошибка загрузки инструментов:', error);
        showNotification('Ошибка загрузки данных', true);
    }
}

async function addTool(tool) {
    try {
        // Проверяем, есть ли станки и типы инструментов
        const machines = window.toolDatabase.getMachines();
        const toolTypes = window.toolDatabase.getToolTypes();
        
        if (machines.length === 0) {
            showNotification('Ошибка: нет доступных станков. Добавьте станки в админ-панели.', true);
            return;
        }
        
        if (Object.keys(toolTypes).length === 0) {
            showNotification('Ошибка: нет доступных типов инструментов. Добавьте типы в админ-панели.', true);
            return;
        }
        
        // Добавляем инструмент в базу данных
        window.toolDatabase.addTool(tool);
        window.toolDatabase.addActivity(`Добавлен инструмент: ${tool.toolType} ${tool.toolSize || ''} на ${tool.machine}, ячейка ${tool.cellNumber}`);
        
        // Обновляем интерфейс
        loadTools();
        showNotification('✅ Инструмент успешно добавлен!');
        
        // Синхронизируем с сервером если доступен
        await syncWithServer();
    } catch (error) {
        console.error('Ошибка добавления инструмента:', error);
        showNotification('Ошибка добавления инструмента', true);
    }
}

async function deleteTool(cellNumber, machine) {
    if (!confirm('Удалить этот инструмент?')) {
        return;
    }
    
    try {
        // Удаляем инструмент из базы данных
        window.toolDatabase.deleteTool(cellNumber, machine);
        window.toolDatabase.addActivity(`Удален инструмент с ${machine}, ячейка ${cellNumber}`);
        
        // Обновляем интерфейс
        loadTools();
        showNotification('🗑️ Инструмент удален!');
        
        // Синхронизируем с сервером если доступен
        await syncWithServer();
    } catch (error) {
        console.error('Ошибка удаления инструмента:', error);
        showNotification('Ошибка удаления инструмента', true);
    }
}

// Синхронизация с сервером
async function syncWithServer() {
    try {
        const response = await fetch(`${API_BASE}/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(window.toolDatabase.getAll())
        });
        
        if (response.ok) {
            console.log('✅ Данные синхронизированы с сервером');
        }
    } catch (error) {
        console.log('⚠️ Сервер недоступен, работаем локально');
    }
}

function formatDate(date) {
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        return "Сегодня";
    } else if (diffDays === 2) {
        return "Вчера";
    } else {
        return `${diffDays - 1} дн. назад`;
    }
}

function updateTable() {
    const toolTable = document.getElementById('toolTable');
    const machineSelect = document.getElementById('machine');
    const selectedMachine = machineSelect.value;
    
    if (!toolTable) return;
    
    toolTable.innerHTML = '';

    const filteredTools = selectedMachine && selectedMachine !== "Все" 
        ? tools.filter(tool => tool.machine === selectedMachine)
        : tools;

    // Добавляем дату и время обновления
    const updateInfo = document.createElement('div');
    updateInfo.className = 'update-info';
    updateInfo.innerHTML = `📅 Обновлено: ${new Date().toLocaleString('ru-RU')}`;
    toolTable.appendChild(updateInfo);

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

        // Заголовки таблицы
        const headerRow = document.createElement('tr');
        ['Тип', 'Размер', 'Ячейка', 'Добавлен', ''].forEach(headerText => {
            const header = document.createElement('th');
            header.textContent = headerText;
            headerRow.appendChild(header);
        });
        stationTable.appendChild(headerRow);

        // Данные инструментов
        toolsByMachine[machine].forEach(tool => {
            const row = document.createElement('tr');

            // Тип инструмента
            const toolTypeCell = document.createElement('td');
            toolTypeCell.className = 'tool-type';
            toolTypeCell.textContent = tool.toolType;
            row.appendChild(toolTypeCell);

            // Размер
            const toolSizeCell = document.createElement('td');
            toolSizeCell.className = 'tool-size';
            toolSizeCell.textContent = tool.toolSize || '-';
            row.appendChild(toolSizeCell);

            // Ячейка
            const cellNumberCell = document.createElement('td');
            cellNumberCell.className = 'cell-info';
            cellNumberCell.textContent = tool.cellNumber;
            row.appendChild(cellNumberCell);

            // Дата - только относительное время
            const dateAddedCell = document.createElement('td');
            dateAddedCell.className = 'date-info';
            const daysAgo = formatDate(new Date(tool.dateAdded));
            dateAddedCell.textContent = daysAgo;
            row.appendChild(dateAddedCell);

            // Действие - удаление
            const deleteCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = 'Удалить инструмент';
            deleteBtn.onclick = (e) => {
                e.preventDefault();
                if (confirm('Удалить этот инструмент?')) {
                    deleteTool(tool.cellNumber, tool.machine);
                }
            };
            deleteCell.appendChild(deleteBtn);
            row.appendChild(deleteCell);

            stationTable.appendChild(row);
        });

        stationBlock.appendChild(stationTable);
        toolTable.appendChild(stationBlock);
    });
}

// Обновление в реальном времени
function setupRealTimeUpdates() {
    // Обновление каждые 3 секунды
    setInterval(loadTools, 3000);
}

console.log('Tool Management System loaded successfully');