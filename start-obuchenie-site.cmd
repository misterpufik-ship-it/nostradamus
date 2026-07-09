@echo off
cd /d "%~dp0"
echo X-active Obuchenie: http://127.0.0.1:8000/obuchenie/site/
echo Lesson builder:    http://127.0.0.1:8765/
start "" "http://127.0.0.1:8000/obuchenie/site/"
python -m http.server 8000
