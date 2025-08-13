const { Markup } = require('telegraf');

// ماژول ثبت‌نام ربات
class RegistrationModule {
    constructor() {
        this.isRegistrationReady = false;
        this.registrationMessage = "بزودی...";
    }

    // بررسی وضعیت کاربر
    checkUserStatus(ctx) {
        const userId = ctx.from?.id;
        const username = ctx.from?.username;
        const firstName = ctx.from?.first_name;
        
        // اگر کاربر ناشناس باشد
        if (!username && !firstName) {
            return 'anonymous';
        }
        
        return 'known';
    }

    // نمایش پیام خوش‌آمدگویی برای کاربران ناشناس
    showAnonymousWelcome(ctx) {
        const welcomeText = `👋 سلام! شما ناشناس هستید.

🎓 به ربات مدرسه خوش آمدید!
لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;

        const keyboard = Markup.keyboard([
            ['🏫 شروع مدرسه'],
            ['🤖 خروج ربات'],
            ['📝 ثبت‌نام']
        ]).resize();

        ctx.reply(welcomeText, keyboard);
    }

    // نمایش کیبورد اصلی
    showMainKeyboard(ctx) {
        const mainText = `🎯 منوی اصلی:
لطفاً گزینه مورد نظر خود را انتخاب کنید:`;

        const keyboard = Markup.keyboard([
            ['🏫 شروع مدرسه'],
            ['🤖 خروج ربات'],
            ['📝 ثبت‌نام']
        ]).resize();

        ctx.reply(mainText, keyboard);
    }

    // پردازش انتخاب کاربر
    handleUserChoice(ctx) {
        const choice = ctx.message.text;
        
        switch (choice) {
            case '🏫 شروع مدرسه':
                this.handleSchoolStart(ctx);
                break;
            case '🤖 خروج ربات':
                this.handleRobotExit(ctx);
                break;
            case '📝 ثبت‌نام':
                this.handleRegistration(ctx);
                break;
            default:
                ctx.reply('❌ لطفاً یکی از گزینه‌های موجود را انتخاب کنید.');
        }
    }

    // پردازش شروع مدرسه
    handleSchoolStart(ctx) {
        ctx.reply('🏫 مدرسه در حال راه‌اندازی...\nلطفاً کمی صبر کنید.');
    }

    // پردازش خروج ربات
    handleRobotExit(ctx) {
        const exitKeyboard = Markup.keyboard([
            ['✅ بله، خروج'],
            ['❌ انصراف']
        ]).resize();
        
        ctx.reply('🤖 آیا مطمئن هستید که می‌خواهید از ربات خارج شوید؟', exitKeyboard);
    }

    // پردازش ثبت‌نام
    handleRegistration(ctx) {
        if (!this.isRegistrationReady) {
            ctx.reply(`📝 ثبت‌نام ${this.registrationMessage}\n\n⏳ این قابلیت به زودی در دسترس خواهد بود.`);
        } else {
            ctx.reply('📝 فرم ثبت‌نام در حال آماده‌سازی است...');
        }
    }

    // تنظیم وضعیت آماده‌بودن ثبت‌نام
    setRegistrationReady(ready) {
        this.isRegistrationReady = ready;
        if (ready) {
            this.registrationMessage = "آماده است!";
        } else {
            this.registrationMessage = "بزودی...";
        }
    }

    // شروع ماژول
    start(ctx) {
        const userStatus = this.checkUserStatus(ctx);
        
        if (userStatus === 'anonymous') {
            this.showAnonymousWelcome(ctx);
        } else {
            this.showMainKeyboard(ctx);
        }
    }

    // پردازش پیام‌های متنی
    processMessage(ctx) {
        this.handleUserChoice(ctx);
    }
}

// صادر کردن ماژول
module.exports = RegistrationModule;
