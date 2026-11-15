@echo off
setlocal
cd /d "%~dp0"
title S-VYASA ERP - Reset Administrator Password

echo ======================================================
echo        S-VYASA ERP - ADMIN PASSWORD RESET
echo ======================================================
echo.
echo This changes ONLY the ERP-ADMIN password in your configured Atlas database.
echo It does not delete or modify students, faculty, classes, attendance or marks.
echo.
if not exist .env (
  echo ERROR: .env was not found. Configure DATABASE_URL first.
  pause
  exit /b 1
)
if not exist node_modules\bcryptjs (
  echo ERROR: Dependencies are missing. Run SETUP-ERP-WINDOWS.bat first.
  pause
  exit /b 1
)
node server\reset-admin-password.js
pause
