//🎯 ماژول ثبت‌نام هوشمند - نسخه 1.0.0
// مکانیزم ثبت‌نام با دکمه‌های تصحیح در هر مرحله

const fs = require('fs');
const path = require('path');
const { sendMessage, sendMessageWithInlineKeyboard } = require('./4bale');

class SmartRegistrationModule {
  constructor() {
    this.dataFile = 'data/smart_registration.json';
    this.userStates = {}; // وضعیت کاربران برای ثبت‌نام
    this.userData = this.loadData();
    
    // ایجاد دایرکتوری data اگر وجود ندارد
    this.ensureDataDirectory();
    
    console.log('✅ SmartRegistrationModule initialized successfully');
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.dataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${dataDir}`);
    }
  }

  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = fs.readFileSync(this.dataFile, 'utf8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error('❌ Error loading registration data:', error);
      return {};
    }
  }

  saveData() {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.userData, null, 2), 'utf8');
      console.log('✅ Registration data saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Error saving registration data:', error);
      return false;
    }
  }

  // 🔍 بررسی ثبت‌نام کاربر
  isUserRegistered(userId) {
    const userIdStr = userId.toString();
    return userIdStr in this.userData && this.userData[userIdStr].full_name;
  }

  // 🔍 بررسی کامل بودن ثبت‌نام
  isRegistrationComplete(userId) {
    const userIdStr = userId.toString();
    if (!(userIdStr in this.userData)) return false;
    
    const userInfo = this.userData[userIdStr];
    const requiredFields = ['full_name', 'national_id', 'phone'];
    return requiredFields.every(field => userInfo[field] && userInfo[field].trim());
  }

  // 🔍 دریافت فیلدهای ناقص
  getMissingFields(userId) {
    const userIdStr = userId.toString();
    if (!(userIdStr in this.userData)) {
      return ['نام', 'کد ملی', 'تلفن'];
    }
    
    const userInfo = this.userData[userIdStr];
    const missing = [];
    
    if (!userInfo.full_name || !userInfo.full_name.trim()) missing.push('نام');
    if (!userInfo.national_id || !userInfo.national_id.trim()) missing.push('کد ملی');
    if (!userInfo.phone || !userInfo.phone.trim()) missing.push('تلفن');
    
    return missing;
  }

  // ✅ اعتبارسنجی کد ملی
  isValidNationalId(nid) {
    return /^\d{10}$/.test(nid);
  }

  // 🎹 ساخت کیبورد معمولی
  buildReplyKeyboard(buttons) {
    return {
      keyboard: buttons.map(row => row.map(btn => ({ text: btn }))),
      resize_keyboard: true
    };
  }

  // 🎹 ساخت کیبورد شیشه‌ای
  buildInlineKeyboard(buttons) {
    return buttons; // برگرداندن مستقیم آرایه دکمه‌ها
  }

  // 📱 پردازش پیام‌ها
  async handleMessage(message) {
    if (!message || !message.chat || !message.from) return false;

    const chatId = message.chat.id;
    const userId = chatId;
    const userIdStr = userId.toString();
    const text = message.text || '';
    const contact = message.contact;

    console.log(`📱 Processing message from user ${userId}: text='${text}', contact=${!!contact}`);

    // پردازش پیام‌های معمولی
    if (text === '/start' || text === 'شروع مجدد' || text === 'شروع') {
      return this.handleStartCommand(chatId, userIdStr);
    } else if (text === 'معرفی مدرسه') {
      return this.handleSchoolIntro(chatId);
    } else if (text === 'ثبت‌نام') {
      return this.handleRegistrationStart(chatId, userIdStr);
    } else if (text === 'خروج') {
      return this.handleExitCommand(chatId);
    } else if (text === 'برگشت به قبل') {
      return this.handleBackCommand(chatId, userIdStr);
    } else if (text === 'پنل قرآن‌آموز') {
      return this.handleQuranStudentPanel(chatId, userIdStr);
    } else if (contact && userIdStr in this.userStates) {
      return this.handleRegistrationStep(chatId, userIdStr, '', contact);
    } else if (userIdStr in this.userStates) {
      return this.handleRegistrationStep(chatId, userIdStr, text, contact);
    } else {
      // 🆕 مدیریت دکمه‌های کیبورد معمولی برای کاربران ناشناس
      if (this.isUserRegistered(userIdStr)) {
        return this.handleQuranStudentPanel(chatId, userIdStr);
      } else {
        // 🔍 بررسی دکمه‌های کیبورد معمولی کاربران ناشناس
        switch (text) {
          case 'شروع':
            return this.handleUnknownUserStart(chatId);
          case 'مدرسه':
            return this.handleUnknownUserSchool(chatId);
          case 'ربات':
            return this.handleUnknownUserBot(chatId);
          case 'خروج':
            return this.handleUnknownUserExit(chatId);
          default:
            // 🔄 اگر دکمه‌ای انتخاب نشده، منوی اصلی را نمایش بده
            return this.handleStartCommand(chatId, userIdStr);
        }
      }
    }
  }

  // 📱 پردازش callback ها
  async handleCallback(callback) {
    if (!callback || !callback.message || !callback.from || !callback.data) return false;

    const chatId = callback.message.chat.id;
    const userIdStr = chatId.toString();
    const data = callback.data;

    console.log(`🔄 Processing callback from user ${chatId}: ${data}`);

    switch (data) {
      case 'start_registration':
        return this.handleRegistrationStart(chatId, userIdStr);
      case 'school_intro':
        return this.handleSchoolIntro(chatId);
      case 'intro_quran_bot':
        return this.handleQuranBotIntro(chatId);
      case 'edit_name':
        return this.handleEditName(chatId, userIdStr);
      case 'edit_national_id':
        return this.handleEditNationalId(chatId, userIdStr);
      case 'edit_phone':
        return this.handleEditPhone(chatId, userIdStr);
      case 'final_confirm':
        return this.handleFinalConfirm(chatId, userIdStr);
      case 'quran_student_panel':
        return this.handleQuranStudentPanel(chatId, userIdStr);
      case 'complete_registration':
        return this.handleCompleteRegistration(chatId, userIdStr);
      default:
        return false;
    }
  }

  // 🚀 دستور شروع
  async handleStartCommand(chatId, userId) {
    if (this.isUserRegistered(userId)) {
      const userInfo = this.userData[userId];
      const firstName = userInfo.first_name || 'کاربر';
      const fullName = userInfo.full_name;
      const nationalId = userInfo.national_id || 'هنوز مانده';
      const phone = userInfo.phone || 'هنوز مانده';

      if (this.isRegistrationComplete(userId)) {
        const welcomeText = `🌟 ${firstName} عزیز، خوش آمدید!\nحساب کاربری شما آماده است 👇\n*نام*: ${fullName}\n*کد ملی*: ${nationalId}\n*تلفن*: ${phone}`;

        await sendMessage(chatId, welcomeText, this.buildReplyKeyboard([
          ['شروع', 'پنل قرآن‌آموز'],
          ['معرفی مدرسه', 'خروج']
        ]));
      } else {
        const missingFields = this.getMissingFields(userId);
        const missingText = missingFields.join('، ');

        const welcomeText = `⚠️ ${firstName} عزیز، ثبت‌نام شما ناقص است!\n\n📋 اطلاعات فعلی:\n*نام*: ${fullName}\n*کد ملی*: ${nationalId}\n*تلفن*: ${phone}\n\n❌ فیلدهای ناقص: ${missingText}`;

        await sendMessageWithInlineKeyboard(chatId, welcomeText, this.buildInlineKeyboard([
          [{ text: '✏️ تصحیح نام', callback_data: 'edit_name' }],
          [{ text: '🆔 تصحیح کد ملی', callback_data: 'edit_national_id' }],
          [{ text: '📱 تصحیح تلفن', callback_data: 'edit_phone' }]
        ]));
      }
    } else {
      // 🆕 سیستم جدید برای کاربران ناشناس
      await this.handleUnknownUserStart(chatId);
    }
    return true;
  }

  // 🆕 متد جدید برای کاربران ناشناس
  async handleUnknownUserStart(chatId) {
    try {
      // 📖 خواندن وضعیت ثبت‌نام
      const { readJson } = require('./server/utils/jsonStore');
      const siteStatus = await readJson('data/site-status.json', {
        registration: { enabled: true, lastUpdate: Date.now(), updatedFrom: 'ربات' }
      });

      // 🗓️ تشخیص ماه فعلی
      const currentMonth = this.getCurrentPersianMonth();
      const nextMonth = this.getNextPersianMonth(currentMonth);

      // 📝 پیام خوش‌آمدگویی
      const welcomeText = `🌟 *خوش آمدید به مدرسه تلاوت قرآن*

🏫 **مدرسه تلاوت قرآن**
با بیش از ۱۰ سال سابقه در زمینه آموزش قرآن کریم

📚 **کلاس‌های موجود:**
• تجوید قرآن کریم
• صوت و لحن
• حفظ قرآن کریم
• تفسیر قرآن

💎 **مزایای ثبت‌نام:**
• اساتید مجرب
• کلاس‌های آنلاین و حضوری
• گواهی پایان دوره
• قیمت مناسب

📝 **ثبت‌نام ماهانه:**
ثبت‌نام به صورت ماهانه انجام می‌شود`;

      // 🎹 کیبورد معمولی (Reply Keyboard)
      const replyKeyboard = this.buildReplyKeyboard([
        ['شروع', 'خروج'],
        ['مدرسه', 'ربات']
      ]);

      // 📤 ارسال پیام با کیبورد معمولی
      await sendMessage(chatId, welcomeText, replyKeyboard);

      // 🔄 بررسی وضعیت ثبت‌نام و نمایش کیبورد شیشه‌ای
      if (siteStatus.registration.enabled) {
        // ✅ ثبت‌نام فعال - نمایش ماه آینده
        const inlineText = `📝 **ثبت‌نام ${nextMonth}**\nثبت‌نام برای ماه ${nextMonth} فعال است`;
        
        await sendMessageWithInlineKeyboard(chatId, inlineText, this.buildInlineKeyboard([
          [{ text: `📝 ثبت‌نام ${nextMonth}`, callback_data: 'start_registration' }]
        ]));
      } else {
        // ❌ ثبت‌نام غیرفعال - نمایش پیام "به زودی"
        const nextMonthText = `📅 **ثبت‌نام**\nثبت‌نام به زودی فعال خواهد شد`;
        
        await sendMessage(chatId, nextMonthText);
      }

    } catch (error) {
      console.error('❌ [REG] Error in handleUnknownUserStart:', error);
      
      // 🔄 در صورت خطا، پیام ساده ارسال کن
      const fallbackText = `🌟 خوش آمدید به مدرسه تلاوت قرآن\n\nلطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;
      
      const replyKeyboard = this.buildReplyKeyboard([
        ['شروع', 'خروج'],
        ['مدرسه', 'ربات']
      ]);
      
      await sendMessage(chatId, fallbackText, replyKeyboard);
    }
  }

  // 🗓️ متد تشخیص ماه فارسی فعلی
  getCurrentPersianMonth() {
    const persianMonths = [
      'فروردین', 'اردیبهشت', 'خرداد',
      'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر',
      'دی', 'بهمن', 'اسفند'
    ];
    
    // 🕐 تاریخ فعلی
    const now = new Date();
    const persianDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      month: 'long'
    }).format(now);
    
    // 🔍 پیدا کردن ماه در آرایه
    const monthIndex = persianMonths.findIndex(month => 
      persianDate.includes(month)
    );
    
    return monthIndex !== -1 ? persianMonths[monthIndex] : 'ماه';
  }

  // 🗓️ متد تشخیص ماه فارسی بعدی
  getNextPersianMonth(currentMonth) {
    const persianMonths = [
      'فروردین', 'اردیبهشت', 'خرداد',
      'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر',
      'دی', 'بهمن', 'اسفند'
    ];
    
    const currentIndex = persianMonths.indexOf(currentMonth);
    if (currentIndex === -1) return 'ماه آینده';
    
    const nextIndex = (currentIndex + 1) % 12;
    return persianMonths[nextIndex];
  }

  // 🆕 متدهای جدید برای مدیریت دکمه‌های کیبورد معمولی کاربران ناشناس

  // 🚀 متد شروع برای کاربران ناشناس
  async handleUnknownUserStart(chatId) {
    const startText = `🚀 **شروع کار با مدرسه تلاوت قرآن**

برای شروع کار با مدرسه تلاوت قرآن، لطفاً یکی از گزینه‌های زیر را انتخاب کنید:

🏫 **معرفی مدرسه** - آشنایی با مدرسه و کلاس‌ها
🤖 **معرفی ربات** - آشنایی با قابلیت‌های ربات
📝 **ثبت‌نام** - ثبت‌نام در مدرسه

یا می‌توانید از دکمه‌های کیبورد استفاده کنید:`;

    const replyKeyboard = this.buildReplyKeyboard([
      ['شروع', 'خروج'],
      ['مدرسه', 'ربات']
    ]);

    await sendMessage(chatId, startText, replyKeyboard);
    return true;
  }

  // 🏫 متد مدرسه برای کاربران ناشناس
  async handleUnknownUserSchool(chatId) {
    try {
      // 🔄 بررسی وضعیت ثبت‌نام
      const { readJson } = require('./server/utils/jsonStore');
      const siteStatus = await readJson('data/site-status.json', {
        registration: { enabled: false }
      });

      const schoolText = `🏫 **مدرسه تلاوت قرآن**

مدرسه تلاوت با بیش از ۱۰ سال سابقه در زمینه آموزش قرآن کریم، خدمات متنوعی ارائه می‌دهد:

📚 **کلاس‌های موجود:**
• تجوید قرآن کریم
• صوت و لحن
• حفظ قرآن کریم
• تفسیر قرآن

💎 **مزایای ثبت‌نام:**
• اساتید مجرب
• کلاس‌های آنلاین و حضوری
• گواهی پایان دوره
• قیمت مناسب`;

      if (siteStatus.registration.enabled) {
        // ✅ ثبت‌نام فعال - نمایش کیبورد شیشه‌ای با ماه آینده
        const currentMonth = this.getCurrentPersianMonth();
        const nextMonth = this.getNextPersianMonth(currentMonth);
        const buttonText = `📝 ثبت‌نام ${nextMonth}`;
        
        await sendMessageWithInlineKeyboard(chatId, schoolText + '\n\nبرای ثبت‌نام روی دکمه زیر کلیک کنید:', this.buildInlineKeyboard([
          [{ text: buttonText, callback_data: 'start_registration' }]
        ]));
      } else {
        // ❌ ثبت‌نام غیرفعال - نمایش پیام "به زودی"
        await sendMessage(chatId, schoolText + '\n\n📅 **ثبت‌نام**\nثبت‌نام به زودی فعال خواهد شد');
      }

      // 🔄 بازگرداندن کیبورد معمولی
      const replyKeyboard = this.buildReplyKeyboard([
        ['شروع', 'خروج'],
        ['مدرسه', 'ربات']
      ]);
      
      await sendMessage(chatId, '🔙 برای بازگشت به منوی اصلی از دکمه‌های بالا استفاده کنید:', replyKeyboard);
      return true;
    } catch (error) {
      console.error('❌ [REG] Error in handleUnknownUserSchool:', error);
      
      // 🔄 در صورت خطا، پیام ساده ارسال کن
      const fallbackText = `🏫 **مدرسه تلاوت قرآن**

مدرسه تلاوت با بیش از ۱۰ سال سابقه در زمینه آموزش قرآن کریم، خدمات متنوعی ارائه می‌دهد.

📅 **ثبت‌نام**\nثبت‌نام به زودی فعال خواهد شد`;

      await sendMessage(chatId, fallbackText);
      
      // 🔄 بازگرداندن کیبورد معمولی
      const replyKeyboard = this.buildReplyKeyboard([
        ['شروع', 'خروج'],
        ['مدرسه', 'ربات']
      ]);
      
      await sendMessage(chatId, '🔙 برای بازگشت به منوی اصلی از دکمه‌های بالا استفاده کنید:', replyKeyboard);
      return true;
    }
  }

  // 🤖 متد ربات برای کاربران ناشناس
  async handleUnknownUserBot(chatId) {
    try {
      // 🔄 بررسی وضعیت ثبت‌نام
      const { readJson } = require('./server/utils/jsonStore');
      const siteStatus = await readJson('data/site-status.json', {
        registration: { enabled: false }
      });

      const botText = `🤖 **ربات مدرسه تلاوت**

ربات مدرسه تلاوت با قابلیت‌های پیشرفته، تجربه‌ای منحصر به فرد در آموزش قرآن کریم ارائه می‌دهد:

🚀 **قابلیت‌های اصلی:**
• 📖 آموزش تلاوت قرآن کریم
• 🧠 حفظ آیات کریمه
• 📝 تفسیر آیات
• 📊 آزمون‌های قرآنی
• 📈 گزارش پیشرفت
• 👥 مدیریت گروه‌ها
• 📋 حضور و غیاب

💡 **ویژگی‌های منحصر به فرد:**
• رابط کاربری ساده و کاربردی
• پشتیبانی از زبان فارسی
• پاسخگویی ۲۴ ساعته
• امنیت بالا
• پشتیبانی از همه دستگاه‌ها`;

      if (siteStatus.registration.enabled) {
        // ✅ ثبت‌نام فعال - نمایش کیبورد شیشه‌ای با ماه آینده
        const currentMonth = this.getCurrentPersianMonth();
        const nextMonth = this.getNextPersianMonth(currentMonth);
        const buttonText = `📝 ثبت‌نام ${nextMonth}`;
        
        await sendMessageWithInlineKeyboard(chatId, botText + '\n\nبرای شروع استفاده از ربات، ثبت‌نام کنید:', this.buildInlineKeyboard([
          [{ text: buttonText, callback_data: 'start_registration' }]
        ]));
      } else {
        // ❌ ثبت‌نام غیرفعال - نمایش پیام "به زودی"
        await sendMessage(chatId, botText + '\n\n📅 **ثبت‌نام**\nثبت‌نام به زودی فعال خواهد شد');
      }

      // 🔄 بازگرداندن کیبورد معمولی
      const replyKeyboard = this.buildReplyKeyboard([
        ['شروع', 'خروج'],
        ['مدرسه', 'ربات']
      ]);
      
      await sendMessage(chatId, '🔙 برای بازگشت به منوی اصلی از دکمه‌های بالا استفاده کنید:', replyKeyboard);
      return true;
    } catch (error) {
      console.error('❌ [REG] Error in handleUnknownUserBot:', error);
      
      // 🔄 در صورت خطا، پیام ساده ارسال کن
      const fallbackText = `🤖 **ربات مدرسه تلاوت**

ربات مدرسه تلاوت با قابلیت‌های پیشرفته، تجربه‌ای منحصر به فرد در آموزش قرآن کریم ارائه می‌دهد.

📅 **ثبت‌نام**\nثبت‌نام به زودی فعال خواهد شد`;

      await sendMessage(chatId, fallbackText);
      
      // 🔄 بازگرداندن کیبورد معمولی
      const replyKeyboard = this.buildReplyKeyboard([
        ['شروع', 'خروج'],
        ['مدرسه', 'ربات']
      ]);
      
      await sendMessage(chatId, '🔙 برای بازگشت به منوی اصلی از دکمه‌های بالا استفاده کنید:', replyKeyboard);
      return true;
    }
  }

  // 🚪 متد خروج برای کاربران ناشناس
  async handleUnknownUserExit(chatId) {
    const exitText = `🚪 **خروج از مدرسه تلاوت قرآن**

متأسفیم که تصمیم به خروج گرفتید! 😔

اگر در آینده تصمیم به بازگشت گرفتید، کافیست دوباره /start را ارسال کنید.

🌟 **یادآوری:**
• ثبت‌نام در مدرسه رایگان است
• کلاس‌های آنلاین و حضوری
• اساتید مجرب و با تجربه
• گواهی پایان دوره

برای بازگشت، /start را دوباره ارسال کنید.`;

    // 🔄 حذف کیبورد
    await sendMessage(chatId, exitText, { remove_keyboard: true });
    return true;
  }

  // 🏫 معرفی مدرسه
  async handleSchoolIntro(chatId) {
    const introText = `_🏫 *معرفی مدرسه تلاوت*

مدرسه تلاوت با بیش از ۱۰ سال سابقه در زمینه آموزش قرآن کریم، خدمات متنوعی ارائه می‌دهد:

📚 *کلاس‌های موجود:*
• تجوید قرآن کریم
• صوت و لحن
• حفظ قرآن کریم
• تفسیر قرآن

💎 *مزایای ثبت‌نام:*
• اساتید مجرب
• کلاس‌های آنلاین و حضوری
• گواهی پایان دوره
• قیمت مناسب_

برای ثبت‌نام روی دکمه زیر کلیک کنید:`;

    await sendMessageWithInlineKeyboard(chatId, introText, this.buildInlineKeyboard([
      [{ text: '📝 ثبت‌نام', callback_data: 'start_registration' }]
    ]));
    return true;
  }

  // 🤖 معرفی ربات
  async handleQuranBotIntro(chatId) {
    const introText = `_🤖 *معرفی ربات مدرسه تلاوت*

ربات مدرسه تلاوت با قابلیت‌های پیشرفته، تجربه‌ای منحصر به فرد در آموزش قرآن کریم ارائه می‌دهد:

🚀 *قابلیت‌های اصلی:*
• 📖 آموزش تلاوت قرآن کریم
• 🧠 حفظ آیات کریمه
• 📝 تفسیر آیات
• 📊 آزمون‌های قرآنی
• 📈 گزارش پیشرفت
• 👥 مدیریت گروه‌ها
• 📋 حضور و غیاب

💡 *ویژگی‌های منحصر به فرد:*
• رابط کاربری ساده و کاربردی
• پشتیبانی از زبان فارسی
• پاسخگویی ۲۴ ساعته
• امنیت بالا
• پشتیبانی از همه دستگاه‌ها

برای شروع استفاده از ربات، ثبت‌نام کنید:`;

    await sendMessageWithInlineKeyboard(chatId, introText, this.buildInlineKeyboard([
      [{ text: '📝 ثبت‌نام', callback_data: 'start_registration' }]
    ]));
    return true;
  }

  // 📝 شروع ثبت‌نام
  async handleRegistrationStart(chatId, userId) {
    this.userStates[userId] = { step: 'name' };
    this.userData[userId] = {};
    this.saveData();

    await sendMessage(chatId, '_لطفاً نام و نام خانوادگی خود را وارد کنید (مثال: علی رضایی)._', this.buildReplyKeyboard([
      ['برگشت به قبل', 'خروج']
    ]));
    return true;
  }

  // 🔄 پردازش مراحل ثبت‌نام
  async handleRegistrationStep(chatId, userId, text, contact) {
    if (!(userId in this.userStates)) {
      console.warn(`⚠️ User ${userId} not in user_states`);
      return false;
    }

    const state = this.userStates[userId];
    const step = state.step;

    console.log(`🔄 Processing registration step for user ${userId}: step=${step}, text='${text}', contact=${!!contact}`);

    switch (step) {
      case 'name':
        return this.handleNameStep(chatId, userId, text);
      case 'national_id':
        return this.handleNationalIdStep(chatId, userId, text);
      case 'phone':
        return this.handlePhoneStep(chatId, userId, contact);
      default:
        console.warn(`⚠️ Unknown step '${step}' for user ${userId}`);
        return false;
    }
  }

  // 📝 مرحله نام
  async handleNameStep(chatId, userId, text) {
    this.userData[userId].full_name = text;
    this.userData[userId].first_name = text.split(' ')[0];
    this.saveData();

    const firstName = this.userData[userId].first_name;
    const statusText = `_${firstName} عزیز،\nنام شما: ${text}\nکد ملی: هنوز مانده\nتلفن: هنوز مانده_\n\nلطفاً کد ملی ۱۰ رقمی خود را وارد کنید.`;

    await sendMessage(chatId, statusText, this.buildReplyKeyboard([
      ['برگشت به قبل', 'خروج']
    ]));

    // دکمه تصحیح نام
    await sendMessageWithInlineKeyboard(chatId, 'می‌خواهید نام را ویرایش کنید؟', this.buildInlineKeyboard([
      [{ text: '✏️ تصحیح نام', callback_data: 'edit_name' }]
    ]));

    this.userStates[userId].step = 'national_id';
    return true;
  }

  // 🆔 مرحله کد ملی
  async handleNationalIdStep(chatId, userId, text) {
    if (this.isValidNationalId(text)) {
      this.userData[userId].national_id = text;
      this.saveData();

      const firstName = this.userData[userId].first_name;
      const fullName = this.userData[userId].full_name;
      const statusText = `_${firstName} عزیز،\nنام: ${fullName}\nکد ملی: ${text}\nتلفن: هنوز مانده_\n\n📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید.`;

      await sendMessage(chatId, statusText, this.buildReplyKeyboard([
        ['برگشت به قبل', 'خروج']
      ]));

      // دکمه ارسال تلفن
      await sendMessage(chatId, '📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید.', {
        keyboard: [[{ text: '📱 ارسال شماره تلفن', request_contact: true }]],
        resize_keyboard: true
      });

      // دکمه‌های تصحیح نام و کد ملی
          await sendMessageWithInlineKeyboard(chatId, 'یا می‌توانید اطلاعات را تصحیح کنید:', this.buildInlineKeyboard([
      [{ text: '✏️ تصحیح نام', callback_data: 'edit_name' }],
      [{ text: '🆔 تصحیح کد ملی', callback_data: 'edit_national_id' }]
    ]));

      this.userStates[userId].step = 'phone';
      return true;
    } else {
      await sendMessage(chatId, '_❌ کد ملی نامعتبر است. لطفاً ۱۰ رقم وارد کنید._');
      return false;
    }
  }

  // 📱 مرحله تلفن
  async handlePhoneStep(chatId, userId, contact) {
    if (contact) {
      const phoneNumber = contact.phone_number;
      this.userData[userId].phone = phoneNumber;
      this.saveData();

      console.log(`✅ Phone number saved for user ${userId}: ${phoneNumber}`);

      const firstName = this.userData[userId].first_name;
      const fullName = this.userData[userId].full_name;
      const nationalId = this.userData[userId].national_id;

      const statusText = `_📋 ${firstName} عزیز، حساب کاربری شما:\nنام: ${fullName}\nکد ملی: ${nationalId}\nتلفن: ${phoneNumber}_`;

      // دکمه‌های تصحیح همه فیلدها + تأیید نهایی
      await sendMessageWithInlineKeyboard(chatId, statusText, this.buildInlineKeyboard([
        [{ text: '✅ تأیید نهایی', callback_data: 'final_confirm' }],
        [{ text: '✏️ تصحیح نام', callback_data: 'edit_name' }],
        [{ text: '🆔 تصحیح کد ملی', callback_data: 'edit_national_id' }],
        [{ text: '📱 تصحیح تلفن', callback_data: 'edit_phone' }]
      ]));

      // پاک کردن وضعیت
      if (userId in this.userStates) {
        delete this.userStates[userId];
        console.log(`✅ Registration completed for user ${userId}`);
      }
      return true;
    } else {
      console.warn(`⚠️ User ${userId} in phone step but no contact provided`);
      await sendMessage(chatId, '_📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید._', {
        keyboard: [[{ text: '📱 ارسال شماره تلفن', request_contact: true }]],
        resize_keyboard: true
      });
      return false;
    }
  }

  // ✏️ ویرایش نام
  async handleEditName(chatId, userId) {
    if (userId in this.userData) {
      delete this.userData[userId].full_name;
      this.saveData();
      this.userStates[userId] = { step: 'name' };
      await sendMessage(chatId, '_✏️ لطفاً نام و نام خانوادگی جدید خود را وارد کنید._', this.buildReplyKeyboard([
        ['برگشت به قبل', 'خروج']
      ]));
    }
    return true;
  }

  // 🆔 ویرایش کد ملی
  async handleEditNationalId(chatId, userId) {
    if (userId in this.userData) {
      delete this.userData[userId].national_id;
      this.saveData();
      this.userStates[userId] = { step: 'national_id' };
      await sendMessage(chatId, '_🆔 لطفاً کد ملی جدید خود را وارد کنید._', this.buildReplyKeyboard([
        ['برگشت به قبل', 'خروج']
      ]));
    }
    return true;
  }

  // 📱 ویرایش تلفن
  async handleEditPhone(chatId, userId) {
    if (userId in this.userData) {
      delete this.userData[userId].phone;
      this.saveData();
      this.userStates[userId] = { step: 'phone' };
      await sendMessage(chatId, '_📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید._', {
        keyboard: [[{ text: '📱 ارسال شماره تلفن', request_contact: true }]],
        resize_keyboard: true
      });
    }
    return true;
  }

  // ✅ تأیید نهایی
  async handleFinalConfirm(chatId, userId) {
    if (userId in this.userData) {
      try {
        const firstName = this.userData[userId].first_name || 'کاربر';
        const fullName = this.userData[userId].full_name || 'نامشخص';
        const nationalId = this.userData[userId].national_id || '';
        const phone = this.userData[userId].phone || '';

        this.userData[userId].user_type = 'quran_student';
        this.userData[userId].registration_date = Date.now();
        this.saveData();

        const confirmText = `🎉 **ثبت‌نام با موفقیت تکمیل شد!**

🌟 ${firstName} عزیز، ثبت‌نام شما با موفقیت انجام شد!

📋 **اطلاعات ثبت‌نام:**
• نام: ${fullName}
• کد ملی: ${nationalId}
• تلفن: ${phone}

✅ حساب کاربری شما آماده است و می‌توانید از خدمات مدرسه استفاده کنید.

📚 **مرحله بعدی:** انتخاب کلاس مورد نظر`;

        await sendMessage(chatId, confirmText, this.buildReplyKeyboard([
          ['📚 انتخاب کلاس'],
          ['پنل قرآن‌آموز'],
          ['شروع مجدد', 'خروج']
        ]));
      } catch (error) {
        console.error(`❌ Error in final_confirm for user ${userId}:`, error);
        await sendMessage(chatId, '🎉 ثبت‌نام شما با موفقیت تکمیل شد!', this.buildReplyKeyboard([
          ['شروع مجدد', 'خروج'],
          ['پنل قرآن‌آموز']
        ]));
      }
    }
    return true;
  }

  // 📚 پنل قرآن‌آموز
  async handleQuranStudentPanel(chatId, userId) {
    if (this.isUserRegistered(userId)) {
      if (this.isRegistrationComplete(userId)) {
        const userInfo = this.userData[userId];
        const firstName = userInfo.first_name || 'کاربر';

        const welcomeText = `📚 **پنل قرآن‌آموز**

سلام ${firstName} عزیز! 👋
به پنل قرآن‌آموز خوش آمدید.

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;

        await sendMessage(chatId, welcomeText, this.buildReplyKeyboard([
          ['📚 انتخاب کلاس'],
          ['🏠 برگشت به منو', 'خروج']
        ]));
      } else {
        const missingFields = this.getMissingFields(userId);
        const missingText = missingFields.join('، ');

        const userInfo = this.userData[userId];
        const firstName = userInfo.first_name || 'کاربر';

        const warningText = `⚠️ **ثبت‌نام ناقص**

${firstName} عزیز، ثبت‌نام شما کامل نیست!
فیلدهای ناقص: ${missingText}

لطفاً ابتدا ثبت‌نام خود را تکمیل کنید.`;

        await sendMessageWithInlineKeyboard(chatId, warningText, this.buildInlineKeyboard([
          [{ text: '✏️ تصحیح نام', callback_data: 'edit_name' }],
          [{ text: '🆔 تصحیح کد ملی', callback_data: 'edit_national_id' }],
          [{ text: '📱 تصحیح تلفن', callback_data: 'edit_phone' }]
        ]));
      }
    } else {
      await sendMessage(chatId, '_❌ شما هنوز ثبت‌نام نکرده‌اید. لطفاً ابتدا ثبت‌نام کنید._', this.buildReplyKeyboard([
        ['شروع مجدد', 'ثبت‌نام']
      ]));
    }
    return true;
  }

  // 🔙 دستور برگشت
  async handleBackCommand(chatId, userId) {
    if (userId in this.userData) {
      if (this.userData[userId].phone) {
        delete this.userData[userId].phone;
        this.saveData();
        this.userStates[userId] = { step: 'phone' };
        await sendMessage(chatId, '_لطفاً شماره تلفن خود را دوباره ارسال کنید._', {
          keyboard: [[{ text: '📱 ارسال شماره تلفن', request_contact: true }]],
          resize_keyboard: true
        });
      } else if (this.userData[userId].national_id) {
        delete this.userData[userId].national_id;
        this.saveData();
        this.userStates[userId] = { step: 'national_id' };
        await sendMessage(chatId, '_لطفاً کد ملی خود را دوباره وارد کنید._');
      } else if (this.userData[userId].full_name) {
        delete this.userData[userId].full_name;
        this.saveData();
        this.userStates[userId] = { step: 'name' };
        await sendMessage(chatId, '_لطفاً نام خود را دوباره وارد کنید._');
      }
    }
    return true;
  }

  // 👋 دستور خروج
  async handleExitCommand(chatId) {
    await sendMessage(chatId, '_👋 با تشکر از استفاده شما از ربات ما. موفق باشید! 🌟_');
    return true;
  }

  // 🔄 تکمیل ثبت‌نام ناقص
  async handleCompleteRegistration(chatId, userId) {
    if (!this.isUserRegistered(userId)) {
      return this.handleRegistrationStart(chatId, userId);
    }

    const missingFields = this.getMissingFields(userId);
    if (missingFields.length === 0) {
      return this.handleQuranStudentPanel(chatId, userId);
    }

    if (missingFields.includes('نام')) {
      return this.handleEditName(chatId, userId);
    } else if (missingFields.includes('کد ملی')) {
      return this.handleEditNationalId(chatId, userId);
    } else if (missingFields.includes('تلفن')) {
      return this.handleEditPhone(chatId, userId);
    }

    return true;
  }

  // 📊 آمار کاربران
  getRegisteredUsersCount() {
    return Object.keys(this.userData).filter(userId => this.isUserRegistered(userId)).length;
  }

  getAllUsersCount() {
    return Object.keys(this.userData).length;
  }

  // 📤 صادرات اطلاعات کاربر
  exportUserData(userId) {
    const userIdStr = userId.toString();
    if (userIdStr in this.userData) {
      return { ...this.userData[userIdStr] };
    }
    return null;
  }
}

// export کلاس
module.exports = SmartRegistrationModule;
