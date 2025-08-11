# 🤖 سیستم کانفیگ نمایش دکمه‌ها

## 📋 توضیحات کلی

این سیستم امکان کنترل نمایش/عدم نمایش دکمه‌ها در پنل مدیر ربات را فراهم می‌کند. با استفاده از مقادیر 0 و 1 می‌توان دکمه‌ها را فعال یا غیرفعال کرد.

## ⚙️ نحوه کارکرد

### مقادیر کانفیگ:
- **0**: دکمه نمایش داده نمی‌شود
- **1**: دکمه نمایش داده می‌شود

### دکمه‌های موجود:
- `ROBOT_BUTTON`: دکمه "ربات" در پنل مدیر

## 🔧 نحوه استفاده

### 1. تغییر وضعیت از طریق کد:
```javascript
const { setButtonVisibility } = require('./3config');

// مخفی کردن دکمه ربات
setButtonVisibility('ROBOT_BUTTON', false);

// نمایش دادن دکمه ربات
setButtonVisibility('ROBOT_BUTTON', true);
```

### 2. بررسی وضعیت:
```javascript
const { isButtonVisible } = require('./3config');

// بررسی اینکه آیا دکمه ربات نمایش داده می‌شود
const isVisible = isButtonVisible('ROBOT_BUTTON');
```

### 3. دریافت تمام تنظیمات:
```javascript
const { getButtonVisibilityConfig } = require('./3config');

// دریافت تمام تنظیمات نمایش دکمه‌ها
const config = getButtonVisibilityConfig();
```

## 🎮 استفاده در ربات

### دستور `/ربات`:
- فقط مدیر مدرسه می‌تواند استفاده کند
- امکان تغییر وضعیت نمایش دکمه ربات
- نمایش وضعیت فعلی

### منوی کنترل:
- دکمه تغییر وضعیت (مخفی کردن/نمایش دادن)
- دکمه نمایش وضعیت فعلی
- دکمه بازگشت به منوی اصلی

## 📁 فایل‌های تغییر یافته

1. **`3config.js`**: اضافه شدن سیستم کانفیگ و توابع مربوطه
2. **`5polling.js`**: پیاده‌سازی کنترل نمایش دکمه‌ها و callback handlers

## 🔄 تغییرات خودکار

- تغییرات در keyboard به صورت خودکار اعمال می‌شود
- نیازی به restart ربات نیست
- تغییرات در پنل بعدی قابل مشاهده است

## 🚀 توسعه آینده

### دکمه‌های قابل اضافه:
```javascript
const BUTTON_VISIBILITY_CONFIG = {
  ROBOT_BUTTON: 1,
  SETTINGS_BUTTON: 1,    // دکمه تنظیمات
  ROLES_BUTTON: 1,       // دکمه نقش‌ها
  EXIT_BUTTON: 1,        // دکمه خروج
  // ... سایر دکمه‌ها
};
```

### قابلیت‌های قابل اضافه:
- ذخیره تنظیمات در فایل
- تنظیمات پیشرفته‌تر (مثل زمان‌بندی)
- لاگ تغییرات
- تنظیمات گروهی

## ✅ تست شده

- ✅ تغییر وضعیت 0 → 1
- ✅ تغییر وضعیت 1 → 0
- ✅ بررسی وضعیت فعلی
- ✅ مدیریت خطاها
- ✅ دسترسی مدیر
- ✅ callback handlers
- ✅ keyboard dynamic

## 📝 مثال کامل

```javascript
// تغییر وضعیت دکمه ربات
setButtonVisibility('ROBOT_BUTTON', false);
console.log('دکمه ربات مخفی شد:', isButtonVisible('ROBOT_BUTTON'));

// نمایش دادن دوباره
setButtonVisibility('ROBOT_BUTTON', true);
console.log('دکمه ربات نمایش داده می‌شود:', isButtonVisible('ROBOT_BUTTON'));

// دریافت تمام تنظیمات
const config = getButtonVisibilityConfig();
console.log('تنظیمات کامل:', config);
```

---

**تاریخ ایجاد**: 1404/05/15  
**نسخه**: 1.0.0  
**وضعیت**: فعال و تست شده ✅
