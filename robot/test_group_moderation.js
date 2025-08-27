// ===== تست سیستم مدیریت گروه =====
const config = require('./3config');

console.log('=== تنظیمات فعلی سیستم مدیریت گروه ===\n');

// وضعیت زمان فعلی
const now = new Date();
console.log('زمان فعلی:', now.toLocaleString('fa-IR'));
console.log('روز هفته:', ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'][now.getDay()]);
console.log('ساعت:', now.getHours(), 'دقیقه:', now.getMinutes());

// وضعیت فعال بودن ربات
console.log('\n--- وضعیت ربات ---');
console.log('زمان تمرین فعال:', config.isPracticeTime() ? '✅ بله' : '❌ خیر');

// تنظیمات زمان‌بندی
console.log('\n--- تنظیمات زمان‌بندی ---');
console.log('ساعت‌های تمرین:', config.getPracticeHours());
console.log('دقیقه شروع:', config.getPracticeStartMinute());
console.log('دقیقه پایان:', config.getPracticeEndMinute());
console.log('روزهای تمرین:', config.getPracticeDays().map(d => ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'][d]));

// تنظیمات مدیریت گروه
console.log('\n--- تنظیمات مدیریت گروه ---');
console.log('مدیریت گروه فعال:', config.isGroupModerationEnabled() ? '✅ بله' : '❌ خیر');
console.log('حذف پیام‌ها:', config.shouldDeleteMessages() ? '✅ بله' : '❌ خیر');
console.log('ارسال هشدار:', config.shouldSendWarning() ? '✅ بله' : '❌ خیر');
console.log('محدود کردن کاربران:', config.shouldRestrictUsers() ? '✅ بله' : '❌ خیر');
console.log('گروه‌های مدیریت شده:', config.getModeratedGroupIds());
console.log('پیام هشدار:', config.getWarningMessage());

// تست گروه خاص
const testGroupId = '5668045453';
console.log('\n--- تست گروه خاص ---');
console.log(`گروه ${testGroupId} مدیریت می‌شود:`, config.isGroupModerated(testGroupId) ? '✅ بله' : '❌ خیر');

// راهنمایی تست
console.log('\n=== راهنمایی تست ===');
if (config.isPracticeTime()) {
    console.log('🔴 ربات اکنون فعال است - برای تست غیرفعال بودن، یکی از کارهای زیر را انجام دهید:');
    console.log('1. ساعت فعلی را تغییر دهید به خارج از ساعت‌های تمرین');
    console.log('2. تنظیمات practice_hours را در settings.json تغییر دهید');
    console.log('3. تنظیمات practice_days را تغییر دهید');
} else {
    console.log('🟢 ربات اکنون غیرفعال است - می‌توانید در گروه تست کنید:');
    console.log('1. در گروه مدیریت شده پیام ارسال کنید');
    console.log('2. ببینید آیا پیام حذف می‌شود یا هشدار نمایش داده می‌شود');
}

console.log('\n=== تنظیمات قابل تغییر ===');
console.log('برای تغییر تنظیمات، فایل‌های زیر را ویرایش کنید:');
console.log('1. settings.json - برای ساعت و دقیقه');
console.log('2. 3config.js - برای تنظیمات مدیریت گروه');
