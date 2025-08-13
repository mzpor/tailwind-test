# 🚀 راهنمای یکپارچه‌سازی SSE - ربات و سایت

## 📋 خلاصه
این سیستم از **Server-Sent Events (SSE)** برای هماهنگی داده‌ها بین ربات تلگرام و سایت استفاده می‌کند. **بدون polling** و فقط با درخواست کاربر.

## 🔧 مشکلات حل شده

### 1. ✅ مشکل کاربر ناشناس
- **قبل:** هر پیام معمولی از کاربر ناشناس باعث ارسال مجدد پیام خوش‌آمدگویی می‌شد
- **بعد:** کاربر فقط یک بار پیام خوش‌آمدگویی دریافت می‌کند
- **راه‌حل:** استفاده از فیلد `welcomeSent` برای علامت‌گذاری

### 2. ✅ هماهنگی داده‌ها
- **قبل:** داده‌های ربات و سایت جدا بودند
- **بعد:** هماهنگ‌سازی خودکار بین `registrations.json` و `registration_data.json`
- **راه‌حل:** سرور SSE با API های یکپارچه

## 🏗️ معماری سیستم

```
┌─────────────────┐    SSE    ┌─────────────────┐
│   ربات تلگرام   │ ◄────────► │   سرور SSE      │
│                 │            │                 │
│ registrations   │            │ API + Events    │
│ .json          │            │                 │
└─────────────────┘            └─────────────────┘
                                        │
                                        │ HTTP API
                                        ▼
                               ┌─────────────────┐
                               │   سایت React    │
                               │                 │
                               │ SSE Client      │
                               │                 │
                               └─────────────────┘
```

## 🚀 راه‌اندازی

### مرحله 1: نصب dependencies سرور SSE
```bash
cd robot
npm install --package-lock-only
npm install express cors
```

### مرحله 2: اجرای سرور SSE
```bash
cd robot
node sse_server.js
```

**خروجی مورد انتظار:**
```
🚀 [SSE] Server running on port 3001
🔗 [SSE] SSE endpoint: http://localhost:3001/api/sse
📊 [SSE] Stats endpoint: http://localhost:3001/api/stats
```

### مرحله 3: اجرای سایت
```bash
cd src
npm run dev
```

### مرحله 4: تست اتصال
1. به سایت بروید
2. روی دکمه **"اتصال SSE 🔗"** کلیک کنید
3. وضعیت اتصال را مشاهده کنید

## 📡 API های سرور SSE

### 🔗 SSE Endpoint
```
GET /api/sse
```
- **توضیح:** اتصال SSE برای دریافت تغییرات real-time
- **استفاده:** کلاینت‌ها برای دریافت اعلان‌ها

### 📊 آمار کلی
```
GET /api/stats
```
- **توضیح:** دریافت آمار کلی کاربران
- **پاسخ:**
```json
{
  "total": 150,
  "incomplete": 45,
  "completed": 105,
  "botUsers": 80,
  "websiteUsers": 70,
  "lastUpdated": 1703123456789
}
```

### 🔍 جستجوی کاربران
```
GET /api/search?query=علی
```
- **توضیح:** جستجو بر اساس نام، کد ملی یا تلفن
- **پاسخ:** آرایه‌ای از کاربران مطابق

### 📋 لیست کاربران
```
GET /api/users?status=completed&source=bot
```
- **توضیح:** دریافت لیست کاربران با فیلتر
- **پارامترها:**
  - `status`: وضعیت ثبت‌نام
  - `source`: منبع (bot/website)

### 🔄 به‌روزرسانی کاربر
```
POST /api/users/:userId
Content-Type: application/json

{
  "fullName": "علی احمدی",
  "phone": "09123456789"
}
```

### 🆕 ایجاد کاربر جدید
```
POST /api/users
Content-Type: application/json

{
  "fullName": "سارا محمدی",
  "nationalId": "1234567890",
  "phone": "09123456789"
}
```

## 🔗 کلاینت SSE در سایت

### استفاده در کامپوننت React
```jsx
import SSEClient from '../lib/sse-client';

const sseClient = new SSEClient('http://localhost:3001');

// اتصال به سرور
sseClient.connect();

// ثبت event handlers
sseClient.on('user_updated', (data) => {
  console.log('کاربر به‌روزرسانی شد:', data);
});

sseClient.on('user_created', (data) => {
  console.log('کاربر جدید ایجاد شد:', data);
});

// دریافت آمار
const stats = await sseClient.getStats();
```

## 🔄 رویدادهای SSE

### 1. `user_updated`
- **زمان:** هنگام به‌روزرسانی اطلاعات کاربر
- **داده:** `{ userId, updates }`

### 2. `user_created`
- **زمان:** هنگام ایجاد کاربر جدید
- **داده:** `{ userId, userData }`

### 3. `connected`
- **زمان:** هنگام برقراری اتصال
- **داده:** `{ message: "اتصال SSE برقرار شد" }`

## 🛠️ عیب‌یابی

### مشکل: سرور SSE اجرا نمی‌شود
```bash
# بررسی پورت
netstat -an | grep 3001

# بررسی dependencies
npm list express cors
```

### مشکل: اتصال SSE برقرار نمی‌شود
1. **بررسی CORS:** سرور SSE باید CORS را پشتیبانی کند
2. **بررسی پورت:** پورت 3001 باید آزاد باشد
3. **بررسی firewall:** firewall سیستم را بررسی کنید

### مشکل: داده‌ها هماهنگ نمی‌شوند
1. **بررسی فایل‌ها:** `data/` directory وجود دارد؟
2. **بررسی permissions:** فایل‌ها قابل خواندن/نوشتن هستند؟
3. **بررسی logs:** console سرور را بررسی کنید

## 📊 مزایای سیستم جدید

### ✅ قبل (سیستم قدیمی)
- ❌ کاربر ناشناس spam می‌کرد
- ❌ داده‌های ربات و سایت جدا بودند
- ❌ نیاز به polling مداوم
- ❌ عدم هماهنگی real-time

### ✅ بعد (سیستم جدید)
- ✅ کاربر ناشناس فقط یک بار پیام دریافت می‌کند
- ✅ هماهنگی خودکار داده‌ها
- ✅ SSE بدون polling
- ✅ هماهنگی real-time
- ✅ API های یکپارچه
- ✅ مدیریت بهتر اتصال

## 🔮 توسعه‌های آینده

### 1. 🔐 احراز هویت
- JWT tokens برای API
- Rate limiting
- IP whitelist

### 2. 📊 مانیتورینگ
- Logging پیشرفته
- Metrics collection
- Health checks

### 3. 🔄 Sync پیشرفته
- Conflict resolution
- Data validation
- Backup & restore

### 4. 🌐 WebSocket
- جایگزینی SSE با WebSocket
- Bi-directional communication
- Real-time chat

## 📞 پشتیبانی

برای سوالات و مشکلات:
1. **Logs:** console سرور و مرورگر را بررسی کنید
2. **Network:** Network tab مرورگر را بررسی کنید
3. **API:** endpoint ها را با Postman تست کنید

---

**🎯 هدف:** ایجاد سیستم یکپارچه و کارآمد برای مدیریت ثبت‌نام بین ربات و سایت
