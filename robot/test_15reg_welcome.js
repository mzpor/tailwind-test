// 🧪 تست متد showWelcome در 15reg.js
const RegistrationModule = require('./15reg.js');

// تست نمایش خوش‌آمدگویی بدون پیام دوم
async function testWelcomeWithoutSecondMessage() {
    console.log('🧪 تست نمایش خوش‌آمدگویی بدون پیام دوم...');
    
    const registration = new RegistrationModule();
    
    // ایجاد ctx مصنوعی
    const ctx = {
        from: { id: 12345 },
        reply: (text, options) => {
            console.log(`📝 پیام ارسالی: "${text}"`);
            if (options && options.reply_markup) {
                console.log(`⌨️ دکمه‌ها:`, JSON.stringify(options.reply_markup, null, 2));
            }
        }
    };
    
    // تست showWelcome
    console.log('\n🎯 تست showWelcome:');
    await registration.showWelcome(ctx);
    
    console.log('\n✅ تست کامل شد!');
}

testWelcomeWithoutSecondMessage().catch(console.error);
