//🎯 ماژول ثبت‌نام هوشمند - نسخه 2.0.0
// مکانیزم ثبت‌نام کامل با مسیر نهایی هوشمند

const fs = require('fs');
const path = require('path');
const { sendMessage, sendMessageWithInlineKeyboard } = require('./4bale');

class SmartRegistrationModule {
  constructor() {
    this.dataFile = path.join(__dirname, 'data', 'smart_registration.json');
    this.workshopsFile = path.join(__dirname, 'data', 'workshops.json');
    this.userStates = {};
    this.userData = {};
    this.workshops = [];
    
    this.ensureDataDirectory();
    const loadedData = this.loadData(); // داده‌ها را در userData ذخیره کن
    this.userData = loadedData.userData || {};
    this.userStates = loadedData.userStates || {};
    this.loadWorkshops();
    
    console.log(`✅ SmartRegistrationModule initialized successfully with ${Object.keys(this.userData).length} users`);
    console.log(`📁 Data file path: ${this.dataFile}`);
    console.log(`📚 Workshops file path: ${this.workshopsFile}`);
    console.log(`📊 User states loaded: ${Object.keys(this.userStates).length}`);
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
        const parsedData = JSON.parse(data);
        console.log(`📁 [REG] Loaded data for ${Object.keys(parsedData.userData || parsedData).length} users`);
        
        // اگر فایل قدیمی باشد که فقط userData دارد
        if (parsedData.userData && parsedData.userStates) {
          return parsedData;
        } else {
          // تبدیل فایل قدیمی به فرمت جدید
          return {
            userData: parsedData,
            userStates: {}
          };
        }
      }
      console.log(`📁 [REG] No data file found, starting with empty data`);
      return { userData: {}, userStates: {} };
    } catch (error) {
      console.error('❌ Error loading registration data:', error);
      return { userData: {}, userStates: {} };
    }
  }

  loadWorkshops() {
    try {
      if (fs.existsSync(this.workshopsFile)) {
        const data = fs.readFileSync(this.workshopsFile, 'utf8');
        this.workshops = JSON.parse(data);
        console.log(`📚 [REG] Loaded ${Object.keys(this.workshops).length} workshops`);
        return this.workshops;
      }
      this.workshops = {};
      console.log(`📚 [REG] No workshops file found, starting with empty workshops`);
      return this.workshops;
    } catch (error) {
      console.error('❌ Error loading workshops data:', error);
      this.workshops = {};
      return this.workshops;
    }
  }

  saveData() {
    try {
      const dataToSave = {
        userData: this.userData,
        userStates: this.userStates,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(dataToSave, null, 2), 'utf8');
      console.log('✅ Registration data and states saved successfully');
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

  // 🎹 ساخت کیبورد اصلی (شروع مجدد، معرفی مدرسه، معرفی ربات، خروج)
  buildMainKeyboard() {
    return this.buildReplyKeyboard([
      ['شروع مجدد', 'معرفی مدرسه'],
      ['معرفی ربات', 'خروج']
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
      return this.handleStartCommand(chatId, userId);
    } else if (text === 'مدرسه' || text === 'معرفی مدرسه') {
      // بررسی وضعیت کاربر
      if (this.isUserRegistered(userId)) {
        // کاربر شناس: خوش‌آمدگویی + حساب کاربری
        return this.handleRegisteredUserSchool(chatId, userId);
      } else {
        // کاربر ناشناس: معرفی مدرسه + ثبت‌نام
        return this.handleSchoolIntro(chatId);
      }
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

    // 🔍 بررسی اولویت: پردازش مراحل ثبت‌نام
    console.log(`🔍 [REG] Checking if user ${userId} is in registration step...`);
    console.log(`🔍 [REG] userStates keys:`, Object.keys(this.userStates));
    console.log(`🔍 [REG] userData keys:`, Object.keys(this.userData));
    
    if (userId in this.userStates && this.userStates[userId].step) {
      console.log(`🔄 [REG] User ${userId} is in registration step: ${this.userStates[userId].step}`);
      console.log(`🔄 [REG] User state:`, JSON.stringify(this.userStates[userId]));
      console.log(`🔄 [REG] User data:`, JSON.stringify(this.userData[userId]));
      
      const result = await this.handleRegistrationStep(chatId, userId, text, contact);
      if (result) {
        console.log(`✅ [REG] Registration step completed successfully for user ${userId}`);
        return true; // اگر مرحله ثبت‌نام با موفقیت پردازش شد
      }
      // اگر مرحله ثبت‌نام شکست خورد، ادامه نده و false برگردان
      console.log(`⚠️ [REG] Registration step failed for user ${userId}, not proceeding to unknown user flow`);
      return false;
    } else {
      console.log(`❌ [REG] User ${userId} is NOT in registration step`);
      console.log(`❌ [REG] userStates[${userId}]:`, this.userStates[userId]);
    }

    // کاربر جدید - شروع ثبت‌نام
    console.log(`🆕 [REG] User ${userId} is new, starting unknown user flow`);
    return this.handleUnknownUserStart(chatId);
  }

  // 🔄 پردازش callback query ها
  async handleCallback(callback) {
    const { data, message, from } = callback;
    const chatId = message.chat.id;
    const userId = from.id;

    console.log(`🔄 [REG] Callback data: ${data}`);
    console.log(`🔄 [REG] Chat ID: ${chatId}, User ID: ${userId}`);

    try {
      let result;
      switch (data) {
        case 'edit_name':
          console.log(`🔄 [REG] Handling edit_name for user ${userId}`);
          result = await this.handleEditName(chatId, userId);
          break;
        case 'edit_national_id':
          console.log(`🔄 [REG] Handling edit_national_id for user ${userId}`);
          result = await this.handleEditNationalId(chatId, userId);
          break;
        case 'edit_phone':
          console.log(`🔄 [REG] Handling edit_phone for user ${userId}`);
          result = await this.handleEditPhone(chatId, userId);
          break;
        case 'final_confirm':
          console.log(`🔄 [REG] Handling final_confirm for user ${userId}`);
          result = await this.handleFinalConfirm(chatId, userId);
          break;
        case 'next_month_registration':
          console.log(`🔄 [REG] Handling next_month_registration for user ${userId}`);
          result = await this.handleNextMonthRegistration(chatId, userId);
          break;
        case 'back_to_main':
          console.log(`🔄 [REG] Handling back_to_main for user ${userId}`);
          result = await this.handleBackToMainMenu(chatId, userId);
          break;
        case 'quran_student_panel':
          console.log(`🔄 [REG] Handling quran_student_panel for user ${userId}`);
          result = await this.handleQuranStudentPanel(chatId, userId);
          break;
        case 'complete_registration':
          console.log(`🔄 [REG] Handling complete_registration for user ${userId}`);
          result = await this.handleCompleteRegistration(chatId, userId);
          break;
        case 'start_next_month_registration':
          console.log(`🔄 [REG] Handling start_next_month_registration for user ${userId}`);
          console.log(`🔄 [REG] About to call handleRegistrationStart for user ${userId}`);
          result = await this.handleRegistrationStart(chatId, userId);
          console.log(`🔄 [REG] handleRegistrationStart result: ${result}`);
          break;
        default:
          console.log(`⚠️ [REG] Unknown callback data: ${data}`);
          result = false;
      }

      if (result) {
        console.log(`✅ [REG] Callback ${data} handled successfully for user ${userId}`);
      } else {
        console.error(`❌ [REG] Callback ${data} failed for user ${userId}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ [REG] Error handling callback ${data} for user ${userId}:`, error);
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
• تجوید قرآن کریم • صوت و لحن
• حفظ قرآن کریم • تفسیر قرآن

💎 **مزایا:** اساتید مجرب، کلاس‌های آنلاین و حضوری، گواهی پایان دوره

برای شروع، لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;

    await sendMessage(chatId, welcomeText, this.buildMainKeyboard());
    return true;
  }

  // 🏫 معرفی مدرسه
  async handleSchoolIntro(chatId) {
    try {
      // بررسی تنظیمات مدیر
      const { isButtonVisible } = require('./3config');
      const { getRegistrationMonthText } = require('./1time');
      const isRegistrationEnabled = isButtonVisible('REGISTRATION_BUTTON');
      
      let schoolText = `🏫 **مدرسه تلاوت قرآن کریم**

🌟 مدرسه‌ای معتبر با ۱۰+ سال سابقه در آموزش قرآن کریم

📅 **${getRegistrationMonthText(true)}**`;

      if (isRegistrationEnabled) {
        // استفاده از منطق ماه‌بندی موجود
        const buttonText = getRegistrationMonthText(true);
        const nextMonthText = getRegistrationMonthText(false);
        


        const inlineKeyboard = [
          [{ text: buttonText, callback_data: 'next_month_registration' }]
        ];

        await sendMessage(chatId, schoolText);
        await sendMessageWithInlineKeyboard(chatId, '', inlineKeyboard);
      } else {
        // اگر ثبت‌نام غیرفعال باشد، متن ماه آینده را نمایش بده
        const nextMonthText = getRegistrationMonthText(false);
        schoolText += `\n\n${nextMonthText}`;
        schoolText += `\n\nلطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;
        await sendMessage(chatId, schoolText, this.buildMainKeyboard());
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error in handleSchoolIntro:', error);
      // در صورت خطا، منوی معمولی نمایش بده
      const fallbackText = `🏫 **مدرسه تلاوت قرآن کریم**

🌟 مدرسه‌ای معتبر با ۱۰+ سال سابقه در آموزش قرآن کریم`;
      
      await sendMessage(chatId, fallbackText, this.buildMainKeyboard());
      return true;
    }
  }

  // 🏫 معرفی مدرسه برای کاربر شناس
  async handleRegisteredUserSchool(chatId, userId) {
    try {
      const userInfo = this.userData[userId];
      const firstName = userInfo.first_name || 'کاربر';
      
      const welcomeText = `🏫 **مدرسه تلاوت قرآن کریم**

سلام ${firstName} عزیز! 👋
به مدرسه تلاوت قرآن کریم خوش آمدید.

🌟 مدرسه‌ای معتبر با ۱۰+ سال سابقه در آموزش قرآن کریم

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;

      await sendMessage(chatId, welcomeText, this.buildMainKeyboard());
      return true;
    } catch (error) {
      console.error('❌ Error in handleRegisteredUserSchool:', error);
      // در صورت خطا، منوی معمولی نمایش بده
      await sendMessage(chatId, '_🏫 به مدرسه تلاوت قرآن کریم خوش آمدید!_', this.buildMainKeyboard());
      return true;
    }
  }

  // 🤖 معرفی ربات
  async handleQuranBotIntro(chatId) {
    const botText = `🤖 **ربات مدرسه تلاوت قرآن**

🌟 **قابلیت‌ها:** ثبت‌نام آنلاین، مشاهده برنامه کلاس‌ها، ارتباط با اساتید، اخبار و پشتیبانی

📱 **نحوه استفاده:** ثبت‌نام → انتخاب کلاس → پرداخت → دریافت لینک → شروع یادگیری

🔧 **دستورات:** /start، /help، /register، /workshops

💡 **نکته:** ربات همیشه در دسترس است.

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;

    await sendMessage(chatId, botText, this.buildMainKeyboard());
    return true;
  }

  // 📝 شروع ثبت‌نام
  async handleRegistrationStart(chatId, userId) {
    console.log(`🚀 [REG] handleRegistrationStart called for user ${userId}`);
    
    try {
      this.userStates[userId] = { step: 'name' };
      this.userData[userId] = {};
      this.saveData();
      
      await sendMessage(chatId, '_لطفاً نام و نام خانوادگی خود را وارد کنید (مثال: علی رضایی)._', this.buildReplyKeyboard([
        ['برگشت به قبل', 'خروج']
      ]));
      
      return true;
    } catch (error) {
      console.error(`❌ [REG] Error in handleRegistrationStart for user ${userId}:`, error);
      return false;
    }
  }

  // 🔄 پردازش مراحل ثبت‌نام
  async handleRegistrationStep(chatId, userId, text, contact) {
    console.log(`🔍 [REG] handleRegistrationStep called for user ${userId}`);
    console.log(`🔍 [REG] userStates[${userId}]:`, JSON.stringify(this.userStates[userId]));
    
    if (!(userId in this.userStates)) {
      console.warn(`⚠️ [REG] User ${userId} not in user_states`);
      return false;
    }

    const state = this.userStates[userId];
    const step = state.step;

    console.log(`🔄 [REG] Processing registration step for user ${userId}: step=${step}, text='${text}', contact=${!!contact}`);

    switch (step) {
      case 'name':
        console.log(`🔄 [REG] Calling handleNameStep for user ${userId}`);
        return this.handleNameStep(chatId, userId, text);
      case 'national_id':
        console.log(`🔄 [REG] Calling handleNationalIdStep for user ${userId}`);
        return this.handleNationalIdStep(chatId, userId, text);
      case 'phone':
        console.log(`🔄 [REG] Calling handlePhoneStep for user ${userId}`);
        return this.handlePhoneStep(chatId, userId, contact);
      default:
        console.warn(`⚠️ [REG] Unknown step '${step}' for user ${userId}`);
        return false;
    }
  }

  // 📝 مرحله نام
  async handleNameStep(chatId, userId, text) {
    if (!text || text.trim().length < 2) {
      await sendMessage(chatId, '❌ نام وارد شده خیلی کوتاه است. لطفاً نام کامل خود را وارد کنید.');
      return false;
    }

    const trimmedName = text.trim();
    this.userData[userId].full_name = trimmedName;
    this.userData[userId].first_name = trimmedName.split(' ')[0];
    
    // تنظیم مرحله بعدی قبل از ارسال پیام‌ها
    this.userStates[userId].step = 'national_id';
    console.log(`✅ [REG] User ${userId} moved from name step to national_id step`);
    console.log(`✅ [REG] userStates[${userId}]:`, JSON.stringify(this.userStates[userId]));
    console.log(`✅ [REG] userData[${userId}]:`, JSON.stringify(this.userData[userId]));
    
    // ذخیره داده‌ها
    this.saveData();

    const firstName = this.userData[userId].first_name;
    const statusText = `_${firstName} عزیز،\nنام شما: ${trimmedName}\nکد ملی: هنوز مانده\nتلفن: هنوز مانده_\n\nلطفاً کد ملی ۱۰ رقمی خود را وارد کنید.`;

    await sendMessage(chatId, statusText, this.buildReplyKeyboard([
      ['برگشت به قبل', 'خروج']
    ]));

    // دکمه تصحیح نام
    await sendMessageWithInlineKeyboard(chatId, 'می‌خواهید نام را ویرایش کنید؟', this.buildInlineKeyboard([
      [{ text: '✏️ تصحیح نام', callback_data: 'edit_name' }]
    ]));

    return true;
  }

  // 🆔 مرحله کد ملی
  async handleNationalIdStep(chatId, userId, text) {
    if (this.isValidNationalId(text)) {
      this.userData[userId].national_id = text;
      
      // تنظیم مرحله بعدی قبل از ارسال پیام‌ها
      this.userStates[userId].step = 'phone';
      console.log(`✅ [REG] User ${userId} moved from national_id step to phone step`);
      
      // ذخیره داده‌ها
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
    // پاک کردن state ثبت‌نام
    if (userId in this.userStates) {
      delete this.userStates[userId];
      this.saveData();
    }

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

  // 📅 ثبت‌نام ماه آینده
  async handleNextMonthRegistration(chatId, userId) {
    try {
      // بررسی اینکه آیا کاربر قبلاً ثبت‌نام کرده یا نه
      if (this.isUserRegistered(userId)) {
        if (this.isRegistrationComplete(userId)) {
          // کاربر قبلاً ثبت‌نام کامل دارد
          const userInfo = this.userData[userId];
          const firstName = userInfo.first_name || 'کاربر';
          
          const alreadyRegisteredText = `🎉 **${firstName} عزیز، شما قبلاً ثبت‌نام کرده‌اید!**

✅ **وضعیت ثبت‌نام:**
• نام: ${userInfo.full_name}
• کد ملی: ${userInfo.national_id}
• تلفن: ${userInfo.phone}

📅 **برای ثبت‌نام در ماه آینده:**
لطفاً با شماره پشتیبانی تماس بگیرید یا از طریق پنل قرآن‌آموز اقدام کنید.`;

          const inlineKeyboard = [
            [{ text: '📚 پنل قرآن‌آموز', callback_data: 'quran_student_panel' }],
            [{ text: '🏠 برگشت به منو', callback_data: 'back_to_main' }]
          ];

          await sendMessage(chatId, alreadyRegisteredText);
          await sendMessageWithInlineKeyboard(chatId, 'لطفاً گزینه مورد نظر را انتخاب کنید:', inlineKeyboard);
        } else {
          // کاربر ثبت‌نام ناقص دارد
          const missingFields = this.getMissingFields(userId);
          const missingText = missingFields.join('، ');

          const incompleteText = `⚠️ **ثبت‌نام ناقص**

برای ثبت‌نام در ماه آینده، ابتدا باید ثبت‌نام فعلی خود را تکمیل کنید.

❌ **فیلدهای ناقص:** ${missingText}

لطفاً ابتدا ثبت‌نام خود را تکمیل کنید:`;

          const inlineKeyboard = [
            [{ text: '✏️ تکمیل ثبت‌نام', callback_data: 'complete_registration' }],
            [{ text: '🏠 برگشت به منو', callback_data: 'back_to_main' }]
          ];

          await sendMessage(chatId, incompleteText);
          await sendMessageWithInlineKeyboard(chatId, 'لطفاً گزینه مورد نظر را انتخاب کنید:', inlineKeyboard);
        }
      } else {
        // کاربر جدید - شروع مستقیم ثبت‌نام
        const newUserText = `🎯 **ثبت‌نام ماه آینده**

🌟 **خوش آمدید!** برای ثبت‌نام در کلاس‌های ماه آینده، لطفاً اطلاعات خود را وارد کنید.

📋 **مراحل ثبت‌نام:**
۱. نام و نام خانوادگی
۲. کد ملی
۳. شماره تلفن

💡 **نکته:** ثبت‌نام شما برای ماه آینده ذخیره می‌شود.

📝 **لطفاً نام و نام خانوادگی خود را وارد کنید:**`;

        // شروع مستقیم ثبت‌نام بدون نیاز به کلیک اضافی
        this.userStates[userId] = { step: 'name' };
        this.userData[userId] = {};
        
        console.log(`✅ [REG] User ${userId} started registration directly to name step`);
        console.log(`✅ [REG] userStates[${userId}]:`, JSON.stringify(this.userStates[userId]));
        console.log(`✅ [REG] userData[${userId}]:`, JSON.stringify(this.userData[userId]));
        
        this.saveData();

        await sendMessage(chatId, newUserText, this.buildReplyKeyboard([
          ['برگشت به قبل', 'خروج']
        ]));
      }

      return true;
    } catch (error) {
      console.error('❌ Error in handleNextMonthRegistration:', error);
      await sendMessage(chatId, '❌ خطا در نمایش ثبت‌نام ماه آینده. لطفاً دوباره تلاش کنید.', this.buildMainKeyboard());
      return false;
    }
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
