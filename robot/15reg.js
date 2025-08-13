const fs = require('fs');
const path = require('path');
const { sendMessage } = require('./4bale');

class RegistrationModule {
    constructor() {
        this.dataFile = path.join(__dirname, 'data', 'smart_registration.json');
        this.userStates = {};
        this.loadData();
    }

    // بارگذاری داده‌ها
    loadData() {
        try {
            if (fs.existsSync(this.dataFile)) {
                const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
                this.userStates = data.userStates || {};
            }
        } catch (error) {
            console.error('خطا در بارگذاری داده‌ها:', error);
        }
    }

    // ذخیره داده‌ها
    saveData() {
        try {
            const data = {
                userStates: this.userStates,
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('خطا در ذخیره داده‌ها:', error);
        }
    }

    // شروع ماژول
    start(ctx) {
        // بررسی وجود ctx.from
        if (!ctx.from || !ctx.from.id) {
            console.log('❌ [15REG] در متد start: ctx.from یا ctx.from.id وجود ندارد');
            return;
        }
        
        const userId = ctx.from.id;
        console.log(`🔍 [15REG] شروع ماژول برای کاربر ${userId}`);
        
        // بررسی وضعیت کاربر
        if (this.userStates[userId]) {
            console.log(`🔄 [15REG] ادامه ثبت‌نام برای کاربر ${userId}`);
            this.continueRegistration(ctx);
        } else {
            console.log(`🎉 [15REG] شروع جدید برای کاربر ${userId}`);
            this.showWelcome(ctx);
        }
    }

    // نمایش خوش‌آمدگویی
    showWelcome(ctx) {
        const welcomeText = `🎉 به ربات دستیار تلاوت قران خوش امدید.

📱 لطفاً شماره تلفن خود را برای ثبت‌نام در ربات ارسال کنید:`;
        
        ctx.reply(welcomeText);
        
        // نمایش دکمه request_contact
        this.showContactButton(ctx);
        
          // تنظیم وضعیت کاربر
        const userId = ctx.from.id;
        this.userStates[userId] = {
            step: 'phone',
            data: {},
            timestamp: Date.now()
        };
        this.saveData();
    }

    // نمایش دکمه request_contact
    showContactButton(ctx) {
        const contactKeyboard = {
            keyboard: [[{ text: "📱 ارسال شماره تلفن", request_contact: true }]],
            resize_keyboard: true
        };
        
        ctx.reply("📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید:", contactKeyboard);
    }

    // ادامه ثبت‌نام
    continueRegistration(ctx) {
        const userId = ctx.from.id;
        const userState = this.userStates[userId];
        
        if (userState.step === 'phone') {
            ctx.reply('📱 لطفاً شماره تلفن خود را ارسال کنید:');
            this.showContactButton(ctx);
        }
    }

    // پردازش پیام
    async handleMessage(ctx) {
        // بررسی وجود ctx.from
        if (!ctx.from || !ctx.from.id) {
            console.log('❌ [15REG] ctx.from یا ctx.from.id وجود ندارد');
            return false;
        }
        
        const userId = ctx.from.id;
        const messageText = ctx.message?.text;
        const contact = ctx.message?.contact;
        
        console.log(`🔍 [15REG] پردازش پیام از کاربر ${userId}: ${messageText || 'contact'}`);
        
        // اگر دستور شروع
        if (messageText === '/start' || messageText === 'شروع'|| messageText === '/شروع'|| messageText === 'استارت') {
            console.log(`✅ [15REG] دستور شروع تشخیص داده شد`);
            this.start(ctx);
            return true;
        }
        
        // اگر contact دریافت شد (روش پیشرفته)
        if (contact && this.userStates[userId]?.step === 'phone') {
            console.log(`📱 [15REG] Contact دریافت شد`);
            await this.handleContact(ctx, contact);
            return true;
        }
        
        // اگر شماره تلفن دستی وارد شد
        if (messageText && this.userStates[userId]?.step === 'phone') {
            console.log(`📱 [15REG] شماره تلفن دستی دریافت شد`);
            await this.handlePhoneNumber(ctx, messageText);
            return true;
        }
        
        console.log(`❌ [15REG] پیام پردازش نشد`);
        return false;
    }

    // پردازش شماره تلفن (ورود دستی)
    async handlePhoneNumber(ctx, phoneNumber) {
        const userId = ctx.from.id;
        
        // ذخیره شماره تلفن
        this.userStates[userId].data.phone = phoneNumber;
        this.userStates[userId].step = 'profile';
        this.saveData();
        
        // بررسی نقش کاربر (اینجا باید با سیستم نقش‌ها ادغام شود)
        const userRole = await this.checkUserRole(phoneNumber);
        
        if (userRole === 'quran_student') {
            // قرآن‌آموز - نمایش پروفایل
            await this.showQuranStudentProfile(ctx);
        } else {
            // نقش دیگر - منوی مربوطه
            await this.showRoleMenu(ctx, userRole);
        }
    }

    // پردازش contact (روش پیشرفته)
    async handleContact(ctx, contact) {
        const userId = ctx.from.id;
        const phoneNumber = contact.phone_number;
        
        console.log(`📱 [15REG] Contact دریافت شد: ${phoneNumber}`);
        
        // ذخیره شماره تلفن
        this.userStates[userId].data.phone = phoneNumber;
        this.userStates[userId].step = 'profile';
        this.saveData();
        
        // بررسی نقش کاربر
        const userRole = await this.checkUserRole(phoneNumber);
        
        if (userRole === 'quran_student') {
            await this.showQuranStudentProfile(ctx);
        } else {
            await this.showRoleMenu(ctx, userRole);
        }
    }

    // بررسی نقش کاربر (شبیه‌سازی)
    async checkUserRole(phoneNumber) {
        // اینجا باید با سیستم نقش‌های اصلی ادغام شود
        // فعلاً شبیه‌سازی می‌کنیم
        return 'quran_student';
    }

    // نمایش پروفایل قرآن‌آموز
    async showQuranStudentProfile(ctx) {
        const profileText = `📖 پروفایل قرآن‌آموز

✅ ثبت‌نام در ربات تکمیل شد
📱 شماره تلفن: ${this.userStates[ctx.from.id].data.phone}

🔄 حالا حساب خود را کامل کنید...`;
        
        ctx.reply(profileText);
    }

    // نمایش منوی نقش
    async showRoleMenu(ctx, role) {
        ctx.reply(`🎯 منوی ${role} نمایش داده می‌شود`);
    }

    // متد مورد نیاز برای polling
    async handleStartCommand(chatId, userId) {
        console.log(`🔍 [15REG] handleStartCommand فراخوانی شد`);
        console.log(`🔍 [15REG] chatId: ${chatId}, userId: ${userId}`);
        
        // ساخت ctx مصنوعی برای compatibility
        const ctx = {
            from: { id: parseInt(userId) },
            chat: { id: parseInt(chatId) },
            reply: async (text) => {
                try {
                    console.log(`📤 [15REG] ارسال پیام به ${chatId}: ${text}`);
                    await sendMessage(parseInt(chatId), text);
                    console.log(`✅ [15REG] پیام با موفقیت ارسال شد`);
                } catch (error) {
                    console.error(`❌ [15REG] خطا در ارسال پیام:`, error.message);
                }
            }
        };
        
        this.start(ctx);
        return true;
    }
}

module.exports = RegistrationModule;
