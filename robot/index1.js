// ماژول ثبت نام ساده با کیبورد شیشه‌ای - نسخه 1.0.0
// استفاده از API بله به جای تلگرام

const { sendMessage, sendMessageWithInlineKeyboard, getUpdates } = require('./4bale');
const { getTimeStamp } = require('./1time');

// ذخیره اطلاعات کاربران
const userStates = new Map();

// متغیرهای polling
let isPolling = false;
let lastUpdateId = 0;
const POLLING_INTERVAL = 500; // 0.5 ثانیه (نیم ثانیه)

// تابع اصلی پردازش پیام‌ها
async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    console.log(`📥 [REG] Received message from ${userId} in ${chatId}: ${text}`);
    
    // اگر دستور /start باشد
    if (text === '/start') {
        await handleStart(chatId, userId);
        return;
    }
    
    // بررسی حالت کاربر
    const userState = userStates.get(userId);
    if (!userState) return;
    
    switch (userState.step) {
        case 'main_menu':
            // بررسی دکمه‌های منوی اصلی
            if (text === '👤 حساب کاربری') {
                await handleUserAccount(chatId, userId);
                return;
            }
            
            if (text === '📝 ثبت نام در مدرسه') {
                await handleSchoolRegistration(chatId, userId);
                return;
            }
            break;
            
        case 'name':
            // بررسی دکمه‌های مرحله نام
            if (text === '🔙 بازگشت') {
                await handleBackToMainMenu(chatId, userId);
                return;
            }
            
            if (text === '❌ لغو') {
                await handleCancelRegistration(chatId, userId);
                return;
            }
            
            await handleNameInput(chatId, userId, text);
            break;
            
        case 'nationalId':
            await handleNationalIdInput(chatId, userId, text);
            break;
    }
}

// تابع پردازش callback query ها
async function handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    console.log(`🔘 [REG] Callback query from ${userId}: ${data}`);
    
    switch (data) {
        case 'user_account':
            await handleUserAccount(chatId, userId);
            break;
            
        case 'school_registration':
            await handleSchoolRegistration(chatId, userId);
            break;
            
        case 'back':
            await handleBackButton(chatId, userId);
            break;
            
        case 'cancel':
            await handleCancelRegistration(chatId, userId);
            break;
            
        default:
            console.log(`⚠️ [REG] Unknown callback data: ${data}`);
    }
}

// پردازش دستور /start
async function handleStart(chatId, userId) {
    console.log(`🚀 [REG] User ${userId} started registration`);
    
    // تنظیم حالت کاربر به منوی اصلی
    userStates.set(userId, { step: 'main_menu' });
    
        const welcomeMessage = `🎉 به مدرسه تلاوت خوش آمدید!

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;
    
    // کیبورد شیشه‌ای برای مرحله اول
    const keyboard = [
        ['👤 حساب کاربری', '📝 ثبت نام در مدرسه']
    ];
    
    const replyMarkup = {
        keyboard: keyboard,
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false
    };
    
    try {
        await sendMessage(chatId, welcomeMessage, replyMarkup);
        console.log(`✅ [REG] Welcome message with new keyboard sent to ${chatId}`);
        
        // اضافه کردن کیبورد اینلاین در منوی اصلی
        const inlineMessage = `📝 برای ادامه، یکی از گزینه‌های زیر را انتخاب کنید:`;
        const inlineKeyboard = [
            [
                { text: '👤 حساب کاربری', callback_data: 'user_account' },
                { text: '📝 ثبت نام در مدرسه', callback_data: 'school_registration' }
            ]
        ];
        
        try {
            const inlineReplyMarkup = {
                inline_keyboard: inlineKeyboard
            };
            await sendMessage(chatId, inlineMessage, inlineReplyMarkup);
            console.log(`✅ [REG] Inline keyboard sent in main menu to ${chatId}`);
        } catch (inlineError) {
            console.error(`❌ [REG] Error sending inline keyboard in main menu:`, inlineError.message);
        }
        
    } catch (error) {
        console.error(`❌ [REG] Error sending welcome message:`, error.message);
    }
}

// پردازش ورود نام
async function handleNameInput(chatId, userId, name) {
    console.log(`📝 [REG] User ${userId} entered name: ${name}`);
    
    const userState = userStates.get(userId);
    userState.name = name;
    userState.step = 'nationalId';
    
    const message = `✅ نام شما ثبت شد: ${name}
    
لطفاً شماره ملی خود را وارد کنید:`;
    
    const keyboard = [
        ['🔙 بازگشت', '❌ لغو']
    ];
    
    console.log('🔧 [REG] Keyboard structure:', JSON.stringify(keyboard, null, 2));
    
    try {
        // ارسال پیام با کیبورد شیشه‌ای
        const replyMarkup = {
            keyboard: keyboard,
            resize_keyboard: true,
            one_time_keyboard: false,
            selective: false
        };
        await sendMessage(chatId, message, replyMarkup);
        console.log(`✅ [REG] Name confirmation with keyboard sent to ${chatId}`);
        
        // ارسال پیام دوم با کیبورد اینلاین ساده
        const inlineMessage = `📝 برای ادامه ثبت نام، شماره ملی خود را وارد کنید یا از دکمه‌های زیر استفاده کنید:`;
        const inlineKeyboard = [
            [
                { text: '🔙 بازگشت', callback_data: 'back' },
                { text: '❌ لغو', callback_data: 'cancel' }
            ]
        ];
        
        try {
            // ارسال کیبورد اینلاین با sendMessage
            const inlineReplyMarkup = {
                inline_keyboard: inlineKeyboard
            };
            await sendMessage(chatId, inlineMessage, inlineReplyMarkup);
            console.log(`✅ [REG] Inline keyboard sent via sendMessage to ${chatId}`);
        } catch (inlineError) {
            console.error(`❌ [REG] Error sending inline keyboard:`, inlineError.message);
            // در صورت خطا، فقط پیام ساده ارسال کن
            await sendMessage(chatId, '📝 لطفاً شماره ملی خود را وارد کنید:');
        }
        
    } catch (error) {
        console.error(`❌ [REG] Error sending name confirmation:`, error.message);
    }
}

// پردازش ورود شماره ملی
async function handleNationalIdInput(chatId, userId, nationalId) {
    console.log(`🆔 [REG] User ${userId} entered national ID: ${nationalId}`);
    
    if (nationalId === '🔙 بازگشت') {
        await handleBackButton(chatId, userId);
        return;
    }
    
    if (nationalId === '❌ لغو') {
        await handleCancelRegistration(chatId, userId);
        return;
    }
    
    const userState = userStates.get(userId);
    userState.nationalId = nationalId;
    
    // ارسال اطلاعات ثبت نام
    await sendRegistrationData(userState, chatId);
    
    // پاک کردن حالت کاربر
    userStates.delete(userId);
}

// پردازش راهنمای ثبت نام
async function handleHelpRegistration(chatId, userId) {
    console.log(`📋 [REG] User ${userId} requested help`);
    
    const helpMessage = `📋 راهنمای ثبت نام:

1️⃣ **شروع:** /start بزنید
2️⃣ **نام:** نام کامل خود را وارد کنید
3️⃣ **شماره ملی:** شماره ملی 10 رقمی را وارد کنید
4️⃣ **تأیید:** اطلاعات شما ثبت می‌شود

⚠️ **نکات مهم:**
• شماره ملی باید دقیق باشد
• می‌توانید با دکمه بازگشت به مرحله قبل برگردید
• برای لغو از دکمه لغو استفاده کنید`;
    
    try {
        await sendMessage(chatId, helpMessage);
        console.log(`✅ [REG] Help message sent to ${chatId}`);
    } catch (error) {
        console.error(`❌ [REG] Error sending help message:`, error.message);
    }
}

// پردازش لغو ثبت نام
async function handleCancelRegistration(chatId, userId) {
    console.log(`❌ [REG] User ${userId} cancelled registration`);
    
    // پاک کردن حالت کاربر
    userStates.delete(userId);
    
    const message = '❌ ثبت نام لغو شد. برای شروع مجدد /start بزنید.';
    
    try {
        // حذف کیبورد و ارسال پیام ساده
        const replyMarkup = {
            remove_keyboard: true
        };
        await sendMessage(chatId, message, replyMarkup);
        console.log(`✅ [REG] Registration cancelled for ${chatId}`);
    } catch (error) {
        console.error(`❌ [REG] Error cancelling registration:`, error.message);
    }
}

// پردازش حساب کاربری
async function handleUserAccount(chatId, userId) {
    console.log(`👤 [REG] User ${userId} requested user account`);
    
    const message = `👤 **حساب کاربری شما:**
    
🆔 شناسه کاربر: ${userId}
📅 تاریخ عضویت: ${getTimeStamp()}
📊 وضعیت: فعال
    
برای بازگشت به منوی اصلی /start بزنید.`;
    
    try {
        // حذف کیبورد و ارسال پیام ساده
        const replyMarkup = {
            remove_keyboard: true
        };
        await sendMessage(chatId, message, replyMarkup);
        console.log(`✅ [REG] User account info sent to ${chatId}`);
    } catch (error) {
        console.error(`❌ [REG] Error sending user account info:`, error.message);
    }
}

// پردازش ثبت نام در مدرسه
async function handleSchoolRegistration(chatId, userId) {
    console.log(`📝 [REG] User ${userId} started school registration`);
    
    // تغییر حالت کاربر به مرحله نام
    userStates.set(userId, { step: 'name' });
    
    const message = `📝 **ثبت نام در مدرسه تلاوت**
    
لطفاً نام کامل خود را وارد کنید:`;
    
    // کیبورد شیشه‌ای برای مرحله نام
    const keyboard = [
        ['🔙 بازگشت', '❌ لغو']
    ];
    
    const replyMarkup = {
        keyboard: keyboard,
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false
    };
    
    try {
        await sendMessage(chatId, message, replyMarkup);
        console.log(`✅ [REG] School registration started for ${chatId}`);
    } catch (error) {
        console.error(`❌ [REG] Error starting school registration:`, error.message);
    }
}

// پردازش دکمه بازگشت از مرحله اول
async function handleBackFromStart(chatId, userId) {
    console.log(`🔙 [REG] User ${userId} pressed back from start`);
    
    const message = '🔙 شما در ابتدای ثبت نام هستید. برای شروع مجدد /start بزنید.';
    
    try {
        // حذف کیبورد و ارسال پیام ساده
        const replyMarkup = {
            remove_keyboard: true
        };
        await sendMessage(chatId, message, replyMarkup);
        console.log(`✅ [REG] Back from start processed for ${chatId}`);
    } catch (error) {
        console.error(`❌ [REG] Error processing back from start:`, error.message);
    }
}

// بازگشت به منوی اصلی
async function handleBackToMainMenu(chatId, userId) {
    console.log(`🔙 [REG] User ${userId} returned to main menu`);
    
    // تغییر حالت کاربر به منوی اصلی
    userStates.set(userId, { step: 'main_menu' });
    
    const message = `🎉 به مدرسه تلاوت خوش آمدید!

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;
    
    // کیبورد شیشه‌ای برای منوی اصلی
    const keyboard = [
        ['👤 حساب کاربری', '📝 ثبت نام در مدرسه']
    ];
    
    const replyMarkup = {
        keyboard: keyboard,
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false
    };
    
    try {
        await sendMessage(chatId, message, replyMarkup);
        console.log(`✅ [REG] User returned to main menu: ${chatId}`);
    } catch (error) {
        console.error(`❌ [REG] Error returning to main menu:`, error.message);
    }
}

// پردازش دکمه بازگشت
async function handleBackButton(chatId, userId) {
    console.log(`🔙 [REG] User ${userId} pressed back button`);
    
    const userState = userStates.get(userId);
    userState.step = 'name';
    
    const message = 'لطفاً نام خود را دوباره وارد کنید:';
    
    try {
        // حذف کیبورد و ارسال پیام ساده
        const replyMarkup = {
            remove_keyboard: true
        };
        await sendMessage(chatId, message, replyMarkup);
        console.log(`✅ [REG] Back button processed and keyboard removed for ${chatId}`);
    } catch (error) {
        console.error(`❌ [REG] Error processing back button:`, error.message);
    }
}

// ارسال اطلاعات ثبت نام
async function sendRegistrationData(userData, chatId) {
    try {
        const timestamp = getTimeStamp();
        const message = `🎉 ثبت نام شما با موفقیت انجام شد!

📝 اطلاعات ثبت نام:
👤 نام: ${userData.name}
🆔 شماره ملی: ${userData.nationalId}
⏰ تاریخ: ${timestamp}`;
        
        // ارسال تأیید به کاربر و حذف کیبورد
        const replyMarkup = {
            remove_keyboard: true
        };
        await sendMessage(chatId, message, replyMarkup);
        console.log(`✅ [REG] Registration confirmation sent and keyboard removed for ${chatId}`);
        
        // ارسال به گروه گزارش (اختیاری)
        // await sendMessage(REPORT_GROUP_ID, `📝 ثبت نام جدید:\n${message}`);
        
    } catch (error) {
        console.error(`❌ [REG] Error sending registration data:`, error.message);
        
        // ارسال پیام خطا به کاربر
        try {
            await sendMessage(chatId, '❌ خطا در ثبت نام. لطفاً دوباره تلاش کنید.');
        } catch (sendError) {
            console.error(`❌ [REG] Error sending error message:`, sendError.message);
        }
    }
}

// تابع polling ساده
async function startPolling() {
    if (isPolling) {
        console.log('⚠️ [REG] Polling already started');
        return;
    }
    
    isPolling = true;
    console.log('🔄 [REG] Starting polling...');
    
    while (isPolling) {
        try {
            // دریافت پیام‌های جدید
            const updates = await getUpdates(lastUpdateId + 1);
            
            if (updates && updates.length > 0) {
                console.log(`📥 [REG] Received ${updates.length} updates`);
                
                for (const update of updates) {
                    // به‌روزرسانی آخرین update ID
                    if (update.update_id > lastUpdateId) {
                        lastUpdateId = update.update_id;
                    }
                    
                    // پردازش پیام
                    if (update.message && update.message.text) {
                        await handleMessage(update.message);
                    }
                    
                    // پردازش callback query
                    if (update.callback_query) {
                        await handleCallbackQuery(update.callback_query);
                    }
                }
            }
            
            // انتظار قبل از polling بعدی
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
            
        } catch (error) {
            console.error('❌ [REG] Polling error:', error.message);
            
            // انتظار بیشتر در صورت خطا
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL * 2));
        }
    }
}

// تابع توقف polling
function stopPolling() {
    isPolling = false;
    console.log('🛑 [REG] Polling stopped');
}

// تابع شروع ربات
async function startRegistrationBot() {
    console.log('🤖 [REG] ربات ثبت نام شروع به کار کرد...');
    console.log(`⏰ [REG] زمان شروع: ${getTimeStamp()}`);
    
    // شروع polling
    await startPolling();
}

// مدیریت خروج برنامه
process.on('SIGINT', async () => {
    console.log('\n🛑 [REG] Received SIGINT, shutting down...');
    stopPolling();
    
    // انتظار برای اتمام polling
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ [REG] Shutdown completed');
    process.exit(0);
});

// صادرات توابع
module.exports = {
    handleMessage,
    startRegistrationBot,
    startPolling,
    stopPolling,
    userStates
};

// شروع خودکار اگر مستقیماً اجرا شود
if (require.main === module) {
    startRegistrationBot().catch(error => {
        console.error('❌ [REG] Error starting registration bot:', error.message);
        process.exit(1);
    });
}
