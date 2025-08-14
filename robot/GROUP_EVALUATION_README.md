# 🎯 سیستم ارزیابی و مدیریت گروه

## 📋 خلاصه
سیستم ارزیابی و مدیریت گروه یک ماژول کامل برای مدیریت خودکار گروه‌ها، ارزیابی‌ها و زمان‌بندی‌ها در ربات تلگرام/بله است.

## 🚀 ویژگی‌های کلیدی

### 🔧 مدیریت گروه
- **بستن خودکار گروه**: در ساعت مشخص شده
- **باز کردن خودکار گروه**: در ساعت مشخص شده  
- **حالت آخر هفته**: تنظیمات جداگانه برای جمعه و شنبه
- **کنترل دسترسی**: محدود کردن ارسال پیام، رسانه و غیره

### 📝 سیستم ارزیابی
- **ارزیابی خودکار**: در زمان‌های مشخص شده
- **سوالات چندگزینه‌ای**: با گزینه‌های قابل تنظیم
- **مدیریت جلسات**: شروع، پایان و پیگیری پیشرفت
- **محاسبه نمره**: سیستم نمره‌دهی خودکار
- **گزارش نتایج**: آمار و تحلیل عملکرد

### ⏰ زمان‌بندی
- **برنامه‌های منظم**: روزانه، هفتگی
- **برنامه‌های سفارشی**: برای رویدادهای خاص
- **اعلان‌های خودکار**: یادآوری قبل از ارزیابی
- **مدیریت منطقه زمانی**: پشتیبانی از تهران

## 📁 ساختار فایل‌ها

```
robot/
├── group_evaluation_config.js      # تنظیمات سیستم
├── group_evaluation_manager.js     # مدیریت گروه و ارزیابی
├── evaluation_module.js            # ماژول ارزیابی
├── test_group_evaluation.js        # فایل تست
└── GROUP_EVALUATION_README.md      # این فایل
```

## 🔧 نصب و راه‌اندازی

### 1. بارگذاری ماژول‌ها
```javascript
const { groupEvaluationConfig } = require('./group_evaluation_config');
const { groupEvaluationManager } = require('./group_evaluation_manager');
const { evaluationModule } = require('./evaluation_module');
```

### 2. شروع سیستم
```javascript
// شروع سیستم مدیریت
groupEvaluationManager.start();

// بررسی وضعیت
const status = groupEvaluationManager.getStatus();
console.log('وضعیت سیستم:', status);
```

### 3. تنظیم کانفیگ
```javascript
// فعال کردن سیستم
groupEvaluationConfig.setSystemEnabled(true, 'admin_user');

// تنظیم زمان ارزیابی
groupEvaluationConfig.setEvaluationTime('20:00', 'admin_user');

// تنظیم زمان بستن گروه
groupEvaluationConfig.setGroupCloseTime('23:00', 'admin_user');
```

## 📊 تنظیمات پیش‌فرض

### ارزیابی
- **زمان**: 20:00 (8 شب)
- **مدت**: 60 دقیقه
- **سوالات**: 5 سوال
- **نمره قبولی**: 70%
- **روزها**: همه روزهای هفته

### مدیریت گروه
- **بستن**: 23:00 (11 شب)
- **باز کردن**: 06:00 (6 صبح)
- **آخر هفته**: بستن 22:00، باز کردن 08:00

### اعلان‌ها
- **یادآوری ارزیابی**: 30 دقیقه قبل
- **تغییر وضعیت گروه**: فعال
- **اعلان‌های ادمین**: فعال

## 🎮 استفاده از API

### مدیریت گروه
```javascript
// بستن گروه خاص
await groupEvaluationManager.closeGroup(groupId);

// باز کردن گروه خاص
await groupEvaluationManager.openGroup(groupId);

// بستن تمام گروه‌ها
await groupEvaluationManager.closeAllGroups();

// باز کردن تمام گروه‌ها
await groupEvaluationManager.openAllGroups();
```

### سیستم ارزیابی
```javascript
// شروع جلسه ارزیابی
const sessionId = await groupEvaluationManager.startEvaluation();

// ثبت‌نام شرکت‌کننده
const participant = evaluationModule.registerParticipant(sessionId, userId, userName);

// ارسال پاسخ
const result = evaluationModule.submitAnswer(sessionId, userId, questionId, answerIndex);

// پایان جلسه
const results = evaluationModule.endEvaluationSession(sessionId);
```

### مدیریت سوالات
```javascript
// اضافه کردن سوال جدید
const questionId = evaluationModule.addQuestion({
  category: 'قرآن',
  question: 'سوال جدید',
  options: ['گزینه 1', 'گزینه 2', 'گزینه 3', 'گزینه 4'],
  correctAnswer: 0,
  difficulty: 'آسان',
  explanation: 'توضیح پاسخ'
});

// ویرایش سوال
evaluationModule.editQuestion(questionId, { question: 'سوال ویرایش شده' });

// حذف سوال
evaluationModule.deleteQuestion(questionId);
```

## 🔐 سیستم دسترسی

### نقش‌های کاربران
- **SCHOOL_ADMIN**: دسترسی کامل به تمام تنظیمات
- **COACH**: دسترسی به ارزیابی و کنترل گروه
- **ASSISTANT**: دسترسی به ارزیابی
- **STUDENT**: فقط شرکت در ارزیابی

### بررسی دسترسی
```javascript
const hasAccess = groupEvaluationConfig.hasPermission(userId, 'evaluationAccess');
const canControlGroup = groupEvaluationConfig.hasPermission(userId, 'groupControlAccess');
const canConfig = groupEvaluationConfig.hasPermission(userId, 'configAccess');
```

## ⏰ برنامه‌های زمان‌بندی سفارشی

### اضافه کردن برنامه جدید
```javascript
const schedule = {
  name: 'اعلان ویژه',
  action: 'send_notification',
  time: '15:00',
  days: [1, 3, 5], // دوشنبه، چهارشنبه، جمعه
  message: 'پیام ویژه برای شما!'
};

groupEvaluationConfig.addCustomSchedule(schedule, 'admin_user');
```

### انواع اقدامات
- `close_group`: بستن گروه
- `open_group`: باز کردن گروه
- `start_evaluation`: شروع ارزیابی
- `send_notification`: ارسال اعلان

## 📈 گزارش‌گیری

### وضعیت سیستم
```javascript
const status = groupEvaluationManager.getStatus();
console.log('وضعیت کلی:', status);
```

### نتایج ارزیابی
```javascript
const results = evaluationModule.getAllResults();
console.log('نتایج تمام جلسات:', results);

const sessionResults = evaluationModule.getSessionResults(sessionId);
console.log('نتایج جلسه خاص:', sessionResults);
```

### آمار گروه‌ها
```javascript
const groupStatus = groupEvaluationManager.getGroupStatus(groupId);
console.log('وضعیت گروه:', groupStatus);
```

## 🧪 تست سیستم

### اجرای تست کامل
```bash
node test_group_evaluation.js
```

### تست بخش‌های مختلف
```javascript
// تست کانفیگ
const config = groupEvaluationConfig.getConfig();
console.log('کانفیگ:', config);

// تست مدیریت
const managerStatus = groupEvaluationManager.getStatus();
console.log('وضعیت مدیریت:', managerStatus);

// تست ارزیابی
const questions = evaluationModule.getAllQuestions();
console.log('سوالات:', questions);
```

## 🚨 عیب‌یابی

### مشکلات رایج
1. **سیستم شروع نمی‌شود**: بررسی کنید که `systemEnabled` در کانفیگ `true` باشد
2. **گروه‌ها بسته نمی‌شوند**: بررسی دسترسی‌ها و تنظیمات زمان
3. **ارزیابی شروع نمی‌شود**: بررسی روزها و زمان ارزیابی
4. **خطا در API**: بررسی توکن بات و دسترسی‌های گروه

### لاگ‌ها
سیستم تمام فعالیت‌ها را در کنسول ثبت می‌کند:
```
✅ [GROUP_EVAL_CONFIG] Configuration loaded successfully
✅ [GROUP_EVAL_MANAGER] Manager started successfully
✅ [EVALUATION_MODULE] Module initialized successfully
```

## 🔄 به‌روزرسانی و نگهداری

### به‌روزرسانی تنظیمات
```javascript
// ریست به حالت پیش‌فرض
groupEvaluationConfig.resetToDefault('admin_user');

// به‌روزرسانی دسترسی‌ها
groupEvaluationConfig.updatePermissions({
  evaluationAccess: ['SCHOOL_ADMIN', 'COACH']
}, 'admin_user');
```

### پاک کردن تاریخچه
```javascript
// پاک کردن تمام تاریخچه
evaluationModule.clearHistory();
groupEvaluationManager.clearHistory();
```

## 📞 پشتیبانی

برای سوالات و مشکلات:
1. بررسی لاگ‌های کنسول
2. اجرای فایل تست
3. بررسی تنظیمات کانفیگ
4. بررسی دسترسی‌های کاربر

## 🎯 آینده

### ویژگی‌های برنامه‌ریزی شده
- [ ] رابط کاربری وب برای مدیریت
- [ ] گزارش‌های پیشرفته و نمودارها
- [ ] سیستم نمره‌دهی پیشرفته
- [ ] پشتیبانی از چندین گروه همزمان
- [ ] سیستم رتبه‌بندی کاربران

---

**نسخه**: 1.0.0  
**آخرین به‌روزرسانی**: 1404/05/15  
**توسعه‌دهنده**: سیستم ربات تلگرام/بله
