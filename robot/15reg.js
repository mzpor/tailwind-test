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
        if (this.userStates[userId] && this.userStates[userId].step !== 'completed') {
            console.log(`🔄 [15REG] ادامه ثبت‌نام برای کاربر ${userId} در مرحله: ${this.userStates[userId].step}`);
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
        
        // ارسال با keyboard
        ctx.reply("📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید:", { 
            reply_markup: contactKeyboard 
        });
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
        const messageText = ctx.text;  // مستقیماً از ctx.text بگیر
        const contact = ctx.contact || null;  // مستقیماً از ctx.contact بگیر
        
        console.log(`🔍 [15REG] پردازش پیام از کاربر ${userId}: ${messageText || (contact ? 'contact' : 'unknown')}`);
        
        // 🔥 دستورات شروع حالا در 5polling.js پردازش می‌شوند
        // اینجا فقط پیام‌های عادی پردازش می‌شوند
        
        // ساخت ctx مصنوعی برای compatibility
        const artificialCtx = {
            from: { 
                id: parseInt(userId),
                first_name: ctx.first_name || 'کاربر'
            },
            chat: { id: parseInt(ctx.chat.id) },
            reply: async (text, options = {}) => {
                try {
                    console.log(`📤 [15REG] ارسال پیام به ${ctx.chat.id}: ${text}`);
                    
                    if (options && options.reply_markup) {
                        // ارسال با keyboard
                        await sendMessage(parseInt(ctx.chat.id), text, options.reply_markup);
                        console.log(`✅ [15REG] پیام با keyboard ارسال شد`);
                    } else {
                        // ارسال بدون keyboard
                        await sendMessage(parseInt(ctx.chat.id), text);
                        console.log(`✅ [15REG] پیام بدون keyboard ارسال شد`);
                    }
                } catch (error) {
                    console.error(`❌ [15REG] خطا در ارسال پیام:`, error.message);
                }
            }
        };
        
        // اگر contact دریافت شد (روش پیشرفته)
        if (contact && this.userStates[userId]?.step === 'phone') {
            console.log(`📱 [15REG] Contact دریافت شد`);
            await this.handleContact(artificialCtx, contact);
            return true;
        }
        
        // اگر نام و فامیل وارد شد
        if (messageText && this.userStates[userId]?.step === 'full_name') {
            console.log(`👤 [15REG] نام و فامیل دریافت شد`);
            await this.handleFullNameInput(artificialCtx, messageText);
            return true;
        }
        
        // اگر شماره تلفن دستی وارد شد
        if (messageText && this.userStates[userId]?.step === 'phone') {
            console.log(`📱 [15REG] شماره تلفن دستی دریافت شد`);
            await this.handlePhoneNumber(artificialCtx, messageText);
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
        
        // استخراج نام کامل و اسم کوچک
        const fullName = contact.first_name || ctx.from.first_name || 'کاربر';
        const firstName = fullName.split(' ')[0];
        
        console.log(`👤 [15REG] نام کامل: "${fullName}" -> اسم کوچک: "${firstName}"`);
        console.log(`📱 [15REG] Contact دریافت شد: ${phoneNumber}`);
        
        // ذخیره کامل اطلاعات کاربر
        this.userStates[userId].data = {
            phone: phoneNumber,
            fullName: fullName,
            firstName: firstName
        };
        this.saveData();
        
        // بررسی نقش کاربر
        const userRole = await this.checkUserRole(phoneNumber);
        
        if (userRole === 'coach' || userRole === 'assistant') {
            // مربی یا کمک مربی
            await this.handleCoachWelcome(ctx, userRole, firstName);
        } else {
            // قرآن‌آموز
            await this.handleQuranStudentRegistration(ctx);
        }
    }

    // بررسی نقش کاربر با شماره تلفن
    async checkUserRole(phoneNumber) {
        console.log(`🔍 [15REG] بررسی نقش برای شماره: ${phoneNumber}`);
        
        try {
            // بارگذاری workshops.json
            const workshopsFile = path.join(__dirname, 'data', 'workshops.json');
            if (fs.existsSync(workshopsFile)) {
                const workshopsData = JSON.parse(fs.readFileSync(workshopsFile, 'utf8'));
                
                // بررسی اینکه آیا شماره در کارگاه‌ها وجود دارد
                for (const [workshopId, workshop] of Object.entries(workshopsData)) {
                    if (workshop.instructor_phone && phoneNumber.includes(workshop.instructor_phone)) {
                        console.log(`✅ [15REG] نقش تشخیص داده شد: مربی (کارگاه ${workshopId})`);
                        return 'coach';  // مربی
                    }
                }
                
                console.log(`✅ [15REG] نقش تشخیص داده شد: قرآن‌آموز (شماره در کارگاه‌ها یافت نشد)`);
                return 'quran_student';  // قرآن‌آموز
            } else {
                console.log(`⚠️ [15REG] فایل workshops.json یافت نشد`);
                return 'quran_student';  // پیش‌فرض
            }
        } catch (error) {
            console.error(`❌ [15REG] خطا در بررسی نقش:`, error.message);
            return 'quran_student';  // پیش‌فرض در صورت خطا
        }
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

    // خوش‌آمدگویی مربی/کمک مربی
    async handleCoachWelcome(ctx, role, firstName) {
        const roleText = role === 'coach' ? 'مربی' : 'کمک مربی';
        
        const welcomeText = `👨‍🏫 خوش‌آمدی ${roleText} ${firstName}
پنل ${roleText} فعال شد`;
        
        const keyboard = {
            keyboard: [
                ['شروع', 'ربات', 'خروج']
            ],
            resize_keyboard: true
        };
        
        ctx.reply(welcomeText, { reply_markup: keyboard });
    }

    // ثبت‌نام قرآن‌آموز
    async handleQuranStudentRegistration(ctx) {
        const userId = ctx.from.id;
        
        // تغییر مرحله به دریافت نام
        this.userStates[userId].step = 'full_name';
        this.saveData();
        
        ctx.reply('👤 لطفاً نام و فامیل خود را وارد کنید:');
    }

    // پردازش ورود نام و فامیل
    async handleFullNameInput(ctx, fullName) {
        const userId = ctx.from.id;
        
        // استخراج اولین اسم (قبل از فاصله)
        const firstName = fullName.split(' ')[0];
        console.log(`👤 [15REG] نام کامل: "${fullName}" -> اسم کوچک: "${firstName}"`);
        
        // ذخیره کامل اطلاعات کاربر
        this.userStates[userId].data.fullName = fullName;
        this.userStates[userId].data.firstName = firstName;
        this.userStates[userId].step = 'completed';
        this.saveData();
        
        // بررسی نقش کاربر بر اساس شماره تلفن
        const phoneNumber = this.userStates[userId].data.phone;
        const userRole = await this.checkUserRole(phoneNumber);
        
        // تعیین متن نقش
        let roleText = 'قرآن‌آموز';
        if (userRole === 'coach') {
            roleText = 'مربی';
        } else if (userRole === 'assistant') {
            roleText = 'کمک مربی';
        }
        
        const welcomeText = `📖 ${roleText} ${firstName} خوش‌آمدی`;
        
        const keyboard = {
            keyboard: [
                ['شروع', 'نقش', 'ربات', 'خروج']
            ],
            resize_keyboard: true
        };
        
        ctx.reply(welcomeText, { reply_markup: keyboard });
    }

    // متد مورد نیاز برای polling
    async handleStartCommand(chatId, userId, contact = null) {
        console.log(`🔍 [15REG] handleStartCommand فراخوانی شد`);
        console.log(`🔍 [15REG] chatId: ${chatId}, userId: ${userId}`);
        
        // ساخت ctx مصنوعی برای compatibility
        const ctx = {
            from: { 
                id: parseInt(userId),
                first_name: 'کاربر'  // اضافه کردن first_name پیش‌فرض
            },
            chat: { id: parseInt(chatId) },
            message: contact ? { contact } : {},  // اضافه کردن contact اگر وجود دارد
            reply: async (text, options = {}) => {
                try {
                    console.log(`📤 [15REG] ارسال پیام به ${chatId}: ${text}`);
                    
                    if (options && options.reply_markup) {
                        // ارسال با keyboard
                        await sendMessage(parseInt(chatId), text, options.reply_markup);
                        console.log(`✅ [15REG] پیام با keyboard ارسال شد`);
                    } else {
                        // ارسال بدون keyboard
                        await sendMessage(parseInt(chatId), text);
                        console.log(`✅ [15REG] پیام بدون keyboard ارسال شد`);
                    }
                } catch (error) {
                    console.error(`❌ [15REG] خطا در ارسال پیام:`, error.message);
                }
            }
        };
        
        // اگر contact وجود دارد، مستقیماً پردازش کن
        if (contact) {
            console.log(`📱 [15REG] Contact در handleStartCommand پردازش می‌شود`);
            await this.handleContact(ctx, contact);
            return true;
        }
        
        // ادامه معمول
        this.start(ctx);
        return true;
    }
}

module.exports = RegistrationModule;
