import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs

# Данные хранятся в памяти (можно заменить на файл)
tools_data = []

class MobileHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # API endpoints
        if self.path == '/api/tools':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(tools_data).encode())
            return
            
        elif self.path.startswith('/api/delete'):
            query = parse_qs(urlparse(self.path).query)
            cell_number = query.get('cell', [None])[0]
            machine = query.get('machine', [None])[0]
            
            if cell_number and machine:
                global tools_data
                tools_data = [t for t in tools_data if not (str(t['cellNumber']) == cell_number and t['machine'] == machine)]
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok'}).encode())
                return
                
        # Статические файлы
        if self.path == '/':
            self.path = '/index.html'
            
        return super().do_GET()
    
    def do_POST(self):
        if self.path == '/api/tools':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            new_tool = json.loads(post_data.decode())
            
            global tools_data
            
            # Проверяем, не занята ли ячейка
            if any(t['cellNumber'] == new_tool['cellNumber'] and t['machine'] == new_tool['machine'] for t in tools_data):
                self.send_response(400)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'Cell already occupied')
                return
            
            tools_data.append(new_tool)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode())
            return
            
    def do_OPTIONS(self):
        # CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

PORT = 8000

with socketserver.TCPServer(("", PORT), MobileHandler) as httpd:
    print("=" * 60)
    print("🚀 МОБИЛЬНЫЙ СЕРВЕР ЗАПУЩЕН!")
    print("=" * 60)
    
    # Получаем IP адреса
    import socket
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    print(f"📍 Локальный доступ:  http://localhost:{PORT}")
    print(f"📍 Сетевой доступ:    http://{local_ip}:{PORT}")
    print("=" * 60)
    print("📱 Подключите мобильные устройства по сетевому адресу")
    print("⏹️  Для остановки: Ctrl+C")
    print("=" * 60)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Сервер остановлен")