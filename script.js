// Константы и переменные
const API_BASE = `${window.location.origin}/api`;
let tools = [];

// Функция для мобильного логирования
function mobileLog(message, data = null) {
    console.log(message, data);
    // Также показываем уведомление для важных ошибок
    if (message.includes('ERROR') || message.includes('Ошибка')) {
        showNotification(message, true);
    }
}

// Получаем элементы DOM после загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    mobileLog('Инициализация приложения...');
    
    // Проверяем мобильное устройство
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        document.body.classList.add('mobile-device');
        mobileLog('Мобильное устройство обнаружено');
    }

    // Получаем элементы DOM
    const toolForm = document.getElementById('toolForm');
    const machineSelect = document.getElementById('machine');
    const toolTypeSelect = document.getElementById('toolType');
    const toolSizeSelect = document.getElementById('toolSize');
    const cellNumberSelect = document.getElementById('cellNumber');
    
    // Заполняем выпадающие списки
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

        // Детальная проверка для мобильных
        if (!cellNumber || cellNumber === '') {
            mobileLog('ERROR: Ячейка не выбрана');
            showNotification('Пожалуйста, выберите ячейку!', true);
            
            // Подсвечиваем поле с ошибкой
            cellNumberSelect.style.borderColor = '#dc3545';
            setTimeout(() => {
                cellNumberSelect.style.borderColor = '';
            }, 2000);
            return;
        }

        if (!machine || machine === '') {
            mobileLog('ERROR: Станок не выбран');
            showNotification('Пожалуйста, выберите станок!', true);
            return;
        }

        if (!toolType || toolType === '') {
            mobileLog('ERROR: Тип инструмента не выбран');
            showNotification('Пожалуйста, выберите тип инструмента!', true);
            return;
        }

        mobileLog('Добавление инструмента:', { machine, toolType, toolSize, cellNumber });
        
        const tool = {
            machine: machine,
            toolType: toolType,
            toolSize: toolSize,
            cellNumber: cellNumber,
            dateAdded: new Date().toISOString()
        };
        
        await addTool(tool);
        toolForm.reset();
        updateToolSizeSelect(); // Сбрасываем выбор размера
    });

    toolTypeSelect.addEventListener('change', updateToolSizeSelect);
    
    machineSelect.addEventListener('change', function() {
        updateCellNumberSelect();
        updateTable();
    });

    // Загружаем данные с сервера
    loadTools();
    
    // Автообновление каждые 3 секунды
    setInterval(loadTools, 3000);
    
    mobileLog('Приложение инициализировано');
}

function updateMachineSelect() {
    const machineSelect = document.getElementById('machine');
    machineSelect.innerHTML = '<option value="" disabled selected>Выберите станок</option><option value="Все">Все</option>';
    const machines = ['ТСЗ-Ф13-70', 'KVL-1361A', 'KVL-1260A'];
    machines.forEach(machine => {
        const option = document.createElement('option');
        option.value = machine;
        option.textContent = machine;
        machineSelect.appendChild(option);
    });
}

function updateToolTypeSelect() {
    const toolTypeSelect = document.getElementById('toolType');
    toolTypeSelect.innerHTML = '<option value="" disabled selected>Выберите тип</option>';
    const toolTypes = ['Фреза', 'Сверло', 'Резьбофреза', 'Дисковая фреза', 'Расточной инструмент', 'Развертка', 'Центровка'];
    toolTypes.forEach(type => {
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
    toolSizeSelect.innerHTML = '<option value="" disabled selected>Выберите размер</option>';
    
    const sizes = {
        'Фреза': ['1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0'],
        'Сверло': ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        'Развертка': ['6', '8', '10', '12', '14', '16', '18', '20'],
        'Резьбофреза': ['M6', 'M8', 'M10', 'M12'],
        'Дисковая фреза': ['50', '63', '80', '100'],
        'Расточной инструмент': ['16', '20', '25', '32'],
        'Центровка': [] // Без размеров
    };
    
    const typeSizes = sizes[selectedType] || [];
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
    
    const occupiedCells = tools
        .filter(tool => tool.machine === selectedMachine)
        .map(tool => tool.cellNumber);

    for (let i = 1; i <= 24; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;

        if (occupiedCells.includes(i.toString())) {
            const tool = tools.find(t => t.cellNumber === i.toString() && t.machine === selectedMachine);
            option.textContent = `${tool.toolType} (Ячейка ${i})`;
            option.disabled = true;
            option.style.color = '#dc3545';
        }

        cellNumberSelect.appendChild(option);
    }
    
    // Логируем состояние выбора ячеек
    mobileLog(`Обновлен список ячеек для станка: ${selectedMachine}`, {
        занято: occupiedCells.length,
        свободно: 24 - occupiedCells.length
    });
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

// API функции
async function loadTools() {
    try {
        const response = await fetch(`${API_BASE}/tools`);
        if (response.ok) {
            tools = await response.json();
            updateTable();
            updateCellNumberSelect();
        } else {
            mobileLog('ERROR: Ошибка загрузки инструментов', response.status);
        }
    } catch (error) {
        mobileLog('ERROR: Ошибка соединения с сервером', error);
        showNotification('Ошибка соединения с сервером', true);
    }
}

async function addTool(tool) {
    try {
        const response = await fetch(`${API_BASE}/tools`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tool)
        });
        
        if (response.ok) {
            await loadTools();
            showNotification('Инструмент успешно добавлен!');
        } else {
            const error = await response.text();
            mobileLog('ERROR: Ошибка добавления инструмента', error);
            showNotification(error || 'Ошибка добавления', true);
        }
    } catch (error) {
        mobileLog('ERROR: Ошибка сети при добавлении', error);
        showNotification('Ошибка соединения', true);
    }
}

async function deleteTool(cellNumber, machine) {
    if (!confirm('Удалить этот инструмент?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/delete?cell=${cellNumber}&machine=${encodeURIComponent(machine)}`, {
            method: 'GET'
        });
        
        if (response.ok) {
            await loadTools();
            showNotification('Инструмент удален!');
        } else {
            mobileLog('ERROR: Ошибка удаления инструмента', response.status);
            showNotification('Ошибка удаления', true);
        }
    } catch (error) {
        mobileLog('ERROR: Ошибка сети при удалении', error);
        showNotification('Ошибка удаления', true);
    }
}

function updateTable() {
    const toolTable = document.getElementById('toolTable');
    const machineSelect = document.getElementById('machine');
    const selectedMachine = machineSelect.value;
    
    if (!toolTable) {
        mobileLog('ERROR: Table element not found');
        return;
    }
    
    toolTable.innerHTML = '';

    const filteredTools = selectedMachine && selectedMachine !== "Все" 
        ? tools.filter(tool => tool.machine === selectedMachine)
        : tools;

    if (filteredTools.length === 0) {
        toolTable.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">Инструменты отсутствуют</div>';
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
        stationName.textContent = machine;
        stationBlock.appendChild(stationName);

        const stationTable = document.createElement('table');
        stationTable.className = 'station-table';

        const headerRow = document.createElement('tr');
        ['Тип инстр.', 'Размер', '# ячейки', 'Дата', 'Действие'].forEach(headerText => {
            const header = document.createElement('th');
            header.textContent = headerText;
            headerRow.appendChild(header);
        });
        stationTable.appendChild(headerRow);

        toolsByMachine[machine].forEach(tool => {
            const row = document.createElement('tr');

            const toolTypeCell = document.createElement('td');
            toolTypeCell.textContent = tool.toolType;
            row.appendChild(toolTypeCell);

            const toolSizeCell = document.createElement('td');
            toolSizeCell.textContent = tool.toolSize || '-';
            row.appendChild(toolSizeCell);

            const cellNumberCell = document.createElement('td');
            cellNumberCell.textContent = tool.cellNumber;
            row.appendChild(cellNumberCell);

            const dateAddedCell = document.createElement('td');
            dateAddedCell.textContent = new Date(tool.dateAdded).toLocaleDateString('ru-RU');
            row.appendChild(dateAddedCell);

            const deleteCell = document.createElement('td');
            const deleteLink = document.createElement('a');
            deleteLink.href = '#';
            deleteLink.textContent = 'Удалить';
            deleteLink.style.color = '#dc3545';
            deleteLink.style.textDecoration = 'none';
            deleteLink.style.cursor = 'pointer';
            deleteLink.style.padding = '8px 12px';
            deleteLink.style.border = '1px solid #dc3545';
            deleteLink.style.borderRadius = '4px';
            deleteLink.style.display = 'inline-block';
            deleteLink.style.minWidth = '60px';
            deleteLink.style.textAlign = 'center';
            
            deleteLink.addEventListener('click', (e) => {
                e.preventDefault();
                deleteTool(tool.cellNumber, tool.machine);
            });
            
            deleteCell.appendChild(deleteLink);
            row.appendChild(deleteCell);

            stationTable.appendChild(row);
        });

        stationBlock.appendChild(stationTable);
        toolTable.appendChild(stationBlock);
    });
    
    mobileLog(`Таблица обновлена. Инструментов: ${filteredTools.length}`);
}

// Глобальные функции для отладки
window.debugTools = {
    getTools: () => tools,
    getSelectedMachine: () => document.getElementById('machine')?.value,
    getSelectedCell: () => document.getElementById('cellNumber')?.value,
    forceUpdate: () => {
        updateTable();
        updateCellNumberSelect();
    },
    testAPI: async () => {
        try {
            const response = await fetch(`${API_BASE}/tools`);
            const data = await response.json();
            console.log('API Test:', data);
            alert(`API работает. Инструментов: ${data.length}`);
        } catch (error) {
            console.error('API Test Error:', error);
            alert('API ошибка: ' + error.message);
        }
    }
};

// Добавляем обработчики для мобильной отладки
document.addEventListener('touchstart', function(e) {
    // Логируем касания для отладки
    if (e.target.tagName === 'SELECT') {
        mobileLog('Касание SELECT:', e.target.id);
    }
}, { passive: true });

mobileLog('Script loaded successfully');