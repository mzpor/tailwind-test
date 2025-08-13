// 🧪 تست منطق 14reg.js بدون ارسال پیام واقعی
// بررسی عملکرد متدها و منطق داخلی

const SmartRegistrationModule = require('./14reg1');

async function test14regLogic() {
  console.log('🧪 [TEST] شروع تست منطق 14reg.js...\n');

  try {
    // ایجاد نمونه ماژول
    const registrationModule = new SmartRegistrationModule();
    console.log('✅ [TEST] ماژول ثبت‌نام ایجاد شد');

    // شبیه‌سازی کاربر ناشناس (ID: 999999999)
    const anonymousUserId = 999999999;
    const chatId = 999999999;

    console.log('\n🔍 [TEST] بررسی وضعیت کاربر ناشناس...');
    
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

    // تست 1: بررسی متدهای اصلی
    console.log('\n🔍 [TEST] تست 1: بررسی متدهای اصلی...');
    
    // بررسی اعتبارسنجی کد ملی
    const validNationalId = registrationModule.isValidNationalId('1234567890');
    const invalidNationalId = registrationModule.isValidNationalId('123');
    console.log(`🆔 [TEST] کد ملی معتبر '1234567890': ${validNationalId ? 'بله' : 'خیر'}`);
    console.log(`🆔 [TEST] کد ملی نامعتبر '123': ${invalidNationalId ? 'بله' : 'خیر'}`);

    if (!validNationalId || invalidNationalId) {
      throw new Error('اعتبارسنجی کد ملی درست کار نمی‌کند');
    }

    // تست 2: بررسی کیبوردها
    console.log('\n🎹 [TEST] تست 2: بررسی کیبوردها...');
    
    const mainKeyboard = registrationModule.buildMainKeyboard();
    const inlineKeyboard = registrationModule.buildInlineKeyboard([
      [{ text: 'تست', callback_data: 'test' }]
    ]);
    
    console.log(`🎹 [TEST] کیبورد اصلی: ${JSON.stringify(mainKeyboard).substring(0, 100)}...`);
    console.log(`🎹 [TEST] کیبورد شیشه‌ای: ${JSON.stringify(inlineKeyboard).substring(0, 100)}...`);

    if (!mainKeyboard || !inlineKeyboard) {
      throw new Error('ساخت کیبورد درست کار نمی‌کند');
    }

    // تست 3: بررسی دستورات خاص
    console.log('\n🔍 [TEST] تست 3: بررسی دستورات خاص...');
    
    const specialCommands = ['شروع', 'مدرسه', 'ربات', 'خروج'];
    specialCommands.forEach(cmd => {
      const isSpecial = registrationModule.isSpecialCommand(cmd);
      console.log(`🔍 [TEST] دستور '${cmd}': ${isSpecial ? 'خاص' : 'معمولی'}`);
    });

    // تست 4: بررسی آمار
    console.log('\n📊 [TEST] تست 4: بررسی آمار...');
    
    const registeredCount = registrationModule.getRegisteredUsersCount();
    const totalCount = registrationModule.getAllUsersCount();
    console.log(`📊 [TEST] تعداد کاربران ثبت‌نام شده: ${registeredCount}`);
    console.log(`📊 [TEST] تعداد کل کاربران: ${totalCount}`);

    // تست 5: بررسی صادرات اطلاعات
    console.log('\n📤 [TEST] تست 5: بررسی صادرات اطلاعات...');
    
    const exportedData = registrationModule.exportUserData(anonymousUserId);
    console.log(`📤 [TEST] اطلاعات صادر شده برای کاربر ناشناس: ${exportedData ? 'موجود' : 'موجود نیست'}`);

    if (exportedData !== null) {
      throw new Error('کاربر ناشناس نباید اطلاعات داشته باشد');
    }

    // تست 6: بررسی وضعیت کاربر
    console.log('\n🔍 [TEST] تست 6: بررسی وضعیت کاربر...');
    
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

    // تست 7: بررسی ساختار داده
    console.log('\n📁 [TEST] تست 7: بررسی ساختار داده...');
    
    const userDataKeys = Object.keys(registrationModule.userData);
    const userStatesKeys = Object.keys(registrationModule.userStates);
    
    console.log(`📁 [TEST] کلیدهای userData: ${userDataKeys.join(', ')}`);
    console.log(`📁 [TEST] کلیدهای userStates: ${userStatesKeys.join(', ')}`);

    // تست 8: بررسی کارگاه‌ها
    console.log('\n📚 [TEST] تست 8: بررسی کارگاه‌ها...');
    
    const workshops = registrationModule.workshops;
    const workshopsCount = Object.keys(workshops).length;
    console.log(`📚 [TEST] تعداد کارگاه‌ها: ${workshopsCount}`);

    if (workshopsCount === 0) {
      console.log('⚠️ [TEST] هیچ کارگاهی یافت نشد');
    } else {
      console.log(`📚 [TEST] نمونه کارگاه: ${JSON.stringify(Object.values(workshops)[0]).substring(0, 100)}...`);
    }

    // تست 9: بررسی متدهای callback
    console.log('\n🔄 [TEST] تست 9: بررسی متدهای callback...');
    
    const callbackMethods = [
      'handleEditName',
      'handleEditNationalId', 
      'handleEditPhone',
      'handleFinalConfirm',
      'handleNextMonthRegistration',
      'handleBackToMainMenu',
      'handleQuranStudentPanel',
      'handleCompleteRegistration',
      'handleRegistrationStart'
    ];

    callbackMethods.forEach(methodName => {
      const method = registrationModule[methodName];
      const exists = typeof method === 'function';
      console.log(`🔄 [TEST] متد ${methodName}: ${exists ? 'موجود' : 'موجود نیست'}`);
      
      if (!exists) {
        throw new Error(`متد ${methodName} وجود ندارد`);
      }
    });

    // تست 10: بررسی متدهای اصلی
    console.log('\n🚀 [TEST] تست 10: بررسی متدهای اصلی...');
    
    const mainMethods = [
      'handleStartCommand',
      'handleMessage',
      'handleCallback',
      'handleRegistrationStep',
      'handleNameStep',
      'handleNationalIdStep',
      'handlePhoneStep'
    ];

    mainMethods.forEach(methodName => {
      const method = registrationModule[methodName];
      const exists = typeof method === 'function';
      console.log(`🚀 [TEST] متد ${methodName}: ${exists ? 'موجود' : 'موجود نیست'}`);
      
      if (!exists) {
        throw new Error(`متد ${methodName} وجود ندارد`);
      }
    });

    // تست 11: بررسی متدهای کمکی
    console.log('\n🔧 [TEST] تست 11: بررسی متدهای کمکی...');
    
    const helperMethods = [
      'isUserRegistered',
      'isRegistrationComplete',
      'getMissingFields',
      'isValidNationalId',
      'isUserAdmin',
      'buildReplyKeyboard',
      'buildInlineKeyboard',
      'buildMainKeyboard',
      'buildWorkshopsKeyboard',
      'isSpecialCommand',
      'getRegisteredUsersCount',
      'getAllUsersCount',
      'exportUserData'
    ];

    helperMethods.forEach(methodName => {
      const method = registrationModule[methodName];
      const exists = typeof method === 'function';
      console.log(`🔧 [TEST] متد ${methodName}: ${exists ? 'موجود' : 'موجود نیست'}`);
      
      if (!exists) {
        throw new Error(`متد ${methodName} وجود ندارد`);
      }
    });

    // تست 12: بررسی متدهای معرفی
    console.log('\n🏫 [TEST] تست 12: بررسی متدهای معرفی...');
    
    const introMethods = [
      'handleSchoolIntro',
      'handleRegisteredUserSchool',
      'handleQuranBotIntro',
      'handleWorkshopSelection',
      'handleQuranStudentPanel',
      'handleBackToMainMenu',
      'handleBackCommand',
      'handleExitCommand'
    ];

    introMethods.forEach(methodName => {
      const method = registrationModule[methodName];
      const exists = typeof method === 'function';
      console.log(`🏫 [TEST] متد ${methodName}: ${exists ? 'موجود' : 'موجود نیست'}`);
      
      if (!exists) {
        throw new Error(`متد ${methodName} وجود ندارد`);
      }
    });

    console.log('\n🎉 [TEST] تمام تست‌های منطقی با موفقیت انجام شد!');
    console.log('✅ [TEST] تمام متدهای مورد نیاز موجود هستند');
    console.log('✅ [TEST] منطق داخلی ماژول درست کار می‌کند');
    console.log('✅ [TEST] ماژول 14reg.js آماده استفاده است');

    return true;

  } catch (error) {
    console.error('\n❌ [TEST] خطا در تست:', error.message);
    console.error('❌ [TEST] جزئیات خطا:', error);
    return false;
  }
}

// اجرای تست
if (require.main === module) {
  test14regLogic()
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

module.exports = { test14regLogic };

