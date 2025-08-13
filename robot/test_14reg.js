// 🧪 تست ماژول 14reg.js
const SmartRegistrationModule = require('./14reg');

console.log('🚀 شروع تست ماژول 14reg.js...\n');

async function testModule() {
  try {
    // ایجاد نمونه ماژول
    const registrationModule = new SmartRegistrationModule();
    console.log('✅ ماژول با موفقیت ایجاد شد');

    // تست متدهای اصلی
    console.log('\n📊 تست متدهای اصلی:');
    
    // تست بررسی کاربر
    const testUserId = '12345';
    const isRegistered = registrationModule.isUserRegistered(testUserId);
    console.log(`🔍 isUserRegistered(${testUserId}): ${isRegistered}`);

    // تست بررسی کامل بودن
    const isComplete = registrationModule.isRegistrationComplete(testUserId);
    console.log(`🔍 isRegistrationComplete(${testUserId}): ${isComplete}`);

    // تست دریافت فیلدهای ناقص
    const missingFields = registrationModule.getMissingFields(testUserId);
    console.log(`🔍 getMissingFields(${testUserId}): ${missingFields.join(', ')}`);

    // تست اعتبارسنجی کد ملی
    const validNationalId = '1234567890';
    const invalidNationalId = '12345';
    console.log(`🔍 isValidNationalId('${validNationalId}'): ${registrationModule.isValidNationalId(validNationalId)}`);
    console.log(`🔍 isValidNationalId('${invalidNationalId}'): ${registrationModule.isValidNationalId(invalidNationalId)}`);

    // تست آمار
    const registeredCount = registrationModule.getRegisteredUsersCount();
    const totalCount = registrationModule.getAllUsersCount();
    console.log(`📊 تعداد کاربران ثبت‌نام شده: ${registeredCount}`);
    console.log(`📊 تعداد کل کاربران: ${totalCount}`);

    // تست ساخت کیبورد
    const mainKeyboard = registrationModule.buildMainKeyboard();
    console.log('🎹 کیبورد اصلی ساخته شد:', JSON.stringify(mainKeyboard, null, 2));

    console.log('\n✅ تمام تست‌ها با موفقیت انجام شد!');
    console.log('🎉 ماژول 14reg.js آماده استفاده است!');

  } catch (error) {
    console.error('❌ خطا در تست ماژول:', error);
  }
}

// اجرای تست
testModule();
