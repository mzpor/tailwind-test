// تست دستی حذف گروه از settings.json
const { removeBotGroup, getBotGroups } = require('./3config');

console.log('=== تست حذف گروه ===\n');

// نمایش گروه‌های فعلی
console.log('۱. گروه‌های فعلی:');
const currentGroups = getBotGroups();
console.log('تعداد گروه‌ها:', currentGroups.length);
console.log('گروه‌ها:', JSON.stringify(currentGroups, null, 2));

// حذف گروه با ID مشخص
const groupIdToRemove = 4535267863; // گروه آزمایشی
console.log('\n۲. حذف گروه:');
console.log(`در حال حذف گروه ${groupIdToRemove}...`);
const success = removeBotGroup(groupIdToRemove);
console.log(`نتیجه حذف:`, success ? '✅ موفق' : '❌ ناموفق');

// نمایش گروه‌ها پس از حذف
console.log('\n۳. گروه‌ها پس از حذف:');
const groupsAfterRemoval = getBotGroups();
console.log('تعداد گروه‌ها:', groupsAfterRemoval.length);
console.log('گروه‌ها:', JSON.stringify(groupsAfterRemoval, null, 2));

console.log('\n✅ تست کامل شد!');