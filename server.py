import http.server
import socketserver
import json
import threading
import webbrowser
import socket

# Глобальная переменная для хранения данных
tools_data = []
data_lock = threading.Lock()

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
                    tools_data[:] = [t for t in tools_data if not (str(t.get('cellNumber', '')) == cell_number and t.get('machine', '') == machine)]
                
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
                if any(t['cellNumber'] == new_tool['cellNumber'] and t['machine'] == new_tool['machine'] for t in tools_data):
                    self.send_response(400)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(b'Cell already occupied')
                    return
                
                tools_data.append(new_tool)
            
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

with socketserver.TCPServer(("", PORT), ToolHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Сервер остановлен")
