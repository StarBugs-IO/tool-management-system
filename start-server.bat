@echo off
chcp 65001
title Tool Management System Server
cd /d "%~dp0"

echo.
echo ========================================
echo    СИСТЕМА УПРАВЛЕНИЯ ИНСТРУМЕНТАМИ
echo ========================================
echo.

:: Проверяем Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ОШИБКА: Python не установлен!
    echo.
    echo Установите Python с python.org
    echo Обязательно отметьте "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

echo ✅ Python обнаружен
echo.

:: Получаем и показываем IP адреса
echo 📡 Поиск сетевых адресов...
echo.

setlocal enabledelayedexpansion
set ip_count=0

for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr "IPv4"') do (
    set /a ip_count+=1
    set "ip=%%i"
    set "ip=!ip: =!"
    echo 📍 Адрес !ip_count!: http://!ip!:8000
)

echo.
if !ip_count! == 0 (
    echo ⚠️  Сетевые адреса не найдены
    echo    Проверьте подключение к сети
) else (
    echo 📱 Для подключения других устройств
    echo    используйте любой из адресов выше
)

echo.
echo 🚀 Запуск сервера...
echo ⏹️  Для остановки нажмите Ctrl+C
echo.

:: Запускаем сервер
python server.py

if errorlevel 1 (
    echo.
    echo ❌ Ошибка запуска сервера!
    echo.
    pause
)

echo.
echo Сервер остановлен.
pause
