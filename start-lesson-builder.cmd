@echo off
cd /d "%~dp0obuchenie"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-lesson-builder.ps1"
