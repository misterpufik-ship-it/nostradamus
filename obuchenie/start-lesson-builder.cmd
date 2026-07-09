@echo off
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
echo Installing lesson builder dependencies...
python -m pip install -r lesson_builder\requirements.txt
echo.
echo Starting lesson builder at http://127.0.0.1:8765
python -m lesson_builder
