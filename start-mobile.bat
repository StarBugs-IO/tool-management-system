@echo off
chcp 65001
title Mobile Tool System
cd /d "%~dp0"

echo.
echo ========================================
echo    ЗАПУСК ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ
echo ========================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python не установлен!
    echo Установите Python с python.org
    pause
    exit /b 1
)

echo ✅ Python обнаружен
echo.
echo 🚀 Запуск мобильного сервера...
echo.

python mobile-server.py