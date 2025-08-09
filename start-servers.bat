@echo off
echo 🚀 راه‌اندازی سرورها...

echo 🛑 متوقف کردن سرورهای قبلی...
taskkill /F /IM node.exe >nul 2>&1

echo 🤖 راه‌اندازی Backend...
start "Backend Server" cmd /k "cd robot && node gateway_bale.js"

echo ⏳ صبر 3 ثانیه...
timeout /t 3 /nobreak >nul

echo ⚡ راه‌اندازی React...
start "React Dev Server" cmd /k "npm run dev"

echo.
echo ✅ سرورها در حال راه‌اندازی...
echo 🌐 React Admin: http://localhost:5173/admin
echo 🔧 Backend API: http://localhost:3000
echo.
echo 📋 برای تست:
echo 1. برو به http://localhost:5173/admin
echo 2. دکمه گزارش‌ها را کلیک کن
echo 3. چک کن پیام به مدیر 1114227010 ارسال شد
echo.
pause
