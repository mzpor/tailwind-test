@echo off
echo 🚀 Starting React + Bot Test Environment
echo.

echo 📦 Installing React dependencies...
call npm install
echo.

echo 🤖 Starting Backend API Server...
start "Backend API" cmd /k "cd robot && node gateway_bale.js"
timeout /t 3 /nobreak >nul

echo ⚡ Starting React Development Server...
start "React Dev" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo ✅ Both servers are starting...
echo 🌐 React Admin: http://localhost:5173/admin
echo 🔧 Backend API: http://localhost:3000
echo.
echo 📋 Test Steps:
echo 1. Open http://localhost:5173/admin
echo 2. Click "غیرفعال کردن گزارش‌ها" button
echo 3. Check Bale group for notification message
echo.
pause
