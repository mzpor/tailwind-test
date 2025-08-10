# 📱 سیستم مدیریت نقش‌ها بر اساس شماره تلفن

## 🎯 هدف
این سیستم به طور خودکار نقش مربی را برای شماره‌های تلفن مدیریت می‌کند:
- وقتی کارگاهی با مربی اضافه می‌شود، شماره موبایل مربی به طور خودکار به لیست `COACH` اضافه می‌شود
- وقتی کارگاه حذف می‌شود، شماره موبایل مربی از لیست `COACH` حذف می‌شود
- سیستم می‌تواند تشخیص دهد که آیا شماره موبایل مربی است یا نه

## 🔧 نحوه کار

### 1. **اضافه کردن کارگاه با مربی**
```javascript
// وقتی کارگاهی با مربی اضافه می‌شود
const workshopData = {
  instructor_name: "علی احمدی",
  instructor_phone: "09123456789",
  cost: "500,000 تومان",
  link: "https://example.com"
};

// سیستم به طور خودکار مربی را به لیست COACH اضافه می‌کند
if (workshopData.instructor_phone && workshopData.instructor_phone.trim() !== '') {
  const result = addCoachByPhone(workshopData.instructor_phone, workshopData.instructor_name);
  // مربی به لیست COACH اضافه می‌شود
}
```

### 2. **حذف کارگاه**
```javascript
// وقتی کارگاهی حذف می‌شود
const instructorPhone = this.workshops[workshopId].instructor_phone;

// حذف کارگاه
delete this.workshops[workshopId];

// سیستم به طور خودکار مربی را از لیست COACH حذف می‌کند
if (instructorPhone && instructorPhone.trim() !== '') {
  const result = removeCoachByPhone(instructorPhone);
  // مربی از لیست COACH حذف می‌شود
}
```

### 3. **تشخیص نقش مربی**
```javascript
// بررسی اینکه آیا شماره تلفن مربی است یا نه
const isCoach = isPhoneCoach(phoneNumber);

// دریافت اطلاعات مربی
const coachInfo = getCoachByPhone(phoneNumber);
```

## 📋 توابع موجود

### در `3config.js`:
- `addCoachByPhone(phoneNumber, instructorName)` - اضافه کردن مربی
- `removeCoachByPhone(phoneNumber)` - حذف مربی
- `isPhoneCoach(phoneNumber)` - بررسی مربی بودن
- `getCoachByPhone(phoneNumber)` - دریافت اطلاعات مربی
- `getAllCoachesWithPhones()` - دریافت تمام مربی‌ها

### در `6mid.js`:
- `isCoachByPhone(phoneNumber)` - بررسی مربی بودن (wrapper)
- `getCoachInfoByPhone(phoneNumber)` - دریافت اطلاعات مربی (wrapper)

### در `gateway_bale.js`:
- تابع `findUserIdByPhone` به‌روزرسانی شده تا مربی‌ها را تشخیص دهد

## 🧪 تست سیستم

### اجرای تست:
```bash
cd robot
node test_phone_coach_system.js
```

### تست دستی:
1. **اضافه کردن کارگاه**: یک کارگاه با مربی و شماره تلفن اضافه کنید
2. **بررسی نقش**: با همان شماره تلفن وارد ربات شوید
3. **حذف کارگاه**: کارگاه را حذف کنید
4. **بررسی مجدد**: دوباره با همان شماره تلفن وارد شوید

## 📊 ساختار داده

### مربی جدید:
```javascript
{
  id: "phone_1754794306126_zg8k77ae3",
  name: "علی احمدی",
  phone: "989123456789",
  type: "phone_based"
}
```

### در `USERS`:
```javascript
{
  "phone_1754794306126_zg8k77ae3": {
    name: "علی احمدی",
    role: "COACH",
    phone: "989123456789"
  }
}
```

## 🔍 لاگ‌ها

سیستم لاگ‌های کامل برای تمام عملیات تولید می‌کند:

```
✅ [CONFIG] Coach علی احمدی with phone 989123456789 added to COACH role
✅ [KARGAH] Coach علی احمدی with phone 989123456789 added to COACH role
✅ [GATEWAY] Phone 989123456789 is a COACH
```

## ⚠️ نکات مهم

1. **نرمال‌سازی شماره تلفن**: سیستم شماره‌های تلفن را نرمال‌سازی می‌کند
2. **بررسی تکراری**: نمی‌تواند دو مربی با همان شماره تلفن داشته باشد
3. **حذف خودکار**: وقتی کارگاه حذف می‌شود، مربی به طور خودکار حذف می‌شود
4. **شناسه منحصر به فرد**: هر مربی شناسه منحصر به فردی دریافت می‌کند

## 🚀 مزایا

- **خودکار**: نیازی به تنظیم دستی نقش‌ها نیست
- **همگام**: نقش‌ها همیشه با کارگاه‌ها همگام هستند
- **امن**: فقط مدیران می‌توانند کارگاه‌ها را اضافه/حذف کنند
- **قابل اعتماد**: سیستم خطاها را مدیریت می‌کند

## 📝 مثال کامل

```javascript
// 1. اضافه کردن کارگاه
const workshop = {
  instructor_name: "سارا محمدی",
  instructor_phone: "09987654321",
  cost: "300,000 تومان"
};

// 2. سیستم به طور خودکار مربی را اضافه می‌کند
addCoachByPhone(workshop.instructor_phone, workshop.instructor_name);

// 3. بررسی نقش
const isCoach = isPhoneCoach("09987654321"); // true

// 4. حذف کارگاه
removeCoachByPhone("09987654321");

// 5. بررسی مجدد
const isCoachAfter = isPhoneCoach("09987654321"); // false
```

## 🎉 نتیجه

حالا سیستم به طور کامل می‌تواند:
- مربی‌ها را بر اساس شماره تلفن مدیریت کند
- نقش‌ها را به طور خودکار اضافه/حذف کند
- تشخیص دهد که آیا شماره تلفن مربی است یا نه
- با سیستم موجود کارگاه‌ها همگام باشد
