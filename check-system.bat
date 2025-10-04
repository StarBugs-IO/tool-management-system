@echo off
chcp 65001
title System Check
cd /d "%~dp0"

echo.
echo ========================================
echo    SYSTEM DIAGNOSTICS
echo ========================================
echo.

echo 1. Checking Python...
python --version
if errorlevel 1 (
    echo ❌ PYTHON NOT FOUND
    echo Install from: https://python.org
    echo Make sure to check "Add Python to PATH"
) else (
    echo ✅ Python OK
)

echo.
echo 2. Checking essential files...
if exist index.html (echo ✅ index.html) else (echo ❌ index.html - MISSING!)
if exist style.css (echo ✅ style.css) else (echo ❌ style.css - MISSING!)
if exist script.js (echo ✅ script.js) else (echo ❌ script.js - MISSING!)

echo.
echo 3. Checking network...
echo IP Addresses:
ipconfig | findstr IPv4

echo.
echo 4. Testing port 8000...
python -c "import socket; s=socket.socket(); s.settimeout(1); result = s.connect_ex(('localhost',8000)); s.close(); print('Port 8000:', 'BUSY' if result == 0 else 'FREE')"

echo.
echo ========================================
echo.
echo What to do next:
echo 1. If Python missing - install it first
echo 2. If files missing - copy them to this folder
echo 3. Run simple-mobile.bat to start server
echo.
pause