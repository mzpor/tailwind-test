//🎯 ماژول مدیریت یکپارچه ثبت‌نام - نسخه 1.0.0
// مدیریت هماهنگ ثبت‌نام بین ربات و سایت

const fs = require('fs');
const path = require('path');
const { sendMessage, sendMessageWithInlineKeyboard } = require('./4bale');

class UnifiedRegistrationManager {
  constructor() {
    this.registrationsFile = 'data/registrations.json';
    this.registrationDataFile = 'data/registration_data.json';
    this.workshopsFile = 'data/workshops.json';
    
    this.registrations = this.loadData(this.registrationsFile);
    this.registrationData = this.loadData(this.registrationDataFile);
    this.workshops = this.loadData(this.workshopsFile);
    
    console.log('✅ UnifiedRegistrationManager initialized successfully');
  }

  loadData(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error(`Error loading ${filePath}:`, error);
      return {};
    }
  }

  saveData(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`✅ Data saved to ${filePath} successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving to ${filePath}:`, error);
      return false;
    }
  }

  // 🔍 یافتن کاربر بر اساس کد ملی
  findUserByNationalId(nationalId) {
    // جستجو در registrations.json
    for (const [userId, userData] of Object.entries(this.registrations)) {
      if (userData.nationalId === nationalId) {
        return { source: 'bot', userId, userData };
      }
    }
    
    // جستجو در registration_data.json
    for (const [userId, userData] of Object.entries(this.registrationData)) {
      if (userData.nationalId === nationalId) {
        return { source: 'website', userId, userData };
      }
    }
    
    return null;
  }

  // 🔍 یافتن کاربر بر اساس شماره تلفن
  findUserByPhone(phone) {
    // جستجو در registrations.json
    for (const [userId, userData] of Object.entries(this.registrations)) {
      if (userData.phone === phone) {
        return { source: 'bot', userId, userData };
      }
    }
    
    // جستجو در registration_data.json
    for (const [userId, userData] of Object.entries(this.registrationData)) {
      if (userData.phone === phone) {
        return { source: 'website', userId, userData };
      }
    }
    
    return null;
  }

  // 🔍 یافتن کاربر بر اساس userId
  findUserById(userId) {
    if (this.registrations[userId]) {
      return { source: 'bot', userId, userData: this.registrations[userId] };
    }
    
    if (this.registrationData[userId]) {
      return { source: 'website', userId, userData: this.registrationData[userId] };
    }
    
    return null;
  }

  // 🔍 بررسی ثبت‌نام کاربر - سازگار با سیستم قدیمی
  isUserRegistered(userId) {
    const userIdStr = userId.toString();
    const userRecord = this.findUserById(userIdStr);
    return userRecord && userRecord.userData.fullName && userRecord.userData.fullName.trim() !== '';
  }

  // 📝 ثبت‌نام جدید از ربات
  registerFromBot(userId, userData) {
    const registrationId = `r_${Date.now()}`;
    
    const newRegistration = {
      fullName: userData.fullName || '',
      firstName: userData.firstName || userData.fullName?.split(' ')[0] || '',
      nationalId: userData.nationalId || null,
      phone: userData.phone || '',
      workshopId: userData.workshopId || null,
      status: this.getRegistrationStatus(userData),
      source: 'bot',
      registrationComplete: this.isRegistrationComplete(userData),
      ts: Date.now(),
      lastUpdated: Date.now()
    };

    this.registrations[registrationId] = newRegistration;
    
    // هماهنگ‌سازی با registration_data.json
    this.syncWithRegistrationData(registrationId, newRegistration);
    
    // ذخیره در هر دو فایل
    this.saveData(this.registrationsFile, this.registrations);
    this.saveData(this.registrationDataFile, this.registrationData);
    
    console.log(`✅ New bot registration created: ${registrationId}`);
    return registrationId;
  }

  // 🌐 ثبت‌نام جدید از سایت
  registerFromWebsite(nationalId, userData) {
    const websiteUserId = nationalId; // استفاده از کد ملی به عنوان userId
    
    const newRegistration = {
      fullName: userData.fullName || '',
      firstName: userData.firstName || userData.fullName?.split(' ')[0] || '',
      nationalId: nationalId,
      phone: userData.phone || '',
      workshopId: userData.workshopId || null,
      status: this.getRegistrationStatus(userData),
      source: 'website',
      registrationComplete: this.isRegistrationComplete(userData),
      ts: Date.now(),
      lastUpdated: Date.now()
    };

    this.registrationData[websiteUserId] = newRegistration;
    
    // هماهنگ‌سازی با registrations.json
    this.syncWithRegistrations(websiteUserId, newRegistration);
    
    // ذخیره در هر دو فایل
    this.saveData(this.registrationsFile, this.registrations);
    this.saveData(this.registrationDataFile, this.registrationData);
    
    console.log(`✅ New website registration created: ${websiteUserId}`);
    return websiteUserId;
  }

  // 🔄 به‌روزرسانی اطلاعات کاربر
  updateUser(userId, updates, source = 'bot') {
    let userRecord = null;
    
    if (source === 'bot') {
      if (this.registrations[userId]) {
        userRecord = this.registrations[userId];
        Object.assign(userRecord, updates, { lastUpdated: Date.now() });
        this.registrations[userId] = userRecord;
      }
    } else {
      if (this.registrationData[userId]) {
        userRecord = this.registrationData[userId];
        Object.assign(userRecord, updates, { lastUpdated: Date.now() });
        this.registrationData[userId] = userRecord;
      }
    }
    
    if (userRecord) {
      // هماهنگ‌سازی بین فایل‌ها
      this.syncBetweenFiles(userId, userRecord);
      
      // ذخیره تغییرات
      this.saveData(this.registrationsFile, this.registrations);
      this.saveData(this.registrationDataFile, this.registrationData);
      
      console.log(`✅ User ${userId} updated successfully`);
      return true;
    }
    
    return false;
  }

  // 🔗 هماهنگ‌سازی بین فایل‌ها
  syncBetweenFiles(userId, userData) {
    // هماهنگ‌سازی در registrations.json
    if (this.registrations[userId]) {
      this.registrations[userId] = { ...userData };
    }
    
    // هماهنگ‌سازی در registration_data.json
    if (this.registrationData[userId]) {
      this.registrationData[userId] = { ...userData };
    }
  }

  // 🔄 هماهنگ‌سازی با registration_data.json
  syncWithRegistrationData(registrationId, userData) {
    // اگر کد ملی وجود دارد، در registration_data.json نیز ذخیره کن
    if (userData.nationalId) {
      this.registrationData[userData.nationalId] = { ...userData };
    }
  }

  // 🔄 هماهنگ‌سازی با registrations.json
  syncWithRegistrations(websiteUserId, userData) {
    // ایجاد رکورد در registrations.json
    const registrationId = `w_${Date.now()}`;
    this.registrations[registrationId] = { ...userData };
  }

  // 📊 بررسی وضعیت ثبت‌نام
  getRegistrationStatus(userData) {
    if (this.isRegistrationComplete(userData)) {
      return 'completed';
    } else if (userData.fullName && userData.nationalId && userData.phone) {
      return 'pending';
    } else if (userData.fullName || userData.nationalId || userData.phone) {
      return 'incomplete';
    } else {
      return 'new';
    }
  }

  // ✅ بررسی تکمیل بودن ثبت‌نام
  isRegistrationComplete(userData) {
    return userData.fullName && 
           userData.nationalId && 
           userData.phone &&
           userData.fullName.trim() !== '' &&
           userData.nationalId.trim() !== '' &&
           userData.phone.trim() !== '';
  }

  // 📋 دریافت لیست کاربران ناقص
  getIncompleteUsers() {
    const incomplete = [];
    
    // بررسی registrations.json
    for (const [userId, userData] of Object.entries(this.registrations)) {
      if (!this.isRegistrationComplete(userData)) {
        incomplete.push({ userId, source: 'bot', ...userData });
      }
    }
    
    // بررسی registration_data.json
    for (const [userId, userData] of Object.entries(this.registrationData)) {
      if (!this.isRegistrationComplete(userData)) {
        incomplete.push({ userId, source: 'website', ...userData });
      }
    }
    
    return incomplete;
  }

  // 📋 دریافت لیست کاربران تکمیل شده
  getCompletedUsers() {
    const completed = [];
    
    // بررسی registrations.json
    for (const [userId, userData] of Object.entries(this.registrations)) {
      if (this.isRegistrationComplete(userData)) {
        completed.push({ userId, source: 'bot', ...userData });
      }
    }
    
    // بررسی registration_data.json
    for (const [userId, userData] of Object.entries(this.registrationData)) {
      if (this.isRegistrationComplete(userData)) {
        completed.push({ userId, source: 'website', ...userData });
      }
    }
    
    return completed;
  }

  // 🔍 جستجوی کاربران
  searchUsers(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    // جستجو در registrations.json
    for (const [userId, userData] of Object.entries(this.registrations)) {
      if (this.matchesSearch(userData, queryLower)) {
        results.push({ userId, source: 'bot', ...userData });
      }
    }
    
    // جستجو در registration_data.json
    for (const [userId, userData] of Object.entries(this.registrationData)) {
      if (this.matchesSearch(userData, queryLower)) {
        results.push({ userId, source: 'website', ...userData });
      }
    }
    
    return results;
  }

  // 🔍 بررسی تطبیق جستجو
  matchesSearch(userData, query) {
    return (userData.fullName && userData.fullName.toLowerCase().includes(query)) ||
           (userData.nationalId && userData.nationalId.includes(query)) ||
           (userData.phone && userData.phone.includes(query));
  }

  // 📊 آمار کلی
  getStatistics() {
    const incomplete = this.getIncompleteUsers();
    const completed = this.getCompletedUsers();
    
    return {
      total: incomplete.length + completed.length,
      incomplete: incomplete.length,
      completed: completed.length,
      botUsers: incomplete.filter(u => u.source === 'bot').length + 
                completed.filter(u => u.source === 'bot').length,
      websiteUsers: incomplete.filter(u => u.source === 'website').length + 
                    completed.filter(u => u.source === 'website').length
    };
  }

  // 🧹 پاک‌سازی رکوردهای تکراری
  cleanupDuplicates() {
    const nationalIdMap = new Map();
    let cleanedCount = 0;
    
    // بررسی registrations.json
    for (const [userId, userData] of Object.entries(this.registrations)) {
      if (userData.nationalId) {
        if (nationalIdMap.has(userData.nationalId)) {
          // ادغام اطلاعات
          const existing = nationalIdMap.get(userData.nationalId);
          const merged = this.mergeUserData(existing, userData);
          nationalIdMap.set(userData.nationalId, merged);
          delete this.registrations[userId];
          cleanedCount++;
        } else {
          nationalIdMap.set(userData.nationalId, userData);
        }
      }
    }
    
    // بررسی registration_data.json
    for (const [userId, userData] of Object.entries(this.registrationData)) {
      if (userData.nationalId) {
        if (nationalIdMap.has(userData.nationalId)) {
          // ادغام اطلاعات
          const existing = nationalIdMap.get(userData.nationalId);
          const merged = this.mergeUserData(existing, userData);
          nationalIdMap.set(userData.nationalId, merged);
          delete this.registrationData[userId];
          cleanedCount++;
        } else {
          nationalIdMap.set(userData.nationalId, userData);
        }
      }
    }
    
    // بازسازی فایل‌ها
    this.registrations = {};
    this.registrationData = {};
    
    for (const [nationalId, userData] of nationalIdMap) {
      if (userData.source === 'bot') {
        const registrationId = `r_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.registrations[registrationId] = userData;
      }
      
      this.registrationData[nationalId] = userData;
    }
    
    // ذخیره فایل‌های پاک‌سازی شده
    this.saveData(this.registrationsFile, this.registrations);
    this.saveData(this.registrationDataFile, this.registrationData);
    
    console.log(`🧹 Cleaned up ${cleanedCount} duplicate records`);
    return cleanedCount;
  }

  // 🔗 ادغام اطلاعات کاربر
  mergeUserData(existing, newData) {
    return {
      ...existing,
      ...newData,
      fullName: newData.fullName || existing.fullName,
      firstName: newData.firstName || existing.firstName,
      nationalId: newData.nationalId || existing.nationalId,
      phone: newData.phone || existing.phone,
      workshopId: newData.workshopId || existing.workshopId,
      source: existing.source === 'bot' || newData.source === 'bot' ? 'both' : 
              existing.source === 'website' ? 'website' : 'bot',
      registrationComplete: this.isRegistrationComplete(newData) || this.isRegistrationComplete(existing),
      lastUpdated: Date.now()
    };
  }

  // 🔄 پردازش پیام‌های ورودی - سازگار با سیستم قدیمی
  async handleMessage(message) {
    const { chat, text, contact, from } = message;
    const chatId = chat.id;
    const userId = from.id;
    const isPrivate = chat.type === 'private';

    if (!isPrivate) {
      return false; // فقط پیام‌های خصوصی
    }

    console.log(`📱 [UNIFIED] Processing message from user ${userId}: text='${text}', contact=${!!contact}`);

    // بررسی دستورات خاص
    if (text === '/start' || text === 'شروع' || text === '/شروع' || text === 'شروع/' || text === 'شروع مجدد' || text === 'استارت' || text === '/استارت') {
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
    } else if (text === 'ربات' || text === 'معرفی ربات') {
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
    console.log(`🔍 [UNIFIED] Checking if user ${userId} is in registration step...`);
    
    // اگر کاربر شناس است و کلمه معمولی زده، هیچ واکنشی نده
    if (this.isUserRegistered(userId) && !this.isSpecialCommand(text)) {
      console.log(`📝 [UNIFIED] User ${userId} sent normal text: "${text}" - No response needed (silent ignore)`);
      return true; // هیچ واکنشی نده، فقط true برگردان
    }

    // 🔒 کاربر جدید - بررسی اینکه آیا قبلاً پیام خوش‌آمدگویی دریافت کرده یا نه
    const userRecord = this.findUserById(userId);
    if (userRecord && userRecord.userData.welcomeSent) {
      console.log(`🔒 [UNIFIED] User ${userId} already received welcome message, ignoring: "${text}"`);
      return true; // هیچ واکنشی نده
    }

    // 🆕 کاربر جدید - شروع ثبت‌نام (فقط یک بار)
    console.log(`🆕 [UNIFIED] User ${userId} is new, starting welcome flow (first time)`);
    const result = await this.handleUnknownUserStart(chatId);
    
    // علامت‌گذاری که کاربر پیام خوش‌آمدگویی دریافت کرده
    if (result) {
      this.markWelcomeSent(userId);
    }
    
    return result;
  }

  // 🏷️ علامت‌گذاری ارسال پیام خوش‌آمدگویی
  markWelcomeSent(userId) {
    try {
      const userRecord = this.findUserById(userId);
      if (userRecord) {
        // به‌روزرسانی در فایل اصلی
        if (userRecord.source === 'bot') {
          this.registrations[userId] = { 
            ...this.registrations[userId], 
            welcomeSent: true,
            lastUpdated: Date.now()
          };
          this.saveData(this.registrationsFile, this.registrations);
        } else {
          this.registrationData[userId] = { 
            ...this.registrationData[userId], 
            welcomeSent: true,
            lastUpdated: Date.now()
          };
          this.saveData(this.registrationDataFile, this.registrationData);
        }
        
        console.log(`✅ [UNIFIED] Welcome message marked as sent for user ${userId}`);
      } else {
        // ایجاد رکورد جدید با علامت welcomeSent
        const newUserData = {
          fullName: '',
          firstName: '',
          nationalId: '',
          phone: '',
          workshopId: null,
          status: 'new',
          source: 'bot',
          registrationComplete: false,
          welcomeSent: true,
          ts: Date.now(),
          lastUpdated: Date.now()
        };
        
        this.registrations[userId] = newUserData;
        this.saveData(this.registrationsFile, this.registrations);
        console.log(`✅ [UNIFIED] New user record created with welcome sent for user ${userId}`);
      }
    } catch (error) {
      console.error(`❌ [UNIFIED] Error marking welcome sent for user ${userId}:`, error);
    }
  }

  // 🚀 پردازش دستور شروع
  async handleStartCommand(chatId, userId) {
    console.log(`🚀 [UNIFIED] Handling start command for user ${userId}`);
    
    const userRecord = this.findUserById(userId);
    if (userRecord && userRecord.userData.fullName && userRecord.userData.fullName.trim() !== '') {
      console.log(`✅ [UNIFIED] User ${userId} is already registered`);
      // ارسال پیام خوش‌آمدگویی برای کاربر ثبت‌نام شده
      return this.handleRegisteredUserSchool(chatId, userId);
    } else {
      console.log(`🆕 [UNIFIED] New user ${userId}, starting welcome flow`);
      return this.handleUnknownUserStart(chatId);
    }
  }

  // 📝 شروع فرآیند ثبت‌نام (فقط ایجاد رکورد)
  async handleRegistrationStart(userId, userIdStr) {
    console.log(`📝 [UNIFIED] Creating registration record for user ${userId}`);
    
    try {
      // بررسی اینکه آیا کاربر قبلاً ثبت‌نام شده یا نه
      const existingUser = this.findUserById(userId);
      if (existingUser && existingUser.userData.fullName && existingUser.userData.fullName.trim() !== '') {
        console.log(`✅ [UNIFIED] User ${userId} is already registered with complete data`);
        return true;
      }

      // اگر کاربر وجود دارد ولی داده‌هایش ناقص است، آن را به‌روزرسانی کن
      if (existingUser && (!existingUser.userData.fullName || existingUser.userData.fullName.trim() === '')) {
        console.log(`🔄 [UNIFIED] User ${userId} exists but has incomplete data, updating...`);
        
        const updatedUserData = {
          ...existingUser.userData,
          status: 'new',
          source: 'bot',
          lastUpdated: Date.now()
        };
        
        this.registrations[userId] = updatedUserData;
        this.saveData(this.registrationsFile, this.registrations);
        
        console.log(`✅ [UNIFIED] User ${userId} data updated`);
        return true;
      }

      // ایجاد رکورد جدید برای کاربر
      const newUserData = {
        fullName: '',
        firstName: '',
        nationalId: '',
        phone: '',
        workshopId: null,
        status: 'new',
        source: 'bot',
        registrationComplete: false,
        ts: Date.now(),
        lastUpdated: Date.now()
      };

      // ذخیره در registrations.json
      this.registrations[userId] = newUserData;
      this.saveData(this.registrationsFile, this.registrations);
      
      console.log(`✅ [UNIFIED] Registration record created for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ [UNIFIED] Error creating registration record for user ${userId}:`, error);
      return false;
    }
  }

  // 🔘 پردازش callback ها
  async handleCallback(callback_query) {
    console.log(`🔘 [UNIFIED] Handling callback: ${callback_query.data}`);
    
    try {
      const userId = callback_query.from.id;
      const callbackData = callback_query.data;

      // پردازش callback های مختلف
      if (callbackData === 'start_registration' || 
          callbackData === 'start_next_month_registration' ||
          callbackData === 'back_to_main') {
        
        console.log(`🔄 [UNIFIED] Callback handled successfully: ${callbackData}`);
        return true;
      }

      console.log(`✅ [UNIFIED] Callback handled successfully: ${callbackData}`);
      return true;
    } catch (error) {
      console.error(`❌ [UNIFIED] Error handling callback:`, error);
      return false;
    }
  }

  // 🔍 بررسی دستورات خاص
  isSpecialCommand(text) {
    const specialCommands = ['شروع', 'مدرسه', 'ربات', 'معرفی ربات', 'خروج', 'برگشت به قبل', '🏠 برگشت به منو', '📚 انتخاب کلاس', 'پنل قرآن‌آموز'];
    return specialCommands.includes(text);
  }

  // 🎹 ساخت کیبورد اصلی
  buildMainKeyboard() {
    return [
      ['شروع مجدد', 'معرفی مدرسه'],
      ['معرفی ربات', 'خروج']
    ];
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

    try {
      // ارسال پیام خوش‌آمدگویی با کیبورد
      console.log(`📱 [UNIFIED] Sending welcome message to chat ${chatId}`);
      await sendMessage(chatId, welcomeText, this.buildMainKeyboard());
      console.log(`✅ [UNIFIED] Welcome message sent successfully to chat ${chatId}`);
      return true;
    } catch (error) {
      console.error(`❌ [UNIFIED] Error sending welcome message to chat ${chatId}:`, error);
      return false;
    }
  }

  // 🏫 معرفی مدرسه
  async handleSchoolIntro(chatId) {
    const schoolText = `🏫 **مدرسه تلاوت قرآن کریم**

🌟 مدرسه‌ای معتبر با ۱۰+ سال سابقه در آموزش قرآن کریم

📚 **کلاس‌های موجود:**
• تجوید قرآن کریم • صوت و لحن
• حفظ قرآن کریم • تفسیر قرآن

💎 **مزایا:** اساتید مجرب، کلاس‌های آنلاین و حضوری، گواهی پایان دوره

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;

    try {
      console.log(`📱 [UNIFIED] Sending school intro to chat ${chatId}`);
      await sendMessage(chatId, schoolText, this.buildMainKeyboard());
      console.log(`✅ [UNIFIED] School intro sent successfully to chat ${chatId}`);
      return true;
    } catch (error) {
      console.error(`❌ [UNIFIED] Error sending school intro to chat ${chatId}:`, error);
      return false;
    }
  }

  // 🏫 معرفی مدرسه برای کاربر شناس
  async handleRegisteredUserSchool(chatId, userId) {
    const userInfo = this.findUserById(userId);
    const firstName = userInfo?.userData?.fullName?.split(' ')[0] || 'کاربر';
    
    const welcomeText = `🏫 **مدرسه تلاوت قرآن کریم**

سلام ${firstName} عزیز! 👋
به مدرسه تلاوت قرآن کریم خوش آمدید.

🌟 مدرسه‌ای معتبر با ۱۰+ سال سابقه در آموزش قرآن کریم

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;

    try {
      console.log(`📱 [UNIFIED] Sending registered user school intro to chat ${chatId}`);
      await sendMessage(chatId, welcomeText, this.buildMainKeyboard());
      console.log(`✅ [UNIFIED] Registered user school intro sent successfully to chat ${chatId}`);
      return true;
    } catch (error) {
      console.error(`❌ [UNIFIED] Error sending registered user school intro to chat ${chatId}:`, error);
      return false;
    }
  }

  // 🤖 معرفی ربات
  async handleQuranBotIntro(chatId) {
    const botText = `🤖 **ربات مدرسه تلاوت قرآن**

🌟 **قابلیت‌ها:** ثبت‌نام آنلاین، مشاهده برنامه کلاس‌ها، ارتباط با اساتید، اخبار و پشتیبانی

💡 **نحوه استفاده:** از دکمه‌های زیر استفاده کنید یا پیام خود را بنویسید

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:`;

    try {
      console.log(`📱 [UNIFIED] Sending bot intro to chat ${chatId}`);
      await sendMessage(chatId, botText, this.buildMainKeyboard());
      console.log(`✅ [UNIFIED] Bot intro sent successfully to chat ${chatId}`);
      return true;
    } catch (error) {
      console.error(`❌ [UNIFIED] Error sending bot intro to chat ${chatId}:`, error);
      return false;
    }
  }

  // 🚪 خروج
  async handleExitCommand(chatId) {
    console.log(`🚪 [UNIFIED] User requested exit from chat ${chatId}`);
    return true;
  }

  // 🔙 برگشت به قبل
  async handleBackCommand(chatId, userId) {
    console.log(`🔙 [UNIFIED] User requested back from chat ${chatId}`);
    return true;
  }

  // 🏠 برگشت به منو
  async handleBackToMainMenu(chatId, userId) {
    console.log(`🏠 [UNIFIED] User requested main menu from chat ${chatId}`);
    return true;
  }

  // 📚 انتخاب کلاس
  async handleWorkshopSelection(chatId, userId) {
    console.log(`📚 [UNIFIED] User requested workshop selection from chat ${chatId}`);
    return true;
  }

  // 👤 پنل قرآن‌آموز
  async handleQuranStudentPanel(chatId, userId) {
    console.log(`👤 [UNIFIED] User requested student panel from chat ${chatId}`);
    return true;
  }
}

module.exports = UnifiedRegistrationManager;
