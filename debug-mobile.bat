@echo off
chcp 65001
title Mobile Tool System - DEBUG
cd /d "%~dp0"

echo.
echo ========================================
echo    DEBUG MODE - MOBILE SYSTEM
echo ========================================
echo.

echo Step 1: Checking Python...
python --version
if errorlevel 1 (
    echo.
    echo ERROR: Python not found!
    echo Please install Python from python.org
    echo.
    pause
    exit /b 1
)

echo.
echo Step 2: Checking files...
if exist mobile-server.py (
    echo ✓ mobile-server.py found
) else (
    echo ✗ mobile-server.py missing
    echo Creating mobile-server.py...
    call :CREATE_MOBILE_SERVER
)

if exist index.html (
    echo ✓ index.html found
) else (
    echo ✗ index.html missing
)

echo.
echo Step 3: Starting server...
echo PRESS CTRL+C TO STOP
echo.
python mobile-server.py

echo.
echo Server stopped.
pause
exit /b

:CREATE_MOBILE_SERVER
echo import http.server > mobile-server.py
echo import socketserver >> mobile-server.py
echo import json >> mobile-server.py
echo import socket >> mobile-server.py
echo. >> mobile-server.py
echo tools_data = [] >> mobile-server.py
echo. >> mobile-server.py
echo class MobileHandler(http.server.SimpleHTTPRequestHandler): >> mobile-server.py
echo     def do_GET(self): >> mobile-server.py
echo         if self.path == '/api/tools': >> mobile-server.py
echo             self.send_response(200) >> mobile-server.py
echo             self.send_header('Content-type', 'application/json') >> mobile-server.py
echo             self.send_header('Access-Control-Allow-Origin', '*') >> mobile-server.py
echo             self.end_headers() >> mobile-server.py
echo             self.wfile.write(json.dumps(tools_data).encode()) >> mobile-server.py
echo             return >> mobile-server.py
echo         if self.path == '/': >> mobile-server.py
echo             self.path = '/index.html' >> mobile-server.py
echo         return http.server.SimpleHTTPRequestHandler.do_GET(self) >> mobile-server.py
echo. >> mobile-server.py
echo     def do_POST(self): >> mobile-server.py
echo         if self.path == '/api/tools': >> mobile-server.py
echo             content_length = int(self.headers['Content-Length']) >> mobile-server.py
echo             post_data = self.rfile.read(content_length) >> mobile-server.py
echo             new_tool = json.loads(post_data.decode()) >> mobile-server.py
echo             global tools_data >> mobile-server.py
echo             tools_data.append(new_tool) >> mobile-server.py
echo             self.send_response(200) >> mobile-server.py
echo             self.send_header('Access-Control-Allow-Origin', '*') >> mobile-server.py
echo             self.end_headers() >> mobile-server.py
echo             return >> mobile-server.py
echo. >> mobile-server.py
echo PORT = 8000 >> mobile-server.py
echo. >> mobile-server.py
echo with socketserver.TCPServer((^"^", PORT^), MobileHandler^) as httpd: >> mobile-server.py
echo     hostname = socket.gethostname(^) >> mobile-server.py
echo     local_ip = socket.gethostbyname(hostname^) >> mobile-server.py
echo     print(^"Server running at:^") >> mobile-server.py
echo     print(f^"Local: http://localhost:{PORT}^") >> mobile-server.py
echo     print(f^"Network: http://{local_ip}:{PORT}^") >> mobile-server.py
echo     httpd.serve_forever(^) >> mobile-server.py
echo ✓ mobile-server.py created
exit /b