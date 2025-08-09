//⏰ 05:00:00 🗓️ پنجشنبه 16 مرداد 1404
// ماژول تنظیمات ربات - مشابه Python settings_module.py

const fs = require('fs');
const { sendMessage, sendMessageWithInlineKeyboard, deleteMessage, answerCallbackQuery, editMessage } = require('./4bale');
const { 
  SETTINGS_CONFIG, 
  loadReportsConfig, 
  saveReportsConfig, 
  getReportsEnabled, 
  setReportsEnabled 
} = require('./3config');
const { hasPermission } = require('./6mid');

// Import reportEvents برای SSE
let reportEvents = null;
let updateSystemStatus = null;
try {
  const gateway = require('./gateway_bale');
  reportEvents = gateway.reportEvents;
  
  const config = require('./3config');
  updateSystemStatus = config.updateSystemStatus;
} catch (error) {
  console.log('⚠️ [SETTINGS] Could not import reportEvents or updateSystemStatus, SSE disabled');
}

class SettingsModule {
  constructor() {
    this.settingsFile = SETTINGS_CONFIG.SETTINGS_FILE;
    this.userStates = {}; // برای ذخیره وضعیت کاربران
    this.loadSettings();
  }
  
  loadSettings() {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, 'utf8');
        this.settings = JSON.parse(data);
        console.log('✅ Settings loaded successfully');
      } else {
                 // تنظیمات پیش‌فرض
         this.settings = {
           practice_days: [0, 1, 2, 3, 4, 5, 6], // همه روزها فعال
           evaluation_days: [0, 1, 2, 3, 4, 5, 6], // همه روزها فعال
           attendance_days: [0, 1, 2, 3, 4, 5, 6], // همه روزها فعال
           enable_satisfaction_survey: true,
           enable_bot_reports: true
         };
        this.saveSettings();
      }
    } catch (error) {
      console.error('Error loading settings:', error.message);
      this.settings = {
        practice_days: [0, 1, 2, 3, 4, 5, 6],
        evaluation_days: [0, 1, 2, 3, 4, 5, 6],
        attendance_days: [0, 1, 2, 3, 4, 5, 6],
        enable_satisfaction_survey: true,
        enable_bot_reports: true
      };
    }
  }
  
  saveSettings() {
    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2), 'utf8');
      console.log('✅ Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error.message);
    }
  }
  
  isAdmin(userId) {
    return hasPermission(userId, 'SCHOOL_ADMIN');
  }
  
  getPracticeDaysKeyboard() {
    const days = [
      { name: "شنبه", value: 0 },
      { name: "یکشنبه", value: 1 },
      { name: "دوشنبه", value: 2 },
      { name: "سه‌شنبه", value: 3 },
      { name: "چهارشنبه", value: 4 },
      { name: "پنج‌شنبه", value: 5 },
      { name: "جمعه", value: 6 }
    ];
    
    const keyboard = [];
    days.forEach(day => {
      const isActive = this.settings.practice_days.includes(day.value);
      const icon = isActive ? '🟢' : '🔴';
      const text = `${icon} ${day.name}`;
      const callbackData = `toggle_practice_day_${day.value}`;
      keyboard.push([{ text, callback_data: callbackData }]);
    });
    
    // دکمه‌های اضافی
    keyboard.push(
      [{ text: '✅ همه روزها', callback_data: 'select_all_practice_days' }],
      [{ text: '❌ هیچ روزی', callback_data: 'select_none_practice_days' }],
      [{ text: '🔙 بازگشت', callback_data: 'settings_main_menu' }]
    );
    
    return { inline_keyboard: keyboard };
  }
  
  getEvaluationDaysKeyboard() {
    const days = [
      { name: "شنبه", value: 0 },
      { name: "یکشنبه", value: 1 },
      { name: "دوشنبه", value: 2 },
      { name: "سه‌شنبه", value: 3 },
      { name: "چهارشنبه", value: 4 },
      { name: "پنج‌شنبه", value: 5 },
      { name: "جمعه", value: 6 }
    ];
    
    const keyboard = [];
    days.forEach(day => {
      const isActive = this.settings.evaluation_days.includes(day.value);
      const icon = isActive ? '🟢' : '🔴';
      const text = `${icon} ${day.name}`;
      const callbackData = `toggle_evaluation_day_${day.value}`;
      keyboard.push([{ text, callback_data: callbackData }]);
    });
    
    // دکمه‌های اضافی
    keyboard.push(
      [{ text: '✅ همه روزها', callback_data: 'select_all_evaluation_days' }],
      [{ text: '❌ هیچ روزی', callback_data: 'select_none_evaluation_days' }],
      [{ text: '🔙 بازگشت', callback_data: 'settings_main_menu' }]
    );
    
    return { inline_keyboard: keyboard };
  }
  
  getPracticeEvaluationDaysKeyboard() {
    console.log('🎯 [SETTINGS] getPracticeEvaluationDaysKeyboard STARTED');
    console.log('🎯 [SETTINGS] GENERATING KEYBOARD FOR PRACTICE+EVALUATION DAYS!');
    const days = [
      { name: "شنبه", value: 0 },
      { name: "یکشنبه", value: 1 },
      { name: "دوشنبه", value: 2 },
      { name: "سه‌شنبه", value: 3 },
      { name: "چهارشنبه", value: 4 },
      { name: "پنج‌شنبه", value: 5 },
      { name: "جمعه", value: 6 }
    ];
    
    const keyboard = [];
    days.forEach(day => {
      const isPracticeActive = this.settings.practice_days.includes(day.value);
      const isEvaluationActive = this.settings.evaluation_days.includes(day.value);
      
      let status = '❌';
      if (isPracticeActive && isEvaluationActive) {
        status = '🎯'; // هر دو
      } else if (isPracticeActive) {
        status = '📅'; // فقط تمرین
      } else if (isEvaluationActive) {
        status = '📊'; // فقط ارزیابی
      }
      
      const text = `${status} ${day.name}`;
      const callbackData = `toggle_practice_evaluation_day_${day.value}`;
      keyboard.push([{ text, callback_data: callbackData }]);
      console.log(`🎯 [SETTINGS] Day ${day.name}: Practice=${isPracticeActive}, Evaluation=${isEvaluationActive}, Status=${status}`);
    });
    
    // دکمه‌های اضافی
    keyboard.push(
      [{ text: '🎯 همه روزها (تمرین + ارزیابی)', callback_data: 'select_all_practice_evaluation_days' }],
      [{ text: '❌ هیچ روزی', callback_data: 'select_none_practice_evaluation_days' }],
      [{ text: '🔙 بازگشت', callback_data: 'settings_main_menu' }]
    );
    
    console.log('🎯 [SETTINGS] getPracticeEvaluationDaysKeyboard COMPLETED');
    console.log('🎯 [SETTINGS] Final keyboard:', JSON.stringify(keyboard, null, 2));
    return { inline_keyboard: keyboard };
  }
  
  getAttendanceDaysKeyboard() {
    const days = [
      { name: "شنبه", value: 0 },
      { name: "یکشنبه", value: 1 },
      { name: "دوشنبه", value: 2 },
      { name: "سه‌شنبه", value: 3 },
      { name: "چهارشنبه", value: 4 },
      { name: "پنج‌شنبه", value: 5 },
      { name: "جمعه", value: 6 }
    ];
    
    const keyboard = [];
    days.forEach(day => {
      const isActive = this.settings.attendance_days.includes(day.value);
      const icon = isActive ? '🟢' : '🔴';
      const text = `${icon} ${day.name}`;
      const callbackData = `toggle_attendance_day_${day.value}`;
      keyboard.push([{ text, callback_data: callbackData }]);
    });
    
    // دکمه‌های اضافی
    keyboard.push(
      [{ text: '✅ همه روزها', callback_data: 'select_all_attendance_days' }],
      [{ text: '❌ هیچ روزی', callback_data: 'select_none_attendance_days' }],
      [{ text: '✅ بی خیال', callback_data: 'confirm_attendance_days' }],
      [{ text: '🔙 گزارش در گروه', callback_data: 'settings_main_menu' }]
    );
    
    return { inline_keyboard: keyboard };
  }
  
  async getMainSettingsKeyboard() {
    console.log('🔧 [SETTINGS] getMainSettingsKeyboard STARTED');
    const practiceDaysCount = this.settings.practice_days.length;
    const evaluationDaysCount = this.settings.evaluation_days.length;
    const attendanceDaysCount = this.settings.attendance_days.length;
    console.log(`🔧 [SETTINGS] Practice days count: ${practiceDaysCount}`);
    console.log(`🔧 [SETTINGS] Evaluation days count: ${evaluationDaysCount}`);
    console.log(`🔧 [SETTINGS] Attendance days count: ${attendanceDaysCount}`);
    
    const satisfactionStatus = this.settings.enable_satisfaction_survey ? '✅ فعال' : '❌ غیرفعال';
    const reportsStatus = getReportsEnabled() ? '✅ فعال' : '❌ غیرفعال';
    
    // دریافت وضعیت ثبت‌نام از فایل site-status.json
    let registrationStatus = '✅ فعال'; // پیش‌فرض
    try {
      const { readJson } = require('./server/utils/jsonStore');
      const siteStatus = await readJson('data/site-status.json', {
        registration: { enabled: true }
      });
      registrationStatus = siteStatus.registration.enabled ? '✅ فعال' : '❌ غیرفعال';
    } catch (error) {
      console.log('⚠️ [SETTINGS] Could not read registration status, using default');
    }
    
    const keyboard = [
      [{ text: `📅 تمرین (${practiceDaysCount} روز)`, callback_data: 'practice_days_settings' }],
      [{ text: `📊 ارزیابی (${evaluationDaysCount} روز)`, callback_data: 'evaluation_days_settings' }],
      [{ text: `👥 حضور و غیاب (${attendanceDaysCount} روز)`, callback_data: 'attendance_days_settings' }],
      [{ text: `🎯 روزهای تمرین و ارزیابی`, callback_data: 'practice_evaluation_days_settings' }],
      [{ text: `📝 نظرسنجی: ${satisfactionStatus}`, callback_data: 'toggle_satisfaction_survey' }],
      [{ text: `📋 گروه گزارش: ${reportsStatus}`, callback_data: 'toggle_bot_reports' }],
      [{ text: `📝 ثبت‌نام: ${registrationStatus}`, callback_data: 'toggle_registration' }]
    ];
    
    console.log('🔧 [SETTINGS] Keyboard generated:', JSON.stringify(keyboard, null, 2));
    console.log('🔧 [SETTINGS] Practice days button callback_data:', keyboard[0][0].callback_data);
    console.log('🔧 [SETTINGS] Evaluation days button callback_data:', keyboard[1][0].callback_data);
    console.log('🔧 [SETTINGS] Practice+Evaluation days button callback_data:', keyboard[2][0].callback_data);
    console.log('🔧 [SETTINGS] PRACTICE+EVALUATION BUTTON CREATED WITH CALLBACK:', keyboard[2][0].callback_data);
    console.log('🔧 [SETTINGS] getMainSettingsKeyboard COMPLETED');
    return { inline_keyboard: keyboard };
  }
  
  async handleSettingsCommand(chatId, userId) {
    console.log('⚙️ [SETTINGS] handleSettingsCommand STARTED');
    console.log(`⚙️ [SETTINGS] ChatId: ${chatId}, UserId: ${userId}`);
    
    if (!this.isAdmin(userId)) {
      console.log('❌ [SETTINGS] User is not admin, returning false');
      return false;
    }
    
    console.log('✅ [SETTINGS] User is admin, proceeding...');
    const text = `⚙️ *پنل تنظیمات مدیر*
انتخاب کنید:`;
    
    const replyMarkup = await this.getMainSettingsKeyboard();
    console.log('⚙️ [SETTINGS] About to call sendMessageWithInlineKeyboard...');
    console.log('⚙️ [SETTINGS] SENDING SETTINGS MENU WITH PRACTICE+EVALUATION BUTTON!');
    const result = sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
    console.log('⚙️ [SETTINGS] sendMessageWithInlineKeyboard called, result:', result);
    console.log('⚙️ [SETTINGS] handleSettingsCommand COMPLETED');
    return result;
  }
  
  async handleCallback(callback) {
    console.log('🔄 [SETTINGS] handleCallback STARTED');
    console.log('🔄 [SETTINGS] Callback object:', JSON.stringify(callback, null, 2));
    
    const chatId = callback.message.chat.id;
    const userId = callback.from.id;
    const messageId = callback.message.message_id;
    const data = callback.data;
    const callbackQueryId = callback.id;
    
    console.log(`🔄 [SETTINGS] Extracted data: ChatId=${chatId}, UserId=${userId}, MessageId=${messageId}, Data=${data}, CallbackQueryId=${callbackQueryId}`);
    
    // لوگ مخصوص برای دکمه روزهای تمرین و ارزیابی
    if (data === 'practice_evaluation_days_settings') {
      console.log('🎯 [SETTINGS] PRACTICE+EVALUATION DAYS CALLBACK RECEIVED!');
      console.log('🎯 [SETTINGS] About to route to settings handler...');
    }
    
    if (!this.isAdmin(userId)) {
      console.log('❌ [SETTINGS] User is not admin, answering callback with error');
      await answerCallbackQuery(callbackQueryId, '❌ شما دسترسی لازم را ندارید');
      return false;
    }
    
    console.log('✅ [SETTINGS] User is admin, routing callback...');
    const result = this.routeCallback(chatId, messageId, userId, data, callbackQueryId);
    console.log('🔄 [SETTINGS] handleCallback COMPLETED, result:', result);
    return result;
  }
  
  async routeCallback(chatId, messageId, userId, data, callbackQueryId) {
    try {
      console.log(`🔍 [SETTINGS] Routing callback: ${data}`);
      console.log(`🔍 [SETTINGS] ChatId: ${chatId}, MessageId: ${messageId}, UserId: ${userId}`);
      console.log(`🔍 [SETTINGS] CallbackQueryId: ${callbackQueryId}`);
      
      if (data === 'settings_main_menu') {
        console.log('🔍 [SETTINGS] → settings_main_menu');
        return this.handleSettingsMainMenu(chatId, messageId, callbackQueryId);
      } else if (data === 'practice_days_settings') {
        console.log('📅 [SETTINGS] → practice_days_settings - CLICKED ON PRACTICE DAYS BUTTON');
        console.log('📅 [SETTINGS] About to call handlePracticeDaysSettings...');
        return this.handlePracticeDaysSettings(chatId, messageId, callbackQueryId);
             } else if (data === 'evaluation_days_settings') {
         console.log('📊 [SETTINGS] → evaluation_days_settings - CLICKED ON EVALUATION DAYS BUTTON');
         console.log('📊 [SETTINGS] About to call handleEvaluationDaysSettings...');
         return this.handleEvaluationDaysSettings(chatId, messageId, callbackQueryId);
       } else if (data === 'attendance_days_settings') {
         console.log('👥 [SETTINGS] → attendance_days_settings - CLICKED ON ATTENDANCE DAYS BUTTON');
         console.log('👥 [SETTINGS] About to call handleAttendanceDaysSettings...');
         return this.handleAttendanceDaysSettings(chatId, messageId, callbackQueryId);
       } else if (data === 'practice_evaluation_days_settings') {
        console.log('🎯 [SETTINGS] → practice_evaluation_days_settings - CLICKED ON PRACTICE+EVALUATION DAYS BUTTON');
        console.log('🎯 [SETTINGS] About to call handlePracticeEvaluationDaysSettings...');
        console.log('🎯 [SETTINGS] ROUTING TO PRACTICE+EVALUATION DAYS HANDLER!');
        return this.handlePracticeEvaluationDaysSettings(chatId, messageId, callbackQueryId);
      } else if (data.startsWith('toggle_practice_day_')) {
        const dayValue = parseInt(data.split('_')[3]);
        console.log(`📅 [SETTINGS] → toggle_practice_day_${dayValue} - TOGGLING PRACTICE DAY`);
        return this.handleTogglePracticeDay(chatId, messageId, dayValue, callbackQueryId);
             } else if (data.startsWith('toggle_evaluation_day_')) {
         const dayValue = parseInt(data.split('_')[3]);
         console.log(`📊 [SETTINGS] → toggle_evaluation_day_${dayValue} - TOGGLING EVALUATION DAY`);
         return this.handleToggleEvaluationDay(chatId, messageId, dayValue, callbackQueryId);
       } else if (data.startsWith('toggle_attendance_day_')) {
         const dayValue = parseInt(data.split('_')[3]);
         console.log(`👥 [SETTINGS] → toggle_attendance_day_${dayValue} - TOGGLING ATTENDANCE DAY`);
         return this.handleToggleAttendanceDay(chatId, messageId, dayValue, callbackQueryId);
       } else if (data.startsWith('toggle_practice_evaluation_day_')) {
        const dayValue = parseInt(data.split('_')[4]);
        console.log(`🎯 [SETTINGS] → toggle_practice_evaluation_day_${dayValue} - TOGGLING PRACTICE+EVALUATION DAY`);
        return this.handleTogglePracticeEvaluationDay(chatId, messageId, dayValue, callbackQueryId);
      } else if (data === 'select_all_practice_days') {
        console.log('📅 [SETTINGS] → select_all_practice_days - SELECTING ALL PRACTICE DAYS');
        return this.handleSelectAllPracticeDays(chatId, messageId, callbackQueryId);
      } else if (data === 'select_none_practice_days') {
        console.log('📅 [SETTINGS] → select_none_practice_days - SELECTING NO PRACTICE DAYS');
        return this.handleSelectNonePracticeDays(chatId, messageId, callbackQueryId);
      } else if (data === 'select_all_evaluation_days') {
        console.log('📊 [SETTINGS] → select_all_evaluation_days - SELECTING ALL EVALUATION DAYS');
        return this.handleSelectAllEvaluationDays(chatId, messageId, callbackQueryId);
             } else if (data === 'select_none_evaluation_days') {
         console.log('📊 [SETTINGS] → select_none_evaluation_days - SELECTING NO EVALUATION DAYS');
         return this.handleSelectNoneEvaluationDays(chatId, messageId, callbackQueryId);
       } else if (data === 'select_all_attendance_days') {
         console.log('👥 [SETTINGS] → select_all_attendance_days - SELECTING ALL ATTENDANCE DAYS');
         return this.handleSelectAllAttendanceDays(chatId, messageId, callbackQueryId);
               } else if (data === 'select_none_attendance_days') {
          console.log('👥 [SETTINGS] → select_none_attendance_days - SELECTING NO ATTENDANCE DAYS');
          return this.handleSelectNoneAttendanceDays(chatId, messageId, callbackQueryId);
        } else if (data === 'confirm_attendance_days') {
          console.log('👥 [SETTINGS] → confirm_attendance_days - CONFIRMING ATTENDANCE DAYS');
          console.log('👥 [SETTINGS] Callback data matches confirm_attendance_days');
          console.log('👥 [SETTINGS] About to call handleConfirmAttendanceDays...');
          const result = await this.handleConfirmAttendanceDays(chatId, messageId, callbackQueryId);
          console.log('👥 [SETTINGS] handleConfirmAttendanceDays result:', result);
          return result;
        } else if (data === 'select_all_practice_evaluation_days') {
        console.log('🎯 [SETTINGS] → select_all_practice_evaluation_days - SELECTING ALL PRACTICE+EVALUATION DAYS');
        return this.handleSelectAllPracticeEvaluationDays(chatId, messageId, callbackQueryId);
      } else if (data === 'select_none_practice_evaluation_days') {
        console.log('🎯 [SETTINGS] → select_none_practice_evaluation_days - SELECTING NO PRACTICE+EVALUATION DAYS');
        return this.handleSelectNonePracticeEvaluationDays(chatId, messageId, callbackQueryId);
      } else if (data === 'toggle_satisfaction_survey') {
        return this.handleToggleSatisfactionSurvey(chatId, messageId, callbackQueryId);
      } else if (data === 'toggle_bot_reports') {
        return this.handleToggleBotReports(chatId, messageId, callbackQueryId);
      } else if (data === 'toggle_registration') {
        return this.handleToggleRegistration(chatId, messageId, callbackQueryId);
      } else if (data === 'settings_back') {
        return this.handleSettingsBack(chatId, messageId, callbackQueryId);
      } else {
        console.warn(`⚠️ [SETTINGS] Unknown settings callback data: ${data}`);
        await answerCallbackQuery(callbackQueryId, '❌ دستور نامعلوم!');
        return false;
      }
    } catch (error) {
      console.error('❌ [SETTINGS] Error in settings callback routing:', error.message);
      console.error('❌ [SETTINGS] Error stack:', error.stack);
      await answerCallbackQuery(callbackQueryId, '❌ خطا در پردازش!');
      return false;
    }
  }
  
  async handleSettingsMainMenu(chatId, messageId, callbackQueryId) {
    console.log('🔙 [SETTINGS] handleSettingsMainMenu STARTED');
    
    // بررسی اینکه آیا از صفحه حضور و غیاب بازگشت کرده
    const { REPORT_GROUP_ID } = require('./6mid');
    const moment = require('moment-jalaali');
    
    try {
      const now = moment();
      const time = now.format('HH:mm:ss');
      const day = now.format('jD');
      const month = now.format('jMMMM').replace(/^ا/, '');
      const year = now.format('jYYYY');
      
      const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
      const practiceDaysList = (this.settings.practice_days || []).map(d => dayNames[d]).join('، ') || '---';
      const evaluationDaysList = (this.settings.evaluation_days || []).map(d => dayNames[d]).join('، ') || '---';
      const attendanceDaysList = (this.settings.attendance_days || []).map(d => dayNames[d]).join('، ') || '---';

      const reportText = `👥 *برنامه جدید هفته تمرین و ارزیابی و کلاس  با مربیان*\nروزهای تمرین قرآن آموزان: ${practiceDaysList}\nروزهای ارزیابی قرآن آموزان: ${evaluationDaysList}\nروزهای کلاس با مربیان: ${attendanceDaysList}\n\nاعلام در ساعت: ${time}\nتاریخ: ${day} ${month} ${year}`;
      
      await sendMessage(REPORT_GROUP_ID, reportText);
      console.log(`✅ [SETTINGS] Attendance days return report sent to group`);
    } catch (error) {
      console.error('❌ [SETTINGS] Error sending attendance return report:', error.message);
    }
    
    const text = `⚙️ *پنل تنظیمات مدیر*
انتخاب کنید:`;
    
    const replyMarkup = await this.getMainSettingsKeyboard();
    
    try {
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      await deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleSettingsMainMenu:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId);
    console.log('🔙 [SETTINGS] handleSettingsMainMenu COMPLETED');
  }
  
  async handlePracticeDaysSettings(chatId, messageId, callbackQueryId) {
    console.log('📅 [SETTINGS] handlePracticeDaysSettings STARTED');
    console.log(`📅 [SETTINGS] ChatId: ${chatId}, MessageId: ${messageId}, CallbackQueryId: ${callbackQueryId}`);
    const activeDays = this.settings.practice_days.length;
    console.log(`📅 [SETTINGS] Active practice days: ${activeDays} days`);
    console.log(`📅 [SETTINGS] Practice days array: ${JSON.stringify(this.settings.practice_days)}`);
    const text = `📅 *تنظیمات روزهای تمرین*
روزهای فعال: ${activeDays} روز`;
    
    const replyMarkup = this.getPracticeDaysKeyboard();
    console.log('📅 [SETTINGS] Practice keyboard generated:', JSON.stringify(replyMarkup, null, 2));
    
    try {
      // اول پیام جدید ارسال کن
      console.log('📅 [SETTINGS] Calling sendMessageWithInlineKeyboard...');
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      console.log('📅 [SETTINGS] sendMessageWithInlineKeyboard completed');
      
      // بعد پیام قبلی رو حذف کن
      console.log('📅 [SETTINGS] Calling deleteMessage...');
      await deleteMessage(chatId, messageId);
      console.log('📅 [SETTINGS] deleteMessage completed');
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handlePracticeDaysSettings:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId);
    console.log('📅 [SETTINGS] answerCallbackQuery completed');
    console.log('📅 [SETTINGS] handlePracticeDaysSettings COMPLETED');
  }
  
  async handleEvaluationDaysSettings(chatId, messageId, callbackQueryId) {
    console.log('📊 [SETTINGS] handleEvaluationDaysSettings STARTED');
    console.log(`📊 [SETTINGS] ChatId: ${chatId}, MessageId: ${messageId}, CallbackQueryId: ${callbackQueryId}`);
    const activeDays = this.settings.evaluation_days.length;
    console.log(`📊 [SETTINGS] Active evaluation days: ${activeDays} days`);
    console.log(`📊 [SETTINGS] Evaluation days array: ${JSON.stringify(this.settings.evaluation_days)}`);
    const text = `📊 *تنظیمات روزهای ارزیابی*
روزهای فعال: ${activeDays} روز`;
    
    const replyMarkup = this.getEvaluationDaysKeyboard();
    console.log('📊 [SETTINGS] Evaluation keyboard generated:', JSON.stringify(replyMarkup, null, 2));
    
    try {
      // اول پیام جدید ارسال کن
      console.log('📊 [SETTINGS] Calling sendMessageWithInlineKeyboard...');
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      console.log('📊 [SETTINGS] sendMessageWithInlineKeyboard completed');
      
      // بعد پیام قبلی رو حذف کن
      console.log('📊 [SETTINGS] Calling deleteMessage...');
      await deleteMessage(chatId, messageId);
      console.log('📊 [SETTINGS] deleteMessage completed');
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleEvaluationDaysSettings:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId);
    console.log('📊 [SETTINGS] answerCallbackQuery completed');
    console.log('📊 [SETTINGS] handleEvaluationDaysSettings COMPLETED');
  }
  
  async handleAttendanceDaysSettings(chatId, messageId, callbackQueryId) {
    console.log('👥 [SETTINGS] handleAttendanceDaysSettings STARTED');
    console.log(`👥 [SETTINGS] ChatId: ${chatId}, MessageId: ${messageId}, CallbackQueryId: ${callbackQueryId}`);
    const activeDays = this.settings.attendance_days.length;
    console.log(`👥 [SETTINGS] Active attendance days: ${activeDays} days`);
    console.log(`👥 [SETTINGS] Attendance days array: ${JSON.stringify(this.settings.attendance_days)}`);
    const text = `👥 *تنظیمات روزهای حضور و غیاب*
روزهای فعال: ${activeDays} روز`;
    
    const replyMarkup = this.getAttendanceDaysKeyboard();
    console.log('👥 [SETTINGS] Attendance keyboard generated:', JSON.stringify(replyMarkup, null, 2));
    
    try {
      // اول پیام جدید ارسال کن
      console.log('👥 [SETTINGS] Calling sendMessageWithInlineKeyboard...');
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      console.log('👥 [SETTINGS] sendMessageWithInlineKeyboard completed');
      
      // بعد پیام قبلی رو حذف کن
      console.log('👥 [SETTINGS] Calling deleteMessage...');
      await deleteMessage(chatId, messageId);
      console.log('👥 [SETTINGS] deleteMessage completed');
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleAttendanceDaysSettings:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId);
    console.log('👥 [SETTINGS] answerCallbackQuery completed');
    console.log('👥 [SETTINGS] handleAttendanceDaysSettings COMPLETED');
  }
  
  async handlePracticeEvaluationDaysSettings(chatId, messageId, callbackQueryId) {
    console.log('🎯 [SETTINGS] handlePracticeEvaluationDaysSettings STARTED');
    console.log('🎯 [SETTINGS] PRACTICE+EVALUATION DAYS BUTTON HANDLER CALLED!');
    console.log(`🎯 [SETTINGS] ChatId: ${chatId}, MessageId: ${messageId}, CallbackQueryId: ${callbackQueryId}`);
    const practiceDays = this.settings.practice_days.length;
    const evaluationDays = this.settings.evaluation_days.length;
    console.log(`🎯 [SETTINGS] Practice days: ${practiceDays}, Evaluation days: ${evaluationDays}`);
    console.log(`🎯 [SETTINGS] Practice days array: ${JSON.stringify(this.settings.practice_days)}`);
    console.log(`🎯 [SETTINGS] Evaluation days array: ${JSON.stringify(this.settings.evaluation_days)}`);
    const text = `🎯 *تنظیمات روزهای تمرین و ارزیابی*
روزهای تمرین: ${practiceDays} روز
روزهای ارزیابی: ${evaluationDays} روز

🎯 = هر دو فعال
📅 = فقط تمرین
📊 = فقط ارزیابی
❌ = هیچکدام`;
    
    const replyMarkup = this.getPracticeEvaluationDaysKeyboard();
    console.log('🎯 [SETTINGS] Combined keyboard generated:', JSON.stringify(replyMarkup, null, 2));
    
    try {
      // اول پیام جدید ارسال کن
      console.log('🎯 [SETTINGS] Calling sendMessageWithInlineKeyboard...');
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      console.log('🎯 [SETTINGS] sendMessageWithInlineKeyboard completed');
      
      // بعد پیام قبلی رو حذف کن
      console.log('🎯 [SETTINGS] Calling deleteMessage...');
      await deleteMessage(chatId, messageId);
      console.log('🎯 [SETTINGS] deleteMessage completed');
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handlePracticeEvaluationDaysSettings:', error.message);
      // اگر حذف پیام موفق نبود، حداقل callback رو پاسخ بده
      try {
        await answerCallbackQuery(callbackQueryId);
      } catch (callbackError) {
        console.error('❌ [SETTINGS] Error answering callback query:', callbackError.message);
      }
    }
    
    await answerCallbackQuery(callbackQueryId);
    console.log('🎯 [SETTINGS] answerCallbackQuery completed');
    console.log('🎯 [SETTINGS] handlePracticeEvaluationDaysSettings COMPLETED');
  }
  
  async handleTogglePracticeDay(chatId, messageId, dayValue, callbackQueryId) {
    if (this.settings.practice_days.includes(dayValue)) {
      this.settings.practice_days = this.settings.practice_days.filter(d => d !== dayValue);
    } else {
      this.settings.practice_days.push(dayValue);
    }
    
    this.settings.practice_days.sort();
    this.saveSettings();
    
    // به‌روزرسانی پیام با کیبورد جدید
    const activeDays = this.settings.practice_days.length;
    const text = `📅 *تنظیمات روزهای تمرین*
روزهای فعال: ${activeDays} روز`;
    
    const replyMarkup = this.getPracticeDaysKeyboard();
    
    try {
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      await deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleTogglePracticeDay:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId);
  }
  
  async handleToggleEvaluationDay(chatId, messageId, dayValue, callbackQueryId) {
    if (this.settings.evaluation_days.includes(dayValue)) {
      this.settings.evaluation_days = this.settings.evaluation_days.filter(d => d !== dayValue);
    } else {
      this.settings.evaluation_days.push(dayValue);
    }
    
    this.settings.evaluation_days.sort();
    this.saveSettings();
    
    // به‌روزرسانی پیام با کیبورد جدید
    const activeDays = this.settings.evaluation_days.length;
    const text = `📊 *تنظیمات روزهای ارزیابی*
روزهای فعال: ${activeDays} روز`;
    
    const replyMarkup = this.getEvaluationDaysKeyboard();
    
    try {
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      await deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleToggleEvaluationDay:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId);
  }
  
  async handleToggleAttendanceDay(chatId, messageId, dayValue, callbackQueryId) {
    if (this.settings.attendance_days.includes(dayValue)) {
      this.settings.attendance_days = this.settings.attendance_days.filter(d => d !== dayValue);
    } else {
      this.settings.attendance_days.push(dayValue);
    }
    
    this.settings.attendance_days.sort();
    this.saveSettings();
    
    // به‌روزرسانی پیام با کیبورد جدید
    const activeDays = this.settings.attendance_days.length;
    const text = `👥 *تنظیمات روزهای حضور و غیاب*
روزهای فعال: ${activeDays} روز`;
    
    const replyMarkup = this.getAttendanceDaysKeyboard();
    
    try {
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      await deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleToggleAttendanceDay:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId);
  }
  
  async handleTogglePracticeEvaluationDay(chatId, messageId, dayValue, callbackQueryId) {
    const isPracticeActive = this.settings.practice_days.includes(dayValue);
    const isEvaluationActive = this.settings.evaluation_days.includes(dayValue);
    
    // چرخه: هیچکدام -> تمرین -> ارزیابی -> هر دو -> هیچکدام
    if (!isPracticeActive && !isEvaluationActive) {
      // هیچکدام -> تمرین
      this.settings.practice_days.push(dayValue);
    } else if (isPracticeActive && !isEvaluationActive) {
      // تمرین -> ارزیابی
      this.settings.practice_days = this.settings.practice_days.filter(d => d !== dayValue);
      this.settings.evaluation_days.push(dayValue);
    } else if (!isPracticeActive && isEvaluationActive) {
      // ارزیابی -> هر دو
      this.settings.practice_days.push(dayValue);
    } else {
      // هر دو -> هیچکدام
      this.settings.practice_days = this.settings.practice_days.filter(d => d !== dayValue);
      this.settings.evaluation_days = this.settings.evaluation_days.filter(d => d !== dayValue);
    }
    
    this.settings.practice_days.sort();
    this.settings.evaluation_days.sort();
    this.saveSettings();
    
    // به‌روزرسانی پیام با کیبورد جدید
    const practiceDays = this.settings.practice_days.length;
    const evaluationDays = this.settings.evaluation_days.length;
    const text = `🎯 *تنظیمات روزهای تمرین و ارزیابی*
روزهای تمرین: ${practiceDays} روز
روزهای ارزیابی: ${evaluationDays} روز

🎯 = هر دو فعال
📅 = فقط تمرین
📊 = فقط ارزیابی
❌ = هیچکدام`;
    
    const replyMarkup = this.getPracticeEvaluationDaysKeyboard();
    
    try {
      // اول پیام جدید ارسال کن
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      // بعد پیام قبلی رو حذف کن
      await deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleTogglePracticeEvaluationDay:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId);
  }
  
  async handleSelectAllPracticeDays(chatId, messageId, callbackQueryId) {
    this.settings.practice_days = [0, 1, 2, 3, 4, 5, 6];
    this.saveSettings();
    
    const text = `📅 *تنظیمات روزهای تمرین*
روزهای فعال: 7 روز`;
    
    const replyMarkup = this.getPracticeDaysKeyboard();
    
    try {
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      await deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleSelectAllPracticeDays:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId, '✅ همه روزهای تمرین فعال شد!');
  }
  
  async handleSelectNonePracticeDays(chatId, messageId, callbackQueryId) {
    this.settings.practice_days = [];
    this.saveSettings();
    
    const text = `📅 *تنظیمات روزهای تمرین*
روزهای فعال: 0 روز`;
    
    const replyMarkup = this.getPracticeDaysKeyboard();
    
    try {
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      await deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleSelectNonePracticeDays:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId, '❌ همه روزهای تمرین غیرفعال شد!');
  }
  
  async handleSelectAllEvaluationDays(chatId, messageId, callbackQueryId) {
    this.settings.evaluation_days = [0, 1, 2, 3, 4, 5, 6];
    this.saveSettings();
    
    const text = `📊 *تنظیمات روزهای ارزیابی*
روزهای فعال: 7 روز`;
    
    const replyMarkup = this.getEvaluationDaysKeyboard();
    
    try {
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      await deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleSelectAllEvaluationDays:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId, '✅ همه روزهای ارزیابی فعال شد!');
  }
  
  async handleSelectNoneEvaluationDays(chatId, messageId, callbackQueryId) {
    this.settings.evaluation_days = [];
    this.saveSettings();
    
    const text = `📊 *تنظیمات روزهای ارزیابی*
روزهای فعال: 0 روز`;
    
    const replyMarkup = this.getEvaluationDaysKeyboard();
    
    try {
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      await deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleSelectNoneEvaluationDays:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId, '❌ همه روزهای ارزیابی غیرفعال شد!');
  }
  
  async handleSelectAllAttendanceDays(chatId, messageId, callbackQueryId) {
    this.settings.attendance_days = [0, 1, 2, 3, 4, 5, 6];
    this.saveSettings();
    
    const text = `👥 *تنظیمات روزهای حضور و غیاب*
روزهای فعال: 7 روز`;
    
    const replyMarkup = this.getAttendanceDaysKeyboard();
    
    try {
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      await deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleSelectAllAttendanceDays:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId, '✅ همه روزهای حضور و غیاب فعال شد!');
  }
  
  async handleSelectNoneAttendanceDays(chatId, messageId, callbackQueryId) {
    this.settings.attendance_days = [];
    this.saveSettings();
    
    const text = `👥 *تنظیمات روزهای حضور و غیاب*
روزهای فعال: 0 روز`;
    
    const replyMarkup = this.getAttendanceDaysKeyboard();
    
    try {
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      await deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleSelectNoneAttendanceDays:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId, '❌ همه روزهای حضور و غیاب غیرفعال شد!');
  }
  
  async handleConfirmAttendanceDays(chatId, messageId, callbackQueryId) {
    console.log('👥 [SETTINGS] handleConfirmAttendanceDays STARTED');
    
    // ارسال گزارش به گروه گزارش
    const { REPORT_GROUP_ID } = require('./6mid');
    const moment = require('moment-jalaali');
    
    try {
      const now = moment();
      const time = now.format('HH:mm:ss');
      const day = now.format('jD');
      const month = now.format('jMMMM').replace(/^ا/, '');
      const year = now.format('jYYYY');
      
      const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
      const practiceDaysList = (this.settings.practice_days || []).map(d => dayNames[d]).join('، ') || '---';
      const evaluationDaysList = (this.settings.evaluation_days || []).map(d => dayNames[d]).join('، ') || '---';
      const attendanceDaysList = (this.settings.attendance_days || []).map(d => dayNames[d]).join('، ') || '---';

      const reportText = `👥 *برنامه جدید هفته تمرین و ارزیابی و کلاس  با مربیان*\nروزهای تمرین قرآن آموزان: ${practiceDaysList}\nروزهای ارزیابی قرآن آموزان: ${evaluationDaysList}\nروزهای کلاس با مربیان: ${attendanceDaysList}\n\nاعلام در ساعت: ${time}\nتاریخ: ${day} ${month} ${year}`;
      
      await sendMessage(REPORT_GROUP_ID, reportText);
      console.log(`✅ [SETTINGS] Attendance days confirmation report sent to group`);
    } catch (error) {
      console.error('❌ [SETTINGS] Error sending attendance confirmation report:', error.message);
    }
    
    // به‌روزرسانی پیام فعلی با پیام تایید
    const confirmText = `✅ *تنظیمات حضور و غیاب تایید شد*
روزهای فعال: ${this.settings.attendance_days.length} روز

گزارش به گروه ارسال شد.`;
    
    const confirmKeyboard = [
      [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'settings_main_menu' }]
    ];
    
    try {
      console.log('✅ [SETTINGS] Attempting to edit message with confirmation...');
      const editResult = await editMessage(chatId, messageId, confirmText, confirmKeyboard);
      console.log('✅ [SETTINGS] Message updated with confirmation successfully');
      console.log('✅ [SETTINGS] Edit result:', editResult);
    } catch (error) {
      console.error('❌ [SETTINGS] Error updating message with confirmation:', error.message);
      console.error('❌ [SETTINGS] Error details:', error.response?.data);
      // اگر editMessage موفق نبود، پیام جدید ارسال کن
      try {
        console.log('✅ [SETTINGS] Falling back to sendMessageWithInlineKeyboard...');
        await sendMessageWithInlineKeyboard(chatId, confirmText, confirmKeyboard.inline_keyboard);
        await deleteMessage(chatId, messageId);
        console.log('✅ [SETTINGS] Fallback message sent successfully');
      } catch (sendError) {
        console.error('❌ [SETTINGS] Error sending new confirmation message:', sendError.message);
      }
    }
    
    await answerCallbackQuery(callbackQueryId, '✅ تنظیمات حضور و غیاب تایید و گزارش شد!');
    console.log('👥 [SETTINGS] handleConfirmAttendanceDays COMPLETED');
  }
  
  async handleSelectAllPracticeEvaluationDays(chatId, messageId, callbackQueryId) {
    this.settings.practice_days = [0, 1, 2, 3, 4, 5, 6];
    this.settings.evaluation_days = [0, 1, 2, 3, 4, 5, 6];
    this.saveSettings();
    
    const text = `🎯 *تنظیمات روزهای تمرین و ارزیابی*
روزهای تمرین: 7 روز
روزهای ارزیابی: 7 روز

🎯 = هر دو فعال
📅 = فقط تمرین
📊 = فقط ارزیابی
❌ = هیچکدام`;
    
    const replyMarkup = this.getPracticeEvaluationDaysKeyboard();
    
    try {
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      await deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleSelectAllPracticeEvaluationDays:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId, '🎯 همه روزها برای تمرین و ارزیابی فعال شد!');
  }
  
  async handleSelectNonePracticeEvaluationDays(chatId, messageId, callbackQueryId) {
    this.settings.practice_days = [];
    this.settings.evaluation_days = [];
    this.saveSettings();
    
    const text = `🎯 *تنظیمات روزهای تمرین و ارزیابی*
روزهای تمرین: 0 روز
روزهای ارزیابی: 0 روز

🎯 = هر دو فعال
📅 = فقط تمرین
📊 = فقط ارزیابی
❌ = هیچکدام`;
    
    const replyMarkup = this.getPracticeEvaluationDaysKeyboard();
    
    try {
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      await deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('❌ [SETTINGS] Error in handleSelectNonePracticeEvaluationDays:', error.message);
    }
    
    await answerCallbackQuery(callbackQueryId, '❌ همه روزها غیرفعال شد!');
  }
  
  async handleToggleSatisfactionSurvey(chatId, messageId, callbackQueryId) {
    try {
      // تغییر وضعیت در فایل محلی
      this.settings.enable_satisfaction_survey = !this.settings.enable_satisfaction_survey;
      this.saveSettings();
      
      // تغییر وضعیت در site-status.json برای همگام‌سازی
      const { readJson, writeJson } = require('./server/utils/jsonStore');
      const siteStatus = await readJson('data/site-status.json', {
        registration: { enabled: true, lastUpdate: Date.now(), updatedFrom: 'ربات' },
        survey: { enabled: true, lastUpdate: Date.now(), updatedFrom: 'ربات' }
      });
      
      siteStatus.survey.enabled = this.settings.enable_satisfaction_survey;
      siteStatus.survey.lastUpdate = Date.now();
      siteStatus.survey.updatedFrom = 'ربات';
      
      await writeJson('data/site-status.json', siteStatus);
      
      const status = this.settings.enable_satisfaction_survey ? 'فعال' : 'غیرفعال';
      
      // فقط لاگ کنیم - گزارش در داشبورد وضعیت سیستم نمایش داده می‌شود
      console.log(`✅ [SETTINGS] Satisfaction survey status changed to: ${status}`);
      
      // ارسال event برای SSE clients و داشبورد (اگر gateway فعال باشد)
      try {
        const gateway = require('./gateway_bale');
        if (gateway && gateway.reportEvents) {
          gateway.reportEvents.emit('survey-change', siteStatus.survey);
          console.log('📡 [SETTINGS] SSE event emitted for survey change');
        }
        if (gateway && gateway.sendSettingsDashboard) {
          await gateway.sendSettingsDashboard();
          console.log('📊 [SETTINGS] Settings dashboard sent');
        }
      } catch (error) {
        console.log('⚠️ [SETTINGS] Could not emit SSE event or send dashboard (gateway might be offline)');
      }
      
      const text = `⚙️ *پنل تنظیمات مدیر*
انتخاب کنید:`;
      
      const replyMarkup = await this.getMainSettingsKeyboard();
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      await answerCallbackQuery(callbackQueryId, `📝 نظرسنجی ${status} شد!`);
      
    } catch (error) {
      console.error('❌ [SETTINGS] Error toggling satisfaction survey:', error);
      await answerCallbackQuery(callbackQueryId, '❌ خطا در تغییر وضعیت نظرسنجی');
    }
  }
  
  async handleToggleRegistration(chatId, messageId, callbackQueryId) {
    try {
      // دریافت وضعیت فعلی ثبت‌نام
      const { readJson, writeJson } = require('./server/utils/jsonStore');
      const siteStatus = await readJson('data/site-status.json', {
        registration: { enabled: true, lastUpdate: Date.now(), updatedFrom: 'ربات' },
        survey: { enabled: true, lastUpdate: Date.now(), updatedFrom: 'ربات' }
      });
      
      // تغییر وضعیت
      const newStatus = !siteStatus.registration.enabled;
      siteStatus.registration.enabled = newStatus;
      siteStatus.registration.lastUpdate = Date.now();
      siteStatus.registration.updatedFrom = 'ربات';
      
      // ذخیره تغییرات
      await writeJson('data/site-status.json', siteStatus);
      
      const status = newStatus ? 'فعال' : 'غیرفعال';
      
      // فقط لاگ کنیم - گزارش در داشبورد وضعیت سیستم نمایش داده می‌شود
      console.log(`✅ [SETTINGS] Registration status changed to: ${status}`);
      
      // ارسال event برای SSE clients و داشبورد (اگر gateway فعال باشد)
      try {
        const gateway = require('./gateway_bale');
        if (gateway && gateway.reportEvents) {
          gateway.reportEvents.emit('registration-change', siteStatus.registration);
          console.log('📡 [SETTINGS] SSE event emitted for registration change');
        }
        if (gateway && gateway.sendSettingsDashboard) {
          await gateway.sendSettingsDashboard();
          console.log('📊 [SETTINGS] Settings dashboard sent');
        }
      } catch (error) {
        console.log('⚠️ [SETTINGS] Could not emit SSE event or send dashboard (gateway might be offline)');
      }
      
      // آپدیت منوی تنظیمات
      const text = `⚙️ *پنل تنظیمات مدیر*
انتخاب کنید:`;
      
      const replyMarkup = await this.getMainSettingsKeyboard();
      await editMessage(chatId, messageId, text, replyMarkup.inline_keyboard);
      await answerCallbackQuery(callbackQueryId, `📝 ثبت‌نام ${status} شد!`);
      
    } catch (error) {
      console.error('❌ [SETTINGS] Error toggling registration:', error);
      await answerCallbackQuery(callbackQueryId, '❌ خطا در تغییر وضعیت ثبت‌نام');
    }
  }
  
  async handleToggleBotReports(chatId, messageId, callbackQueryId) {
    // تغییر وضعیت در فایل مشترک
    const currentStatus = getReportsEnabled();
    const newStatus = !currentStatus;
    const success = setReportsEnabled(newStatus, 'admin', 'bot');
    
    if (!success) {
      await answerCallbackQuery(callbackQueryId, '❌ خطا در تغییر تنظیمات');
      return;
    }
    
    const status = newStatus ? 'فعال' : 'غیرفعال';
    
    // فقط لاگ کنیم - گزارش در داشبورد وضعیت سیستم نمایش داده می‌شود
    console.log(`✅ [SETTINGS] Report status changed to: ${status}`);
    
             // ارسال event برای SSE clients و داشبورد
         if (reportEvents) {
           try {
             const config = loadReportsConfig();
             reportEvents.emit('reportChanged', {
               enabled: config.enabled,
               lastUpdate: config.lastUpdate,
               updatedBy: config.updatedBy,
               updatedFrom: config.updatedFrom,
               timestamp: Date.now()
             });
             console.log('📡 [SETTINGS] SSE event emitted for report change');
           } catch (error) {
             console.error('❌ [SETTINGS] Error emitting SSE event:', error);
           }
         }
         
         // ارسال داشبورد تنظیمات
         try {
           const gateway = require('./gateway_bale');
           if (gateway && gateway.sendSettingsDashboard) {
             await gateway.sendSettingsDashboard();
             console.log('📊 [SETTINGS] Settings dashboard sent');
           }
         } catch (error) {
           console.log('⚠️ [SETTINGS] Could not send settings dashboard (gateway might be offline)');
         }
         
         // آپدیت وضعیت ربات و ارسال داشبورد
         if (updateSystemStatus) {
           try {
             updateSystemStatus('robot', true);
             console.log('📊 [SETTINGS] Robot status updated via settings');
           } catch (error) {
             console.error('❌ [SETTINGS] Error updating robot status:', error);
           }
         }
    
    const text = `⚙️ *پنل تنظیمات مدیر*
انتخاب کنید:`;
    
    const replyMarkup = await this.getMainSettingsKeyboard();
    await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
    await answerCallbackQuery(callbackQueryId, `📋 گروه گزارش ${status} شد!`);
  }
  
  async handleResetSettings(chatId, messageId, callbackQueryId) {
    this.settings = {
      practice_days: [0, 1, 2, 3, 4, 5, 6],
      evaluation_days: [0, 1, 2, 3, 4, 5, 6],
      attendance_days: [0, 1, 2, 3, 4, 5, 6],
      enable_satisfaction_survey: true,
      enable_bot_reports: true
    };
    this.saveSettings();
    
    const text = `⚙️ *پنل تنظیمات مدیر*
انتخاب کنید:`;
    
    const replyMarkup = await this.getMainSettingsKeyboard();
    await sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
    await answerCallbackQuery(callbackQueryId, '🔄 تنظیمات بازنشانی شد!');
  }
  
  async handleSettingsBack(chatId, messageId, callbackQueryId) {
    const text = `🏠 *بازگشت به منوی اصلی*

تنظیمات با موفقیت ذخیره شد.
برای ادامه کار، از دکمه‌های منوی اصلی استفاده کنید.`;
    
    await sendMessage(chatId, text);
    await answerCallbackQuery(callbackQueryId);
  }
  
  // متدهای کمکی برای استفاده در سایر بخش‌ها
  getPracticeDays() {
    return this.settings.practice_days || [0, 1, 2, 3, 4, 5, 6];
  }
  
  getEvaluationDays() {
    return this.settings.evaluation_days || [0, 1, 2, 3, 4, 5, 6];
  }
  
  getAttendanceDays() {
    return this.settings.attendance_days || [0, 1, 2, 3, 4, 5, 6];
  }
  
  isSatisfactionSurveyEnabled() {
    return this.settings.enable_satisfaction_survey !== false;
  }
  
  isBotReportsEnabled() {
    // استفاده از فایل مشترک برای گزارش‌ها
    return getReportsEnabled();
  }
  
  isPracticeDayActive(day) {
    return this.getPracticeDays().includes(day);
  }
  
  isEvaluationDayActive(day) {
    return this.getEvaluationDays().includes(day);
  }
  
  isAttendanceDayActive(day) {
    return this.getAttendanceDays().includes(day);
  }
  
  isUserInState(userId) {
    return this.userStates.hasOwnProperty(userId);
  }
  
  getUserState(userId) {
    return this.userStates[userId];
  }
  
  clearUserState(userId) {
    delete this.userStates[userId];
  }
}

module.exports = SettingsModule; 