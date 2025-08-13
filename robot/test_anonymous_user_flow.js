// 🧪 تست جریان کاربر ناشناس برای 14reg.js
// بررسی کامل جریان ثبت‌نام از ابتدا تا انتها

const SmartRegistrationModule = require('./14reg1');

async function testAnonymousUserFlow() {
  console.log('🧪 [TEST] شروع تست جریان کاربر ناشناس...\n');

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

    // تست 1: دستور /start برای کاربر ناشناس
    console.log('\n🚀 [TEST] تست 1: دستور /start برای کاربر ناشناس...');
    const startResult = await registrationModule.handleStartCommand(chatId, anonymousUserId);
    console.log(`📱 [TEST] نتیجه /start: ${startResult ? 'موفق' : 'ناموفق'}`);

    if (!startResult) {
      throw new Error('دستور /start برای کاربر ناشناس ناموفق بود');
    }

    // تست 2: شروع ثبت‌نام
    console.log('\n📝 [TEST] تست 2: شروع ثبت‌نام...');
    const registrationStartResult = await registrationModule.handleRegistrationStart(chatId, anonymousUserId);
    console.log(`📝 [TEST] نتیجه شروع ثبت‌نام: ${registrationStartResult ? 'موفق' : 'ناموفق'}`);

    if (!registrationStartResult) {
      throw new Error('شروع ثبت‌نام ناموفق بود');
    }

    // بررسی وضعیت کاربر
    const userState = registrationModule.userStates[anonymousUserId];
    console.log(`📊 [TEST] وضعیت کاربر: ${JSON.stringify(userState)}`);

    // تست 3: مرحله نام
    console.log('\n📝 [TEST] تست 3: مرحله نام...');
    const nameResult = await registrationModule.handleNameStep(chatId, anonymousUserId, 'احمد محمدی');
    console.log(`📝 [TEST] نتیجه مرحله نام: ${nameResult ? 'موفق' : 'ناموفق'}`);

    if (!nameResult) {
      throw new Error('مرحله نام ناموفق بود');
    }

    // بررسی وضعیت کاربر
    const userStateAfterName = registrationModule.userStates[anonymousUserId];
    console.log(`📊 [TEST] وضعیت کاربر بعد از نام: ${JSON.stringify(userStateAfterName)}`);

    // تست 4: مرحله کد ملی
    console.log('\n🆔 [TEST] تست 4: مرحله کد ملی...');
    const nationalIdResult = await registrationModule.handleNationalIdStep(chatId, anonymousUserId, '1234567890');
    console.log(`🆔 [TEST] نتیجه مرحله کد ملی: ${nationalIdResult ? 'موفق' : 'ناموفق'}`);

    if (!nationalIdResult) {
      throw new Error('مرحله کد ملی ناموفق بود');
    }

    // بررسی وضعیت کاربر
    const userStateAfterNationalId = registrationModule.userStates[anonymousUserId];
    console.log(`📊 [TEST] وضعیت کاربر بعد از کد ملی: ${JSON.stringify(userStateAfterNationalId)}`);

    // تست 5: مرحله تلفن (شبیه‌سازی contact)
    console.log('\n📱 [TEST] تست 5: مرحله تلفن...');
    const mockContact = {
      phone_number: '989123456789'
    };
    const phoneResult = await registrationModule.handlePhoneStep(chatId, anonymousUserId, mockContact);
    console.log(`📱 [TEST] نتیجه مرحله تلفن: ${phoneResult ? 'موفق' : 'ناموفق'}`);

    if (!phoneResult) {
      throw new Error('مرحله تلفن ناموفق بود');
    }

    // بررسی وضعیت کاربر
    const userStateAfterPhone = registrationModule.userStates[anonymousUserId];
    console.log(`📊 [TEST] وضعیت کاربر بعد از تلفن: ${JSON.stringify(userStateAfterPhone)}`);

    // تست 6: تأیید نهایی
    console.log('\n✅ [TEST] تست 6: تأیید نهایی...');
    const finalConfirmResult = await registrationModule.handleFinalConfirm(chatId, anonymousUserId);
    console.log(`✅ [TEST] نتیجه تأیید نهایی: ${finalConfirmResult ? 'موفق' : 'ناموفق'}`);

    if (!finalConfirmResult) {
      throw new Error('تأیید نهایی ناموفق بود');
    }

    // بررسی وضعیت نهایی کاربر
    const finalUserData = registrationModule.userData[anonymousUserId];
    console.log(`📊 [TEST] اطلاعات نهایی کاربر: ${JSON.stringify(finalUserData)}`);

    // تست 7: بررسی کامل بودن ثبت‌نام
    console.log('\n🔍 [TEST] تست 7: بررسی کامل بودن ثبت‌نام...');
    const isComplete = registrationModule.isRegistrationComplete(anonymousUserId);
    console.log(`🔍 [TEST] آیا ثبت‌نام کامل است؟ ${isComplete ? 'بله' : 'خیر'}`);

    if (!isComplete) {
      throw new Error('ثبت‌نام کامل نیست');
    }

    // تست 8: بررسی ثبت‌نام شده بودن کاربر
    console.log('\n🔍 [TEST] تست 8: بررسی ثبت‌نام شده بودن کاربر...');
    const isNowRegistered = registrationModule.isUserRegistered(anonymousUserId);
    console.log(`🔍 [TEST] آیا کاربر حالا ثبت‌نام شده؟ ${isNowRegistered ? 'بله' : 'خیر'}`);

    if (!isNowRegistered) {
      throw new Error('کاربر هنوز ثبت‌نام نشده');
    }

    // تست 9: انتخاب کارگاه
    console.log('\n📚 [TEST] تست 9: انتخاب کارگاه...');
    const workshopResult = await registrationModule.handleWorkshopSelection(chatId, anonymousUserId);
    console.log(`📚 [TEST] نتیجه انتخاب کارگاه: ${workshopResult ? 'موفق' : 'ناموفق'}`);

    if (!workshopResult) {
      throw new Error('انتخاب کارگاه ناموفق بود');
    }

    // تست 10: پنل قرآن‌آموز
    console.log('\n📚 [TEST] تست 10: پنل قرآن‌آموز...');
    const panelResult = await registrationModule.handleQuranStudentPanel(chatId, anonymousUserId);
    console.log(`📚 [TEST] نتیجه پنل قرآن‌آموز: ${panelResult ? 'موفق' : 'ناموفق'}`);

    if (!panelResult) {
      throw new Error('پنل قرآن‌آموز ناموفق بود');
    }

    // تست 11: منوی اصلی
    console.log('\n🏠 [TEST] تست 11: منوی اصلی...');
    const mainMenuResult = await registrationModule.handleBackToMainMenu(chatId, anonymousUserId);
    console.log(`🏠 [TEST] نتیجه منوی اصلی: ${mainMenuResult ? 'موفق' : 'ناموفق'}`);

    if (!mainMenuResult) {
      throw new Error('منوی اصلی ناموفق بود');
    }

    // تست 12: معرفی مدرسه برای کاربر ثبت‌نام شده
    console.log('\n🏫 [TEST] تست 12: معرفی مدرسه برای کاربر ثبت‌نام شده...');
    const schoolIntroResult = await registrationModule.handleRegisteredUserSchool(chatId, anonymousUserId);
    console.log(`🏫 [TEST] نتیجه معرفی مدرسه: ${schoolIntroResult ? 'موفق' : 'ناموفق'}`);

    if (!schoolIntroResult) {
      throw new Error('معرفی مدرسه ناموفق بود');
    }

    // تست 13: معرفی ربات
    console.log('\n🤖 [TEST] تست 13: معرفی ربات...');
    const botIntroResult = await registrationModule.handleQuranBotIntro(chatId);
    console.log(`🤖 [TEST] نتیجه معرفی ربات: ${botIntroResult ? 'موفق' : 'ناموفق'}`);

    if (!botIntroResult) {
      throw new Error('معرفی ربات ناموفق بود');
    }

    // تست 14: خروج
    console.log('\n👋 [TEST] تست 14: خروج...');
    const exitResult = await registrationModule.handleExitCommand(chatId);
    console.log(`👋 [TEST] نتیجه خروج: ${exitResult ? 'موفق' : 'ناموفق'}`);

    if (!exitResult) {
      throw new Error('خروج ناموفق بود');
    }

    // تست 15: بررسی آمار
    console.log('\n📊 [TEST] تست 15: بررسی آمار...');
    const registeredCount = registrationModule.getRegisteredUsersCount();
    const totalCount = registrationModule.getAllUsersCount();
    console.log(`📊 [TEST] تعداد کاربران ثبت‌نام شده: ${registeredCount}`);
    console.log(`📊 [TEST] تعداد کل کاربران: ${totalCount}`);

    // تست 16: صادرات اطلاعات کاربر
    console.log('\n📤 [TEST] تست 16: صادرات اطلاعات کاربر...');
    const exportedData = registrationModule.exportUserData(anonymousUserId);
    console.log(`📤 [TEST] اطلاعات صادر شده: ${JSON.stringify(exportedData)}`);

    if (!exportedData) {
      throw new Error('صادرات اطلاعات کاربر ناموفق بود');
    }

    console.log('\n🎉 [TEST] تمام تست‌ها با موفقیت انجام شد!');
    console.log('✅ [TEST] جریان کاربر ناشناس به درستی کار می‌کند');
    console.log('✅ [TEST] تمام مراحل ثبت‌نام به درستی انجام می‌شود');
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
  testAnonymousUserFlow()
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

module.exports = { testAnonymousUserFlow };

