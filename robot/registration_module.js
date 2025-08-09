//📝 ماژول ثبت‌نام - نسخه 1.0.0
// مشابه سیستم پایتون registration_module.py

const fs = require('fs');
const path = require('path');
const { sendMessage, sendMessageWithInlineKeyboard, editMessageWithInlineKeyboard } = require('./4bale');
const { ADMIN_IDS, AUTHORIZED_USER_IDS, HELPER_COACH_USER_IDS } = require('./3config');

class RegistrationModule {
  constructor() {
    this.dataFile = 'registration_data.json';
    this.userData = this.loadData();
    this.userStates = {}; // وضعیت کاربران برای ثبت‌نام
    console.log('✅ RegistrationModule initialized successfully');
  }

  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = fs.readFileSync(this.dataFile, 'utf8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error('Error loading registration data:', error);
      return {};
    }
  }

  saveData(data) {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2), 'utf8');
      console.log('Registration data saved successfully');
    } catch (error) {
      console.error('Error saving registration data:', error);
    }
  }

  isUserRegistered(userId) {
    const userIdStr = userId.toString();
    return userIdStr in this.userData && 'full_name' in this.userData[userIdStr];
  }

  isRegistrationComplete(userId) {
    const userIdStr = userId.toString();
    if (!(userIdStr in this.userData)) {
      return false;
    }
    
    const userInfo = this.userData[userIdStr];
    const requiredFields = ['full_name', 'national_id', 'phone'];
    return requiredFields.every(field => userInfo[field] && userInfo[field].trim());
  }

  getMissingFields(userId) {
    const userIdStr = userId.toString();
    if (!(userIdStr in this.userData)) {
      return ['نام', 'کد ملی', 'تلفن'];
    }
    
    const userInfo = this.userData[userIdStr];
    const missing = [];
    
    if (!userInfo.full_name || !userInfo.full_name.trim()) {
      missing.push('نام');
    }
    if (!userInfo.national_id || !userInfo.national_id.trim()) {
      missing.push('کد ملی');
    }
    if (!userInfo.phone || !userInfo.phone.trim()) {
      missing.push('تلفن');
    }
    
    return missing;
  }

  isAdminOrTeacher(userId) {
    const { getUserRole } = require('./6mid');
    const { ROLES } = require('./3config');
    const role = getUserRole(userId);
    return role === ROLES.SCHOOL_ADMIN ||
           role === ROLES.GROUP_ADMIN ||
           role === ROLES.COACH ||
           role === ROLES.ASSISTANT;
  }

  getUserRole(userId) {
    const { getUserRole: getRoleFromMid } = require('./6mid');
    return getRoleFromMid(userId);
  }

  isValidNationalId(nid) {
    return /^\d{10}$/.test(nid);
  }

  buildReplyKeyboard(buttons) {
    return {
      keyboard: buttons.map(row => row.map(btn => ({ text: btn }))),
      resize_keyboard: true
    };
  }

  buildInlineKeyboard(buttons) {
    return { inline_keyboard: buttons };
  }

  async handleMessage(message) {
    if (!message || !message.chat || !message.from) {
      return false;
    }

    const chatId = message.chat.id;
    const userId = chatId; // استفاده از chat_id به عنوان user_id
    const userIdStr = userId.toString();
    const text = message.text || '';
    const contact = message.contact;

    console.log(`Processing message from user ${userId}: text='${text}', contact=${!!contact}`);

    // بررسی مدیر یا مربی بودن
    if (this.isAdminOrTeacher(userId)) {
      return this.handleAdminMessage(chatId, userId, text);
    }

    // پردازش پیام‌های معمولی
    if (text === '/start' || text === 'شروع مجدد'|| text === 'شروع') {
      return this.handleStartCommand(chatId, userIdStr);
    } else if (text === 'معرفی مدرسه') {
      return this.handleSchoolIntro(chatId);
    } else if (text === 'ربات' || text === '/ربات' || text === '🤖 ربات') {
      return this.handleBotIntro(chatId);
    } else if (text === 'ثبت‌نام' || text === 'ثبت‌نام مجدد') {
      return this.handleRegistrationStart(chatId, userIdStr);
    } else if (text === 'خروج') {
      return this.handleExitCommand(chatId);
    } else if (text === 'برگشت به قبل') {
      return this.handleBackCommand(chatId, userIdStr);
    } else if (text === 'پنل قرآن‌آموز') {
      return this.handleQuranStudentPanel(chatId, userIdStr);
    } else if (text === '📚 انتخاب کلاس') {
      return this.handleSelectClass(chatId, userIdStr);
    } else if (text === 'شروع') {
      if (this.isUserRegistered(userIdStr)) {
        return this.handleQuranStudentPanel(chatId, userIdStr);
      } else {
        return this.handleStartCommand(chatId, userIdStr);
      }
    } else if (contact && userIdStr in this.userStates) {
      return this.handleRegistrationStep(chatId, userIdStr, '', contact);
    } else if (userIdStr in this.userStates) {
      return this.handleRegistrationStep(chatId, userIdStr, text, contact);
    } else {
      if (this.isUserRegistered(userIdStr)) {
        return this.handleQuranStudentPanel(chatId, userIdStr);
      } else {
        return this.handleStartCommand(chatId, userIdStr);
      }
    }
  }

  async handleCallback(callback) {
    if (!callback || !callback.message || !callback.from || !callback.data) {
      return false;
    }

    const chatId = callback.message.chat.id;
    const userIdStr = chatId.toString();
    const data = callback.data;

    console.log(`Processing callback from user ${chatId}: ${data}`);

    if (data === 'start_registration') {
      return this.handleRegistrationStart(chatId, userIdStr);
    } else if (data === 'edit_name') {
      return this.handleEditName(chatId, userIdStr);
    } else if (data === 'edit_national_id') {
      return this.handleEditNationalId(chatId, userIdStr);
    } else if (data === 'edit_phone') {
      return this.handleEditPhone(chatId, userIdStr);
    } else if (data === 'edit_info') {
      return this.handleEditInfo(chatId, userIdStr);
    } else if (data === 'final_confirm') {
      return this.handleFinalConfirm(chatId, userIdStr);
    } else if (data === 'quran_student_panel') {
      return this.handleQuranStudentPanel(chatId, userIdStr);
    } else if (data === 'complete_registration') {
      return this.handleCompleteRegistration(chatId, userIdStr);
    } else if (data === 'back_to_start') {
      return this.handleStartCommand(chatId, userIdStr);
    }

    return false;
  }

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
          ['معرفی مدرسه', 'ربات'],
          ['خروج']
        ]));
      } else {
        const missingFields = this.getMissingFields(userId);
        const missingText = missingFields.join('، ');

        const welcomeText = `⚠️ ${firstName} عزیز، ثبت‌نام شما ناقص است!\n\n📋 اطلاعات فعلی:\n*نام*: ${fullName}\n*کد ملی*: ${nationalId}\n*تلفن*: ${phone}\n\n❌ فیلدهای ناقص: ${missingText}`;

        await sendMessage(chatId, welcomeText, this.buildReplyKeyboard([
          ['شروع', 'معرفی مدرسه'],
          ['ربات', 'ثبت‌نام مجدد'],
          ['خروج']
        ]));
      }
    } else {
      const welcomeText = '_🌟 خوش آمدید! به مدرسه تلاوت خوش آمدید!_';
      await sendMessage(chatId, welcomeText, this.buildReplyKeyboard([
        ['شروع', 'خروج'],
        ['معرفی مدرسه', 'ربات']
      ]));
    }
    return true;
  }

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
• قیمت مناسب

📝 *ثبت‌نام ماهانه:*
ثبت‌نام به صورت ماهانه انجام می‌شود و مدیر مدرسه زمان آن را مشخص می‌کند._

برای ثبت‌نام روی دکمه زیر کلیک کنید:`;

    await sendMessage(chatId, introText, this.buildInlineKeyboard([
      [{ text: '📝 ثبت‌نام شهریور', callback_data: 'start_registration' }]
    ]));
    return true;
  }

  async handleBotIntro(chatId) {
    const userId = chatId.toString();
    const isRegistered = this.isUserRegistered(userId);
    
    const botIntroText = `🤖 *ربات قرآنی هوشمند*

📚 **قابلیت‌های اصلی:**
• 📖 آموزش تلاوت قرآن کریم
• 🧠 حفظ آیات کریمه
• 📝 تفسیر آیات
• 📊 آزمون‌های قرآنی
• 📈 گزارش پیشرفت
• 👥 مدیریت گروه‌ها
• 📋 حضور و غیاب
• 🏭 مدیریت کارگاه‌ها
• ⚙️ تنظیمات پیشرفته

🎯 **دستورات مهم:**
• /عضو - عضویت در گروه
• /لیست - مشاهده لیست اعضا
• /گروه - مدیریت گروه‌ها (مدیر مدرسه)
• /کارگاه - مدیریت کارگاه‌ها (مدیر مدرسه)
• /تنظیمات - تنظیمات ربات (فقط مدیر مدرسه)

🌟 **برای شروع، یکی از گزینه‌های زیر را انتخاب کنید:**`;

    if (isRegistered) {
      await sendMessage(chatId, botIntroText, this.buildReplyKeyboard([
        ['شروع مجدد', 'معرفی مدرسه'],
        ['پنل قرآن‌آموز'],
        ['خروج']
      ]));
    } else {
      await sendMessage(chatId, botIntroText, this.buildReplyKeyboard([
        ['شروع مجدد', 'معرفی مدرسه'],
        ['ثبت‌نام'],
        ['خروج']
      ]));
      
      // اضافه کردن دکمه شیشه‌ای ثبت‌نام
      await sendMessage(chatId, '_برای ثبت‌نام روی دکمه زیر کلیک کنید:_', this.buildInlineKeyboard([
        [{ text: '📝 ثبت‌نام', callback_data: 'start_registration' }]
      ]));
    }
    return true;
  }

  async handleRegistrationStart(chatId, userId) {
    this.userStates[userId] = { step: 'name' };
    this.userData[userId] = {};
    this.saveData(this.userData);

    await sendMessage(chatId, '_لطفاً نام و نام خانوادگی خود را وارد کنید (مثال: علی رضایی)._');
    return true;
  }

  async handleRegistrationStep(chatId, userId, text, contact) {
    if (!(userId in this.userStates)) {
      console.warn(`User ${userId} not in user_states`);
      return false;
    }

    const state = this.userStates[userId];
    const step = state.step;

    console.log(`Processing registration step for user ${userId}: step=${step}, text='${text}', contact=${!!contact}`);

    if (step === 'name') {
      this.userData[userId].full_name = text;
      this.userData[userId].first_name = text.split(' ')[0];
      this.saveData(this.userData);

      const firstName = this.userData[userId].first_name;
      const statusText = `_${firstName} عزیز،\nنام شما: ${text}\nکد ملی: هنوز مانده\nتلفن: هنوز مانده_\n\nلطفاً کد ملی ۱۰ رقمی خود را وارد کنید.`;

      await sendMessage(chatId, statusText);

      await sendMessage(chatId, 'می‌خواهید نام را ویرایش کنید؟', this.buildInlineKeyboard([
        [{ text: '✏️ تصحیح نام', callback_data: 'edit_name' }]
      ]));

      state.step = 'national_id';

    } else if (step === 'national_id') {
      if (this.isValidNationalId(text)) {
        this.userData[userId].national_id = text;
        this.saveData(this.userData);

        const firstName = this.userData[userId].first_name;
        const fullName = this.userData[userId].full_name;
        const statusText = `_${firstName} عزیز،\nنام: ${fullName}\nکد ملی: ${text}\nتلفن: هنوز مانده_\n\n📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید.`;

        await sendMessage(chatId, statusText);

        await sendMessage(chatId, '📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید.', {
          keyboard: [[{ text: '📱 ارسال شماره تلفن', request_contact: true }]],
          resize_keyboard: true
        });

        await sendMessage(chatId, 'یا می‌توانید اطلاعات را تصحیح کنید:', this.buildInlineKeyboard([
          [{ text: '✏️ تصحیح نام', callback_data: 'edit_name' }],
          [{ text: '🆔 تصحیح کد ملی', callback_data: 'edit_national_id' }]
        ]));

        state.step = 'phone';
      } else {
        await sendMessage(chatId, '_❌ کد ملی نامعتبر است. لطفاً ۱۰ رقم وارد کنید._');
      }

    } else if (step === 'phone' && contact) {
      const phoneNumber = contact.phone_number;
      this.userData[userId].phone = phoneNumber;
      this.saveData(this.userData);

      console.log(`Phone number saved for user ${userId}: ${phoneNumber}`);

      const firstName = this.userData[userId].first_name;
      const fullName = this.userData[userId].full_name;
      const nationalId = this.userData[userId].national_id;

      const statusText = `_📋 ${firstName} عزیز، حساب کاربری شما:\nنام: ${fullName}\nکد ملی: ${nationalId}\nتلفن: ${phoneNumber}_`;

      await sendMessage(chatId, statusText, this.buildInlineKeyboard([
        [{ text: '✅ تأیید نهایی', callback_data: 'final_confirm' }]
      ]));

      if (userId in this.userStates) {
        delete this.userStates[userId];
        console.log(`Registration completed for user ${userId}`);
      }
    } else if (step === 'phone' && !contact) {
      console.warn(`User ${userId} in phone step but no contact provided`);
      await sendMessage(chatId, '_📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید._', {
        keyboard: [[{ text: '📱 ارسال شماره تلفن', request_contact: true }]],
        resize_keyboard: true
      });
    }

    return true;
  }

  async handleEditName(chatId, userId) {
    if (userId in this.userData) {
      delete this.userData[userId].full_name;
      this.saveData(this.userData);
      this.userStates[userId] = { step: 'name' };
      await sendMessage(chatId, '_✏️ لطفاً نام و نام خانوادگی جدید خود را وارد کنید._', this.buildReplyKeyboard([
        ['برگشت به قبل', 'خروج']
      ]));
    }
    return true;
  }

  async handleEditNationalId(chatId, userId) {
    if (userId in this.userData) {
      delete this.userData[userId].national_id;
      this.saveData(this.userData);
      this.userStates[userId] = { step: 'national_id' };
      await sendMessage(chatId, '_🆔 لطفاً کد ملی جدید خود را وارد کنید._', this.buildReplyKeyboard([
        ['برگشت به قبل', 'خروج']
      ]));
    }
    return true;
  }

  async handleEditPhone(chatId, userId) {
    if (userId in this.userData) {
      delete this.userData[userId].phone;
      this.saveData(this.userData);
      this.userStates[userId] = { step: 'phone' };
      await sendMessage(chatId, '_📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید._', {
        keyboard: [[{ text: '📱 ارسال شماره تلفن', request_contact: true }], [{ text: 'برگشت به قبل' }]],
        resize_keyboard: true,
        one_time_keyboard: false
      });
    }
    return true;
  }

  async handleEditInfo(chatId, userId) {
    if (userId in this.userData) {
      this.userData[userId] = {};
      this.saveData(this.userData);
      this.userStates[userId] = { step: 'name' };
      await sendMessage(chatId, '_بیایید دوباره شروع کنیم. لطفاً نام و نام خانوادگی خود را وارد کنید._');
    }
    return true;
  }

  async handleFinalConfirm(chatId, userId) {
    if (userId in this.userData) {
      try {
        const firstName = this.userData[userId].first_name || 'کاربر';
        const fullName = this.userData[userId].full_name || 'نامشخص';
        const nationalId = this.userData[userId].national_id || '';
        const phone = this.userData[userId].phone || '';

        this.userData[userId].user_type = 'quran_student';
        this.saveData(this.userData);

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
        console.error(`Error in final_confirm for user ${userId}:`, error);
        await sendMessage(chatId, '🎉 ثبت‌نام شما با موفقیت تکمیل شد!', this.buildReplyKeyboard([
          ['شروع مجدد', 'خروج'],
          ['پنل قرآن‌آموز']
        ]));
      }
    }
    return true;
  }

  async syncWithWebsite(userId, fullName, nationalId, phone) {
    try {
      const axios = require('axios');
      const websiteUrl = 'http://localhost:8000'; // آدرس سایت
      
      const response = await axios.post(`${websiteUrl}/api/bot-register`, {
        user_id: userId,
        full_name: fullName,
        national_id: nationalId,
        phone: phone
      });

      if (response.data.success) {
        console.log(`✅ User ${userId} synced with website successfully`);
        return true;
      } else {
        console.warn(`⚠️ Website sync failed for user ${userId}: ${response.data.message}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error syncing user ${userId} with website:`, error.message);
      return false;
    }
  }

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

        await sendMessage(chatId, warningText, this.buildInlineKeyboard([
          [{ text: '✏️ تصحیح نام', callback_data: 'edit_name' }],
          [{ text: '🆔 تصحیح کد ملی', callback_data: 'edit_national_id' }],
          [{ text: '📱 تصحیح تلفن', callback_data: 'edit_phone' }]
        ]));
      }
    } else {
      await sendMessage(chatId, '_❌ شما هنوز ثبت‌نام نکرده‌اید. لطفاً ابتدا ثبت‌نام کنید._', this.buildReplyKeyboard([
        ['شروع مجدد', 'ثبت‌نام']
      ]));
      
      // اضافه کردن دکمه شیشه‌ای ثبت‌نام
      await sendMessage(chatId, '_برای ثبت‌نام روی دکمه زیر کلیک کنید:_', this.buildInlineKeyboard([
        [{ text: '📝 ثبت‌نام', callback_data: 'start_registration' }]
      ]));
    }
    return true;
  }

  async handleAdminMessage(chatId, userId, text) {
    const role = this.getUserRole(userId);
    const roleName = this.getRoleDisplayName(role);

    if (text === '/start' || text === 'شروع مجدد' || text === 'شروع') {
      await sendMessage(chatId, `_👑 ${roleName} عزیز، به پنل مدیریتی خوش آمدید!_`, this.buildReplyKeyboard([
        ['📊 آمار کاربران', '👥 مدیریت کاربران'],
        ['📚 مدیریت کلاس‌ها', '⚙️ تنظیمات'],
        ['🔙 بازگشت به حالت عادی']
      ]));
    } else if (text === '🔙 بازگشت به حالت عادی') {
      await sendMessage(chatId, '_🌟 خوش آمدید! به مدرسه تلاوت خوش آمدید!_', this.buildReplyKeyboard([
        ['شروع مجدد', 'معرفی مدرسه', 'خروج']
      ]));
    } else {
      // برای سایر پیام‌ها، به سیستم اصلی برگرد
      return false;
    }
    return true;
  }

  getRoleDisplayName(role) {
    const { ROLES } = require('./3config');
    switch (role) {
      case ROLES.SCHOOL_ADMIN:
        return 'مدیر مدرسه';
      case ROLES.GROUP_ADMIN:
        return 'مدیر گروه';
      case ROLES.COACH:
        return 'مربی';
      case ROLES.ASSISTANT:
        return 'کمک مربی';
      default:
        return 'کاربر';
    }
  }

  async handleExitCommand(chatId) {
    await sendMessage(chatId, '_👋 با تشکر از استفاده شما از ربات ما. موفق باشید! 🌟_');
    return true;
  }

  async handleSelectClass(chatId, userId) {
    try {
      const { KargahModule } = require('./12kargah');
      const kargahModule = new KargahModule();
      kargahModule.sendMessage = sendMessage;
      kargahModule.sendMessageWithInlineKeyboard = sendMessageWithInlineKeyboard;
      kargahModule.showWorkshopsForStudent(chatId, userId);
    } catch (error) {
      console.error('Error showing workshops:', error);
      await sendMessage(chatId, '❌ خطا در نمایش کلاس‌ها. لطفاً دوباره تلاش کنید.');
    }
    return true;
  }

  async handleBackCommand(chatId, userId) {
    if (userId in this.userData) {
      if (this.userData[userId].phone) {
        delete this.userData[userId].phone;
        this.saveData(this.userData);
        this.userStates[userId] = { step: 'phone' };
        await sendMessage(chatId, '_لطفاً شماره تلفن خود را دوباره ارسال کنید._', {
          keyboard: [[{ text: '📱 ارسال شماره تلفن', request_contact: true }]],
          resize_keyboard: true
        });
      } else if (this.userData[userId].national_id) {
        delete this.userData[userId].national_id;
        this.saveData(this.userData);
        this.userStates[userId] = { step: 'national_id' };
        await sendMessage(chatId, '_لطفاً کد ملی خود را دوباره وارد کنید._');
      } else if (this.userData[userId].full_name) {
        delete this.userData[userId].full_name;
        this.saveData(this.userData);
        this.userStates[userId] = { step: 'name' };
        await sendMessage(chatId, '_لطفاً نام خود را دوباره وارد کنید._');
      }
    }
    return true;
  }

  getRegisteredUsersCount() {
    return Object.keys(this.userData).filter(userId => this.isUserRegistered(userId)).length;
  }

  getAllUsersCount() {
    return Object.keys(this.userData).length;
  }

  exportUserData(userId) {
    const userIdStr = userId.toString();
    if (userIdStr in this.userData) {
      return { ...this.userData[userIdStr] };
    }
    return null;
  }
}

// ایجاد نمونه سراسری
const registrationModule = new RegistrationModule();

module.exports = {
  RegistrationModule,
  registrationModule
};
