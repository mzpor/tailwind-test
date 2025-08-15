# مدرسه تلاوت - سیستم ثبت‌نام و نظرسنجی

این پروژه یک سیستم کامل برای مدیریت مدرسه تلاوت است که شامل ثبت‌نام دانش‌آموزان، نظرسنجی و مدیریت کارگاه‌ها می‌باشد.

## 🚀 راه‌اندازی پروژه

### پیش‌نیازها
- Node.js (نسخه 18 یا بالاتر)
- npm یا yarn

### نصب وابستگی‌ها
```bash
npm install
```

### راه‌اندازی توسعه
```bash
npm run dev
```

### ساخت نسخه تولید
```bash
npm run build
```

## ⚙️ تنظیمات Gateway

### فایل کانفیگ
پروژه از فایل `gateway-config.json` برای تنظیم پورت و URL gateway استفاده می‌کند.

**⚠️ مهم:** این فایل در زمان اجرا ایجاد می‌شود و نباید در git commit شود.

### راه‌اندازی اولیه
1. فایل `gateway-config.example.json` را کپی کنید:
   ```bash
   cp gateway-config.example.json gateway-config.json
   ```

2. مقادیر را مطابق نیاز خود تنظیم کنید:
   ```json
   {
     "gatewayPort": 3003,
     "gatewayUrl": "http://localhost:3003"
   }
   ```

### ساخت خودکار
اگر فایل کانفیگ وجود نداشته باشد، برنامه به صورت خودکار از مقادیر پیش‌فرض استفاده می‌کند.

## 📁 ساختار پروژه

- `src/` - کدهای frontend
- `robot/` - کدهای backend و ربات تلگرام
- `public/` - فایل‌های استاتیک
- `data/` - فایل‌های داده (در زمان اجرا ایجاد می‌شوند)

## 🔧 تکنولوژی‌ها

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** JSON-based storage
- **Telegram Bot:** Bale Bot API
