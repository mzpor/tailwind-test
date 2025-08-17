// 🧪 تست متد handleStartCommand در 15reg.js
const RegistrationModule = require('./15reg');

async function testStartCommand() {
    console.log('🧪 [TEST] شروع تست handleStartCommand...\n');

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

        // تست 1: کاربر جدید
        console.log('\n🚀 [TEST] تست 1: کاربر جدید...');
        const startResult1 = await registrationModule.handleStartCommand(999999999, 999999999);
        console.log(`📱 [TEST] نتیجه /start برای کاربر جدید: ${startResult1 ? 'موفق' : 'ناموفق'}`);

        // بررسی وضعیت کاربر
        const userState1 = registrationModule.userStates[999999999];
        console.log(`📊 [TEST] وضعیت کاربر جدید: ${JSON.stringify(userState1)}`);

        // تست 2: کاربر در مرحله phone (شبیه‌سازی کاربر قبلی)
        console.log('\n🔄 [TEST] تست 2: کاربر در مرحله phone...');
        registrationModule.userStates[888888888] = {
            step: 'phone',
            data: { phone: '09301234567' },
            timestamp: Date.now()
        };
        
        const startResult2 = await registrationModule.handleStartCommand(888888888, 888888888);
        console.log(`📱 [TEST] نتیجه /start برای کاربر در مرحله phone: ${startResult2 ? 'موفق' : 'ناموفق'}`);

        // بررسی وضعیت کاربر
        const userState2 = registrationModule.userStates[888888888];
        console.log(`📊 [TEST] وضعیت کاربر در مرحله phone: ${JSON.stringify(userState2)}`);

        console.log('\n✅ [TEST] تست با موفقیت انجام شد!');
        
    } catch (error) {
        console.error('❌ [TEST] خطا در تست:', error.message);
    }
}

// اجرای تست
testStartCommand();
