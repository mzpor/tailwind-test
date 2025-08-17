const fs = require('fs');
const path = require('path');
const { sendMessage, answerCallbackQuery } = require('./4bale');
const { USER_ACCESS_CONFIG, addUserToRole, MAIN_BUTTONS_CONFIG, getQuranStudentScenario } = require('./3config');

// اضافه کردن ماژول پرداخت
const PaymentModule = require('./16pay');

class RegistrationModule {
    constructor() {
        this.dataFile = path.join(__dirname, 'data', 'smart_registration.json');
        this.userStates = {};
        this.loadData();
        
        // اضافه کردن ماژول مدیریت کمک مربی
        const AssistantManagerModule = require('./assistant_manager');
        this.assistantManager = new AssistantManagerModule();
        
        // اضافه کردن ماژول پرداخت
        this.paymentModule = new PaymentModule();
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
        
        // 🔥 بررسی وضعیت کاربر
        if (this.userStates[userId] && this.userStates[userId].step === 'completed') {
            // کاربر قبلاً ثبت‌نام شده - نمایش کیبرد متناسب با نقش
            console.log(`✅ [15REG] کاربر ${userId} قبلاً ثبت‌نام شده، نمایش کیبرد نقش`);
            this.showRoleBasedKeyboard(ctx);
        } else {
            // 🔥 برای همه کاربران دیگر (جدید یا در حال ثبت‌نام)، همیشه از مرحله welcome شروع شود
            console.log(`🎉 [15REG] کاربر ${userId} در مرحله ${this.userStates[userId]?.step || 'جدید'}، شروع از مرحله welcome`);
            this.showWelcome(ctx);
        }
    }

    // نمایش خوش‌آمدگویی
    async showWelcome(ctx) {
        const welcomeText = `👋 به مدرسه تلاوت خوش آمدید!

برای ثبت‌نام در کلاس‌ها، روی دکمه زیر کلیک کنید. همچنین می‌توانید وضعیت حساب کاربری خود را مشاهده نمایید.`;
        
        const welcomeKeyboard = {
            keyboard: [
                [{ text: "📝 ثبت‌نام در مدرسه تلاوت" }],
                [{ text: "💎 حساب کاربری" }]
            ],
            resize_keyboard: true
        };
        
        // ارسال پیام خوش‌آمدگویی همراه با کیبرد
        ctx.reply(welcomeText, { 
            reply_markup: welcomeKeyboard 
        });
        
        // تنظیم وضعیت کاربر
        const userId = ctx.from.id;
        this.userStates[userId] = {
            step: 'welcome',
            data: {},
            timestamp: Date.now()
        };
        this.saveData();
    }
    
    // نمایش خوش‌آمدگویی سناریو 2
    async showScenario2Welcome(ctx) {
        const userId = ctx.from.id;
        
        // تغییر مرحله به انتظار برای نام در سناریو 2
        this.userStates[userId].step = 'scenario2_waiting_for_name';
        this.saveData();
        
        const welcomeText = `🎉 سناریو 2

لطفا نام و نام خانوادگی خود را وارد کنید(فقط حروف فارسی):`;
        
        // کیبرد شیشه‌ای برای سناریو 2
        const inlineKeyboard = {
            inline_keyboard: [
                [
                    { text: "انصراف", callback_data: "scenario2_cancel" },
                    { text: "بازگشت", callback_data: "scenario2_back" }
                ]
            ]
        };
        
        // کیبرد معمولی ثابت (مدرسه تلاوت + حساب کاربری)
        const mainKeyboard = {
            keyboard: [
                [{ text: "📝 مدرسه تلاوت" }],
                [{ text: "💎 حساب کاربری" }]
            ],
            resize_keyboard: true
        };
        
        // ارسال پیام با کیبرد شیشه‌ای و کیبرد معمولی
        ctx.reply(welcomeText, { 
            reply_markup: inlineKeyboard 
        });
        
        // ارسال کیبرد معمولی جداگانه
        ctx.reply("کیبرد اصلی:", { 
            reply_markup: mainKeyboard 
        });
        
        console.log(`✅ [15REG] سناریو 2 اجرا شد برای کاربر ${userId} - انتظار برای نام`);
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
        
        // 🔥 همیشه ابتدا از مرحله welcome شروع شود
        if (userState.step === 'welcome') {
            // کاربر در مرحله خوش‌آمدگویی - نمایش خوش‌آمدگویی کامل
            await this.showWelcome(ctx);
        } else if (userState.step === 'phone') {
            // 🔥 اگر کاربر در مرحله phone باشد، ابتدا باید خوش‌آمدگویی ببیند
            console.log(`📱 [15REG] کاربر در مرحله phone، اما ابتدا باید خوش‌آمدگویی ببیند`);
            this.userStates[userId].step = 'welcome';
            this.saveData();
            await this.showWelcome(ctx);
        } else if (userState.step === 'waiting_for_name') {
            // 🔥 مرحله انتظار برای نام - درخواست نام و فامیل
            console.log(`🔍 [15REG] کاربر در مرحله انتظار برای نام، درخواست نام و فامیل`);
            await this.handleQuranStudentRegistration(ctx);
        } else if (userState.step === 'profile') {
            // 🔥 مرحله profile - نمایش پروفایل و ادامه
            console.log(`🔍 [15REG] کاربر در مرحله profile، نمایش پروفایل`);
            this.showProfileAndContinue(ctx);
        } else if (userState.step === 'full_name') {
            // 🔥 بررسی معتبر بودن شماره تلفن
            const userData = userState.data;
            if (!userData || !userData.phone || !this.isValidPhoneNumber(userData.phone)) {
                console.log(`❌ [15REG] شماره تلفن نامعتبر در مرحله full_name: ${userData?.phone}`);
                // برگردون به مرحله phone
                this.userStates[userId].step = 'phone';
                this.saveData();
                await this.showWelcome(ctx);
                return;
            }
            
            // 🔥 شرط جدید: اگر مربی است و شماره دارد، مستقیماً پنل
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
                        
                        // 🔥 اضافه کردن خودکار به کانفیگ
                        try {
                            if (userRole === 'coach') {
                                addUserToRole('COACH', userId, 'مربی', phoneToCheck);
                                console.log(`✅ [15REG] کاربر ${userId} به عنوان مربی در کانفیگ اضافه شد`);
                            } else if (userRole === 'assistant') {
                                addUserToRole('ASSISTANT', userId, 'کمک مربی', phoneToCheck);
                                console.log(`✅ [15REG] کاربر ${userId} به عنوان کمک مربی در کانفیگ اضافه شد`);
                            }
                        } catch (error) {
                            console.error(`❌ [15REG] خطا در اضافه کردن به کانفیگ:`, error.message);
                        }
                        
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
            
            // 🔥 اضافه کردن خودکار به کانفیگ
            try {
                if (userRole === 'coach') {
                    addUserToRole('COACH', userId, firstName, userData.phone);
                    console.log(`✅ [15REG] کاربر ${userId} به عنوان مربی در کانفیگ اضافه شد`);
                } else if (userRole === 'assistant') {
                    addUserToRole('ASSISTANT', userId, firstName, userData.phone);
                    console.log(`✅ [15REG] کاربر ${userId} به عنوان کمک مربی در کانفیگ اضافه شد`);
                }
            } catch (error) {
                console.error(`❌ [15REG] خطا در اضافه کردن به کانفیگ:`, error.message);
            }
            
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
            
            // 🔥 اضافه کردن دکمه "تمایل به ثبت‌نام" برای کمک مربی
            if (userRole === 'assistant') {
                keyboardRows.push(['📝 تمایل به ثبت‌نام']);
                console.log(`✅ [15REG] دکمه "تمایل به ثبت‌نام" برای کمک مربی اضافه شد`);
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
            
            // 🔥 اضافه کردن دکمه "تمایل به ثبت‌نام" برای کمک مربی
            if (userRole === 'assistant') {
                keyboardRows.push(['📝 تمایل به ثبت‌نام']);
                console.log(`✅ [15REG] دکمه "تمایل به ثبت‌نام" برای کمک مربی اضافه شد`);
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
        // 🔥 سازگاری با ساختارهای مختلف: ctx از 5polling.js یا ctx معمولی
        let messageObj = ctx;
        let userId, messageText, contact, chatId;
        
        // بررسی ساختار msg از 5polling.js
        if (ctx && ctx.from && ctx.from.id && ctx.chat && ctx.chat.id) {
            // ساختار ctx معمولی
            messageObj = ctx;
            userId = ctx.from.id;
            messageText = ctx.text;
            contact = ctx.contact || null;
            chatId = parseInt(ctx.chat.id);
            console.log(`🔍 [15REG] ساختار ctx معمولی تشخیص داده شد`);
        } else if (ctx && ctx.from && ctx.from.id && ctx.chat && ctx.chat.id) {
            // ساختار msg از 5polling.js
            messageObj = ctx;
            userId = ctx.from.id;
            messageText = ctx.text;
            contact = ctx.contact || null;
            chatId = parseInt(ctx.chat.id);
            console.log(`🔍 [15REG] ساختار msg از 5polling.js تشخیص داده شد`);
        } else {
            console.log('❌ [15REG] ساختار پیام نامعتبر:', JSON.stringify(ctx, null, 2));
            return false;
        }
        
        console.log(`🔍 [15REG] پردازش پیام از کاربر ${userId}: ${messageText || (contact ? 'contact' : 'unknown')}`);
        
        // 🔥 دستورات شروع حالا در 5polling.js پردازش می‌شوند
        // اینجا فقط پیام‌های عادی پردازش می‌شوند
        
        // ساخت ctx مصنوعی برای compatibility
        const artificialCtx = {
            from: { 
                id: parseInt(userId),
                first_name: messageObj.first_name || 'کاربر'
            },
            chat: { id: chatId },
            reply: async (text, options = {}) => {
                try {
                    console.log(`📤 [15REG] ارسال پیام به ${chatId}: ${text}`);
                    
                    if (options && options.reply_markup) {
                        // ارسال با keyboard
                        await sendMessage(chatId, text, options.reply_markup);
                        console.log(`✅ [15REG] پیام با keyboard ارسال شد`);
                    } else {
                        // ارسال بدون keyboard
                        await sendMessage(chatId, text);
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
        
        // اگر نام و فامیل وارد شد (سناریو 1)
        if (messageText && this.userStates[userId]?.step === 'waiting_for_name') {
            console.log(`👤 [15REG] نام و فامیل سناریو 1 دریافت شد`);
            await this.handleFullNameInput(artificialCtx, messageText);
            return true;
        }
        
        // اگر نام و فامیل وارد شد (سناریو 2)
        if (messageText && this.userStates[userId]?.step === 'scenario2_waiting_for_name') {
            console.log(`👤 [15REG] نام و فامیل سناریو 2 دریافت شد`);
            await this.handleScenario2NameInput(artificialCtx, messageText);
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
        
        // 🔥 پردازش دکمه "تمایل به ثبت‌نام" برای کمک مربی
        if (messageText === '📝 تمایل به ثبت‌نام') {
            console.log(`📝 [15REG] دکمه "تمایل به ثبت‌نام" فشرده شد`);
            await this.handleAssistantRegistrationRequest(artificialCtx);
            return true;
        }
        
        // اگر دکمه ثبت‌نام در مدرسه فشرده شد
        if (messageText === '📝 ثبت‌نام در مدرسه تلاوت') {
            console.log(`📝 [15REG] دکمه ثبت‌نام در مدرسه فشرده شد`);
            await this.handleSchoolRegistration(artificialCtx);
            return true;
        }
        
        // اگر دکمه حساب کاربری فشرده شد
        if (messageText === '💎 حساب کاربری') {
            console.log(`💎 [15REG] دکمه حساب کاربری فشرده شد`);
            await this.handleUserAccount(artificialCtx);
            return true;
        }
        
        // اگر دکمه بازگشت فشرده شد
        if (messageText === '🔙 بازگشت') {
            console.log(`🔙 [15REG] دکمه بازگشت فشرده شد`);
            await this.showWelcome(artificialCtx);
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
        
        // 🔥 بررسی معتبر بودن شماره تلفن
        if (!this.isValidPhoneNumber(phoneNumber)) {
            console.log(`❌ [15REG] شماره تلفن نامعتبر: ${phoneNumber}`);
            ctx.reply('❌ شماره تلفن نامعتبر است. لطفاً شماره موبایل ایران (مثل 09123456789) وارد کنید:');
            return;
        }
        
        // 🔥 بررسی وجود شماره تلفن در رکوردهای دیگر
        let existingUserId = null;
        for (const [uid, userData] of Object.entries(this.userStates)) {
            if (uid !== userId.toString() && userData.data && userData.data.phone === phoneNumber) {
                existingUserId = uid;
                break;
            }
        }
        
        if (existingUserId) {
            // 🔥 به‌روزرسانی رکورد موجود
            console.log(`🔄 [15REG] شماره تلفن ${phoneNumber} قبلاً ثبت شده، به‌روزرسانی رکورد موجود`);
            
            // کپی کردن اطلاعات از رکورد موجود
            const existingData = this.userStates[existingUserId].data;
            this.userStates[userId].data = {
                ...existingData,
                phone: phoneNumber
            };
            
            // حذف رکورد قدیمی
            delete this.userStates[existingUserId];
            
            console.log(`✅ [15REG] رکورد موجود به‌روزرسانی شد`);
        } else {
            // 🔥 ذخیره شماره تلفن جدید
            this.userStates[userId].data.phone = phoneNumber;
        }
        
        this.userStates[userId].step = 'profile';
        this.saveData();
        
        console.log(`✅ [15REG] شماره تلفن ذخیره شد: ${phoneNumber}`);
        console.log(`✅ [15REG] مرحله تغییر کرد به: profile`);
        
        // بررسی نقش کاربر (اینجا باید با سیستم نقش‌ها ادغام شود)
        const userRole = await this.checkUserRole(phoneNumber);
        console.log(`🔍 [15REG] نقش تشخیص داده شد: ${userRole}`);
        
        if (userRole === 'quran_student') {
            // قرآن‌آموز - بررسی سناریو
            const scenario = getQuranStudentScenario();
            console.log(`🎯 [15REG] سناریو قرآن‌آموز: ${scenario}`);
            
            if (scenario === 1) {
                // سناریو 1: درخواست نام و فامیل
                console.log(`📝 [15REG] اجرای سناریو 1: درخواست نام و فامیل`);
                await this.showQuranStudentProfile(ctx);
            } else if (scenario === 2) {
                // سناریو 2: خوش‌آمدگویی + کیبرد معمولی
                console.log(`🎉 [15REG] اجرای سناریو 2: خوش‌آمدگویی + کیبرد معمولی`);
                await this.showScenario2Welcome(ctx);
            }
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
        
        // 🔥 بررسی معتبر بودن شماره تلفن
        if (!this.isValidPhoneNumber(phoneNumber)) {
            console.log(`❌ [15REG] شماره تلفن نامعتبر: ${phoneNumber}`);
            ctx.reply('❌ شماره تلفن نامعتبر است. لطفاً شماره موبایل معتبر وارد کنید');
            return;
        }
        
        // 🔥 بررسی وجود شماره تلفن در رکوردهای دیگر
        let existingUserId = null;
        for (const [uid, userData] of Object.entries(this.userStates)) {
            if (uid !== userId.toString() && userData.data && userData.data.phone === phoneNumber) {
                existingUserId = uid;
                break;
            }
        }
        
        if (existingUserId) {
            // 🔥 به‌روزرسانی رکورد موجود
            console.log(`🔄 [15REG] شماره تلفن ${phoneNumber} قبلاً ثبت شده، به‌روزرسانی رکورد موجود`);
            
            // کپی کردن اطلاعات از رکورد موجود
            const existingData = this.userStates[existingUserId].data;
            this.userStates[userId].data = {
                ...existingData,
                phone: phoneNumber
            };
            
            // حذف رکورد قدیمی
            delete this.userStates[existingUserId];
            
            console.log(`✅ [15REG] رکورد موجود به‌روزرسانی شد`);
        }
        
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
            
            // 🔥 اضافه کردن خودکار به کانفیگ
            if (userRole === 'assistant') {
                try {
                    addUserToRole('ASSISTANT', userId, firstName, phoneNumber);
                    console.log(`✅ [15REG] کاربر ${userId} به عنوان کمک مربی در کانفیگ اضافه شد`);
                } catch (error) {
                    console.error(`❌ [15REG] خطا در اضافه کردن به کانفیگ:`, error.message);
                }
            }
            
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
            // قرآن‌آموز - بررسی سناریو
            const scenario = getQuranStudentScenario();
            console.log(`🎯 [15REG] سناریو قرآن‌آموز: ${scenario}`);
            
            if (scenario === 1) {
                // سناریو 1: درخواست نام و فامیل
                console.log(`📝 [15REG] اجرای سناریو 1: درخواست نام و فامیل`);
                
                // فقط شماره تلفن ذخیره شود (بدون نام)
                this.userStates[userId].data = {
                    phone: phoneNumber,  // شماره تلفن واقعی
                    userRole: userRole   // نقش ذخیره شد
                };
                this.userStates[userId].step = 'waiting_for_name';  // مرحله جدید: انتظار برای نام
                this.saveData();
                
                await this.handleQuranStudentRegistration(ctx);
            } else if (scenario === 2) {
                // سناریو 2: خوش‌آمدگویی + کیبرد معمولی
                console.log(`🎉 [15REG] اجرای سناریو 2: خوش‌آمدگویی + کیبرد معمولی`);
                
                // ذخیره اطلاعات و تکمیل ثبت‌نام
                this.userStates[userId].data = {
                    phone: phoneNumber,  // شماره تلفن واقعی
                    userRole: userRole   // نقش ذخیره شد
                };
                this.userStates[userId].step = 'completed';  // تکمیل ثبت‌نام
                this.saveData();
                
                await this.showScenario2Welcome(ctx);
            }
        }
    }

    // بررسی نقش کاربر با شماره تلفن
    async checkUserRole(phoneNumber) {
        console.log(`🔍 [15REG] بررسی نقش برای شماره: ${phoneNumber}`);
        
        try {
            // 🔥 استفاده از workshops.json برای همه نقش‌ها
            const normalizePhone = (phone) => {
                const digits = phone.replace(/\D/g, '');
                // اگر 11 رقم یا بیشتر، 10 رقم آخر
                // اگر کمتر، همان عدد
                return digits.length >= 11 ? digits.slice(-10) : digits;
            };
            const normalizedPhone = normalizePhone(phoneNumber);
            console.log(`🔧 [15REG] شماره نرمال‌سازی شده: ${normalizedPhone}`);
            
            // بارگذاری workshops.json
            const workshopsFile = path.join(__dirname, 'data', 'workshops.json');
            if (fs.existsSync(workshopsFile)) {
                const workshopsData = JSON.parse(fs.readFileSync(workshopsFile, 'utf8'));
                
                // 🔥 بررسی مربی‌ها
                if (workshopsData.coach) {
                    for (const [coachId, coach] of Object.entries(workshopsData.coach)) {
                        if (coach.phone && coach.phone !== "0" && coach.phone.trim() !== "") {
                            const normalizedCoachPhone = normalizePhone(coach.phone);
                            if (normalizedPhone.includes(normalizedCoachPhone)) {
                                console.log(`✅ [15REG] نقش تشخیص داده شد: مربی (کارگاه ${coachId})`);
                                return 'coach';  // مربی
                            }
                        }
                    }
                }
                
                // 🔥 بررسی کمک مربی‌ها
                if (workshopsData.assistant) {
                    for (const [assistantId, assistant] of Object.entries(workshopsData.assistant)) {
                        if (assistant.phone && assistant.phone.trim() !== "") {
                            const normalizedAssistantPhone = normalizePhone(assistant.phone);
                            if (normalizedPhone.includes(normalizedAssistantPhone)) {
                                console.log(`✅ [15REG] نقش تشخیص داده شد: کمک مربی (کمک مربی ${assistantId})`);
                                return 'assistant';  // کمک مربی
                            }
                        }
                    }
                }
            }
            
            console.log(`✅ [15REG] نقش تشخیص داده شد: قرآن‌آموز (شماره در کارگاه‌ها یافت نشد)`);
            return 'quran_student';  // قرآن‌آموز
            
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
                
                // 🔥 بررسی مربی‌ها
                if (workshopsData.coach) {
                    for (const [coachId, coach] of Object.entries(workshopsData.coach)) {
                        if (coach.phone && coach.phone !== "0" && coach.phone.trim() !== "") {
                            // نرمال‌سازی شماره مربی
                            const normalizePhone = (phone) => {
                                const digits = phone.replace(/\D/g, '');
                                return digits.length >= 11 ? digits.slice(-10) : digits;
                            };
                            const normalizedCoachPhone = normalizePhone(coach.phone);
                            const normalizedUserPhone = normalizePhone(phoneNumber);
                            
                            if (normalizedUserPhone.includes(normalizedCoachPhone)) {
                                console.log(`✅ [15REG] نام ورکشاپ یافت شد: ${coach.name}`);
                                return coach.name;
                            }
                        }
                    }
                }
                
                // 🔥 بررسی کمک مربی‌ها
                if (workshopsData.assistant) {
                    for (const [assistantId, assistant] of Object.entries(workshopsData.assistant)) {
                        if (assistant.phone && assistant.phone.trim() !== "") {
                            // نرمال‌سازی شماره کمک مربی
                            const normalizePhone = (phone) => {
                                const digits = phone.replace(/\D/g, '');
                                return digits.length >= 11 ? digits.slice(-10) : digits;
                            };
                            const normalizedAssistantPhone = normalizePhone(assistant.phone);
                            const normalizedUserPhone = normalizePhone(phoneNumber);
                            
                            if (normalizedUserPhone.includes(normalizedAssistantPhone)) {
                                console.log(`✅ [15REG] نام کمک مربی یافت شد: ${assistant.name}`);
                                return assistant.name;
                            }
                        }
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
                if (workshopsData.coach) {
                    for (const [coachId, coach] of Object.entries(workshopsData.coach)) {
                        if (coach.phone && coach.phone !== "0") {
                            console.log(`✅ [15REG] شماره واقعی مربی یافت شد: ${coach.phone}`);
                            return coach.phone;
                        }
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
        
        // 🔥 اضافه کردن دکمه "تمایل به ثبت‌نام" برای کمک مربی
        if (role === 'assistant') {
            keyboardRows.push(['📝 تمایل به ثبت‌نام']);
            console.log(`✅ [15REG] دکمه "تمایل به ثبت‌نام" برای کمک مربی اضافه شد`);
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
        this.userStates[userId].step = 'waiting_for_name';
        this.saveData();
        
        // نمایش کیبرد معمولی (بدون دکمه ارسال شماره تلفن)
        const keyboardRows = [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']];
        
        // اضافه کردن دکمه ریست اگر مجاز باشد
        if (USER_ACCESS_CONFIG.allowUserReset === 1) {
            keyboardRows.push(['ریست']);
            console.log(`✅ [15REG] دکمه ریست اضافه شد (allowUserReset: 1)`);
        }
        
        const keyboard = {
            keyboard: keyboardRows,
            resize_keyboard: true
        };
        
        // ارسال پیام با کیبرد معمولی
        ctx.reply('👤 لطفاً نام و فامیل خود را وارد کنید:', { reply_markup: keyboard });
        console.log(`✅ [15REG] درخواست نام و فامیل با کیبرد معمولی ارسال شد`);
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
        
        console.log(`✅ [15REG] نام و فامیل ذخیره شد: ${fullName}`);
        
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
        
        // 🔥 بررسی وضعیت کاربر
        const userState = this.userStates[userId];
        
        // 🔥 همیشه ابتدا پیام خوش‌آمدگویی نمایش داده شود
        if (!userState || userState.step === 'welcome') {
            // 🔥 کاربر جدید یا در مرحله خوش‌آمدگویی
            console.log(`🎉 [15REG] کاربر جدید یا در مرحله خوش‌آمدگویی، نمایش خوش‌آمدگویی`);
            await this.showWelcome(ctx);
            return true;
        }
        
        // 🔥 اگر کاربر در مرحله phone باشد، مستقیماً به مرحله phone نرود
        // 🔥 ابتدا باید از مرحله خوش‌آمدگویی بگذرد
        if (userState.step === 'phone') {
            console.log(`📱 [15REG] کاربر در مرحله phone، اما ابتدا باید خوش‌آمدگویی ببیند`);
            // ریست کردن به مرحله welcome
            this.userStates[userId].step = 'welcome';
            this.saveData();
            await this.showWelcome(ctx);
            return true;
        }
        
        if (userState.step === 'waiting_for_name') {
            // 🔥 کاربر در مرحله انتظار برای نام - درخواست نام و فامیل
            console.log(`👤 [15REG] کاربر در مرحله انتظار برای نام، درخواست نام و فامیل`);
            await this.handleQuranStudentRegistration(ctx);
            return true;
        }
        
        if (userState.step === 'profile') {
            // 🔥 بررسی معتبر بودن شماره تلفن
            const userData = userState.data;
            if (!userData || !userData.phone || !this.isValidPhoneNumber(userData.phone)) {
                console.log(`❌ [15REG] شماره تلفن نامعتبر: ${userData?.phone}`);
                // برگردون به مرحله phone
                this.userStates[userId].step = 'phone';
                this.saveData();
                await this.showWelcome(ctx);
                return true;
            }
            
            // 🔥 شماره تلفن معتبر - حل مشکل مرحله profile
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
            
            // 🔥 اضافه کردن خودکار به کانفیگ
            try {
                if (userRole === 'coach') {
                    addUserToRole('COACH', userId, firstName, userData.phone);
                    console.log(`✅ [15REG] کاربر ${userId} به عنوان مربی در کانفیگ اضافه شد`);
                } else if (userRole === 'assistant') {
                    addUserToRole('ASSISTANT', userId, firstName, userData.phone);
                    console.log(`✅ [15REG] کاربر ${userId} به عنوان کمک مربی در کانفیگ اضافه شد`);
                }
            } catch (error) {
                console.error(`❌ [15REG] خطا در اضافه کردن به کانفیگ:`, error.message);
            }
            
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
            
            // 🔥 اضافه کردن دکمه "تمایل به ثبت‌نام" برای کمک مربی
            if (userRole === 'assistant') {
                keyboardRows.push(['📝 تمایل به ثبت‌نام']);
                console.log(`✅ [15REG] دکمه "تمایل به ثبت‌نام" برای کمک مربی اضافه شد`);
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
        
        // 🔥 اطمینان از اضافه شدن به ساختار مرکزی
        if (userRole === 'coach' || userRole === 'assistant') {
            try {
                if (userRole === 'coach') {
                    addUserToRole('COACH', userId, firstName, userData.phone);
                    console.log(`✅ [15REG] کاربر ${userId} به عنوان مربی در کانفیگ اضافه شد`);
                } else if (userRole === 'assistant') {
                    addUserToRole('ASSISTANT', userId, firstName, userData.phone);
                    console.log(`✅ [15REG] کاربر ${userId} به عنوان کمک مربی در کانفیگ اضافه شد`);
                }
            } catch (error) {
                console.error(`❌ [15REG] خطا در اضافه کردن به کانفیگ:`, error.message);
            }
        }
        
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
        
        // اضافه کردن دکمه‌های قابل کنترل با کانفیگ
        // بررسی نمایش دکمه ثبت اطلاعات بر اساس نقش کاربر
        const { isRegisterInfoVisibleForRole } = require('./3config');
        if (MAIN_BUTTONS_CONFIG.REGISTER_INFO === 1 && isRegisterInfoVisibleForRole(userRole)) {
            keyboardRows.push(['ثبت اطلاعات']);
            console.log(`✅ [15REG] دکمه "ثبت اطلاعات" اضافه شد برای نقش ${userRole} (REGISTER_INFO: 1, Role: ${userRole})`);
        } else {
            console.log(`⚠️ [15REG] دکمه "ثبت اطلاعات" نمایش داده نمی‌شود برای نقش ${userRole} (REGISTER_INFO: ${MAIN_BUTTONS_CONFIG.REGISTER_INFO}, Role: ${userRole})`);
        }
        
        // بررسی نمایش دکمه تنظیمات بر اساس نقش کاربر
        const { isSettingsVisibleForRole } = require('./3config');
        if (MAIN_BUTTONS_CONFIG.SETTINGS === 1 && isSettingsVisibleForRole(userRole)) {
            keyboardRows.push(['تنظیمات']);
            console.log(`✅ [15REG] دکمه "تنظیمات" اضافه شد برای نقش ${userRole} (SETTINGS: 1, Role: ${userRole})`);
        } else {
            console.log(`⚠️ [15REG] دکمه "تنظیمات" نمایش داده نمی‌شود برای نقش ${userRole} (SETTINGS: ${MAIN_BUTTONS_CONFIG.SETTINGS}, Role: ${userRole})`);
        }
        
        // اضافه کردن دکمه ریست اگر مجاز باشد
        if (USER_ACCESS_CONFIG.allowUserReset === 1) {
            keyboardRows.push(['ریست']);
            console.log(`✅ [15REG] دکمه ریست اضافه شد (allowUserReset: 1)`);
        } else {
            console.log(`⚠️ [15REG] دکمه ریست نمایش داده نمی‌شود (allowUserReset: 0)`);
        }
        
        // 🔥 اضافه کردن دکمه "تمایل به ثبت‌نام" برای کمک مربی
        if (userRole === 'assistant') {
            keyboardRows.push(['📝 تمایل به ثبت‌نام']);
            console.log(`✅ [15REG] دکمه "تمایل به ثبت‌نام" برای کمک مربی اضافه شد`);
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
        
        // کیبرد معمولی
        const keyboard = {
            keyboard: [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']],
            resize_keyboard: true
        };
        
        // ارسال پیام با کیبرد معمولی
        ctx.reply(welcomeText, { reply_markup: keyboard });
        
        // بررسی وضعیت ثبت‌نام کارگاه از تنظیمات مدیر
        const { isButtonVisible } = require('./3config');
        const workshopRegistrationEnabled = isButtonVisible('REGISTRATION_BUTTON'); // Changed to use REGISTRATION_BUTTON
        
        // ارسال دکمه ثبت‌نام با کیبرد اینلاین
        const { sendMessageWithInlineKeyboard } = require('./4bale');
        
        if (workshopRegistrationEnabled) {
            await sendMessageWithInlineKeyboard(
                ctx.chat.id,
                '👆 **برای ثبت‌نام در کارگاه‌ها:**',
                [
                    [{ text: '📝 ثبت‌نام در کارگاه', callback_data: 'quran_student_registration' }]
                ]
            );
        } else {
            await sendMessageWithInlineKeyboard(
                ctx.chat.id,
                '👆 **ثبت‌نام در کارگاه‌ها:**',
                [
                    [{ text: '⏳ ثبت‌نام بزودی', callback_data: 'workshop_registration_disabled' }]
                ]
            );
        }
        
        console.log(`✅ [15REG] پنل قرآن‌آموز برای کاربر ${userId} نمایش داده شد`);
    }
    
    // پردازش دکمه مربی
    async handleCoachButton(msg) {
        const userId = msg.from.id;
        const userData = this.userStates[userId]?.data;
        
        if (!userData || !userData.phone) {
            const { sendMessage } = require('./4bale');
            await sendMessage(msg.chat.id, '❌ اطلاعات کاربر یافت نشد');
            return;
        }
        
        const { getRoleDisplayName } = require('./3config');
        const welcomeText = `👨‍🏫 **پنل ${getRoleDisplayName('COACH')}**

📋 **گزینه‌های موجود:**
• 🎯 مدیریت گروه‌ها
• 👨‍🏫 مدیریت ${getRoleDisplayName('ASSISTANT')}`;
        
        // کیبرد معمولی (موجود)
        const keyboard = {
            keyboard: [['شروع', 'مربی', 'ربات', 'خروج']],
            resize_keyboard: true
        };
        
        // ارسال پیام با کیبرد معمولی
        const { sendMessage } = require('./4bale');
        await sendMessage(msg.chat.id, welcomeText, keyboard);
        
        // کیبرد اینلاین برای گزینه‌های اضافی
        const { sendMessageWithInlineKeyboard } = require('./4bale');
        const { hasGroupManagementAccess } = require('./3config');
        
        // ساخت کیبرد بر اساس کانفیگ
        const coachKeyboard = [
            [{ text: `👨‍🏫 مدیریت ${getRoleDisplayName('ASSISTANT')}`, callback_data: 'manage_assistant' }],
            [{ text: '🔙 بازگشت', callback_data: 'back' }]
        ];
        
        // اضافه کردن دکمه مدیریت گروه‌ها فقط اگر فعال باشد
        if (hasGroupManagementAccess('COACH')) {
            coachKeyboard.unshift([{ text: '🎯 مدیریت گروه‌ها', callback_data: 'coach_groups' }]);
        }
        
        // ارسال پیام با کیبرد اینلاین
        await sendMessageWithInlineKeyboard(
            msg.chat.id,
            '👆 **گزینه‌های اضافی:**',
            coachKeyboard
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
        
        // 🔥 اطمینان از تنظیم نقش در ساختار مرکزی
        await this.ensureUserRoleInCentralStructure(userId);
        
        // پردازش callback های مدیریت کمک مربی
        if (data === 'quran_student_registration') {
            console.log(`📝 [15REG] ثبت‌نام قرآن‌آموز درخواست شد`);
            return await this.handleQuranStudentRegistrationCallback(chatId, userId, callbackQueryId);
        } else if (data === 'quran_student_back_to_menu') {
            console.log(`🏠 [15REG] بازگشت قرآن‌آموز به منو درخواست شد`);
            return await this.handleQuranStudentBackToMenu(chatId, userId, callbackQueryId);
        } else if (data.startsWith('quran_student_select_workshop_')) {
            console.log(`📚 [15REG] انتخاب کارگاه قرآن‌آموز: ${data}`);
            return await this.handleQuranStudentWorkshopSelection(chatId, userId, callbackQueryId, data);
        } else if (data.startsWith('quran_student_payment_')) {
            console.log(`💳 [15REG] پرداخت کارگاه قرآن‌آموز: ${data}`);
            const workshopId = data.replace('quran_student_payment_', '');
            return await this.paymentModule.handleQuranStudentPayment(chatId, userId, workshopId);
        } else if (data.startsWith('payment_confirm_')) {
            console.log(`💳 [15REG] تأیید پرداخت کارگاه: ${data}`);
            const workshopId = data.replace('payment_confirm_', '');
            return await this.handlePaymentConfirmation(chatId, userId, workshopId);
        } else if (data.startsWith('pay_workshop_')) {
            console.log(`💳 [15REG] پرداخت مستقیم کارگاه: ${data}`);
            const workshopId = data.replace('pay_workshop_', '');
            return await this.paymentModule.handleQuranStudentPayment(chatId, userId, workshopId);
        } else if (data === 'workshop_registration_disabled') {
            console.log(`⏳ [15REG] ثبت‌نام کارگاه غیرفعال درخواست شد`);
            await answerCallbackQuery(callbackQueryId, '⏳ ثبت‌نام در کارگاه‌ها به زودی فعال خواهد شد');
            return true;
        } else if (data === 'manage_assistant') {
            console.log(`👨‍🏫 [15REG] مدیریت کمک مربی درخواست شد`);
            return await this.handleManageAssistant(chatId, userId, callbackQueryId);
        } else if (data === 'assistant_manage_groups') {
            // بررسی کانفیگ مدیریت گروه‌ها
            const { isGroupManagementEnabled, hasGroupManagementAccess } = require('./3config');
            if (!isGroupManagementEnabled()) {
                console.log(`❌ [15REG] Group management is disabled by config`);
                await answerCallbackQuery(callbackQueryId, '⚠️ مدیریت گروه‌ها غیرفعال است', true);
                return true;
            }
            
            if (!hasGroupManagementAccess('ASSISTANT')) {
                console.log(`❌ [15REG] Assistant has no access to group management`);
                await answerCallbackQuery(callbackQueryId, '⚠️ شما دسترسی لازم برای مدیریت گروه‌ها را ندارید', true);
                return true;
            }
            
            console.log(`🎯 [15REG] مدیریت گروه‌های کمک مربی درخواست شد`);
            return await this.handleAssistantManageGroups(chatId, userId, callbackQueryId);
        } else if (data === 'coach_groups') {
            // بررسی کانفیگ مدیریت گروه‌ها
            const { isGroupManagementEnabled, hasGroupManagementAccess } = require('./3config');
            if (!isGroupManagementEnabled()) {
                console.log(`❌ [15REG] Group management is disabled by config`);
                await answerCallbackQuery(callbackQueryId, '⚠️ مدیریت گروه‌ها غیرفعال است', true);
                return true;
            }
            
            if (!hasGroupManagementAccess('COACH')) {
                console.log(`❌ [15REG] Coach has no access to group management`);
                await answerCallbackQuery(callbackQueryId, '⚠️ شما دسترسی لازم برای مدیریت گروه‌ها را ندارید', true);
                return true;
            }
            
            console.log(`🎯 [15REG] مدیریت گروه‌های مربی درخواست شد (همان مسیر کمک مربی)`);
            return false; // اجازه می‌دهد تا 5polling.js پردازش کند
                } else if (data === 'assistant_back') {
            console.log(`🔙 [15REG] بازگشت کمک مربی درخواست شد`);
            return await this.handleAssistantBack(chatId, userId, callbackQueryId);
        } else if (data === 'back') {
            console.log(`🔙 [15REG] بازگشت درخواست شد`);
            return await this.handleBackToMain(chatId, userId, callbackQueryId);
        } else if (data.startsWith('scenario2_')) {
            // پردازش callback های سناریو 2
            console.log(`🎯 [15REG] Callback سناریو 2: ${data}`);
            return await this.handleScenario2Callback(callback, data);
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
    
    // 🔥 اطمینان از تنظیم نقش در ساختار مرکزی
    async ensureUserRoleInCentralStructure(userId) {
        console.log(`🔍 [15REG] بررسی نقش کاربر ${userId} در ساختار مرکزی`);
        
        try {
            // بررسی نقش در userStates
            const userData = this.userStates[userId]?.data;
            if (!userData || !userData.userRole) {
                console.log(`⚠️ [15REG] نقش کاربر ${userId} در userStates یافت نشد`);
                return;
            }
            
            const userRole = userData.userRole;
            const firstName = userData.firstName || 'کاربر';
            const phone = userData.phone;
            
            console.log(`🔍 [15REG] نقش کاربر ${userId}: ${userRole}`);
            
            // اگر مربی یا کمک مربی است، اطمینان از اضافه شدن به ساختار مرکزی
            if (userRole === 'coach' || userRole === 'assistant') {
                try {
                    if (userRole === 'coach') {
                        addUserToRole('COACH', userId, firstName, phone);
                        console.log(`✅ [15REG] کاربر ${userId} به عنوان مربی در ساختار مرکزی تنظیم شد`);
                    } else if (userRole === 'assistant') {
                        addUserToRole('ASSISTANT', userId, firstName, phone);
                        console.log(`✅ [15REG] کاربر ${userId} به عنوان کمک مربی در ساختار مرکزی تنظیم شد`);
                    }
                } catch (error) {
                    console.error(`❌ [15REG] خطا در تنظیم نقش در ساختار مرکزی:`, error.message);
                }
            }
        } catch (error) {
            console.error(`❌ [15REG] خطا در بررسی نقش کاربر:`, error.message);
        }
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
    
    // مدیریت گروه‌های کمک مربی
    async handleAssistantManageGroups(chatId, userId, callbackQueryId) {
        console.log(`🎯 [15REG] نمایش مدیریت گروه‌های کمک مربی`);
        
        try {
            // اینجا باید به سیستم مدیریت گروه‌های مدیر وصل بشه
            // ولی فقط گروه‌هایی که کمک مربی ادمین هست رو نشون بده
            const text = `🎯 **مدیریت گروه‌های کمک مربی**

📋 **گروه‌های شما:**
• گروه قرآن کریم (2 گروه)
• گروه حفظ موضوعی

⚠️ **نکته:** فقط گروه‌هایی که شما ادمین هستید قابل مدیریت هستند.

👆 **لطفاً گروه مورد نظر را انتخاب کنید:**`;
            
            const keyboard = [
                [{ text: '📚 گروه قرآن کریم', callback_data: 'assistant_group_quran' }],
                [{ text: '📖 گروه حفظ موضوعی', callback_data: 'assistant_group_hifz' }],
                [{ text: '🔙 بازگشت', callback_data: 'assistant_back' }]
            ];
            
            const { sendMessageWithInlineKeyboard } = require('./4bale');
            await sendMessageWithInlineKeyboard(chatId, text, keyboard);
            return true;
            
        } catch (error) {
            console.error(`❌ [15REG] خطا در نمایش مدیریت گروه‌های کمک مربی:`, error);
        }
        
        return false;
    }

    // مدیریت گروه‌های مربی
    async handleCoachManageGroups(chatId, userId, callbackQueryId) {
        console.log(`🎯 [15REG] نمایش مدیریت گروه‌های مربی`);
        
        try {
            // اینجا باید به سیستم مدیریت گروه‌های مدیر وصل بشه
            // ولی فقط گروه‌هایی که مربی ادمین هست رو نشون بده
            const text = `🎯 **مدیریت گروه‌های مربی**

📋 **گروه‌های شما:**
• گروه قرآن کریم (3 گروه)
• گروه حفظ موضوعی
• گروه تفسیر

⚠️ **نکته:** فقط گروه‌هایی که شما ادمین هستید قابل مدیریت هستند.

👆 **لطفاً گروه مورد نظر را انتخاب کنید:**`;
            
            const keyboard = [
                [{ text: '📚 گروه قرآن کریم', callback_data: 'coach_group_quran' }],
                [{ text: '📖 گروه حفظ موضوعی', callback_data: 'coach_group_hifz' }],
                [{ text: '📖 گروه تفسیر', callback_data: 'coach_group_tafsir' }],
                [{ text: '🔙 بازگشت', callback_data: 'back' }]
            ];
            
            const { sendMessageWithInlineKeyboard } = require('./4bale');
            await sendMessageWithInlineKeyboard(chatId, text, keyboard);
            return true;
            
        } catch (error) {
            console.error(`❌ [15REG] خطا در نمایش مدیریت گروه‌های مربی:`, error);
        }
        
        return false;
    }
    
    // بازگشت کمک مربی
    async handleAssistantBack(chatId, userId, callbackQueryId) {
        console.log(`🔙 [15REG] بازگشت کمک مربی به منوی اصلی`);
        
        // پاک کردن وضعیت کاربر در ماژول مدیریت کمک مربی
        if (this.assistantManager) {
            delete this.assistantManager.userStates[userId];
        }
        
        const text = '🔙 بازگشت به منوی کمک مربی';
        const keyboard = [[{ text: '🔙 بازگشت', callback_data: 'assistant_back' }]];
        
        const { sendMessageWithInlineKeyboard } = require('./4bale');
        await sendMessageWithInlineKeyboard(chatId, text, keyboard);
        
        return true;
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
    async handleAssistantButton(msg) {
        const userId = msg.from.id;
        const userData = this.userStates[userId]?.data;
        
        if (!userData || !userData.phone) {
            const { sendMessage } = require('./4bale');
            await sendMessage(msg.chat.id, '❌ اطلاعات کاربر یافت نشد');
            return;
        }
        
        const welcomeText = `👨‍🏫 **پنل کمک مربی محمد**

📋 **گزینه‌های موجود:**
• 🎯 مدیریت گروه‌ها (2 گروه)
• مدیریت دانش‌آموزان گروه‌های من (فعلاً غیرفعال)
• 🚫 گزارش‌گیری گروه‌های من (فعلاً غیرفعال)
• ثبت‌نام (فعلاً غیرفعال)

👆 **لطفاً گزینه مورد نظر را انتخاب کنید:**`;
        
        // کیبرد معمولی (موجود)
        const keyboard = {
            keyboard: [['شروع', 'کمک مربی', 'قرآن‌آموز', 'ربات', 'خروج']],
            resize_keyboard: true
        };
        
        // ارسال پیام با کیبرد معمولی
        const { sendMessage } = require('./4bale');
        await sendMessage(msg.chat.id, welcomeText, keyboard);
        
        // کیبرد اینلاین برای مدیریت گروه‌ها
        const { sendMessageWithInlineKeyboard } = require('./4bale');
        const { hasGroupManagementAccess } = require('./3config');
        
        // ساخت کیبرد بر اساس کانفیگ
        const assistantKeyboard = [
            [{ text: '🔙 بازگشت', callback_data: 'assistant_back' }]
        ];
        
        // اضافه کردن دکمه مدیریت گروه‌ها فقط اگر فعال باشد
        if (hasGroupManagementAccess('ASSISTANT')) {
            assistantKeyboard.unshift([{ text: '🎯 مدیریت گروه‌ها', callback_data: 'assistant_manage_groups' }]);
        }
        
        // ارسال پیام با کیبرد اینلاین
        await sendMessageWithInlineKeyboard(
            ctx.chat.id,
            '👆 **گزینه‌های مدیریتی:**',
            assistantKeyboard
        );
        
        console.log(`✅ [15REG] پنل کمک مربی برای کاربر ${userId} نمایش داده شد`);
    }
    
    // متد جدید: پردازش ثبت‌نام قرآن‌آموز
    async handleQuranStudentRegistrationCallback(chatId, userId, callbackQueryId) {
        console.log(`📝 [15REG] شروع ثبت‌نام قرآن‌آموز برای کاربر ${userId}`);
        
        try {
            // استفاده از ماژول کارگاه‌ها برای نمایش انتخاب کارگاه
            const workshopModule = require('./12kargah');
            
            // ارسال پیام انتخاب کارگاه
            const text = `📝 **ثبت نام قرآن آموز**

🎯 **مراحل ثبت نام:**
1️⃣ **انتخاب کلاس:** یکی از کلاس‌های موجود را انتخاب کنید
2️⃣ **تکمیل اطلاعات:** نام و شماره تماس خود را وارد کنید
3️⃣ **پرداخت:** هزینه کلاس را پرداخت کنید
4️⃣ **تایید:** ثبت نام شما تایید خواهد شد

📚 **کلاس‌های موجود:**`;
            
            // ساخت کیبورد برای انتخاب کارگاه
            const { readJson } = require('./server/utils/jsonStore');
            const workshops = await readJson('data/workshops.json', {});
            
            if (!workshops || !workshops.coach || Object.keys(workshops.coach).length === 0) {
                const noWorkshopsText = text + `\n\n❌ در حال حاضر هیچ کلاسی برای ثبت‌نام موجود نیست.
لطفاً بعداً دوباره تلاش کنید یا با مدیر تماس بگیرید.`;
                
                const keyboard = [
                    [{ text: '🏠 بازگشت به منو', callback_data: 'quran_student_back_to_menu' }]
                ];
                
                const { sendMessageWithInlineKeyboard } = require('./4bale');
                await sendMessageWithInlineKeyboard(chatId, noWorkshopsText, keyboard);
                return true;
            }
            
            // ساخت کیبورد برای انتخاب کارگاه
            const keyboard = [];
            for (const [coachId, workshop] of Object.entries(workshops.coach)) {
                const instructorName = workshop.name || 'نامشخص';
                const cost = workshop.cost || 'نامشخص';
                keyboard.push([{
                    text: `📚 ${instructorName} - ${cost}`,
                    callback_data: `quran_student_select_workshop_${coachId}`
                }]);
            }
            
            keyboard.push([{ text: '🏠 بازگشت به منو', callback_data: 'quran_student_back_to_menu' }]);
            
            const { sendMessageWithInlineKeyboard } = require('./4bale');
            await sendMessageWithInlineKeyboard(chatId, text, keyboard);
            
            console.log(`✅ [15REG] انتخاب کارگاه برای کاربر ${userId} نمایش داده شد`);
            return true;
            
        } catch (error) {
            console.error(`❌ [15REG] خطا در نمایش انتخاب کارگاه:`, error);
            const { sendMessageWithInlineKeyboard } = require('./4bale');
            await sendMessageWithInlineKeyboard(chatId, '❌ خطا در نمایش کارگاه‌ها. لطفاً دوباره تلاش کنید.', [
                [{ text: '🔙 بازگشت', callback_data: 'quran_student_back_to_menu' }]
            ]);
            return false;
        }
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
    
    // متد جدید: پردازش دکمه ثبت‌نام در مدرسه
    async handleSchoolRegistration(ctx) {
        const userId = ctx.from.id;
        
        console.log(`📝 [15REG] شروع ثبت‌نام در مدرسه برای کاربر ${userId}`);
        
        // تغییر مرحله به phone
        this.userStates[userId].step = 'phone';
        this.saveData();
        
        // نمایش دکمه درخواست شماره تلفن
        await this.showContactButton(ctx);
        
        console.log(`✅ [15REG] درخواست شماره تلفن برای کاربر ${userId} نمایش داده شد`);
    }
    
    // متد جدید: پردازش دکمه حساب کاربری
    async handleUserAccount(ctx) {
        const userId = ctx.from.id;
        
        console.log(`💎 [15REG] نمایش حساب کاربری برای کاربر ${userId}`);
        
        const accountText = `💎 **حساب کاربری شما**

📱 **وضعیت:** کاربر جدید
📝 **مرحله:** ثبت‌نام نشده
⏰ **تاریخ:** ${new Date().toLocaleDateString('fa-IR')}

🔒 **برای مشاهده اطلاعات کامل، ابتدا ثبت‌نام کنید**

👆 **برای شروع ثبت‌نام:**`;
        
        const keyboard = {
            keyboard: [
                [{ text: "📝 ثبت‌نام در مدرسه تلاوت" }],
                [{ text: "🔙 بازگشت" }]
            ],
            resize_keyboard: true
        };
        
        ctx.reply(accountText, { reply_markup: keyboard });
        console.log(`✅ [15REG] حساب کاربری برای کاربر ${userId} نمایش داده شد`);
    }
    
    // 🔥 متد جدید: پردازش درخواست ثبت‌نام کمک مربی
    async handleAssistantRegistrationRequest(ctx) {
        const userId = ctx.from.id;
        const userData = this.userStates[userId]?.data;
        
        if (!userData || !userData.phone) {
            ctx.reply('❌ اطلاعات کاربر یافت نشد');
            return;
        }
        
        // 🔥 استفاده از نقش ذخیره شده
        const userRole = userData.userRole;
        if (!userRole || userRole !== 'assistant') {
            ctx.reply('❌ این گزینه فقط برای کمک مربی‌ها قابل استفاده است');
            return;
        }
        
        console.log(`📝 [15REG] کمک مربی ${userId} درخواست ثبت‌نام کرده است`);
        
        // 🔥 اضافه کردن نقش STUDENT به کمک مربی
        try {
            addUserToRole('STUDENT', userId, userData.firstName || 'کمک مربی', userData.phone);
            console.log(`✅ [15REG] نقش STUDENT به کمک مربی ${userId} اضافه شد`);
            
            // به‌روزرسانی userStates
            if (!this.userStates[userId].data.roles) {
                this.userStates[userId].data.roles = [];
            }
            if (!this.userStates[userId].data.roles.includes('STUDENT')) {
                this.userStates[userId].data.roles.push('STUDENT');
            }
            this.saveData();
            
            const successText = `🎉 **ثبت‌نام موفق!**

👨‍🏫 **نقش فعلی:** کمک مربی + قرآن‌آموز
📱 **شماره تلفن:** ${userData.phone}
👤 **نام:** ${userData.firstName || 'کمک مربی'}

✅ **حالا می‌توانید:**
• در کلاس‌ها ثبت‌نام کنید
• از قابلیت‌های قرآن‌آموز استفاده کنید
• همچنان به عنوان کمک مربی فعالیت کنید

🎯 **برای شروع ثبت‌نام، دکمه "قرآن‌آموز" را فشار دهید**`;
            
            // کیبرد جدید با نقش‌های چندگانه
            const keyboard = {
                keyboard: [
                    ['شروع', 'کمک مربی', 'ربات', 'خروج'],
                    ['📖 قرآن‌آموز'],  // دکمه جدید برای قرآن‌آموز
                    ['ریست']
                ],
                resize_keyboard: true
            };
            
            ctx.reply(successText, { reply_markup: keyboard });
            console.log(`✅ [15REG] ثبت‌نام کمک مربی ${userId} تکمیل شد`);
            
        } catch (error) {
            console.error(`❌ [15REG] خطا در اضافه کردن نقش STUDENT:`, error.message);
            ctx.reply('❌ خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.');
        }
    }
    
    // 🔥 متد جدید: بررسی معتبر بودن شماره تلفن
    isValidPhoneNumber(phone) {
        if (!phone) return false;
        
        // حذف کاراکترهای اضافی
        const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
        
        // بررسی شماره موبایل ایران (09xxxxxxxxx)
        if (/^09\d{9}$/.test(cleanPhone)) {
            return true;
        }
        
        // بررسی شماره بین‌المللی ایران (+989xxxxxxxxx)
        if (/^\+989\d{9}$/.test(cleanPhone)) {
            return true;
        }
        
        // بررسی شماره بین‌المللی ایران (989xxxxxxxxx)
        if (/^989\d{9}$/.test(cleanPhone)) {
            return true;
        }
        
        return false;
    }
    
    // متد جدید: بازگشت قرآن‌آموز به منو
    async handleQuranStudentBackToMenu(chatId, userId, callbackQueryId) {
        console.log(`🏠 [15REG] بازگشت قرآن‌آموز به منوی اصلی`);
        
        try {
            // حذف پیام‌های قبلی
            const { deleteMessage } = require('./4bale');
            try {
                await deleteMessage(chatId, chatId);
            } catch (error) {
                console.log('Could not delete message, continuing...');
            }
            
            // نمایش منوی اصلی قرآن‌آموز
            const welcomeText = `📖 **پنل قرآن‌آموز**

📋 **گزینه‌های موجود:**
• 🤖 معرفی ربات
• 📝 ثبت نام

💡 **نکات مهم:**
• می‌توانید هر ماه ثبت‌نام کنید
• در نظر سنجی مدرسه شرکت کنید
• از قابلیت‌های ربات استفاده کنید

👆 **لطفاً گزینه مورد نظر را انتخاب کنید:**`;
            
            // کیبرد معمولی
            const keyboard = {
                keyboard: [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']],
                resize_keyboard: true
            };
            
            // ارسال پیام با کیبرد معمولی
            const { sendMessage } = require('./4bale');
            await sendMessage(chatId, welcomeText, { reply_markup: keyboard });
            
            // بررسی وضعیت ثبت‌نام کارگاه از تنظیمات مدیر
            const { isButtonVisible } = require('./3config');
            const workshopRegistrationEnabled = isButtonVisible('REGISTRATION_BUTTON'); // Changed to use REGISTRATION_BUTTON
            
            // ارسال دکمه ثبت‌نام با کیبرد اینلاین
            const { sendMessageWithInlineKeyboard } = require('./4bale');
            
            if (workshopRegistrationEnabled) {
                await sendMessageWithInlineKeyboard(
                    chatId,
                    '👆 **برای ثبت‌نام در کارگاه‌ها:**',
                    [
                        [{ text: '📝 ثبت‌نام در کارگاه', callback_data: 'quran_student_registration' }]
                    ]
                );
            } else {
                await sendMessageWithInlineKeyboard(
                    chatId,
                    '👆 **ثبت‌نام در کارگاه‌ها:**',
                    [
                        [{ text: '⏳ ثبت‌نام بزودی', callback_data: 'workshop_registration_disabled' }]
                    ]
                );
            }
            
            console.log(`✅ [15REG] بازگشت به منوی قرآن‌آموز برای کاربر ${userId} انجام شد`);
            return true;
            
        } catch (error) {
            console.error(`❌ [15REG] خطا در بازگشت به منو:`, error);
            return false;
        }
    }
    
    // متد جدید: انتخاب کارگاه قرآن‌آموز
    async handleQuranStudentWorkshopSelection(chatId, userId, callbackQueryId, data) {
        console.log(`📚 [15REG] انتخاب کارگاه برای کاربر ${userId}: ${data}`);
        
        try {
            // استخراج ID کارگاه از callback data
            const workshopId = data.replace('quran_student_select_workshop_', '');
            
            // خواندن اطلاعات کارگاه
            const { readJson } = require('./server/utils/jsonStore');
            const workshops = await readJson('data/workshops.json', {});
            
            if (!workshops || !workshops.coach || !workshops.coach[workshopId]) {
                throw new Error('کارگاه یافت نشد');
            }
            
            const workshop = workshops.coach[workshopId];
            const instructorName = workshop.name || 'نامشخص';
            const cost = workshop.cost || 'نامشخص';
            const description = workshop.description || 'توضیحات موجود نیست';
            const duration = workshop.duration || 'نامشخص';
            const level = workshop.level || 'نامشخص';
            
            const text = `📚 **انتخاب کارگاه**

👨‍🏫 **استاد:** ${instructorName}
💰 **هزینه:** ${cost}
📖 **توضیحات:** ${description}
⏱️ **مدت:** ${duration}
📊 **سطح:** ${level}

🎯 **مرحله بعدی:** پرداخت هزینه کارگاه

👆 **برای ادامه ثبت‌نام و پرداخت:**`;
            
            const keyboard = [
                [{ text: `💳 پرداخت ${cost}`, callback_data: `quran_student_payment_${workshopId}` }],
                [{ text: '🔙 بازگشت به انتخاب کارگاه', callback_data: 'quran_student_registration' }],
                [{ text: '🏠 بازگشت به منو', callback_data: 'quran_student_back_to_menu' }]
            ];
            
            const { sendMessageWithInlineKeyboard } = require('./4bale');
            await sendMessageWithInlineKeyboard(chatId, text, keyboard);
            
            console.log(`✅ [15REG] انتخاب کارگاه ${workshopId} برای کاربر ${userId} نمایش داده شد`);
            return true;
            
        } catch (error) {
            console.error(`❌ [15REG] خطا در انتخاب کارگاه:`, error);
            const { sendMessageWithInlineKeyboard } = require('./4bale');
            await sendMessageWithInlineKeyboard(chatId, '❌ خطا در انتخاب کارگاه. لطفاً دوباره تلاش کنید.', [
                [{ text: '🔙 بازگشت', callback_data: 'quran_student_registration' }]
            ]);
                         return false;
         }
     }
     
     // متد جدید: تأیید پرداخت
     async handlePaymentConfirmation(chatId, userId, workshopId) {
         console.log(`💳 [15REG] تأیید پرداخت برای کاربر ${userId} و کارگاه ${workshopId}`);
         
         try {
             // خواندن اطلاعات کارگاه
             const { readJson } = require('./server/utils/jsonStore');
             const workshops = await readJson('data/workshops.json', {});
             
             if (!workshops || !workshops.coach || !workshops.coach[workshopId]) {
                 throw new Error('کارگاه یافت نشد');
             }
             
             const workshop = workshops.coach[workshopId];
             const costText = workshop.cost || 'نامشخص';
             
             const text = `🎉 **پرداخت تأیید شد!**
 
 📚 **کارگاه:** ${workshop.name}
 💵 **مبلغ:** ${costText}
 👤 **کاربر:** ${userId}
 
 ✅ **ثبت‌نام شما با موفقیت انجام شد**
 
 🔗 **لینک کارگاه:** ${workshop.link || 'لینک موجود نیست'}
 
 📱 **مراحل بعدی:**
 • از طریق لینک بالا وارد گروه کارگاه شوید
 • منتظر تماس از سوی استاد باشید
 • شروع کلاس طبق برنامه اعلام شده
 
 🎯 **برای بازگشت به منوی اصلی:**`;
             
             const keyboard = [
                 [{ text: '🏠 بازگشت به منو', callback_data: 'quran_student_back_to_menu' }]
             ];
             
             const { sendMessageWithInlineKeyboard } = require('./4bale');
             await sendMessageWithInlineKeyboard(chatId, text, keyboard);
             
             console.log(`✅ [15REG] تأیید پرداخت برای کاربر ${userId} و کارگاه ${workshopId} نمایش داده شد`);
             return true;
             
         } catch (error) {
             console.error(`❌ [15REG] خطا در تأیید پرداخت:`, error);
             const { sendMessageWithInlineKeyboard } = require('./4bale');
             await sendMessageWithInlineKeyboard(chatId, '❌ خطا در تأیید پرداخت. لطفاً دوباره تلاش کنید.', [
                 [{ text: '🔙 بازگشت', callback_data: 'quran_student_registration' }]
             ]);
             return false;
         }
     }
     
     // ===== متدهای سناریو 2 =====
     
     // پردازش callback query های سناریو 2
     async handleScenario2Callback(callback, callbackData) {
         const userId = callback.from.id;
         const chatId = callback.message.chat.id;
         console.log(`🔘 [15REG] Callback سناریو 2 دریافت شد: ${callbackData} برای کاربر ${userId}`);
         
         // ساخت ctx مصنوعی برای compatibility
         const artificialCtx = {
             from: { 
                 id: parseInt(userId),
                 first_name: callback.from.first_name || 'کاربر'
             },
             chat: { id: chatId },
             reply: async (text, options = {}) => {
                 try {
                     console.log(`📤 [15REG] ارسال پیام سناریو 2 به ${chatId}: ${text}`);
                     
                     if (options && options.reply_markup) {
                         // ارسال با keyboard
                         const { sendMessage } = require('./4bale');
                         await sendMessage(chatId, text, options.reply_markup);
                         console.log(`✅ [15REG] پیام سناریو 2 با keyboard ارسال شد`);
                     } else {
                         // ارسال بدون keyboard
                         const { sendMessage } = require('./4bale');
                         await sendMessage(chatId, text);
                         console.log(`✅ [15REG] پیام سناریو 2 بدون keyboard ارسال شد`);
                     }
                 } catch (error) {
                     console.error(`❌ [15REG] خطا در ارسال پیام سناریو 2:`, error.message);
                 }
             }
         };
         
         switch (callbackData) {
             case 'scenario2_cancel':
                 await this.handleScenario2Cancel(artificialCtx);
                 break;
             case 'scenario2_back':
                 await this.handleScenario2Back(artificialCtx);
                 break;
             case 'scenario2_workshop_registration':
                 await this.handleScenario2WorkshopRegistration(artificialCtx);
                 break;
             default:
                 console.log(`⚠️ [15REG] Callback نامعتبر سناریو 2: ${callbackData}`);
         }
         
         return true;
     }
     
     // پردازش انصراف در سناریو 2
     async handleScenario2Cancel(ctx) {
         const userId = ctx.from.id;
         console.log(`❌ [15REG] انصراف سناریو 2 برای کاربر ${userId}`);
         
         // حذف وضعیت کاربر
         delete this.userStates[userId];
         this.saveData();
         
         const cancelText = `❌ عملیات لغو شد. برای شروع مجدد /start را بزنید.`;
         
         // کیبرد معمولی ثابت
         const mainKeyboard = {
             keyboard: [
                 [{ text: "📝 مدرسه تلاوت" }],
                 [{ text: "💎 حساب کاربری" }]
             ],
             resize_keyboard: true
         };
         
         ctx.reply(cancelText, { 
             reply_markup: mainKeyboard 
         });
         
         console.log(`✅ [15REG] انصراف سناریو 2 برای کاربر ${userId} پردازش شد`);
     }
     
     // پردازش بازگشت در سناریو 2
     async handleScenario2Back(ctx) {
         const userId = ctx.from.id;
         console.log(`🔙 [15REG] بازگشت سناریو 2 برای کاربر ${userId}`);
         
         // برگشت به مرحله welcome
         this.userStates[userId].step = 'welcome';
         this.saveData();
         
         await this.showWelcome(ctx);
         
         console.log(`✅ [15REG] بازگشت سناریو 2 برای کاربر ${userId} پردازش شد`);
     }
     
     // پردازش ثبت‌نام در کارگاه در سناریو 2
     async handleScenario2WorkshopRegistration(ctx) {
         const userId = ctx.from.id;
         console.log(`📚 [15REG] ثبت‌نام در کارگاه سناریو 2 برای کاربر ${userId}`);
         
         // انتقال به جریان ثبت‌نام کارگاه
         await this.handleQuranStudentRegistration(ctx);
         
         console.log(`✅ [15REG] انتقال به ثبت‌نام کارگاه برای کاربر ${userId} در سناریو 2`);
     }
     
     // پردازش ورود نام در سناریو 2
     async handleScenario2NameInput(ctx, fullName) {
         const userId = ctx.from.id;
         console.log(`👤 [15REG] نام سناریو 2 دریافت شد: ${fullName} برای کاربر ${userId}`);
         
         // بررسی حروف فارسی
         if (!this.isPersianText(fullName)) {
             ctx.reply('❌ لطفاً فقط حروف فارسی وارد کنید.');
             return;
         }
         
         // استخراج نام و نام خانوادگی
         const nameParts = fullName.split(/[\s\u200C\u200D]+/).filter(part => part.length > 0);
         const firstName = nameParts.length > 0 ? nameParts[0] : fullName;
         const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
         
         // ذخیره در smart_registration.json
         this.userStates[userId].data.fullName = fullName;
         this.userStates[userId].data.firstName = firstName;
         this.userStates[userId].data.lastName = lastName;
         this.userStates[userId].step = 'scenario2_completed';
         this.saveData();
         
         console.log(`✅ [15REG] نام سناریو 2 ذخیره شد: ${fullName}`);
         
         // نمایش پیام تکمیل حساب کاربری
         const completionText = `✅ حساب کاربری کامل شد`;
         
         // کیبرد شیشه‌ای برای ثبت‌نام در کارگاه
         const inlineKeyboard = {
             inline_keyboard: [
                 [{ text: "📚 ثبت‌نام در کارگاه", callback_data: "scenario2_workshop_registration" }]
             ]
         };
         
         // کیبرد معمولی ثابت
         const mainKeyboard = {
             keyboard: [
                 [{ text: "📝 مدرسه تلاوت" }],
                 [{ text: "💎 حساب کاربری" }]
             ],
             resize_keyboard: true
         };
         
         // ارسال پیام تکمیل با کیبرد شیشه‌ای
         ctx.reply(completionText, { 
             reply_markup: inlineKeyboard 
         });
         
         // ارسال کیبرد معمولی جداگانه
         ctx.reply("کیبرد اصلی:", { 
             reply_markup: mainKeyboard 
         });
         
         console.log(`✅ [15REG] تکمیل حساب کاربری سناریو 2 برای کاربر ${userId} نمایش داده شد`);
     }
     
     // بررسی حروف فارسی
     isPersianText(text) {
         const persianRegex = /^[\u0600-\u06FF\s\u200C\u200D]+$/;
         return persianRegex.test(text);
     }
     
     // ===== پایان متدهای سناریو 2 =====
     
 }
 
 module.exports = RegistrationModule;