@echo off
@chcp 65001 >nul
title Resume Expert AI Agent Launcher
cd /d "%~dp0"

echo ===================================================
echo           Resume Expert AI Agent Starting...
echo ===================================================
echo.
echo Launching local server and opening browser...
echo.

start "" "http://localhost:3000"

call npm run dev

pause
