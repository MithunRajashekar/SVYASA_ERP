@echo off
setlocal
cd /d "%~dp0"
title S-VYASA ERP - Three Portals

if not exist package.json (
  echo ERROR: package.json was not found. Run this file from the extracted project folder.
  pause
  exit /b 1
)
if not exist .env (
  echo ERROR: .env is missing. Run SETUP-ERP-WINDOWS.bat first.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Dependencies are missing. Run SETUP-ERP-WINDOWS.bat first.
  pause
  exit /b 1
)
if not exist student-app\node_modules (
  echo Student portal dependencies are missing. Run SETUP-ERP-WINDOWS.bat first.
  pause
  exit /b 1
)

echo Starting API, Administrator, Faculty and Student portals...
echo Administrator: http://localhost:5175
echo Faculty:        http://localhost:5173
echo Student:        http://localhost:5174
echo API health:     http://localhost:4000/api/health
echo.
echo Keep this window open. Press Ctrl+C to stop all services.
echo.
call npm run dev:all
pause
