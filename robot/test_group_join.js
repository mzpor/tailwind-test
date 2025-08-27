// تست دستی ورود گروه جدید
const { addBotGroup, getBotGroups } = require('./3config');

console.log('=== تست ورود گروه جدید ===\n');

// شبیه‌سازی گروهی که ربات به آن وارد شده
const testGroup = {
  id: 4535267863,
  title: "گروه قرآنی اعلام ها",
  type: "group"
};

console.log('۱. گروه‌های فعلی:');
const currentGroups = getBotGroups();
console.log('تعداد گروه‌ها:', currentGroups.length);
console.log('گروه‌ها:', JSON.stringify(currentGroups, null, 2));

// ۲. اضافه کردن گروه جدید
console.log('\n۲. اضافه کردن گروه جدید:');
console.log(`در حال اضافه کردن گروه ${testGroup.id} (${testGroup.title})...`);
const success = addBotGroup(testGroup.id, testGroup.title, 95519970);
console.log(`نتیجه اضافه کردن:`, success ? '✅ موفق' : '❌ ناموفق');

// ۳. نمایش گروه‌ها پس از اضافه کردن
console.log('\n۳. گروه‌ها پس از اضافه کردن:');
const groupsAfterAdd = getBotGroups();
console.log('تعداد گروه‌ها:', groupsAfterAdd.length);
console.log('گروه‌ها:', JSON.stringify(groupsAfterAdd, null, 2));

console.log('\n✅ تست کامل شد!');

