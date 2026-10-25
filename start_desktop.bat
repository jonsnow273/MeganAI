@echo off
title Megan AI Desktop Assistant
cd /d "%~dp0"

echo ======================================================
echo  Starting Megan AI - Intelligent Desktop Assistant
echo ======================================================
echo.

python main.py --desktop
if errorlevel 1 (
    echo.
    echo Launching via npm in frontend...
    cd frontend && npm run electron:start
)
