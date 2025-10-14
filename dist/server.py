import http.server
import socketserver
import json
import threading
import webbrowser
import socket
import os
import time
from datetime import datetime
import traceback
from urllib.parse import urlparse, parse_qs

# Глобальные переменные для хранения данных
tools_data = []
last_changes = []  # Храним последние изменения для синхронизации
DATA_FILE = 'tools_data.json'
data_lock = threading.Lock()

def load_data():
    """Загружает данные из файла"""
    global tools_data
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                tools_data = json.load(f)
        else:
            tools_data = []
    except Exception as e:
        print(f"❌ Ошибка загрузки данных: {e}")
        tools_data = []

def save_data():
    """Сохраняет данные в файл"""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(tools_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"❌ Ошибка сохранения данных: {e}")

def save_machines_data(machines):
    """Сохраняет данные станков в отдельный файл"""
    try:
        with open('machines_data.json', 'w', encoding='utf-8') as f:
            json.dump(machines, f, ensure_ascii=False, indent=2)
    except:
        pass

def save_tooltypes_data(tooltypes):
    """Сохраняет данные типов инструментов в отдельный файл"""
    try:
        with open('tooltypes_data.json', 'w', encoding='utf-8') as f:
            json.dump(tooltypes, f, ensure_ascii=False, indent=2)
    except:
        pass

def load_machines_data():
    """Загружает данные станков"""
    try:
        if os.path.exists('machines_data.json'):
            with open('machines_data.json', 'r', encoding='utf-8') as f:
                return json.load(f)
    except:
        pass
    return []

def load_tooltypes_data():
    """Загружает данные типов инструментов"""
    try:
        if os.path.exists('tooltypes_data.json'):
            with open('tooltypes_data.json', 'r', encoding='utf-8') as f:
                return json.load(f)
    except:
        pass
    return {}

def get_ip_address():
    """Получает IP адрес сервера для подключения других устройств"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except:
        return "localhost"

class ToolHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Указываем директорию с файлами
        self.directory = 'dist'
        super().__init__(*args, directory=self.directory, **kwargs)
    
    def is_host_client(self):
        """Проверяет, является ли клиент хостом (localhost)"""
        client_ip = self.client_address[0]
        return client_ip in ['127.0.0.1', 'localhost', get_ip_address()]
    
    def do_GET(self):
        global tools_data, last_changes
        
        try:
            parsed_path = urlparse(self.path)
            path = parsed_path.path
            
            if path == '/api/tools':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.end_headers()
                
                with data_lock:
                    response_data = json.dumps(tools_data).encode()
                    self.wfile.write(response_data)
                return
                
            elif path == '/api/full-data':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.end_headers()
                
                full_data = {
                    'tools': tools_data,
                    'machines': load_machines_data(),
                    'toolTypes': load_tooltypes_data(),
                    'timestamp': time.time(),
                    'is_host': self.is_host_client(),
                    'server_ip': get_ip_address()
                }
                response_data = json.dumps(full_data).encode()
                self.wfile.write(response_data)
                return
                
            elif path == '/api/changes':
                # Возвращаем последние изменения
                query = parse_qs(parsed_path.query)
                since = float(query.get('since', [0])[0])
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                with data_lock:
                    recent_changes = [ch for ch in last_changes if ch['timestamp'] > since]
                    response_data = json.dumps({
                        'changes': recent_changes,
                        'current_timestamp': time.time(),
                        'tools_count': len(tools_data)
                    }).encode()
                    self.wfile.write(response_data)
                return
                
            elif path.startswith('/api/delete'):
                query = parse_qs(parsed_path.query)
                cell_number = query.get('cell', [None])[0]
                machine = query.get('machine', [None])[0]
                
                if cell_number and machine:
                    with data_lock:
                        initial_count = len(tools_data)
                        tools_data[:] = [t for t in tools_data if not (str(t.get('cellNumber', '')) == cell_number and t.get('machine', '') == machine)]
                        
                        if len(tools_data) < initial_count:
                            # Добавляем запись об изменении
                            last_changes.append({
                                'type': 'delete',
                                'machine': machine,
                                'cellNumber': cell_number,
                                'timestamp': time.time()
                            })
                            # Ограничиваем историю изменений
                            if len(last_changes) > 100:
                                last_changes.pop(0)
                            save_data()
                    
                    self.send_response(200)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    return
                    
            elif path == '/api/ping':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok', 'timestamp': time.time()}).encode())
                return
                    
            # Обработка статических файлов - перенаправляем в dist/
            if path == '/':
                self.path = '/index.html'
            elif path == '/admin':
                # Проверяем доступ к админ-панели
                if not self.is_host_client():
                    self.send_error(403, "Доступ запрещен. Админ-панель доступна только с хостового устройства")
                    return
                self.path = '/admin/index.html'
            elif path.startswith('/admin/'):
                # Для админ-панели файлы тоже в dist/admin/
                pass
            
            return super().do_GET()
            
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass
        except Exception as e:
            print(f"❌ Ошибка в GET {self.path}: {e}")

    def do_POST(self):
        global tools_data, last_changes
        
        try:
            parsed_path = urlparse(self.path)
            path = parsed_path.path
            
            if path == '/api/tools':
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                new_tool = json.loads(post_data.decode())
                
                with data_lock:
                    # Проверяем, не занята ли ячейка
                    if any(t['cellNumber'] == new_tool['cellNumber'] and t['machine'] == new_tool['machine'] for t in tools_data):
                        self.send_response(400)
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(b'Cell already occupied')
                        return
                    
                    # Добавляем timestamp
                    new_tool['dateAdded'] = datetime.now().isoformat()
                    new_tool['id'] = f"{new_tool['machine']}_{new_tool['cellNumber']}_{int(time.time()*1000)}"
                    
                    tools_data.append(new_tool)
                    
                    # Добавляем запись об изменении
                    last_changes.append({
                        'type': 'add',
                        'tool': new_tool,
                        'timestamp': time.time()
                    })
                    # Ограничиваем историю изменений
                    if len(last_changes) > 100:
                        last_changes.pop(0)
                    
                    save_data()
                
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'added', 'id': new_tool['id']}).encode())
                return
                
            elif path == '/api/sync':
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                sync_data = json.loads(post_data.decode())
                
                with data_lock:
                    # КЛИЕНТСКИЕ ДАННЫЕ ИМЕЮТ ПРИОРИТЕТ - полностью заменяем серверные данные
                    if 'tools' in sync_data:
                        tools_data = sync_data['tools']
                        
                        # Добавляем запись об изменении при синхронизации
                        last_changes.append({
                            'type': 'sync',
                            'tools_count': len(tools_data),
                            'timestamp': time.time()
                        })
                        # Ограничиваем историю изменений
                        if len(last_changes) > 100:
                            last_changes.pop(0)
                            
                        save_data()
                    
                    if 'machines' in sync_data:
                        save_machines_data(sync_data['machines'])
                    
                    if 'toolTypes' in sync_data:
                        save_tooltypes_data(sync_data['toolTypes'])
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'synced', 
                    'tools_count': len(tools_data),
                    'timestamp': time.time()
                }).encode())
                return
                
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass
        except Exception as e:
            print(f"❌ Ошибка в POST {self.path}: {e}")
            
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        """Переопределяем логирование чтобы убрать лишние сообщения"""
        # Логируем только ошибки
        if '404' in format or '500' in format or '400' in format or '403' in format:
            print(f"{self.address_string()} - - [{self.log_date_time_string()}] {format % args}")

# Загружаем данные при запуске
load_data()

PORT = 8000
server_ip = get_ip_address()

print("=" * 51)
print("🚀 СИСТЕМА УПРАВЛЕНИЯ ИНСТРУМЕНТАМИ")
print("=" * 50)
print(f"📍 Локальный: http://localhost:{PORT}")
print(f"📍 Сетевой:   http://{server_ip}:{PORT}")
print("=" * 50)
print(f"📊 Инструментов: {len(tools_data)}")
print("⚡ Режим: Реальная синхронизация")
print("🔒 Админ-панель: доступна только с хоста")
print("=" * 50)

# Автоматически открываем браузер
try:
    webbrowser.open(f'http://localhost:{PORT}')
except:
    pass

# Используем ThreadingMixIn для обработки множественных подключений
class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

try:
    # Запускаем сервер из текущей директории (где находится server.py)
    with ThreadedTCPServer(("", PORT), ToolHandler) as httpd:
        print(f"🎯 Сервер запущен на порту {PORT}")
        print("⏹️  Остановка: Ctrl+C")
        print("=" * 50)
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n💾 Сохраняем данные...")
    save_data()
    print("🛑 Сервер остановлен")
