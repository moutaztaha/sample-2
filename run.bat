@echo off
echo Starting Factory Management System...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Error: Node.js is not installed or not in PATH
  echo Please install Node.js from https://nodejs.org/
  pause
  exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Error: npm is not installed or not in PATH
  echo Please install Node.js from https://nodejs.org/
  pause
  exit /b 1
)

REM Check if the application is built
if not exist "dist\index.html" (
  echo Building application...
  call npm run build
  if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to build application
    pause
    exit /b 1
  )
)

REM Start the server
echo Starting server...
start cmd /k npm run server

REM Wait for server to start
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

REM Open browser
echo Opening browser...
start http://localhost:3000

echo Factory Management System started successfully!
echo Default login credentials:
echo Username: admin
echo Password: admin123
echo.
echo Press any key to exit this window...
pause >nul