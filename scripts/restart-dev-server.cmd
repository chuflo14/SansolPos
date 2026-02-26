@echo off
setlocal

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

cd /d "%~dp0.."
start "" /b cmd /c "npm run dev > .devserver.log 2>&1"

echo restarted
