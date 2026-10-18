@echo off
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
 echo Please install Node.js 24 from https://nodejs.org then open this file again.
 pause
 exit /b 1
)
if not exist node_modules (
 call npm ci
 if errorlevel 1 (pause & exit /b 1)
)
start "" http://localhost:3000
call npm run dev
pause
