// 🧪 تست ساده جریان کاربر ناشناس
// بررسی منطق بدون ارسال پیام واقعی

const SmartRegistrationModule = require('./14reg1');

async function testAnonymousFlowLogic() {
  console.log('🧪 [TEST] شروع تست منطق جریان کاربر ناشناس...\n');

  try {
    // ایجاد نمونه ماژول
    const registrationModule = new SmartRegistrationModule();
    console.log('✅ [TEST] ماژول ثبت‌نام ایجاد شد');

    // شبیه‌سازی کاربر ناشناس
    const anonymousUserId = 999999999;
    const chatId = 999999999;

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

    // تست 1: بررسی متد handleStartCommand
    console.log('\n🚀 [TEST] تست 1: بررسی متد handleStartCommand...');
    
    // شبیه‌سازی پیام /start
    const startResult = await registrationModule.handleStartCommand(chatId, anonymousUserId);
    console.log(`📱 [TEST] نتیجه handleStartCommand: ${startResult ? 'موفق' : 'ناموفق'}`);

    if (!startResult) {
      throw new Error('handleStartCommand برای کاربر ناشناس ناموفق بود');
    }

    // تست 2: بررسی متد handleRegistrationStart
    console.log('\n📝 [TEST] تست 2: بررسی متد handleRegistrationStart...');
    
    const registrationStartResult = await registrationModule.handleRegistrationStart(chatId, anonymousUserId);
    console.log(`📝 [TEST] نتیجه handleRegistrationStart: ${registrationStartResult ? 'موفق' : 'ناموفق'}`);

    if (!registrationStartResult) {
      throw new Error('handleRegistrationStart ناموفق بود');
    }

    // بررسی وضعیت کاربر
    const userState = registrationModule.userStates[anonymousUserId];
    console.log(`📊 [TEST] وضعیت کاربر: ${JSON.stringify(userState)}`);

    if (!userState || userState.step !== 'name') {
      throw new Error('وضعیت کاربر بعد از شروع ثبت‌نام درست نیست');
    }

    // تست 3: بررسی متد handleNameStep
    console.log('\n📝 [TEST] تست 3: بررسی متد handleNameStep...');
    
    const nameResult = await registrationModule.handleNameStep(chatId, anonymousUserId, 'احمد محمدی');
    console.log(`📝 [TEST] نتیجه handleNameStep: ${nameResult ? 'موفق' : 'ناموفق'}`);

    if (!nameResult) {
      throw new Error('handleNameStep ناموفق بود');
    }

    // بررسی وضعیت کاربر
    const userStateAfterName = registrationModule.userStates[anonymousUserId];
    console.log(`📊 [TEST] وضعیت کاربر بعد از نام: ${JSON.stringify(userStateAfterName)}`);

    if (!userStateAfterName || userStateAfterName.step !== 'national_id') {
      throw new Error('وضعیت کاربر بعد از نام درست نیست');
    }

    // تست 4: بررسی متد handleNationalIdStep
    console.log('\n🆔 [TEST] تست 4: بررسی متد handleNationalIdStep...');
    
    const nationalIdResult = await registrationModule.handleNationalIdStep(chatId, anonymousUserId, '1234567890');
    console.log(`🆔 [TEST] نتیجه handleNationalIdStep: ${nationalIdResult ? 'موفق' : 'ناموفق'}`);

    if (!nationalIdResult) {
      throw new Error('handleNationalIdStep ناموفق بود');
    }

    // بررسی وضعیت کاربر
    const userStateAfterNationalId = registrationModule.userStates[anonymousUserId];
    console.log(`📊 [TEST] وضعیت کاربر بعد از کد ملی: ${JSON.stringify(userStateAfterNationalId)}`);

    if (!userStateAfterNationalId || userStateAfterNationalId.step !== 'phone') {
      throw new Error('وضعیت کاربر بعد از کد ملی درست نیست');
    }

    // تست 5: بررسی متد handlePhoneStep
    console.log('\n📱 [TEST] تست 5: بررسی متد handlePhoneStep...');
    
    const mockContact = {
      phone_number: '989123456789'
    };
    const phoneResult = await registrationModule.handlePhoneStep(chatId, anonymousUserId, mockContact);
    console.log(`📱 [TEST] نتیجه handlePhoneStep: ${phoneResult ? 'موفق' : 'ناموفق'}`);

    if (!phoneResult) {
      throw new Error('handlePhoneStep ناموفق بود');
    }

    // بررسی وضعیت کاربر
    const userStateAfterPhone = registrationModule.userStates[anonymousUserId];
    console.log(`📊 [TEST] وضعیت کاربر بعد از تلفن: ${JSON.stringify(userStateAfterPhone)}`);

    // تست 6: بررسی متد handleFinalConfirm
    console.log('\n✅ [TEST] تست 6: بررسی متد handleFinalConfirm...');
    
    const finalConfirmResult = await registrationModule.handleFinalConfirm(chatId, anonymousUserId);
    console.log(`✅ [TEST] نتیجه handleFinalConfirm: ${finalConfirmResult ? 'موفق' : 'ناموفق'}`);

    if (!finalConfirmResult) {
      throw new Error('handleFinalConfirm ناموفق بود');
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

    // تست 9: بررسی متدهای callback
    console.log('\n🔄 [TEST] تست 9: بررسی متدهای callback...');
    
    const callbackData = 'start_next_month_registration';
    const callbackResult = await registrationModule.handleCallback({
      data: callbackData,
      message: { chat: { id: chatId } },
      from: { id: anonymousUserId }
    });
    
    console.log(`🔄 [TEST] نتیجه callback '${callbackData}': ${callbackResult ? 'موفق' : 'ناموفق'}`);

    if (!callbackResult) {
      throw new Error('handleCallback ناموفق بود');
    }

    console.log('\n🎉 [TEST] تمام تست‌های جریان کاربر ناشناس با موفقیت انجام شد!');
    console.log('✅ [TEST] جریان کاربر ناشناس به درستی کار می‌کند');
    console.log('✅ [TEST] تمام مراحل ثبت‌نام به درستی انجام می‌شود');
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
  testAnonymousFlowLogic()
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

module.exports = { testAnonymousFlowLogic };

