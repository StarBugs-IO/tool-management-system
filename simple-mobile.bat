@echo off
cd /d "%~dp0"
python -c "
import http.server
import socketserver
import json
import socket

data = []

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/tools':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        elif self.path.startswith('/api/delete'):
            import urllib.parse
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            cell = query.get('cell', [''])[0]
            machine = query.get('machine', [''])[0]
            global data
            data = [t for t in data if not (str(t.get('cellNumber', '')) == cell and t.get('machine', '') == machine)]
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
        else:
            if self.path == '/':
                self.path = '/index.html'
            super().do_GET()
    
    def do_POST(self):
        if self.path == '/api/tools':
            length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(length)
            new_tool = json.loads(post_data.decode())
            data.append(new_tool)
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

print('=== MOBILE TOOL SYSTEM ===')
hostname = socket.gethostname()
local_ip = socket.gethostbyname(hostname)
print(f'Local:  http://localhost:8000')
print(f'Mobile: http://{local_ip}:8000')
print('Press Ctrl+C to stop')
print('==========================')
socketserver.TCPServer(('', 8000), Handler).serve_forever()
"
pause