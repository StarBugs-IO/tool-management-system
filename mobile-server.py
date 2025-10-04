import http.server 
import socketserver 
import json 
import socket 
 
tools_data = [] 
 
class MobileHandler(http.server.SimpleHTTPRequestHandler): 
    def do_GET(self): 
        if self.path == '/api/tools': 
            self.send_response(200) 
            self.send_header('Content-type', 'application/json') 
            self.send_header('Access-Control-Allow-Origin', '*') 
            self.end_headers() 
            self.wfile.write(json.dumps(tools_data).encode()) 
            return 
        if self.path == '/': 
            self.path = '/index.html' 
        return http.server.SimpleHTTPRequestHandler.do_GET(self) 
 
    def do_POST(self): 
        if self.path == '/api/tools': 
            content_length = int(self.headers['Content-Length']) 
            post_data = self.rfile.read(content_length) 
            new_tool = json.loads(post_data.decode()) 
            global tools_data 
            tools_data.append(new_tool) 
            self.send_response(200) 
            self.send_header('Access-Control-Allow-Origin', '*') 
            self.end_headers() 
            return 
 
PORT = 8000 
 
with socketserver.TCPServer(("", PORT), MobileHandler) as httpd: 
    hostname = socket.gethostname() 
    local_ip = socket.gethostbyname(hostname) 
    print("Server running at:") 
    print(f"Local: http://localhost:{PORT}") 
    print(f"Network: http://{local_ip}:{PORT}") 
    httpd.serve_forever() 
