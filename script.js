// Константы и переменные
const API_BASE = `${window.location.origin}/api`;
let tools = [];

// Получаем элементы DOM после загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('🛠️ Инициализация системы управления инструментами...');
    
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

        // Валидация формы
        if (!cellNumber || cellNumber === '') {
            showNotification('Пожалуйста, выберите ячейку!', true);
            cellNumberSelect.style.borderColor = '#ffffff';
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

        console.log('Добавление инструмента:', { machine, toolType, toolSize, cellNumber });
        
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
    
    // Автообновление каждые 5 секунд
    setInterval(loadTools, 5000);
    
    console.log('✅ Система инициализирована');
}

function updateMachineSelect() {
    const machineSelect = document.getElementById('machine');
    
    // Пробуем загрузить станки из админки
    const adminMachines = JSON.parse(localStorage.getItem('admin_machines')) || [
        { id: 1, name: "ТСЗ-Ф13-70", status: "active", cells: 24 },
        { id: 2, name: "KVL-1361A", status: "active", cells: 24 },
        { id: 3, name: "KVL-1260A", status: "active", cells: 24 }
    ];
    
    machineSelect.innerHTML = '<option value="" disabled selected>Выберите станок</option><option value="Все">Все станки</option>';
    
    adminMachines.forEach(machine => {
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
    
    // Пробуем загрузить типы инструментов из админки
    const adminToolTypes = JSON.parse(localStorage.getItem('admin_toolTypes')) || {
        'Фреза': ['1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0'],
        'Сверло': ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        'Развертка': ['6', '8', '10', '12', '14', '16', '18', '20'],
        'Резьбофреза': ['M6', 'M8', 'M10', 'M12'],
        'Дисковая фреза': ['50', '63', '80', '100'],
        'Расточной инструмент': ['16', '20', '25', '32'],
        'Центровка': []
    };
    
    toolTypeSelect.innerHTML = '<option value="" disabled selected>Выберите тип</option>';
    
    Object.keys(adminToolTypes).forEach(type => {
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
    
    // Пробуем загрузить размеры из админки
    const adminToolTypes = JSON.parse(localStorage.getItem('admin_toolTypes')) || {
        'Фреза': ['1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0'],
        'Сверло': ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        'Развертка': ['6', '8', '10', '12', '14', '16', '18', '20'],
        'Резьбофреза': ['M6', 'M8', 'M10', 'M12'],
        'Дисковая фреза': ['50', '63', '80', '100'],
        'Расточной инструмент': ['16', '20', '25', '32'],
        'Центровка': []
    };
    
    toolSizeSelect.innerHTML = '<option value="" disabled selected>Выберите размер</option>';
    
    const typeSizes = adminToolTypes[selectedType] || [];
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
    
    // Получаем количество ячеек для выбранного станка
    const adminMachines = JSON.parse(localStorage.getItem('admin_machines')) || [
        { id: 1, name: "ТСЗ-Ф13-70", status: "active", cells: 24 },
        { id: 2, name: "KVL-1361A", status: "active", cells: 24 },
        { id: 3, name: "KVL-1260A", status: "active", cells: 24 }
    ];
    
    const selectedMachineData = adminMachines.find(m => m.name === selectedMachine);
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

// API функции
async function loadTools() {
    try {
        const response = await fetch(`${API_BASE}/tools`);
        if (response.ok) {
            tools = await response.json();
            updateTable();
            updateCellNumberSelect();
        } else {
            console.error('Ошибка загрузки инструментов:', response.status);
        }
    } catch (error) {
        console.error('Ошибка соединения с сервером:', error);
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
            showNotification('✅ Инструмент успешно добавлен!');
        } else {
            const error = await response.text();
            console.error('Ошибка добавления инструмента:', error);
            showNotification(error || 'Ошибка добавления инструмента', true);
        }
    } catch (error) {
        console.error('Ошибка сети при добавлении:', error);
        showNotification('Ошибка соединения с сервером', true);
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
            showNotification('🗑️ Инструмент удален!');
        } else {
            console.error('Ошибка удаления инструмента:', response.status);
            showNotification('Ошибка удаления инструмента', true);
        }
    } catch (error) {
        console.error('Ошибка сети при удалении:', error);
        showNotification('Ошибка удаления инструмента', true);
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
        return `${diffDays - 1} дн.`;
    }
}

function updateTable() {
    const toolTable = document.getElementById('toolTable');
    const machineSelect = document.getElementById('machine');
    const selectedMachine = machineSelect.value;
    
    if (!toolTable) {
        console.error('Table element not found');
        return;
    }
    
    toolTable.innerHTML = '';

    const filteredTools = selectedMachine && selectedMachine !== "Все" 
        ? tools.filter(tool => tool.machine === selectedMachine)
        : tools;

    if (filteredTools.length === 0) {
        toolTable.innerHTML = `
            <div class="no-tools">
                <div style="font-size: 3em; margin-bottom: 10px;">📭</div>
                <h3>Инструменты отсутствуют</h3>
                <p>Добавьте первый инструмент используя форму выше</p>
            </div>
        `;
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
        stationName.innerHTML = `🏭 ${machine}`;
        stationBlock.appendChild(stationName);

        const stationTable = document.createElement('table');
        stationTable.className = 'station-table';

        // Заголовки таблицы
        const headerRow = document.createElement('tr');
        ['Тип инстр.', 'Размер', '# ячейки', 'Дата', 'Действие'].forEach(headerText => {
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
            toolTypeCell.innerHTML = `⚙ ${tool.toolType}`;
            row.appendChild(toolTypeCell);

            // Размер
            const toolSizeCell = document.createElement('td');
            toolSizeCell.className = 'tool-size';
            toolSizeCell.textContent = tool.toolSize || '-';
            row.appendChild(toolSizeCell);

            // Ячейка
            const cellNumberCell = document.createElement('td');
            cellNumberCell.className = 'cell-info';
            cellNumberCell.innerHTML = `📍 Ячейка ${tool.cellNumber}`;
            row.appendChild(cellNumberCell);

            // Дата
            const dateAddedCell = document.createElement('td');
            dateAddedCell.className = 'date-info';
            const daysAgo = formatDate(new Date(tool.dateAdded));
            dateAddedCell.innerHTML = `🕐 ${daysAgo}`;
            row.appendChild(dateAddedCell);

            // Действие - удаление
            const deleteCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '🗑️ Удалить';
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
    
    console.log(`✅ Таблица обновлена. Инструментов: ${filteredTools.length}`);
}

// Функции для отладки и разработки
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
            alert(`✅ API работает. Инструментов: ${data.length}`);
        } catch (error) {
            console.error('API Test Error:', error);
            alert('❌ API ошибка: ' + error.message);
        }
    },
    addTestData: () => {
        const testTools = [
            {
                machine: 'ТСЗ-Ф13-70',
                toolType: 'Фреза',
                toolSize: '2.5',
                cellNumber: '15',
                dateAdded: new Date().toISOString()
            },
            {
                machine: 'ТСЗ-Ф13-70',
                toolType: 'Сверло',
                toolSize: '4.0',
                cellNumber: '8',
                dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                machine: 'KVL-1361A',
                toolType: 'Развертка',
                toolSize: '6.0',
                cellNumber: '12',
                dateAdded: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
        
        testTools.forEach(tool => {
            if (!tools.some(t => t.cellNumber === tool.cellNumber && t.machine === tool.machine)) {
                tools.push(tool);
            }
        });
        
        updateTable();
        updateCellNumberSelect();
        showNotification('✅ Тестовые данные добавлены');
    },
    clearAllData: () => {
        if (confirm('Очистить все данные?')) {
            tools = [];
            updateTable();
            updateCellNumberSelect();
            showNotification('🗑️ Все данные очищены');
        }
    },
    exportData: () => {
        const dataStr = JSON.stringify(tools, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tools_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('💾 Данные экспортированы');
    },
    importData: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedTools = JSON.parse(event.target.result);
                    if (Array.isArray(importedTools)) {
                        tools = importedTools;
                        updateTable();
                        updateCellNumberSelect();
                        showNotification('📥 Данные импортированы');
                    } else {
                        showNotification('❌ Неверный формат файла', true);
                    }
                } catch (error) {
                    showNotification('❌ Ошибка чтения файла', true);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
};

// Лицензионная проверка (опционально)
async function checkLicense() {
    try {
        const companySize = 1; // Можно определить по количеству инструментов
        const usageType = 'commercial'; // или 'non-commercial'
        
        const response = await fetch(`${API_BASE}/license/check`, {
            headers: {
                'X-Company-Size': companySize,
                'X-Usage-Type': usageType
            }
        });
        
        if (response.ok) {
            const licenseInfo = await response.json();
            if (licenseInfo.status === 'commercial') {
                console.log('📄 Лицензионное уведомление:', licenseInfo.message);
            }
        }
    } catch (error) {
        // Игнорируем ошибки лицензионной проверки
    }
}

// Функции для работы с локальным хранилищем (fallback)
function saveToolsToLocalStorage() {
    try {
        localStorage.setItem('tools_backup', JSON.stringify(tools));
    } catch (error) {
        console.warn('Не удалось сохранить в localStorage:', error);
    }
}

function loadToolsFromLocalStorage() {
    try {
        const savedTools = localStorage.getItem('tools_backup');
        if (savedTools) {
            const parsedTools = JSON.parse(savedTools);
            if (Array.isArray(parsedTools)) {
                tools = parsedTools;
                return true;
            }
        }
    } catch (error) {
        console.warn('Не удалось загрузить из localStorage:', error);
    }
    return false;
}

// Автосохранение при изменении данных
function setupAutoSave() {
    let saveTimeout;
    
    const originalPush = Array.prototype.push;
    Array.prototype.push = function() {
        const result = originalPush.apply(this, arguments);
        if (this === tools) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveToolsToLocalStorage, 1000);
        }
        return result;
    };
    
    // Перехватываем удаление элементов
    const originalSplice = Array.prototype.splice;
    Array.prototype.splice = function() {
        const result = originalSplice.apply(this, arguments);
        if (this === tools) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveToolsToLocalStorage, 1000);
        }
        return result;
    };
}

// Восстановление данных при загрузке
function restoreData() {
    // Сначала пробуем загрузить с сервера
    loadTools();
    
    // Если сервер недоступен, пробуем localStorage
    setTimeout(() => {
        if (tools.length === 0) {
            if (loadToolsFromLocalStorage()) {
                console.log('📥 Данные восстановлены из localStorage');
                updateTable();
                updateCellNumberSelect();
                showNotification('📥 Данные восстановлены из резервной копии');
            }
        }
    }, 2000);
}

// Инициализация расширенных функций
function initializeExtendedFeatures() {
    // Настройка автосохранения
    setupAutoSave();
    
    // Восстановление данных
    restoreData();
    
    // Добавляем обработчик перед закрытием страницы
    window.addEventListener('beforeunload', saveToolsToLocalStorage);
    
    // Добавляем глобальные горячие клавиши
    document.addEventListener('keydown', (e) => {
        // Ctrl+S - сохранить
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveToolsToLocalStorage();
            showNotification('💾 Данные сохранены');
        }
        
        // Ctrl+L - обновить список
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            loadTools();
            showNotification('🔄 Список обновлен');
        }
        
        // F1 - справка
        if (e.key === 'F1') {
            e.preventDefault();
            alert(`Горячие клавиши:
Ctrl+S - Сохранить данные
Ctrl+L - Обновить список
F1 - Эта справка

Для отладки в консоли используйте:
debugTools.addTestData() - добавить тестовые данные
debugTools.exportData() - экспорт данных
debugTools.importData() - импорт данных
debugTools.clearAllData() - очистить все данные`);
        }
    });
    
    console.log('🔧 Расширенные функции инициализированы');
}

// Запускаем лицензионную проверку при загрузке
setTimeout(checkLicense, 5000);

// Инициализируем расширенные функции
setTimeout(initializeExtendedFeatures, 1000);

console.log('🛠️ Tool Management System loaded successfully');

// ASCII эффекты для черно-белого стиля
document.addEventListener('DOMContentLoaded', function() {
    // Добавляем ASCII эффект печатания для заголовков
    const asciiTitles = document.querySelectorAll('h1, h2');
    
    asciiTitles.forEach(title => {
        const originalText = title.textContent;
        title.textContent = '';
        let i = 0;
        
        const typeWriter = setInterval(() => {
            if (i < originalText.length) {
                title.textContent += originalText.charAt(i);
                i++;
            } else {
                clearInterval(typeWriter);
                // Добавляем мигающий курсор
                const cursor = document.createElement('span');
                cursor.className = 'terminal-cursor';
                cursor.textContent = '_';
                title.appendChild(cursor);
                
                // Убираем курсор через 3 секунды
                setTimeout(() => {
                    cursor.style.display = 'none';
                }, 3000);
            }
        }, 50);
    });

    // ASCII эффект для уведомлений
    const originalShowNotification = window.showNotification;
    window.showNotification = function(message, isError = false) {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = '';
            let i = 0;
            
            const typeNotification = setInterval(() => {
                if (i < message.length) {
                    notification.textContent += message.charAt(i);
                    i++;
                } else {
                    clearInterval(typeNotification);
                }
            }, 30);
            
            notification.className = isError ? 'notification error' : 'notification';
            notification.style.display = 'block';

            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
    };

    // Добавляем ASCII арт в заголовок
    const addAsciiArt = () => {
        const asciiArt = `
╔═══════════════════════════════════════╗
║        TOOL MANAGEMENT SYSTEM         ║
║              v1.0.0                   ║
║                                       ║
║      [⚙] [🔧] [🏭] [📍] [🕐]        ║
╚═══════════════════════════════════════╝
        `.trim();
        
        const header = document.querySelector('.header');
        if (header) {
            const artElement = document.createElement('pre');
            artElement.style.cssText = `
                text-align: center;
                color: #ffffff;
                font-family: 'Courier New', monospace;
                margin: 10px 0;
                line-height: 1.2;
                text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
                white-space: pre;
            `;
            artElement.textContent = asciiArt;
            header.insertBefore(artElement, header.firstChild);
        }
    };

    // Добавляем ASCII арт после загрузки DOM
    setTimeout(addAsciiArt, 100);

    console.log('🖥️  ЧЕРНО-БЕЛЫЙ ASCII СТИЛЬ АКТИВИРОВАН');
    console.log('┌─────────────────────────────────────┐');
    console.log('│      TOOL MANAGEMENT SYSTEM        │');
    console.log('│        MONOCHROME EDITION          │');
    console.log('└─────────────────────────────────────┘');
});
