// 🧪 تست متد showWelcome در 15reg.js
const RegistrationModule = require('./15reg');

async function testWelcome() {
    console.log('🧪 [TEST] شروع تست showWelcome...\n');

    try {
        // ایجاد نمونه ماژول
        const registrationModule = new RegistrationModule();
        console.log('✅ [TEST] ماژول ثبت‌نام ایجاد شد');

        // شبیه‌سازی ctx
        const mockCtx = {
            from: { id: 999999999 },
            chat: { id: 999999999 },
            reply: (text, options = {}) => {
                console.log(`📤 [TEST] پیام ارسال شد: ${text}`);
                if (options.reply_markup) {
                    console.log(`⌨️ [TEST] Keyboard: ${JSON.stringify(options.reply_markup)}`);
                }
                return Promise.resolve();
            }
        };

        // تست متد showWelcome
        console.log('\n🚀 [TEST] تست متد showWelcome...');
        await registrationModule.showWelcome(mockCtx);
        
        // بررسی وضعیت کاربر
        const userState = registrationModule.userStates[999999999];
        console.log(`📊 [TEST] وضعیت کاربر: ${JSON.stringify(userState)}`);

        console.log('\n✅ [TEST] تست با موفقیت انجام شد!');
        
    } catch (error) {
        console.error('❌ [TEST] خطا در تست:', error.message);
    }
}

// اجرای تست
testWelcome();
