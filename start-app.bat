@echo off
echo ========================================
echo    Plantea App Launcher
echo ========================================
echo.
echo This will start both backend and frontend
echo.
echo Step 1: Starting Backend Server...
echo.

start "Plantea Backend" cmd /k "cd plantea-backend && node server.js"

timeout /t 3 /nobreak >nul

echo.
echo Step 2: Testing Backend...
echo.

node test-backend.js

echo.
echo Step 3: Starting Frontend...
echo.
echo Press any key to start the frontend app...
pause >nul

start "Plantea Frontend" cmd /k "cd plantea-frontend && npx expo start"

echo.
echo ========================================
echo    Both servers are starting!
echo ========================================
echo.
echo Backend: http://localhost:3000
echo Frontend: Check the Expo window
echo.
echo To stop: Close both terminal windows
echo.
echo Happy coding! 🌱
echo.
pause
