//🎯 ماژول ثبت‌نام هوشمند - نسخه 2.0.0
// مکانیزم ثبت‌نام کامل با مسیر نهایی هوشمند

const fs = require('fs');
const path = require('path');
const { sendMessage, sendMessageWithInlineKeyboard } = require('./4bale');

class SmartRegistrationModule {
  constructor() {
    this.dataFile = 'data/smart_registration.json';
    this.workshopsFile = 'data/workshops.json';
    this.userStates = {}; // وضعیت کاربران برای ثبت‌نام
    this.userData = this.loadData();
    this.workshops = this.loadWorkshops();
    
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

  loadWorkshops() {
    try {
      if (fs.existsSync(this.workshopsFile)) {
        const data = fs.readFileSync(this.workshopsFile, 'utf8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error('❌ Error loading workshops data:', error);
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

  // 🔍 بررسی مدیر بودن کاربر
  isUserAdmin(phone) {
    try {
      const { getAdminIdByPhone } = require('./3config');
      const adminId = getAdminIdByPhone(phone);
      return adminId !== null;
    } catch (error) {
      console.error('❌ Error checking admin status:', error);
      return false;
    }
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

  // 🎹 ساخت کیبورد اصلی (شروع، ربات، خروج)
  buildMainKeyboard() {
    return this.buildReplyKeyboard([
      ['شروع'],
      ['مدرسه', 'ربات'],
      ['مدرسه', 'مدرسه'],
    ]);
  }

  // 🎹 ساخت کیبورد کارگاه‌ها
  buildWorkshopsKeyboard() {
    const buttons = [];
    let currentRow = [];
    
    Object.entries(this.workshops).forEach(([id, workshop]) => {
      const buttonText = `📚 ${workshop.instructor_name} - ${workshop.cost}`;
      currentRow.push(buttonText);
      
      if (currentRow.length === 2) {
        buttons.push([...currentRow]);
        currentRow = [];
      }
    });
    
    // اضافه کردن ردیف آخر اگر ناقص باشد
    if (currentRow.length > 0) {
      buttons.push(currentRow);
    }
    
    // اضافه کردن دکمه‌های پایین
    buttons.push(['🏠 برگشت به منو', 'خروج']);
    
    return this.buildReplyKeyboard(buttons);
  }

  // 🔄 پردازش پیام‌های ورودی
  async handleMessage(message) {
    const { chat, text, contact, from } = message;
    const chatId = chat.id;
    const userId = from.id;
    const isPrivate = chat.type === 'private';

    if (!isPrivate) {
      return false; // فقط پیام‌های خصوصی
    }

    console.log(`📱 Processing message from user ${userId}: text='${text}', contact=${!!contact}`);

    // بررسی دستورات خاص
    if (text === '/start' || text === 'شروع' || text === 'شروع/' || text === 'شروع مجدد' || text === 'استارت' || text === '/استارت') {
    } else if (text === 'مدرسه') {
      return this.handleSchoolIntro(chatId);
    } else if (text === 'ربات') {
      return this.handleQuranBotIntro(chatId);
    } else if (text === 'خروج') {
      return this.handleExitCommand(chatId);
    } else if (text === 'برگشت به قبل') {
      return this.handleBackCommand(chatId, userId);
    } else if (text === '🏠 برگشت به منو') {
      return this.handleBackToMainMenu(chatId, userId);
    } else if (text === '📚 انتخاب کلاس') {
      return this.handleWorkshopSelection(chatId, userId);
    } else if (text === 'پنل قرآن‌آموز') {
      return this.handleQuranStudentPanel(chatId, userId);
    }

    // بررسی انتخاب کارگاه
    if (text && text.startsWith('📚 ')) {
      return this.handleWorkshopSelection(chatId, userId, text);
    }

    // پردازش مراحل ثبت‌نام
    if (userId in this.userStates) {
      return this.handleRegistrationStep(chatId, userId, text, contact);
    }

    // کاربر جدید - شروع ثبت‌نام
    return this.handleUnknownUserStart(chatId);
  }

  // 🔄 پردازش callback query ها
  async handleCallback(callback) {
    const { data, message, from } = callback;
    const chatId = message.chat.id;
    const userId = from.id;

    console.log(`🔄 [POLLING] Callback data: ${data}`);

    switch (data) {
      case 'edit_name':
        return this.handleEditName(chatId, userId);
      case 'edit_national_id':
        return this.handleEditNationalId(chatId, userId);
      case 'edit_phone':
        return this.handleEditPhone(chatId, userId);
      case 'final_confirm':
        return this.handleFinalConfirm(chatId, userId);
      default:
        console.log(`⚠️ Unknown callback data: ${data}`);
        return false;
    }
  }

  // 🚀 شروع دستور
  async handleStartCommand(chatId, userId) {
    console.log(`🚀 [REG] Start command from user ${userId}`);
    
    // همیشه ابتدا کیبورد اصلی را نمایش بده
    const welcomeText = `🏫 **مدرسه تلاوت قرآن**

به مدرسه تلاوت قرآن کریم خوش آمدید! 👋

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;

    await sendMessage(chatId, welcomeText, this.buildMainKeyboard());
    
    // سپس بر اساس وضعیت کاربر تصمیم بگیر
    if (this.isUserRegistered(userId)) {
      if (this.isRegistrationComplete(userId)) {
        // کاربر ثبت‌نام شده - پیام اضافی ارسال نکن
        return true;
      } else {
        // کاربر ثبت‌نام ناقص دارد
        setTimeout(() => {
          this.handleCompleteRegistration(chatId, userId);
        }, 1000);
        return true;
      }
    } else {
      // کاربر جدید - پیام اضافی ارسال نکن
      return true;
    }
  }

  // 🆕 شروع برای کاربر جدید
  async handleUnknownUserStart(chatId) {
    const welcomeText = `🏫 **مدرسه تلاوت قرآن**

به مدرسه تلاوت قرآن کریم خوش آمدید

📚 **کلاس‌های موجود:**
• تجوید قرآن کریم
• صوت و لحن
• حفظ قرآن کریم
• تفسیر قرآن

💎 **مزایای ثبت‌نام:**
• اساتید مجرب
• کلاس‌های آنلاین و حضوری
• گواهی پایان دوره

برای شروع، لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;

    await sendMessage(chatId, welcomeText, this.buildMainKeyboard());
    return true;
  }

  // 🏫 معرفی مدرسه
  async handleSchoolIntro(chatId) {
    const schoolText = `🏫 **مدرسه تلاوت قرآن کریم**

🌟 **درباره مدرسه:**
مدرسه تلاوت قرآن کریم با بیش از ۱۰ سال سابقه در آموزش قرآن کریم، یکی از معتبرترین مراکز آموزشی در این حوزه است.

📚 **کلاس‌های موجود:**
• **تجوید قرآن کریم** - آموزش قواعد صحیح خوانی
• **صوت و لحن** - آموزش آواز و لحن زیبا
• **حفظ قرآن کریم** - حفظ آیات و سوره‌ها
• **تفسیر قرآن** - درک معانی و مفاهیم

👨‍🏫 **اساتید مجرب:**
• استاد محمد رشوند - متخصص حفظ قرآن
• استاد علی حتم خانی - متخصص تجوید و صوت
• استاد احمد حاجی زاده - متخصص تفسیر
• و سایر اساتید مجرب

💎 **مزایای ثبت‌نام:**
• کلاس‌های آنلاین و حضوری
• گواهی پایان دوره معتبر
• پشتیبانی ۲۴ ساعته
• قیمت مناسب و مقرون به صرفه

📞 **اطلاعات تماس:**
برای اطلاعات بیشتر با ما تماس بگیرید.

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;

    await sendMessage(chatId, schoolText, this.buildMainKeyboard());
    return true;
  }

  // 🤖 معرفی ربات
  async handleQuranBotIntro(chatId) {
    const botText = `🤖 **ربات مدرسه تلاوت قرآن**

🌟 **قابلیت‌های ربات:**
• ثبت‌نام آنلاین در کلاس‌ها
• مشاهده برنامه کلاس‌ها
• ارتباط مستقیم با اساتید
• دریافت اخبار و اطلاعیه‌ها
• پشتیبانی ۲۴ ساعته

📱 **نحوه استفاده:**
۱. ثبت‌نام در ربات
۲. انتخاب کلاس مورد نظر
۳. پرداخت شهریه
۴. دریافت لینک کلاس
۵. شروع یادگیری

🔧 **دستورات موجود:**
• /start - شروع کار
• /help - راهنما
• /register - ثبت‌نام
• /workshops - مشاهده کارگاه‌ها

💡 **نکته:** ربات همیشه در دسترس است و می‌توانید در هر زمان از خدمات آن استفاده کنید.

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;

    await sendMessage(chatId, botText, this.buildMainKeyboard());
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
    // ذخیره نام کامل و نام کوچک
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
      delete this.userData[userId].first_name;
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

        // بررسی مدیر بودن کاربر
        if (this.isUserAdmin(phone)) {
          const adminText = `🎉 **خوش آمدید مربی عزیز!**

🌟 ${firstName} عزیز، به عنوان مربی مدرسه تلاوت قرآن خوش آمدید!

📋 **اطلاعات حساب:**
• نام: ${fullName}
• کد ملی: ${nationalId}
• تلفن: ${phone}
• نقش: مربی

✅ حساب کاربری شما فعال شده است.

🏫 **دسترسی‌های مربی:**
• مدیریت کلاس‌ها
• مشاهده دانش‌آموزان
• ارسال گزارش‌ها
• تنظیمات پیشرفته`;

          await sendMessage(chatId, adminText, this.buildMainKeyboard());
        } else {
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
        }
      } catch (error) {
        console.error(`❌ Error in final_confirm for user ${userId}:`, error);
        await sendMessage(chatId, '🎉 ثبت‌نام شما با موفقیت تکمیل شد!', this.buildMainKeyboard());
      }
    }
    return true;
  }

  // 📚 انتخاب کارگاه
  async handleWorkshopSelection(chatId, userId, selectedWorkshop = null) {
    if (!this.isRegistrationComplete(userId)) {
      await sendMessage(chatId, '_❌ ابتدا باید ثبت‌نام خود را تکمیل کنید._', this.buildMainKeyboard());
      return false;
    }

    if (selectedWorkshop) {
      // کاربر کارگاه خاصی را انتخاب کرده
      const workshopName = selectedWorkshop.replace('📚 ', '');
      const workshop = Object.values(this.workshops).find(w => 
        w.instructor_name === workshopName.split(' - ')[0]
      );

      if (workshop) {
        const workshopText = `📚 **کارگاه ${workshop.instructor_name}**

📖 **توضیحات:** ${workshop.description}
⏱️ **مدت زمان:** ${workshop.duration}
👥 **ظرفیت:** ${workshop.capacity} نفر
📊 **سطح:** ${workshop.level}
💰 **هزینه:** ${workshop.cost}

🔗 **لینک کارگاه:** ${workshop.link}

💳 **برای ثبت‌نام و پرداخت:**
لطفاً با شماره ${workshop.instructor_phone} تماس بگیرید یا از لینک بالا استفاده کنید.`;

        await sendMessage(chatId, workshopText, this.buildReplyKeyboard([
          ['📚 انتخاب کلاس دیگر'],
          ['🏠 برگشت به منو', 'خروج']
        ]));
      }
    } else {
      // نمایش لیست کارگاه‌ها
      const workshopsText = `📚 **لیست کارگاه‌های موجود**

لطفاً یکی از کارگاه‌های زیر را انتخاب کنید:`;

      await sendMessage(chatId, workshopsText, this.buildWorkshopsKeyboard());
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
      await sendMessage(chatId, '_❌ شما هنوز ثبت‌نام نکرده‌اید. لطفاً ابتدا ثبت‌نام کنید._', this.buildMainKeyboard());
    }
    return true;
  }

  // 🏠 برگشت به منوی اصلی
  async handleBackToMainMenu(chatId, userId) {
    if (this.isRegistrationComplete(userId)) {
      const userInfo = this.userData[userId];
      const firstName = userInfo.first_name || 'کاربر';
      
      const menuText = `🏠 **منوی اصلی**

سلام ${firstName} عزیز! 👋
به منوی اصلی خوش آمدید.

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;

      await sendMessage(chatId, menuText, this.buildMainKeyboard());
    } else {
      await sendMessage(chatId, '_🏠 به منوی اصلی برگشتید._', this.buildMainKeyboard());
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
        delete this.userData[userId].first_name;
        this.saveData();
        this.userStates[userId] = { step: 'name' };
        await sendMessage(chatId, '_لطفاً نام خود را دوباره وارد کنید._');
      }
    }
    return true;
  }

  // 👋 دستور خروج
  async handleExitCommand(chatId) {
    const exitText = `👋 **با تشکر از استفاده شما از ربات ما!**

🌟 **امیدواریم که تجربه خوبی داشته باشید**
📚 **موفق باشید در یادگیری قرآن کریم**
🔄 **برای استفاده مجدد، دستور /start را بزنید**

_خداحافظ و موفق باشید!_ 🌟`;

    await sendMessage(chatId, exitText);
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
