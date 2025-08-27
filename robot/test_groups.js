// ===== تست سیستم ذخیره‌سازی گروه‌ها =====
const {
  GROUP_STORAGE_CONFIG,
  loadBotGroups,
  saveBotGroups,
  addBotGroup,
  removeBotGroup,
  getBotGroups,
  hasBotGroup
} = require('./3config');

console.log('=== تست سیستم ذخیره‌سازی گروه‌ها ===\n');

// ۱. تست بارگذاری اطلاعات گروه‌ها
console.log('۱. بارگذاری اطلاعات گروه‌ها:');
const groupsData = loadBotGroups();
console.log('داده‌های گروه‌ها:', JSON.stringify(groupsData, null, 2));

// ۲. تست اضافه کردن گروه جدید
console.log('\n۲. اضافه کردن گروه جدید:');
const testGroupId = 123456789;
const testGroupName = 'گروه حفظ';
const success = addBotGroup(testGroupId, testGroupName, 95519970);
console.log(`اضافه کردن گروه ${testGroupId}:`, success ? '✅ موفق' : '❌ ناموفق');

// ۳. تست اضافه کردن گروه دوم
console.log('\n۳. اضافه کردن گروه دوم:');
const testGroupId2 = 987654321;
const testGroupName2 = 'گروه اعلام';
const success2 = addBotGroup(testGroupId2, testGroupName2, 95519970);
console.log(`اضافه کردن گروه ${testGroupId2}:`, success2 ? '✅ موفق' : '❌ ناموفق');

// ۴. تست دریافت لیست گروه‌ها
console.log('\n۴. لیست گروه‌ها:');
const groups = getBotGroups();
console.log('گروه‌ها:', JSON.stringify(groups, null, 2));

// ۵. تست بررسی وجود گروه
console.log('\n۵. بررسی وجود گروه:');
console.log(`گروه ${testGroupId} وجود دارد:`, hasBotGroup(testGroupId) ? '✅ بله' : '❌ خیر');
console.log(`گروه ${testGroupId2} وجود دارد:`, hasBotGroup(testGroupId2) ? '✅ بله' : '❌ خیر');
console.log(`گروه 999999999 وجود دارد:`, hasBotGroup(999999999) ? '✅ بله' : '❌ خیر');

// ۶. تست حذف گروه
console.log('\n۶. حذف گروه:');
const removeSuccess = removeBotGroup(testGroupId);
console.log(`حذف گروه ${testGroupId}:`, removeSuccess ? '✅ موفق' : '❌ ناموفق');

// ۷. تست نهایی لیست گروه‌ها
console.log('\n۷. لیست نهایی گروه‌ها:');
const finalGroups = getBotGroups();
console.log('گروه‌های نهایی:', JSON.stringify(finalGroups, null, 2));

console.log('\n=== تنظیمات سیستم ===');
console.log('GROUP_STORAGE_CONFIG:', JSON.stringify(GROUP_STORAGE_CONFIG, null, 2));

console.log('\n✅ تست کامل شد!');