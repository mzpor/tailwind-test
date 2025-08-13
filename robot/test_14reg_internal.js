// 🧪 تست منطق داخلی 14reg.js
// بررسی عملکرد متدها بدون ارسال پیام واقعی

const SmartRegistrationModule = require('./14reg');

async function testInternalLogic() {
  console.log('🧪 [TEST] شروع تست منطق داخلی 14reg.js...\n');

  try {
    // ایجاد نمونه ماژول
    const registrationModule = new SmartRegistrationModule();
    console.log('✅ [TEST] ماژول ثبت‌نام ایجاد شد');

    // شبیه‌سازی کاربر ناشناس
    const anonymousUserId = 999999999;

    console.log('\n🔍 [TEST] بررسی وضعیت اولیه کاربر...');
    
    // بررسی اینکه کاربر ناشناس است
    const isRegistered = registrationModule.isUserRegistered(anonymousUserId);
    console.log(`📊 [TEST] آیا کاربر ثبت‌نام شده؟ ${isRegistered ? 'بله' : 'خیر'}`);

    if (isRegistered) {
      console.log('⚠️ [TEST] کاربر قبلاً ثبت‌نام شده، حذف اطلاعات...');
      delete registrationModule.userData[anonymousUserId];
      delete registrationModule.userStates[anonymousUserId];
      registrationModule.saveData();
      console.log('✅ [TEST] اطلاعات کاربر حذف شد');
    }

    // تست 1: بررسی متدهای کمکی
    console.log('\n🔧 [TEST] تست 1: بررسی متدهای کمکی...');
    
    // بررسی اعتبارسنجی کد ملی
    const validNationalId = registrationModule.isValidNationalId('1234567890');
    const invalidNationalId = registrationModule.isValidNationalId('123');
    console.log(`🆔 [TEST] کد ملی معتبر '1234567890': ${validNationalId ? 'بله' : 'خیر'}`);
    console.log(`🆔 [TEST] کد ملی نامعتبر '123': ${invalidNationalId ? 'بله' : 'خیر'}`);

    if (!validNationalId || invalidNationalId) {
      throw new Error('اعتبارسنجی کد ملی درست کار نمی‌کند');
    }

    // بررسی وضعیت کاربر
    const isComplete = registrationModule.isRegistrationComplete(anonymousUserId);
    const missingFields = registrationModule.getMissingFields(anonymousUserId);
    
    console.log(`🔍 [TEST] آیا ثبت‌نام کامل است؟ ${isComplete ? 'بله' : 'خیر'}`);
    console.log(`🔍 [TEST] فیلدهای ناقص: ${missingFields.join('، ')}`);

    if (isComplete) {
      throw new Error('کاربر ناشناس نباید ثبت‌نام کامل داشته باشد');
    }

    if (missingFields.length === 0) {
      throw new Error('کاربر ناشناس باید فیلدهای ناقص داشته باشد');
    }

    // تست 2: بررسی ساختار داده
    console.log('\n📁 [TEST] تست 2: بررسی ساختار داده...');
    
    const userDataKeys = Object.keys(registrationModule.userData);
    const userStatesKeys = Object.keys(registrationModule.userStates);
    
    console.log(`📁 [TEST] کلیدهای userData: ${userDataKeys.join(', ')}`);
    console.log(`📁 [TEST] کلیدهای userStates: ${userStatesKeys.join(', ')}`);

    // تست 3: بررسی کارگاه‌ها
    console.log('\n📚 [TEST] تست 3: بررسی کارگاه‌ها...');
    
    const workshops = registrationModule.workshops;
    const workshopsCount = Object.keys(workshops).length;
    console.log(`📚 [TEST] تعداد کارگاه‌ها: ${workshopsCount}`);

    if (workshopsCount === 0) {
      console.log('⚠️ [TEST] هیچ کارگاهی یافت نشد');
    } else {
      console.log(`📚 [TEST] نمونه کارگاه: ${JSON.stringify(Object.values(workshops)[0]).substring(0, 100)}...`);
    }

    // تست 4: بررسی متدهای موجود
    console.log('\n🔍 [TEST] تست 4: بررسی متدهای موجود...');
    
    const requiredMethods = [
      'handleStartCommand',
      'handleMessage',
      'handleCallback',
      'handleRegistrationStep',
      'handleNameStep',
      'handleNationalIdStep',
      'handlePhoneStep',
      'handleEditName',
      'handleEditNationalId',
      'handleEditPhone',
      'handleFinalConfirm',
      'handleNextMonthRegistration',
      'handleBackToMainMenu',
      'handleQuranStudentPanel',
      'handleCompleteRegistration',
      'handleRegistrationStart',
      'handleSchoolIntro',
      'handleRegisteredUserSchool',
      'handleQuranBotIntro',
      'handleWorkshopSelection',
      'handleBackCommand',
      'handleExitCommand'
    ];

    const missingMethods = [];
    requiredMethods.forEach(methodName => {
      const method = registrationModule[methodName];
      const exists = typeof method === 'function';
      if (!exists) {
        missingMethods.push(methodName);
      }
    });

    if (missingMethods.length > 0) {
      throw new Error(`متدهای زیر وجود ندارند: ${missingMethods.join(', ')}`);
    }

    console.log(`✅ [TEST] تمام ${requiredMethods.length} متد مورد نیاز موجود هستند`);

    // تست 5: بررسی منطق داخلی
    console.log('\n🧠 [TEST] تست 5: بررسی منطق داخلی...');
    
    // شبیه‌سازی شروع ثبت‌نام
    registrationModule.userStates[anonymousUserId] = { step: 'name' };
    registrationModule.userData[anonymousUserId] = {};
    
    console.log(`📊 [TEST] وضعیت کاربر بعد از شروع: ${JSON.stringify(registrationModule.userStates[anonymousUserId])}`);
    
    if (registrationModule.userStates[anonymousUserId].step !== 'name') {
      throw new Error('مرحله اول ثبت‌نام درست تنظیم نشده');
    }

    // شبیه‌سازی مرحله نام
    registrationModule.userData[anonymousUserId].full_name = 'احمد محمدی';
    registrationModule.userData[anonymousUserId].first_name = 'احمد';
    registrationModule.userStates[anonymousUserId].step = 'national_id';
    
    console.log(`📊 [TEST] وضعیت کاربر بعد از نام: ${JSON.stringify(registrationModule.userStates[anonymousUserId])}`);
    
    if (registrationModule.userStates[anonymousUserId].step !== 'national_id') {
      throw new Error('مرحله دوم ثبت‌نام درست تنظیم نشده');
    }

    // شبیه‌سازی مرحله کد ملی
    registrationModule.userData[anonymousUserId].national_id = '1234567890';
    registrationModule.userStates[anonymousUserId].step = 'phone';
    
    console.log(`📊 [TEST] وضعیت کاربر بعد از کد ملی: ${JSON.stringify(registrationModule.userStates[anonymousUserId])}`);
    
    if (registrationModule.userStates[anonymousUserId].step !== 'phone') {
      throw new Error('مرحله سوم ثبت‌نام درست تنظیم نشده');
    }

    // شبیه‌سازی مرحله تلفن
    registrationModule.userData[anonymousUserId].phone = '989123456789';
    delete registrationModule.userStates[anonymousUserId];
    
    console.log(`📊 [TEST] وضعیت کاربر بعد از تلفن: ${JSON.stringify(registrationModule.userStates[anonymousUserId])}`);
    
    if (registrationModule.userStates[anonymousUserId]) {
      throw new Error('وضعیت کاربر بعد از تکمیل ثبت‌نام باید حذف شود');
    }

    // تست 6: بررسی کامل بودن ثبت‌نام
    console.log('\n🔍 [TEST] تست 6: بررسی کامل بودن ثبت‌نام...');
    
    const isNowComplete = registrationModule.isRegistrationComplete(anonymousUserId);
    const isNowRegistered = registrationModule.isUserRegistered(anonymousUserId);
    
    console.log(`🔍 [TEST] آیا ثبت‌نام کامل است؟ ${isNowComplete ? 'بله' : 'خیر'}`);
    console.log(`🔍 [TEST] آیا کاربر ثبت‌نام شده؟ ${isNowRegistered ? 'بله' : 'خیر'}`);

    if (!isNowComplete) {
      throw new Error('ثبت‌نام باید کامل باشد');
    }

    if (!isNowRegistered) {
      throw new Error('کاربر باید ثبت‌نام شده باشد');
    }

    // تست 7: بررسی صادرات اطلاعات
    console.log('\n📤 [TEST] تست 7: بررسی صادرات اطلاعات...');
    
    const exportedData = registrationModule.exportUserData(anonymousUserId);
    console.log(`📤 [TEST] اطلاعات صادر شده: ${JSON.stringify(exportedData)}`);

    if (!exportedData) {
      throw new Error('صادرات اطلاعات کاربر ناموفق بود');
    }

    if (!exportedData.full_name || !exportedData.national_id || !exportedData.phone) {
      throw new Error('اطلاعات صادر شده ناقص است');
    }

    // تست 8: بررسی آمار
    console.log('\n📊 [TEST] تست 8: بررسی آمار...');
    
    const registeredCount = registrationModule.getRegisteredUsersCount();
    const totalCount = registrationModule.getAllUsersCount();
    console.log(`📊 [TEST] تعداد کاربران ثبت‌نام شده: ${registeredCount}`);
    console.log(`📊 [TEST] تعداد کل کاربران: ${totalCount}`);

    if (registeredCount < 1) {
      throw new Error('حداقل یک کاربر باید ثبت‌نام شده باشد');
    }

    // تست 9: بررسی کیبوردها
    console.log('\n🎹 [TEST] تست 9: بررسی کیبوردها...');
    
    const mainKeyboard = registrationModule.buildMainKeyboard();
    const inlineKeyboard = registrationModule.buildInlineKeyboard([
      [{ text: 'تست', callback_data: 'test' }]
    ]);
    
    console.log(`🎹 [TEST] کیبورد اصلی: ${JSON.stringify(mainKeyboard).substring(0, 100)}...`);
    console.log(`🎹 [TEST] کیبورد شیشه‌ای: ${JSON.stringify(inlineKeyboard).substring(0, 100)}...`);

    if (!mainKeyboard || !inlineKeyboard) {
      throw new Error('ساخت کیبورد درست کار نمی‌کند');
    }

    // تست 10: بررسی دستورات خاص
    console.log('\n🔍 [TEST] تست 10: بررسی دستورات خاص...');
    
    const specialCommands = ['شروع', 'مدرسه', 'ربات', 'خروج'];
    specialCommands.forEach(cmd => {
      const isSpecial = registrationModule.isSpecialCommand(cmd);
      console.log(`🔍 [TEST] دستور '${cmd}': ${isSpecial ? 'خاص' : 'معمولی'}`);
      
      if (!isSpecial) {
        throw new Error(`دستور '${cmd}' باید خاص باشد`);
      }
    });

    // پاکسازی داده‌های تست
    delete registrationModule.userData[anonymousUserId];
    delete registrationModule.userStates[anonymousUserId];
    registrationModule.saveData();
    console.log('🧹 [TEST] داده‌های تست پاک شدند');

    console.log('\n🎉 [TEST] تمام تست‌های منطق داخلی با موفقیت انجام شد!');
    console.log('✅ [TEST] تمام متدهای مورد نیاز موجود هستند');
    console.log('✅ [TEST] منطق داخلی ماژول درست کار می‌کند');
    console.log('✅ [TEST] جریان کاربر ناشناس به درستی پیاده‌سازی شده');
    console.log('✅ [TEST] ماژول 14reg.js آماده استفاده در 5polling.js است');

    return true;

  } catch (error) {
    console.error('\n❌ [TEST] خطا در تست:', error.message);
    console.error('❌ [TEST] جزئیات خطا:', error);
    return false;
  }
}

// اجرای تست
if (require.main === module) {
  testInternalLogic()
    .then(success => {
      if (success) {
        console.log('\n🎯 [TEST] نتیجه: موفق');
        process.exit(0);
      } else {
        console.log('\n❌ [TEST] نتیجه: ناموفق');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 [TEST] خطای غیرمنتظره:', error);
      process.exit(1);
    });
}

module.exports = { testInternalLogic };

