@echo off
chcp 65001 >nul
title Tool Management System Server
cd /d "%~dp0"

echo.
echo ========================================
echo    TOOL MANAGEMENT SYSTEM
echo ========================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo.
    echo Install Python from python.org
    echo Make sure to check "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

echo OK: Python found
echo.

:: Show network addresses
echo Network addresses:
setlocal enabledelayedexpansion
set count=0

for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr "IPv4"') do (
    set /a count+=1
    set "ip=%%i"
    set "ip=!ip: =!"
    echo   http://!ip!:8000
)

echo.
if !count! == 0 (
    echo Warning: No network addresses found
    echo Check network connection
) else (
    echo For other devices use any address above
)

echo.
echo Starting server...
echo Press Ctrl+C to stop
echo.

:: Start server
python dist/server.py

if errorlevel 1 (
    echo.
    echo ERROR: Server startup failed
    echo.
    pause
)

echo.
echo Server stopped.
pause
