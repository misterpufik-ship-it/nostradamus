@echo off
cd /d "%~dp0"
start "" /b node server.js
timeout /t 1 >nul
start "" "http://localhost:8001/"
