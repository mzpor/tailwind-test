# 🎓 ماژول ثبت نام هوشمند (14reg.js)

## 📋 خلاصه
ماژول `14reg.js` یک سیستم ثبت نام کامل و هوشمند برای مدرسه تلاوت قرآن است که بر اساس راهنمای `13REG_GUIDE.md` ساخته شده است.

## ✨ ویژگی‌های کلیدی

### 🔐 **مراحل ثبت نام**
- **مرحله 1:** دریافت نام و نام خانوادگی
- **مرحله 2:** دریافت کد ملی 10 رقمی  
- **مرحله 3:** دریافت شماره تلفن (با دکمه ارسال تماس)
- **مرحله 4:** تأیید نهایی و تکمیل ثبت نام

### 🎨 **رابط کاربری بهبود یافته**
- **کاربر ناشناس:** خوشامدگویی + دکمه ثبت نام مستقیم
- **کاربر ناقص:** درخواست تکمیل اطلاعات
- **کاربر کامل:** منوی اصلی + دسترسی کامل
- کیبوردهای معمولی زیبا و کاربرپسند
- پیام‌های فارسی کامل با ایموجی‌های مناسب
- دکمه‌های inline برای ویرایش اطلاعات

### 💾 **مدیریت داده**
- ذخیره در فایل JSON (`smart_registration.json`)
- مدیریت حالت کاربر (`userStates`)
- پیگیری مراحل ثبت نام
- پشتیبانی از کارگاه‌ها

## 🚀 نحوه استفاده

### **نصب و راه‌اندازی**
```javascript
const SmartRegistrationModule = require('./14reg');
const registrationModule = new SmartRegistrationModule();
```

### **متدهای اصلی**

#### 1. **پردازش پیام‌ها**
```javascript
const result = await registrationModule.handleMessage(message);
```

#### 2. **پردازش callback ها**
```javascript
const result = await registrationModule.handleCallback(callback);
```

#### 3. **دستور /start**
```javascript
const result = await registrationModule.handleStartCommand(chatId, userId);
```

## 📱 **جریان کاربری بهبود یافته**

### **کاربر جدید (ناشناس)**
```
1. /start → خوشامدگویی + دکمه ثبت نام
2. کلیک "📝 ثبت نام" → شروع مستقیم ثبت نام
3. ورود نام → ورود کد ملی → ورود تلفن → تأیید
```

### **کاربر موجود ناقص**
```
1. /start → منوی اصلی + درخواست تکمیل
2. دکمه "✏️ تکمیل ثبت‌نام" → تکمیل اطلاعات
```

### **کاربر کامل**
```
1. /start → منوی اصلی + خوشامدگویی شخصی‌سازی شده
2. "معرفی مدرسه" → خوشامدگویی شخصی‌سازی شده
3. "پنل قرآن‌آموز" → دسترسی کامل
4. "انتخاب کلاس" → لیست کارگاه‌ها
```

## 🔧 **متدهای مهم**

### **بررسی وضعیت کاربر**
```javascript
// بررسی ثبت نام
const isRegistered = registrationModule.isUserRegistered(userId);

// بررسی کامل بودن
const isComplete = registrationModule.isRegistrationComplete(userId);

// دریافت فیلدهای ناقص
const missingFields = registrationModule.getMissingFields(userId);
```

### **اعتبارسنجی**
```javascript
// اعتبارسنجی کد ملی
const isValid = registrationModule.isValidNationalId(nationalId);

// بررسی مدیر بودن
const isAdmin = registrationModule.isUserAdmin(phone);
```

### **مدیریت کارگاه‌ها**
```javascript
// انتخاب کارگاه
await registrationModule.handleWorkshopSelection(chatId, userId, workshopName);

// پنل قرآن‌آموز
await registrationModule.handleQuranStudentPanel(chatId, userId);
```

## 📁 **ساختار فایل داده**

### **smart_registration.json**
```json
{
  "userData": {
    "userId": {
      "full_name": "نام کامل",
      "first_name": "نام کوچک",
      "national_id": "کد ملی",
      "phone": "شماره تلفن",
      "user_type": "quran_student",
      "registration_date": "تاریخ ثبت نام"
    }
  },
  "userStates": {
    "userId": {
      "step": "مرحله فعلی",
      "data": "داده‌های موقت"
    }
  },
  "lastUpdated": "تاریخ آخرین بروزرسانی"
}
```

## 🎯 **مراحل ثبت نام**

### **مرحله 1: نام**
- دریافت نام کامل
- استخراج نام کوچک
- اعتبارسنجی حداقل 2 کاراکتر
- دکمه ویرایش نام

### **مرحله 2: کد ملی**
- اعتبارسنجی 10 رقمی
- دکمه‌های ویرایش نام و کد ملی
- نمایش پیشرفت

### **مرحله 3: تلفن**
- دکمه ارسال تماس
- اعتبارسنجی شماره
- دکمه‌های ویرایش تمام فیلدها

### **مرحله 4: تأیید**
- نمایش خلاصه اطلاعات
- دکمه تأیید نهایی
- تشخیص خودکار نقش (مربی/دانش‌آموز)

## 🔄 **مدیریت خطا و بازگشت**

### **دکمه‌های بازگشت**
- "برگشت به قبل" - بازگشت به مرحله قبلی
- "🏠 برگشت به منو" - بازگشت به منوی اصلی
- "خروج" - خروج از ربات

### **ویرایش اطلاعات**
- دکمه‌های inline برای ویرایش
- بازگشت به مرحله مربوطه
- حفظ داده‌های قبلی

## 📊 **ویژگی‌های پیشرفته**

### **مدیریت نقش‌ها**
- تشخیص خودکار مربی
- دسترسی‌های متفاوت
- پیام‌های شخصی‌سازی شده

### **سیستم کارگاه‌ها**
- لیست کارگاه‌های موجود
- اطلاعات کامل هر کارگاه
- لینک مستقیم و تماس

### **ثبت نام ماه آینده**
- ثبت نام مستقیم
- بررسی وضعیت موجود
- مدیریت کاربران ناقص

## 🧪 **تست و دیباگ**

### **فایل تست**
```bash
node test_14reg.js
```

### **لاگ‌های مهم**
```javascript
// لاگ‌های مراحل ثبت نام
console.log(`🔄 [14REG] User ${userId} moved from ${step} step`);

// لاگ‌های خطا
console.error(`❌ [14REG] Error in ${method} for user ${userId}:`, error);

// لاگ‌های موفقیت
console.log(`✅ [14REG] ${action} completed successfully for user ${userId}`);
```

### **نقاط بررسی**
- وضعیت `userStates`
- محتوای `userData`
- اعتبارسنجی ورودی‌ها
- ذخیره و بارگذاری داده

## 🔒 **امنیت و اعتبارسنجی**

### **اعتبارسنجی ورودی**
- نام: حداقل 2 کاراکتر
- کد ملی: دقیقاً 10 رقم
- تلفن: فرمت استاندارد

### **مدیریت خطا**
- try-catch در تمام متدها
- بررسی وجود داده
- پیام‌های خطای مناسب

## 📈 **بهینه‌سازی**

### **مدیریت حافظه**
- پاک کردن `userStates` پس از تکمیل
- ذخیره خودکار داده‌ها
- مدیریت فایل‌های JSON

### **عملکرد**
- بررسی سریع وضعیت کاربر
- پردازش غیرهمزمان
- مدیریت callback ها

## 🆘 **راهنمای عیب‌یابی**

### **مشکلات رایج**

#### 1. **کاربر در مرحله گیر کرده**
```javascript
// بررسی وضعیت
console.log(registrationModule.userStates[userId]);

// پاک کردن وضعیت
delete registrationModule.userStates[userId];
```

#### 2. **داده ذخیره نمی‌شود**
```javascript
// بررسی فایل
console.log(registrationModule.dataFile);

// ذخیره دستی
registrationModule.saveData();
```

#### 3. **callback کار نمی‌کند**
```javascript
// بررسی داده callback
console.log(callback.data);

// بررسی متد handleCallback
console.log(registrationModule.handleCallback);
```

### **نکات مهم**
- همیشه از `await` استفاده کنید
- بررسی وجود `userId` در `userData`
- مدیریت خطا در تمام متدها
- لاگ کردن مراحل مهم

## 📝 **نمونه کد کامل**

```javascript
const SmartRegistrationModule = require('./14reg');

class BotHandler {
    constructor() {
        this.registrationModule = new SmartRegistrationModule();
    }

    async handleMessage(message) {
        try {
            const result = await this.registrationModule.handleMessage(message);
            if (result) {
                console.log('✅ پیام با موفقیت پردازش شد');
            }
        } catch (error) {
            console.error('❌ خطا در پردازش پیام:', error);
        }
    }

    async handleCallback(callback) {
        try {
            const result = await this.registrationModule.handleCallback(callback);
            if (result) {
                console.log('✅ Callback با موفقیت پردازش شد');
            }
        } catch (error) {
            console.error('❌ خطا در پردازش callback:', error);
        }
    }
}
```

## 🎯 **مراحل بعدی**

### **ویژگی‌های پیشنهادی**
- سیستم پرداخت آنلاین
- مدیریت کلاس‌ها
- گزارش‌گیری پیشرفته
- API برای وب‌سایت

### **بهینه‌سازی**
- کش کردن داده‌ها
- مدیریت همزمانی
- امنیت بیشتر
- تست‌های خودکار

## 🔄 **تغییرات نسبت به نسخه قبلی**

### **بهبودهای اصلی**
1. **جریان کاربری بهتر:** کاربران ناشناس مستقیماً دکمه ثبت نام می‌بینند
2. **پیام‌های شخصی‌سازی شده:** بر اساس وضعیت کاربر
3. **مدیریت بهتر خطا:** try-catch در تمام متدها
4. **لاگ‌های بهتر:** با پیشوند `[14REG]`
5. **ساختار کد بهبود یافته:** متدهای مجزا و قابل نگهداری

### **ویژگی‌های جدید**
- تشخیص خودکار نقش کاربر (مربی/دانش‌آموز)
- سیستم کارگاه‌ها
- ثبت نام ماه آینده
- پنل قرآن‌آموز

---

**🎉 ماژول 14reg.js آماده استفاده است!**

برای سوالات و مشکلات:
1. بررسی لاگ‌های سیستم
2. تست مراحل ثبت نام
3. بررسی فایل‌های داده
4. تماس با تیم توسعه

