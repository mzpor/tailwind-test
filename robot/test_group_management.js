// تست سیستم مدیریت گروه‌ها در settings.json
const { addBotGroup, removeBotGroup, getBotGroups } = require('./3config');

console.log('=== تست سیستم مدیریت گروه‌ها ===\n');

// ۱. نمایش گروه‌های فعلی
console.log('۱. گروه‌های فعلی:');
const currentGroups = getBotGroups();
console.log('گروه‌ها:', JSON.stringify(currentGroups, null, 2));

// ۲. اضافه کردن گروه جدید
console.log('\n۲. اضافه کردن گروه جدید:');
const groupId = 111111111;
const groupName = 'گروه تست';
const success = addBotGroup(groupId, groupName, 95519970);
console.log(`اضافه کردن گروه ${groupId}:`, success ? '✅ موفق' : '❌ ناموفق');

// ۳. نمایش گروه‌ها پس از اضافه کردن
console.log('\n۳. گروه‌ها پس از اضافه کردن:');
const groupsAfterAdd = getBotGroups();
console.log('گروه‌ها:', JSON.stringify(groupsAfterAdd, null, 2));

// ۴. پاک کردن گروه
console.log('\n۴. پاک کردن گروه:');
const removeSuccess = removeBotGroup(groupId);
console.log(`پاک کردن گروه ${groupId}:`, removeSuccess ? '✅ موفق' : '❌ ناموفق');

// ۵. نمایش گروه‌ها پس از پاک کردن
console.log('\n۵. گروه‌ها پس از پاک کردن:');
const groupsAfterRemove = getBotGroups();
console.log('گروه‌ها:', JSON.stringify(groupsAfterRemove, null, 2));

console.log('\n✅ تست کامل شد!');
