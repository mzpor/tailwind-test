// تست سیستم bot_groups در settings.json
const { getBotGroups, addBotGroup } = require('./3config');

console.log('=== تست سیستم گروه‌ها ===\n');

// ۱. خواندن گروه‌ها از settings.json
console.log('۱. خواندن گروه‌ها از settings.json:');
const groups = getBotGroups();
console.log('گروه‌ها:', JSON.stringify(groups, null, 2));

// ۲. اضافه کردن گروه جدید
console.log('\n۲. اضافه کردن گروه جدید:');
const success = addBotGroup(123456789, 'گروه تست', 95519970);
console.log('نتیجه اضافه کردن:', success ? '✅ موفق' : '❌ ناموفق');

// ۳. خواندن مجدد گروه‌ها
console.log('\n۳. خواندن مجدد گروه‌ها:');
const updatedGroups = getBotGroups();
console.log('گروه‌های به‌روزرسانی شده:', JSON.stringify(updatedGroups, null, 2));

console.log('\n✅ تست کامل شد!');

