@echo off
setlocal
cd /d "%~dp0"
title S-VYASA ERP - First-time Setup

echo ======================================================
echo              S-VYASA ERP SETUP
echo ======================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or is not on PATH.
  echo Install Node.js 20.19+ or 22.12+, then reopen this file.
  start https://nodejs.org/en/download
  pause
  exit /b 1
)

if not exist package.json (
  echo ERROR: package.json was not found.
  echo Extract this ZIP and run this file from the folder containing README.md.
  pause
  exit /b 1
)

if not exist .env (
  if exist .env.example (
    copy .env.example .env >nul
    echo Created .env from .env.example.
  ) else (
    echo ERROR: .env.example is missing.
    pause
    exit /b 1
  )
)

echo Opening the ERP configuration file.
echo Enter DATABASE_URL and JWT_SECRET, save, and close Notepad.
notepad .env

echo.
echo Installing the shared API, Administrator and Faculty dependencies...
call npm install
if errorlevel 1 (
  echo ERROR: Main project dependency installation failed.
  pause
  exit /b 1
)

echo.
echo Installing Student portal dependencies...
call npm --prefix .\student-app install
if errorlevel 1 (
  echo ERROR: Student portal dependency installation failed.
  pause
  exit /b 1
)

echo.
echo ======================================================
echo Setup completed. Double-click START-ERP-WINDOWS.bat.
echo ======================================================
pause
