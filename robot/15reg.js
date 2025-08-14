


const fs = require('fs');
const path = require('path');
const { sendMessage } = require('./4bale');
const { USER_ACCESS_CONFIG } = require('./3config');

class RegistrationModule {
    constructor() {
        this.dataFile = path.join(__dirname, 'data', 'smart_registration.json');
        this.userStates = {};
        this.loadData();
        
        // اضافه کردن ماژول مدیریت کمک مربی
        const AssistantManagerModule = require('./assistant_manager');
        this.assistantManager = new AssistantManagerModule();
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

    // بررسی وضعیت ثبت‌نام کاربر
    isUserRegistered(userId) {
        return this.userStates[userId] && this.userStates[userId].step === 'completed';
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
        if (this.userStates[userId] && this.userStates[userId].step === 'completed') {
            // کاربر قبلاً ثبت‌نام شده - نمایش کیبرد متناسب با نقش
            console.log(`✅ [15REG] کاربر ${userId} قبلاً ثبت‌نام شده، نمایش کیبرد نقش`);
            this.showRoleBasedKeyboard(ctx);
        } else if (this.userStates[userId] && this.userStates[userId].step !== 'completed') {
            // کاربر در حال ثبت‌نام است
            console.log(`🔄 [15REG] ادامه ثبت‌نام برای کاربر ${userId} در مرحله: ${this.userStates[userId].step}`);
            this.continueRegistration(ctx);
        } else {
            // کاربر جدید
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
    async continueRegistration(ctx) {
        const userId = ctx.from.id;
        const userState = this.userStates[userId];
        
        console.log(`🔍 [15REG] ادامه ثبت‌نام برای کاربر ${userId} در مرحله: ${userState.step}`);
        
        if (userState.step === 'phone') {
            ctx.reply('📱 لطفاً شماره تلفن خود را ارسال کنید:');
            this.showContactButton(ctx);
        } else if (userState.step === 'profile') {
            // 🔥 مرحله profile - نمایش پروفایل و ادامه
            console.log(`🔍 [15REG] کاربر در مرحله profile، نمایش پروفایل`);
            this.showProfileAndContinue(ctx);
        } else if (userState.step === 'full_name') {
            // 🔥 شرط جدید: اگر مربی است و شماره دارد، مستقیماً پنل
            const userData = userState.data;
            if (userData && userData.phone) {
                console.log(`🔍 [15REG] بررسی نقش برای شماره موجود: ${userData.phone}`);
                
                // اگر شماره "مربی" است، از شماره واقعی استفاده کن
                let phoneToCheck = userData.phone;
                if (userData.phone === "مربی") {
                    // 🔥 شماره واقعی را از ورکشاپ پیدا کن
                    phoneToCheck = await this.findRealPhoneForCoach();
                    console.log(`🔍 [15REG] شماره واقعی پیدا شد: ${phoneToCheck}`);
                    
                    // 🔥 شماره واقعی را در userStates ذخیره کن
                    if (phoneToCheck && phoneToCheck !== "مربی") {
                        this.userStates[userId].data.phone = phoneToCheck;
                        this.saveData();
                        console.log(`✅ [15REG] شماره واقعی در userStates ذخیره شد: ${phoneToCheck}`);
                    }
                }
                
                if (phoneToCheck && phoneToCheck !== "مربی") {
                    // 🔥 حالا نقش را با شماره واقعی بررسی کن
                    const userRole = await this.checkUserRole(phoneToCheck);
                    console.log(`🔍 [15REG] نقش با شماره واقعی: ${userRole}`);
                    
                    if (userRole === 'coach' || userRole === 'assistant') {
                        // 🔥 نقش مربی تشخیص داده شد - تکمیل خودکار
                        this.userStates[userId].data.userRole = userRole;
                        this.checkAndCompleteCoachRegistration(ctx);
                        return;
                    }
                }
            }
            
            // ادامه معمول
            ctx.reply('👤 لطفاً نام و فامیل خود را وارد کنید:');
        } else {
            console.log(`⚠️ [15REG] مرحله ناشناخته: ${userState.step}`);
            ctx.reply('❌ خطا در ادامه ثبت‌نام. لطفاً دوباره تلاش کنید.');
            // ریست کردن و شروع مجدد
            delete this.userStates[userId];
            this.saveData();
            this.showWelcome(ctx);
        }
    }
    
    // 🔥 متد جدید: بررسی و تکمیل ثبت‌نام مربی
    async checkAndCompleteCoachRegistration(ctx) {
        const userId = ctx.from.id;
        const userData = this.userStates[userId]?.data;
        
        if (!userData || !userData.phone) {
            console.log(`❌ [15REG] اطلاعات کاربر ناقص`);
            return;
        }
        
        // 🔥 اگر نقش ذخیره نشده، دوباره شناسایی کن
        let userRole = userData.userRole;
        if (!userRole) {
            console.log(`🔍 [15REG] نقش ذخیره نشده، شناسایی مجدد...`);
            userRole = await this.checkUserRole(userData.phone);
            this.userStates[userId].data.userRole = userRole;
            this.saveData();
            console.log(`✅ [15REG] نقش جدید ذخیره شد: ${userRole}`);
        }
        
        console.log(`🔍 [15REG] نقش کاربر: ${userRole}`);
        
        if (userRole === 'coach' || userRole === 'assistant') {
            // 🔥 مربی یا کمک مربی - استفاده از نام ورکشاپ
            const workshopName = await this.getWorkshopName(userData.phone);
            const firstName = workshopName || 'مربی';
            
            console.log(`✅ [15REG] تکمیل خودکار ثبت‌نام برای ${userRole} با نام: ${firstName}`);
            
            // تکمیل اطلاعات
            this.userStates[userId].data.firstName = firstName;
            this.userStates[userId].data.fullName = workshopName || 'مربی';
            this.userStates[userId].step = 'completed';
            this.saveData();
            
            const roleText = userRole === 'coach' ? 'مربی' : 'کمک مربی';
            
            const welcomeText = `👨‍🏫 خوش‌آمدی ${roleText} ${firstName}
پنل ${roleText} فعال شد`;
            
            // ساخت کیبرد متناسب با نقش
            let keyboardRows;
            if (userRole === 'coach') {
                keyboardRows = [['شروع', 'مربی', 'ربات', 'خروج']];
            } else {
                keyboardRows = [['شروع', 'کمک مربی', 'ربات', 'خروج']];
            }
            
            // اضافه کردن دکمه ریست اگر مجاز باشد
            if (USER_ACCESS_CONFIG.allowUserReset === 1) {
                keyboardRows.push(['ریست']);
                console.log(`✅ [15REG] دکمه ریست اضافه شد (allowUserReset: 1)`);
            } else {
                console.log(`⚠️ [15REG] دکمه ریست نمایش داده نمی‌شود (allowUserReset: 0)`);
            }
            
            const keyboard = {
                keyboard: keyboardRows,
                resize_keyboard: true
            };
            
            ctx.reply(welcomeText, { reply_markup: keyboard });
            
        } else {
            // قرآن‌آموز - ادامه ثبت‌نام
            console.log(`✅ [15REG] ادامه ثبت‌نام برای قرآن‌آموز`);
            ctx.reply('👤 لطفاً نام و فامیل خود را وارد کنید:');
        }
    }

    // 🔥 متد جدید: نمایش پروفایل و ادامه
    async showProfileAndContinue(ctx) {
        const userId = ctx.from.id;
        const userData = this.userStates[userId]?.data;
        
        if (!userData || !userData.phone) {
            ctx.reply('❌ اطلاعات کاربر ناقص است. لطفاً دوباره تلاش کنید.');
            return;
        }
        
        // 🔥 استفاده از نقش ذخیره شده به جای شناسایی مجدد
        const userRole = userData.userRole;
        if (!userRole) {
            console.log(`❌ [15REG] نقش کاربر ذخیره نشده`);
            return;
        }
        
        console.log(`🔍 [15REG] نقش کاربر از حافظه: ${userRole}`);
        
        if (userRole === 'coach' || userRole === 'assistant') {
            // مربی یا کمک مربی - تکمیل ثبت‌نام
            console.log(`✅ [15REG] تکمیل ثبت‌نام برای ${userRole}`);
            this.userStates[userId].step = 'completed';
            this.saveData();
            
            const roleText = userRole === 'coach' ? 'مربی' : 'کمک مربی';
            const firstName = userData.firstName || 'کاربر';
            
            const welcomeText = `👨‍🏫 خوش‌آمدی ${roleText} ${firstName}
پنل ${roleText} فعال شد`;
            
            // ساخت کیبرد متناسب با نقش
            let keyboardRows;
            if (userRole === 'coach') {
                keyboardRows = [['شروع', 'مربی', 'ربات', 'خروج']];
            } else {
                keyboardRows = [['شروع', 'کمک مربی', 'ربات', 'خروج']];
            }
            
            // اضافه کردن دکمه ریست اگر مجاز باشد
            if (USER_ACCESS_CONFIG.allowUserReset === 1) {
                keyboardRows.push(['ریست']);
                console.log(`✅ [15REG] دکمه ریست اضافه شد (allowUserReset: 1)`);
            } else {
                console.log(`⚠️ [15REG] دکمه ریست نمایش داده نمی‌شود (allowUserReset: 0)`);
            }
            
            const keyboard = {
                keyboard: keyboardRows,
                resize_keyboard: true
            };
            
            ctx.reply(welcomeText, { reply_markup: keyboard });
            
        } else {
            // قرآن‌آموز - ادامه ثبت‌نام
            console.log(`✅ [15REG] ادامه ثبت‌نام برای قرآن‌آموز`);
            this.userStates[userId].step = 'full_name';
            this.saveData();
            ctx.reply('👤 لطفاً نام و فامیل خود را وارد کنید:');
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
        
        // اگر دکمه ریست فشرده شد
        if (messageText === 'ریست' && USER_ACCESS_CONFIG.allowUserReset === 1) {
            console.log(`🔄 [15REG] دکمه ریست فشرده شد`);
            await this.handleReset(artificialCtx);
            return true;
        }
        
        // 🔥 کنترل نقش‌ها - اولویت با این ماژول
        if (messageText === 'ربات' || messageText === '/ربات') {
            console.log(`🤖 [15REG] دکمه ربات فشرده شد`);
            await this.handleRobotButton(artificialCtx);
            return true;
        }
        
        if (messageText === 'قرآن‌آموز' || messageText === 'قرآن آموز') {
            console.log(`📖 [15REG] دکمه قرآن‌آموز فشرده شد`);
            await this.handleQuranStudentButton(artificialCtx);
            return true;
        }
        
        if (messageText === 'مربی') {
            console.log(`👨‍🏫 [15REG] دکمه مربی فشرده شد`);
            await this.handleCoachButton(artificialCtx);
            return true;
        }
        
        if (messageText === 'کمک مربی') {
            console.log(`👨‍🏫 [15REG] دکمه کمک مربی فشرده شد`);
            await this.handleAssistantButton(artificialCtx);
            return true;
        }
        
        // اگر دکمه شروع فشرده شد
        if (messageText === 'شروع' || messageText === '/start' || messageText === '/شروع') {
            console.log(`🚀 [15REG] دکمه شروع فشرده شد`);
            await this.handleStartButton(artificialCtx);
            return true;
        }
        
        // اگر دکمه خروج فشرده شد
        if (messageText === 'خروج' || messageText === '/خروج') {
            console.log(`👋 [15REG] دکمه خروج فشرده شد`);
            await this.handleExitButton(artificialCtx);
            return true;
        }
        
        // پردازش پیام‌های متنی برای مدیریت کمک مربی
        if (this.assistantManager) {
            const assistantResult = await this.assistantManager.handleMessage(ctx);
            if (assistantResult) {
                console.log(`✅ [15REG] پیام در ماژول مدیریت کمک مربی پردازش شد`);
                
                // اگر نتیجه شامل text و keyboard است، پیام جدید ارسال کن
                if (assistantResult.text && assistantResult.keyboard) {
                    const { sendMessageWithInlineKeyboard } = require('./4bale');
                    await sendMessageWithInlineKeyboard(ctx.chat.id, assistantResult.text, assistantResult.keyboard);
                }
                
                return true;
            }
        }
        
        console.log(`❌ [15REG] پیام پردازش نشد: ${messageText}`);
        return false;
    }

    // پردازش شماره تلفن (ورود دستی)
    async handlePhoneNumber(ctx, phoneNumber) {
        const userId = ctx.from.id;
        
        console.log(`📱 [15REG] پردازش شماره تلفن: ${phoneNumber}`);
        
        // ذخیره شماره تلفن
        this.userStates[userId].data.phone = phoneNumber;
        this.userStates[userId].step = 'profile';
        this.saveData();
        
        console.log(`✅ [15REG] شماره تلفن ذخیره شد: ${phoneNumber}`);
        console.log(`✅ [15REG] مرحله تغییر کرد به: profile`);
        
        // بررسی نقش کاربر (اینجا باید با سیستم نقش‌ها ادغام شود)
        const userRole = await this.checkUserRole(phoneNumber);
        console.log(`🔍 [15REG] نقش تشخیص داده شد: ${userRole}`);
        
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
        
        // 🔥 یک بار نقش را شناسایی و ذخیره کن
        const userRole = await this.checkUserRole(phoneNumber);
        console.log(`🔍 [15REG] نقش تشخیص داده شد: ${userRole}`);
        
        // ذخیره نقش در userStates
        this.userStates[userId].data.userRole = userRole;
        
        if (userRole === 'coach' || userRole === 'assistant') {
            // 🔥 مربی یا کمک مربی - استفاده از نام ورکشاپ
            const workshopName = await this.getWorkshopName(phoneNumber);
            const firstName = workshopName || 'مربی';
            
            console.log(`👤 [15REG] نام ورکشاپ: "${workshopName}"`);
            console.log(`👤 [15REG] اسم کوچک: "${firstName}"`);
            
            // ذخیره کامل اطلاعات کاربر
            this.userStates[userId].data = {
                phone: phoneNumber,  // شماره تلفن واقعی
                fullName: workshopName || 'مربی',
                firstName: firstName,
                lastName: '',
                userRole: userRole  // 🔥 نقش ذخیره شد
            };
            this.userStates[userId].step = 'completed';  // 🔥 مستقیماً تکمیل
            this.saveData();
            
            console.log(`✅ [15REG] اطلاعات مربی ذخیره شد و ثبت‌نام تکمیل شد`);
            
            // نمایش پنل مربی
            await this.handleCoachWelcome(ctx, userRole, firstName);
            
        } else {
            // قرآن‌آموز - ادامه ثبت‌نام
            const fullName = contact.first_name || ctx.from.first_name || 'کاربر';
            
            // تقسیم نام به بخش‌های مختلف
            const nameParts = fullName.split(/[\s\u200C\u200D]+/).filter(part => part.length > 0);
            const firstName = nameParts.length > 0 ? nameParts[0] : fullName;
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            
            console.log(`👤 [15REG] نام کامل: "${fullName}"`);
            console.log(`👤 [15REG] نام‌های تقسیم شده:`, nameParts);
            console.log(`👤 [15REG] اسم کوچک: "${firstName}"`);
            console.log(`👤 [15REG] نام خانوادگی: "${lastName}"`);
            
            // ذخیره کامل اطلاعات کاربر
            this.userStates[userId].data = {
                phone: phoneNumber,  // شماره تلفن واقعی
                fullName: fullName,
                firstName: firstName,
                lastName: lastName,
                userRole: userRole  // 🔥 نقش ذخیره شد
            };
            this.userStates[userId].step = 'full_name';  // 🔥 ادامه ثبت‌نام
            this.saveData();
            
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
                    // بررسی مربی
                    if (workshop.instructor_phone && phoneNumber.includes(workshop.instructor_phone)) {
                        console.log(`✅ [15REG] نقش تشخیص داده شد: مربی (کارگاه ${workshopId})`);
                        return 'coach';  // مربی
                    }
                    
                    // بررسی کمک مربی (فعلاً وجود ندارد)
                    if (workshop.assistant_phone && phoneNumber.includes(workshop.assistant_phone)) {
                        console.log(`✅ [15REG] نقش تشخیص داده شد: کمک مربی (کارگاه ${workshopId})`);
                        return 'assistant';  // کمک مربی
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
    
    // 🔥 متد جدید: دریافت نام ورکشاپ
    async getWorkshopName(phoneNumber) {
        console.log(`🔍 [15REG] دریافت نام ورکشاپ برای شماره: ${phoneNumber}`);
        
        try {
            const workshopsFile = path.join(__dirname, 'data', 'workshops.json');
            if (fs.existsSync(workshopsFile)) {
                const workshopsData = JSON.parse(fs.readFileSync(workshopsFile, 'utf8'));
                
                for (const [workshopId, workshop] of Object.entries(workshopsData)) {
                    if (workshop.instructor_phone && phoneNumber.includes(workshop.instructor_phone)) {
                        console.log(`✅ [15REG] نام ورکشاپ یافت شد: ${workshop.instructor_name}`);
                        return workshop.instructor_name;
                    }
                }
            }
            return null;
        } catch (error) {
            console.error(`❌ [15REG] خطا در دریافت نام ورکشاپ:`, error.message);
            return null;
        }
    }
    
    // 🔥 متد جدید: پیدا کردن شماره واقعی برای مربی
    async findRealPhoneForCoach() {
        console.log(`🔍 [15REG] جستجوی شماره واقعی برای مربی`);
        
        try {
            const workshopsFile = path.join(__dirname, 'data', 'workshops.json');
            if (fs.existsSync(workshopsFile)) {
                const workshopsData = JSON.parse(fs.readFileSync(workshopsFile, 'utf8'));
                
                // اولین شماره مربی که پیدا شود
                for (const [workshopId, workshop] of Object.entries(workshopsData)) {
                    if (workshop.instructor_phone && workshop.instructor_phone !== "0") {
                        console.log(`✅ [15REG] شماره واقعی مربی یافت شد: ${workshop.instructor_phone}`);
                        return workshop.instructor_phone;
                    }
                }
            }
            return null;
        } catch (error) {
            console.error(`❌ [15REG] خطا در پیدا کردن شماره واقعی:`, error.message);
            return null;
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
        
        // ساخت کیبرد متناسب با نقش
        let keyboardRows;
        if (role === 'coach') {
            keyboardRows = [['شروع', 'مربی', 'ربات', 'خروج']];
        } else {
            keyboardRows = [['شروع', 'کمک مربی', 'ربات', 'خروج']];
        }
        
        // اضافه کردن دکمه ریست اگر مجاز باشد
        if (USER_ACCESS_CONFIG.allowUserReset === 1) {
            keyboardRows.push(['ریست']);
            console.log(`✅ [15REG] دکمه ریست اضافه شد (allowUserReset: 1)`);
        } else {
            console.log(`⚠️ [15REG] دکمه ریست نمایش داده نمی‌شود (allowUserReset: 0)`);
        }
        
        const keyboard = {
            keyboard: keyboardRows,
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
        
        // استخراج اولین اسم (قبل از فاصله) - اصلاح شده
        const nameParts = fullName.split(/[\s\u200C\u200D]+/).filter(part => part.length > 0);
        const firstName = nameParts.length > 0 ? nameParts[0] : fullName;
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        console.log(`👤 [15REG] نام کامل: "${fullName}"`);
        console.log(`👤 [15REG] نام‌های تقسیم شده:`, nameParts);
        console.log(`👤 [15REG] اسم کوچک: "${firstName}"`);
        console.log(`👤 [15REG] نام خانوادگی: "${lastName}"`);
        
        // ذخیره کامل اطلاعات کاربر
        this.userStates[userId].data.fullName = fullName;
        this.userStates[userId].data.firstName = firstName;
        this.userStates[userId].data.lastName = lastName;
        this.userStates[userId].step = 'completed';
        this.saveData();
        
        // 🔥 استفاده از نقش ذخیره شده به جای شناسایی مجدد
        const userRole = this.userStates[userId].data.userRole;
        if (!userRole) {
            console.log(`❌ [15REG] نقش کاربر ذخیره نشده`);
            return;
        }
        
        // تعیین متن نقش
        let roleText = 'قرآن‌آموز';
        if (userRole === 'coach') {
            roleText = 'مربی';
        } else if (userRole === 'assistant') {
            roleText = 'کمک مربی';
        }
        
        const welcomeText = `📖 ${roleText} ${firstName} خوش‌آمدی`;
        
        // ساخت کیبرد متناسب با نقش
        const keyboardRows = [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']];
        
        // اضافه کردن دکمه ریست اگر مجاز باشد
        if (USER_ACCESS_CONFIG.allowUserReset === 1) {
            keyboardRows.push(['ریست']);
            console.log(`✅ [15REG] دکمه ریست اضافه شد (allowUserReset: 1)`);
        } else {
            console.log(`⚠️ [15REG] دکمه ریست نمایش داده نمی‌شود (allowUserReset: 0)`);
        }
        
        const keyboard = {
            keyboard: keyboardRows,
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
        
        // 🔥 بررسی وضعیت کاربر و حل مشکل مرحله profile
        const userState = this.userStates[userId];
        if (userState && userState.step === 'profile') {
            console.log(`🔧 [15REG] کاربر در مرحله profile گیر کرده، حل مشکل...`);
            await this.fixProfileStage(ctx);
            return true;
        }
        
        // ادامه معمول
        this.start(ctx);
        return true;
    }
    
    // 🔥 متد جدید: حل مشکل مرحله profile
    async fixProfileStage(ctx) {
        const userId = ctx.from.id;
        const userData = this.userStates[userId]?.data;
        
        if (!userData || !userData.phone) {
            console.log(`❌ [15REG] اطلاعات کاربر ناقص، ریست کردن...`);
            delete this.userStates[userId];
            this.saveData();
            this.showWelcome(ctx);
            return;
        }
        
        // 🔥 استفاده از نقش ذخیره شده به جای شناسایی مجدد
        const userRole = userData.userRole;
        if (!userRole) {
            console.log(`❌ [15REG] نقش کاربر ذخیره نشده`);
            return;
        }
        
        console.log(`🔍 [15REG] نقش کاربر از حافظه: ${userRole}`);
        
        if (userRole === 'coach' || userRole === 'assistant') {
            // 🔥 مربی یا کمک مربی - استفاده از نام ورکشاپ
            const workshopName = await this.getWorkshopName(userData.phone);
            const firstName = workshopName || 'مربی';
            
            console.log(`✅ [15REG] تکمیل ثبت‌نام برای ${userRole} با نام: ${firstName}`);
            
            // تکمیل اطلاعات
            this.userStates[userId].data.firstName = firstName;
            this.userStates[userId].data.fullName = workshopName || 'مربی';
            this.userStates[userId].step = 'completed';
            this.saveData();
            
            const roleText = userRole === 'coach' ? 'مربی' : 'کمک مربی';
            
            const welcomeText = `👨‍🏫 خوش‌آمدی ${roleText} ${firstName}
پنل ${roleText} فعال شد`;
            
            // ساخت کیبرد متناسب با نقش
            let keyboardRows;
            if (userRole === 'coach') {
                keyboardRows = [['شروع', 'مربی', 'ربات', 'خروج']];
            } else {
                keyboardRows = [['شروع', 'کمک مربی', 'ربات', 'خروج']];
            }
            
            // اضافه کردن دکمه ریست اگر مجاز باشد
            if (USER_ACCESS_CONFIG.allowUserReset === 1) {
                keyboardRows.push(['ریست']);
                console.log(`✅ [15REG] دکمه ریست اضافه شد (allowUserReset: 1)`);
            } else {
                console.log(`⚠️ [15REG] دکمه ریست نمایش داده نمی‌شود (allowUserReset: 0)`);
            }
            
            const keyboard = {
                keyboard: keyboardRows,
                resize_keyboard: true
            };
            
            ctx.reply(welcomeText, { reply_markup: keyboard });
            
        } else {
            // قرآن‌آموز - ادامه ثبت‌نام
            console.log(`✅ [15REG] ادامه ثبت‌نام برای قرآن‌آموز`);
            this.userStates[userId].step = 'full_name';
            this.saveData();
            ctx.reply('👤 لطفاً نام و فامیل خود را وارد کنید:');
        }
    }
    
    // پردازش دکمه ریست
    async handleReset(ctx) {
        const userId = ctx.from.id;
        
        console.log(`🔄 [15REG] درخواست ریست از کاربر ${userId}`);
        
        // پاک کردن تمام اطلاعات کاربر
        delete this.userStates[userId];
        this.saveData();
        
        console.log(`✅ [15REG] اطلاعات کاربر ${userId} ریست شد`);
        
        // شروع مجدد
        this.start(ctx);
    }
    
    // نمایش کیبرد متناسب با نقش کاربر
    async showRoleBasedKeyboard(ctx) {
        const userId = ctx.from.id;
        const userData = this.userStates[userId]?.data;
        
        if (!userData || !userData.phone) {
            console.log(`❌ [15REG] اطلاعات کاربر ${userId} ناقص است`);
            this.showWelcome(ctx);
            return;
        }
        
        // 🔥 استفاده از نقش ذخیره شده به جای شناسایی مجدد
        const userRole = userData.userRole;
        if (!userRole) {
            console.log(`❌ [15REG] نقش کاربر ذخیره نشده`);
            return;
        }
        
        const firstName = userData.firstName || 'کاربر';
        
        console.log(`🔍 [15REG] نقش کاربر از حافظه: ${userRole}`);
        console.log(`🔍 [15REG] شماره تلفن: ${userData.phone}`);
        
        // تعیین متن نقش و کیبرد
        let roleText, keyboardRows;
        
        if (userRole === 'coach') {
            roleText = 'مربی';
            keyboardRows = [['شروع', 'مربی', 'ربات', 'خروج']];
        } else if (userRole === 'assistant') {
            roleText = 'کمک مربی';
            keyboardRows = [['شروع', 'کمک مربی', 'ربات', 'خروج']];
        } else {
            roleText = 'قرآن‌آموز';
            keyboardRows = [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']];
        }
        
        // اضافه کردن دکمه ریست اگر مجاز باشد
        if (USER_ACCESS_CONFIG.allowUserReset === 1) {
            keyboardRows.push(['ریست']);
            console.log(`✅ [15REG] دکمه ریست اضافه شد (allowUserReset: 1)`);
        } else {
            console.log(`⚠️ [15REG] دکمه ریست نمایش داده نمی‌شود (allowUserReset: 0)`);
        }
        
        const keyboard = {
            keyboard: keyboardRows,
            resize_keyboard: true
        };
        
        const welcomeText = `🎉 ${roleText} ${firstName} خوش‌آمدی!`;
        ctx.reply(welcomeText, { reply_markup: keyboard });
        
        console.log(`✅ [15REG] کیبرد نقش ${roleText} برای کاربر ${userId} نمایش داده شد`);
    }
    
    // پردازش دکمه قرآن‌آموز
    async handleQuranStudentButton(ctx) {
        const userId = ctx.from.id;
        const userData = this.userStates[userId]?.data;
        
        if (!userData || !userData.phone) {
            ctx.reply('❌ اطلاعات کاربر یافت نشد');
            return;
        }
        
        const welcomeText = `📖 **پنل قرآن‌آموز**

📋 **گزینه‌های موجود:**
• 🤖 معرفی ربات
• 📝 ثبت نام

💡 **نکات مهم:**
• می‌توانید هر ماه ثبت‌نام کنید
• در نظر سنجی مدرسه شرکت کنید
• از قابلیت‌های ربات استفاده کنید

👆 **لطفاً گزینه مورد نظر را انتخاب کنید:**`;
        
        const keyboard = {
            keyboard: [['شروع', 'ربات', 'مدرسه', 'خروج']],
            resize_keyboard: true
        };
        
        ctx.reply(welcomeText, { reply_markup: keyboard });
        console.log(`✅ [15REG] پنل قرآن‌آموز برای کاربر ${userId} نمایش داده شد`);
    }
    
    // پردازش دکمه مربی
    async handleCoachButton(ctx) {
        const userId = ctx.from.id;
        const userData = this.userStates[userId]?.data;
        
        if (!userData || !userData.phone) {
            ctx.reply('❌ اطلاعات کاربر یافت نشد');
            return;
        }
        
        const welcomeText = `👨‍🏫 **پنل مربی**

📋 **گزینه‌های موجود:**
• 🎯 مدیریت کارگاه
• 👥 مدیریت دانش‌آموزان
• 📊 گزارش‌گیری
• 👨‍🏫 مدیریت کمک مربی

👆 **لطفاً گزینه مورد نظر را انتخاب کنید:**`;
        
        // کیبرد معمولی (موجود)
        const keyboard = {
            keyboard: [['شروع', 'مربی', 'ربات', 'خروج']],
            resize_keyboard: true
        };
        
        // ارسال پیام با کیبرد معمولی
        ctx.reply(welcomeText, { reply_markup: keyboard });
        
        // کیبرد اینلاین برای گزینه‌های اضافی
        const { sendMessageWithInlineKeyboard } = require('./4bale');
        
        // ارسال پیام با کیبرد اینلاین
        await sendMessageWithInlineKeyboard(
            ctx.chat.id,
            '👆 **گزینه‌های اضافی:**',
            [
                [{ text: '👨‍🏫 مدیریت کمک مربی', callback_data: 'manage_assistant' }],
                [{ text: '🔙 بازگشت', callback_data: 'back' }]
            ]
        );
        
        // اضافه کردن ماژول مدیریت کمک مربی
        const AssistantManagerModule = require('./assistant_manager');
        this.assistantManager = new AssistantManagerModule();
        console.log(`✅ [15REG] پنل مربی برای کاربر ${userId} نمایش داده شد`);
    }
    
    // پردازش callback های کیبرد اینلاین
    async handleCallback(callback) {
        const chatId = callback.message.chat.id;
        const userId = callback.from.id;
        const messageId = callback.message.message_id;
        const data = callback.data;
        const callbackQueryId = callback.id;
        
        console.log(`🔍 [15REG] Callback received: ${data}`);
        
        // پردازش callback های مدیریت کمک مربی
        if (data === 'manage_assistant') {
            console.log(`👨‍🏫 [15REG] مدیریت کمک مربی درخواست شد`);
            return await this.handleManageAssistant(chatId, userId, callbackQueryId);
        } else if (data === 'back') {
            console.log(`🔙 [15REG] بازگشت درخواست شد`);
            return await this.handleBackToMain(chatId, userId, callbackQueryId);
        } else if (data.startsWith('assistant_')) {
            // ارسال callback به ماژول مدیریت کمک مربی
            console.log(`👨‍🏫 [15REG] Callback مدیریت کمک مربی: ${data}`);
            const result = await this.assistantManager.handleCallback(callback);
            
            // اگر نتیجه وجود دارد، پیام جدید ارسال کن
            if (result && result.text && result.keyboard) {
                const { sendMessageWithInlineKeyboard } = require('./4bale');
                await sendMessageWithInlineKeyboard(chatId, result.text, result.keyboard);
                return true;
            }
            
            return result;
        }
        
        return false;
    }
    
    // مدیریت کمک مربی
    async handleManageAssistant(chatId, userId, callbackQueryId) {
        console.log(`👨‍🏫 [15REG] نمایش پنل مدیریت کمک مربی`);
        
        try {
            const result = await this.assistantManager.showAssistantManagement(chatId, userId);
            if (result && result.text && result.keyboard) {
                const { sendMessageWithInlineKeyboard } = require('./4bale');
                await sendMessageWithInlineKeyboard(chatId, result.text, result.keyboard);
                return true;
            }
        } catch (error) {
            console.error(`❌ [15REG] خطا در نمایش مدیریت کمک مربی:`, error);
        }
        
        return false;
    }
    
    // بازگشت به منوی اصلی
    async handleBackToMain(chatId, userId, callbackQueryId) {
        console.log(`🔙 [15REG] بازگشت به منوی اصلی`);
        
        // پاک کردن وضعیت کاربر در ماژول مدیریت کمک مربی
        if (this.assistantManager) {
            delete this.assistantManager.userStates[userId];
        }
        
        const text = '🔙 بازگشت به منوی اصلی';
        const keyboard = [[{ text: '🔙 بازگشت', callback_data: 'back' }]];
        
        const { sendMessageWithInlineKeyboard } = require('./4bale');
        await sendMessageWithInlineKeyboard(chatId, text, keyboard);
        
        return true;
    }
    
    // پردازش دکمه کمک مربی
    async handleAssistantButton(ctx) {
        const userId = ctx.from.id;
        const userData = this.userStates[userId]?.data;
        
        if (!userData || !userData.phone) {
            ctx.reply('❌ اطلاعات کاربر یافت نشد');
            return;
        }
        
        const welcomeText = `👨‍🏫 **پنل کمک مربی**

📋 **گزینه‌های موجود:**
• 🎯 کمک در کارگاه
• 📊 پشتیبانی دانش‌آموزان
• 📊 گزارش‌گیری

👆 **لطفاً گزینه مورد نظر را انتخاب کنید:**`;
        
        const keyboard = {
            keyboard: [['شروع', 'کمک مربی', 'ربات', 'خروج']],
            resize_keyboard: true
        };
        
        ctx.reply(welcomeText, { reply_markup: keyboard });
        console.log(`✅ [15REG] پنل کمک مربی برای کاربر ${userId} نمایش داده شد`);
    }
    
    // 🔥 متد جدید: پردازش دکمه ربات
    async handleRobotButton(ctx) {
        const userId = ctx.from.id;
        const userData = this.userStates[userId]?.data;
        
        if (!userData || !userData.phone) {
            ctx.reply('❌ اطلاعات کاربر یافت نشد');
            return;
        }
        
        // 🔥 استفاده از نقش ذخیره شده به جای شناسایی مجدد
        const userRole = userData.userRole;
        if (!userRole) {
            console.log(`❌ [15REG] نقش کاربر ذخیره نشده`);
            return;
        }
        
        console.log(`🔍 [15REG] نقش کاربر از حافظه: ${userRole}`);
        console.log(`🔍 [15REG] شماره تلفن: ${userData.phone}`);
        
        const robotText = `🤖 **معرفی ربات قرآنی هوشمند**

📚 **قابلیت‌های اصلی:**
• 👥 حضور و غیاب
• 📊 ارزیابی و نظر سنجی
• 🏫 مدیریت گروه‌ها
• 📝 ثبت‌نام ماهانه

🎯 **این ربات برای کمک به آموزش قرآن کریم طراحی شده است**

⏰ ${new Date().toLocaleDateString('fa-IR')}`;
        
        // نمایش کیبرد متناسب با نقش کاربر
        let keyboardRows;
        
        if (userRole === 'coach') {
            keyboardRows = [['شروع', 'مربی', 'ربات', 'خروج']];
        } else if (userRole === 'assistant') {
            keyboardRows = [['شروع', 'کمک مربی', 'ربات', 'خروج']];
        } else {
            keyboardRows = [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']];
        }
        
        // اضافه کردن دکمه ریست اگر مجاز باشد
        if (USER_ACCESS_CONFIG.allowUserReset === 1) {
            keyboardRows.push(['ریست']);
        }
        
        const keyboard = {
            keyboard: keyboardRows,
            resize_keyboard: true
        };
        
        ctx.reply(robotText, { reply_markup: keyboard });
        console.log(`✅ [15REG] معرفی ربات برای کاربر ${userId} با نقش ${userRole} نمایش داده شد`);
    }
    
    // 🔥 متد جدید: پردازش دکمه شروع
    async handleStartButton(ctx) {
        const userId = ctx.from.id;
        const userData = this.userStates[userId]?.data;
        
        if (!userData || !userData.phone) {
            ctx.reply('❌ اطلاعات کاربر یافت نشد');
            return;
        }
        
        // 🔥 استفاده از نقش ذخیره شده به جای شناسایی مجدد
        const userRole = userData.userRole;
        if (!userRole) {
            console.log(`❌ [15REG] نقش کاربر ذخیره نشده`);
            return;
        }
        
        const firstName = userData.firstName || 'کاربر';
        
        console.log(`🔍 [15REG] نقش کاربر از حافظه: ${userRole}`);
        console.log(`🔍 [15REG] شماره تلفن: ${userData.phone}`);
        
        let roleText, keyboardRows;
        
        if (userRole === 'coach') {
            roleText = 'مربی';
            keyboardRows = [['شروع', 'مربی', 'ربات', 'خروج']];
        } else if (userRole === 'assistant') {
            roleText = 'کمک مربی';
            keyboardRows = [['شروع', 'کمک مربی', 'ربات', 'خروج']];
        } else {
            roleText = 'قرآن‌آموز';
            keyboardRows = [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']];
        }
        
        // اضافه کردن دکمه ریست اگر مجاز باشد
        if (USER_ACCESS_CONFIG.allowUserReset === 1) {
            keyboardRows.push(['ریست']);
        }
        
        const keyboard = {
            keyboard: keyboardRows,
            resize_keyboard: true
        };
        
        const welcomeText = `🎉 ${roleText} ${firstName} خوش‌آمدی!

📱 پنل ${roleText} فعال شد
⏰ ${new Date().toLocaleDateString('fa-IR')}`;
        
        ctx.reply(welcomeText, { reply_markup: keyboard });
        console.log(`✅ [15REG] پنل شروع برای کاربر ${userId} با نقش ${roleText} نمایش داده شد`);
    }
    
    // 🔥 متد جدید: پردازش دکمه خروج
    async handleExitButton(ctx) {
        const userId = ctx.from.id;
        const userData = this.userStates[userId]?.data;
        
        if (!userData || !userData.phone) {
            ctx.reply('❌ اطلاعات کاربر یافت نشد');
            return;
        }
        
        // 🔥 استفاده از نقش ذخیره شده به جای شناسایی مجدد
        const userRole = userData.userRole;
        if (!userRole) {
            console.log(`❌ [15REG] نقش کاربر ذخیره نشده`);
            return;
        }
        
        console.log(`🔍 [15REG] نقش کاربر از حافظه: ${userRole}`);
        
        let roleText;
        if (userRole === 'coach') {
            roleText = 'مربی';
        } else if (userRole === 'assistant') {
            roleText = 'کمک مربی';
        } else {
            roleText = 'قرآن‌آموز';
        }
        
        const exitText = `👋 پنل ${roleText} بسته شد

برای شروع مجدد، دکمه "شروع" را فشار دهید
⏰ ${new Date().toLocaleDateString('fa-IR')}`;
        
        // نمایش کیبرد ساده
        const keyboard = {
            keyboard: [['شروع']],
            resize_keyboard: true
        };
        
        ctx.reply(exitText, { reply_markup: keyboard });
        console.log(`✅ [15REG] پنل خروج برای کاربر ${userId} با نقش ${roleText} نمایش داده شد`);
    }
}

module.exports = RegistrationModule;