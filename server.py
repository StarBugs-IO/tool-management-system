import http.server
import socketserver
import json
import threading
import webbrowser
import socket
import os
from datetime import datetime

# Глобальная переменная для хранения данных
tools_data = []
DATA_FILE = 'tools_data.json'
data_lock = threading.Lock()

def load_data():
    """Загружает данные из файла"""
    global tools_data
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                tools_data = json.load(f)
            print(f"📥 Данные загружены из {DATA_FILE}: {len(tools_data)} инструментов")
        else:
            tools_data = []
            print("📝 Файл данных не найден, создан новый список")
    except Exception as e:
        print(f"❌ Ошибка загрузки данных: {e}")
        tools_data = []

def save_data():
    """Сохраняет данные в файл"""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(tools_data, f, ensure_ascii=False, indent=2)
        print(f"💾 Данные сохранены в {DATA_FILE}: {len(tools_data)} инструментов")
    except Exception as e:
        print(f"❌ Ошибка сохранения данных: {e}")

def get_ip_address():
    """Получает IP адрес сервера для подключения других устройств"""
    try:
        # Создаем временное соединение чтобы определить IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            ip_address = s.getsockname()[0]
        return ip_address
    except:
        return "localhost"

class ToolHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        global tools_data
        
        if self.path == '/api/tools':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            with data_lock:
                self.wfile.write(json.dumps(tools_data).encode())
            return
            
        elif self.path.startswith('/api/delete'):
            from urllib.parse import parse_qs, urlparse
            query = parse_qs(urlparse(self.path).query)
            cell_number = query.get('cell', [None])[0]
            machine = query.get('machine', [None])[0]
            
            if cell_number and machine:
                with data_lock:
                    initial_count = len(tools_data)
                    tools_data[:] = [t for t in tools_data if not (str(t.get('cellNumber', '')) == cell_number and t.get('machine', '') == machine)]
                    
                    if len(tools_data) < initial_count:
                        save_data()  # Сохраняем после удаления
                        print(f"🗑️ Удален инструмент: {machine}, ячейка {cell_number}")
                
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                return
                
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()
    
    def do_POST(self):
        global tools_data
        
        if self.path == '/api/tools':
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
                
                tools_data.append(new_tool)
                save_data()  # Сохраняем после добавления
                print(f"✅ Добавлен инструмент: {new_tool['toolType']} {new_tool.get('toolSize', '')} на {new_tool['machine']}, ячейка {new_tool['cellNumber']}")
            
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            return
            
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

# Загружаем данные при запуске
load_data()

PORT = 8000

# Получаем IP адрес
server_ip = get_ip_address()

print("=" * 60)
print("🚀 СИСТЕМА УПРАВЛЕНИЯ ИНСТРУМЕНТАМИ ЗАПУЩЕНА!")
print("=" * 60)
print(f"📍 Локальный доступ:  http://localhost:{PORT}")
print(f"📍 Сетевой доступ:    http://{server_ip}:{PORT}")
print(f"📍 Админ-панель:      http://{server_ip}:{PORT}/admin/")
print("=" * 60)
print(f"📊 Загружено инструментов: {len(tools_data)}")
print(f"💾 Данные сохраняются в: {DATA_FILE}")
print("=" * 60)
print("📱 Для подключения других устройств используйте:")
print(f"   🔗 http://{server_ip}:{PORT}")
print("=" * 60)
print("⏹️  Для остановки сервера нажмите Ctrl+C")
print("=" * 60)

# Автоматически открываем браузер
try:
    webbrowser.open(f'http://localhost:{PORT}')
    print("🌐 Браузер запущен автоматически...")
except:
    print("⚠️  Не удалось открыть браузер автоматически")

# Функция для автосохранения каждые 5 минут
def auto_save():
    while True:
        threading.Event().wait(300)  # 5 минут
        with data_lock:
            if tools_data:
                save_data()
                print(f"🔄 Автосохранение: {len(tools_data)} инструментов")

# Запускаем автосохранение в отдельном потоке
auto_save_thread = threading.Thread(target=auto_save, daemon=True)
auto_save_thread.start()

with socketserver.TCPServer(("", PORT), ToolHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n💾 Сохраняем данные перед выходом...")
        save_data()
        print("🛑 Сервер остановлен")