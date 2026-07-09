@echo off
cd /d "%~dp0"
pip install flask flask-cors openpyxl -q
start "" /b python inventa\api_server.py
timeout /t 1 >nul
start "" "http://127.0.0.1:8003/inventa/"
