/**
 * 🧪 تست جریان ربات
 * بررسی عملکرد جریان: شروع → معرفی مدرسه → ثبت نام ماهانه
 */

console.log('🧪 شروع تست جریان ربات...\n');

// تست ماژول‌های مختلف
async function testModules() {
  try {
    // تست ماژول تنظیمات
    console.log('🔧 تست ماژول تنظیمات...');
    const { ROLES, USER_ROLES, getUserRole } = require('./3config');
    console.log('✅ ROLES:', ROLES);
    console.log('✅ USER_ROLES:', USER_ROLES);
    
    // تست نقش‌های کاربران
    const testUsers = [1638058362, 574330749, 2045777722, 999999999];
    for (const userId of testUsers) {
      const role = getUserRole(userId);
      console.log(`👤 کاربر ${userId}: ${role}`);
    }
    
    // تست ماژول ثبت نام
    console.log('\n📝 تست ماژول ثبت نام...');
    const { registrationModule } = require('./registration_module');
    console.log('✅ ماژول ثبت نام بارگذاری شد');
    
    // تست توابع ماهانه
    const currentMonth = registrationModule.getCurrentPersianMonth();
    const nextMonth = registrationModule.getNextPersianMonth();
    console.log(`📅 ماه جاری: ${currentMonth}`);
    console.log(`📅 ماه بعدی: ${nextMonth}`);
    
    // تست ماژول کارگاه‌ها
    console.log('\n🏭 تست ماژول کارگاه‌ها...');
    const kargahModule = require('./12kargah');
    console.log('✅ ماژول کارگاه‌ها بارگذاری شد');
    
    // تست توابع ماهانه کارگاه‌ها
    const kargahCurrentMonth = kargahModule.getCurrentPersianMonth();
    const kargahNextMonth = kargahModule.getNextPersianMonth();
    console.log(`📅 ماه جاری کارگاه‌ها: ${kargahCurrentMonth}`);
    console.log(`📅 ماه بعدی کارگاه‌ها: ${kargahNextMonth}`);
    
    console.log('\n✅ تمام تست‌ها با موفقیت انجام شد!');
    
  } catch (error) {
    console.error('❌ خطا در تست:', error.message);
    console.error('❌ Stack trace:', error.stack);
  }
}

// اجرای تست
testModules();
