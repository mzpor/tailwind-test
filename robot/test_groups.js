/**
 * 🧪 تست کانفیگ گروه‌ها
 * تست سیستم باز/بسته کردن گروه‌ها
 */

console.log('🧪 [TEST] Starting group configuration test...');

// بارگذاری ماژول‌های مورد نیاز
const { testGroupConfig } = require('./5polling');

// اجرای تست
console.log('🧪 [TEST] Running group configuration test...');
const testResult = testGroupConfig();

if (testResult) {
  console.log('✅ [TEST] All tests passed successfully!');
} else {
  console.log('❌ [TEST] Some tests failed!');
}

console.log('🧪 [TEST] Test completed.');
