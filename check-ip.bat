@echo off
echo Getting IP addresses...
ipconfig | findstr IPv4
echo.
echo Server will run on: http://YOUR-IP:8000
echo.
pause