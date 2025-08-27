//⏰ 23:30:00 🗓️ چهارشنبه 15 مرداد 1404
// ماژول مدیریت کارگاه‌ها - مشابه Python kargah_module.py

const fs = require('fs');
const { hasPermission } = require('./6mid');
const { addCoachByPhone, removeCoachByPhone, WORKSHOP_CONFIG } = require('./3config.js');

class KargahModule {
  constructor() {
    this.workshops = {}; // ذخیره کارگاه‌ها
    this.userStates = {}; // وضعیت کاربران
    this.tempData = {}; // داده‌های موقت برای اضافه/ویرایش
    this.workshopsFile = './data/workshops.json';
    this.loadWorkshops();
    console.log('✅ KargahModule initialized successfully');
  }
  
  // متدهای ارسال پیام - برای اتصال از polling.js
  setSendMessage(sendMessage) {
    this.sendMessage = sendMessage;
  }
  
  setSendMessageWithInlineKeyboard(sendMessageWithInlineKeyboard) {
    this.sendMessageWithInlineKeyboard = sendMessageWithInlineKeyboard;
  }
  
  setEditMessageWithInlineKeyboard(editMessageWithInlineKeyboard) {
    this.editMessageWithInlineKeyboard = editMessageWithInlineKeyboard;
  }
  
  // متد پیش‌فرض برای ارسال پیام با کیبورد
  async sendMessageWithInlineKeyboard(chatId, text, keyboard) {
    if (this.sendMessageWithInlineKeyboard) {
      return await this.sendMessageWithInlineKeyboard(chatId, text, keyboard);
    } else {
      // استفاده از متد پیش‌فرض
      const { sendMessageWithInlineKeyboard } = require('./4bale');
      return await sendMessageWithInlineKeyboard(chatId, text, keyboard);
    }
  }
  
  // متد پیش‌فرض برای ویرایش پیام با کیبورد
  async editMessageWithInlineKeyboard(chatId, messageId, text, keyboard) {
    if (this.editMessageWithInlineKeyboard) {
      return await this.editMessageWithInlineKeyboard(chatId, messageId, text, keyboard);
    } else {
      // استفاده از متد پیش‌فرض
      const { editMessageWithInlineKeyboard } = require('./4bale');
      return await editMessageWithInlineKeyboard(chatId, messageId, text, keyboard);
    }
  }
  
  loadWorkshops() {
    try {
      if (fs.existsSync(this.workshopsFile)) {
        const data = fs.readFileSync(this.workshopsFile, 'utf8');
        this.workshops = JSON.parse(data);
        console.log('✅ Workshops loaded successfully');
        console.log('📊 Structure:', Object.keys(this.workshops));
      } else {
        this.workshops = { coach: {}, assistant: {} };
        console.log('No workshops file found, starting with empty structure');
      }
    } catch (error) {
      console.error('Error loading workshops:', error.message);
      this.workshops = { coach: {}, assistant: {} };
    }
  }
  
  saveWorkshops() {
    try {
      fs.writeFileSync(this.workshopsFile, JSON.stringify(this.workshops, null, 2), 'utf8');
      console.log('✅ Workshops saved successfully');
    } catch (error) {
      console.error('Error saving workshops:', error.message);
    }
  }
  
  isUserAdmin(userId) {
    return hasPermission(userId, 'SCHOOL_ADMIN');
  }
  
  getWorkshopListKeyboard() {
    const keyboard = [];
    
    if (!this.workshops.coach || Object.keys(this.workshops.coach).length === 0) {
      keyboard.push([{ text: '📝 کارگاه جدید', callback_data: 'kargah_add' }]);
      keyboard.push([{ text: '🔙 بازگشت', callback_data: 'kargah_back' }]);
    } else {
      for (const [coachId, coach] of Object.entries(this.workshops.coach)) {
        const instructorName = coach.name || 'نامشخص';
        const cost = coach.cost || 'نامشخص';
        keyboard.push([{
          text: `📚 ${instructorName} - ${cost}`,
          callback_data: `kargah_view_coach_${coachId}`
        }]);
      }
      
      keyboard.push([{ text: '📝 کارگاه جدید', callback_data: 'kargah_add' }]);
      keyboard.push([{ text: '🔙 بازگشت', callback_data: 'kargah_back' }]);
    }
    
    return { inline_keyboard: keyboard };
  }
  
  getWorkshopManagementKeyboard() {
    const keyboard = [];
    
    // نمایش لیست کارگاه‌ها
    if (this.workshops.coach && Object.keys(this.workshops.coach).length > 0) {
      for (const [coachId, coach] of Object.entries(this.workshops.coach)) {
        const instructorName = coach.name || 'نامشخص';
        const cost = coach.cost || 'نامشخص';
        const level = coach.level || '';
        const emoji = level.includes('پیشرفته') ? '🔥' : level.includes('متوسط') ? '⚡' : '🌱';
        keyboard.push([{
          text: `${emoji} ${instructorName} - ${cost}`,
          callback_data: `kargah_view_coach_${coachId}`
        }]);
      }
    }
    
    // دکمه‌های عملیات
    keyboard.push([{ text: '📝 اضافه کردن کارگاه', callback_data: 'kargah_add' }]);
    
    return { inline_keyboard: keyboard };
  }
  
  getWorkshopEditKeyboard(workshopId) {
    const keyboard = [
      [{ text: '✏️ ویرایش نام مربی', callback_data: `kargah_edit_instructor_${workshopId}` }],
      [{ text: '📱 ویرایش تلفن مربی', callback_data: `kargah_edit_phone_${workshopId}` }],
      [{ text: '💰 ویرایش هزینه', callback_data: `kargah_edit_cost_${workshopId}` }],
      [{ text: '🔗 ویرایش لینک', callback_data: `kargah_edit_link_${workshopId}` }],
      [{ text: '🗑️ حذف کارگاه', callback_data: `kargah_delete_${workshopId}` }],
      [{ text: '🔙 بازگشت', callback_data: 'kargah_list' }]
    ];
    return { inline_keyboard: keyboard };
  }
  
  async handleKargahCommand(chatId, userId) {
    if (!this.isUserAdmin(userId)) {
      return false;
    }
    
    let text = '';
    if (!this.workshops || Object.keys(this.workshops).length === 0) {
      text = `🏭 *مدیریت ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME}‌ها*\n\n❌ هیچ ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME}ی ثبت نشده است.\nبرای شروع، ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME} جدید اضافه کنید:`;
    } else {
      text = `🏭 *مدیریت ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME}‌ها*\n\n📋 لیست ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME}های ثبت شده:\n`;
      for (const [coachId, workshop] of Object.entries(this.workshops.coach)) {
        const instructorName = workshop.name || 'نامشخص';
        const cost = workshop.cost || 'نامشخص';
        const level = workshop.level || '';
        const emoji = level.includes('پیشرفته') ? '🔥' : level.includes('متوسط') ? '⚡' : '🌱';
        // نمایش نام مربی به جای ID کارگاه
        text += `${emoji} *${instructorName}* - ${cost}\n`;
      }
      text += `\nبرای مشاهده جزئیات و ویرایش، روی ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME} مورد نظر کلیک کنید:`;
    }
    
    const replyMarkup = this.getWorkshopManagementKeyboard();
    return await this.sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
  }
  
  // متد جدید برای پردازش پیام‌های متنی
  async handleMessage(message) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text || '';
    
    if (!this.isUserAdmin(userId)) {
      return false;
    }
    
    // بررسی وضعیت کاربر
    const userState = this.userStates[userId] || '';
    
    if (userState.startsWith('kargah_add_')) {
      return this.handleAddWorkshopStep(chatId, userId, text, userState);
    } else if (userState.startsWith('kargah_edit_')) {
      return this.handleEditWorkshopStep(chatId, userId, text, userState);
    } else if (text === '/کارگاه') {
      return this.handleKargahCommand(chatId, userId);
    }
    
    return false;
  }
  
  async handleCallback(callback) {
    const chatId = callback.message.chat.id;
    const userId = callback.from.id;
    const messageId = callback.message.message_id;
    const data = callback.data;
    const callbackQueryId = callback.id;
    
    // بررسی callback های دانش‌آموزان (بدون نیاز به دسترسی ادمین)
    if (data.startsWith('student_') || data === 'student_back_to_menu') {
      return this.routeCallback(chatId, messageId, userId, data, callbackQueryId);
    }
    
    // برای سایر callback ها، بررسی دسترسی ادمین
    if (!this.isUserAdmin(userId)) {
      return false;
    }
    
    return this.routeCallback(chatId, messageId, userId, data, callbackQueryId);
  }
  
  async routeCallback(chatId, messageId, userId, data, callbackQueryId) {
    try {
      console.log(`Routing kargah callback: ${data}`);
      
      // Callback های مربوط به دانش‌آموزان
      if (data === 'student_registration') {
        return this.handleStudentRegistration(chatId, messageId, userId, callbackQueryId);
      } else if (data.startsWith('student_select_workshop_')) {
        const workshopId = data.replace('student_select_workshop_', '');
        return this.handleStudentSelectWorkshop(chatId, messageId, userId, workshopId, callbackQueryId);
      } else if (data.startsWith('student_pay_workshop_')) {
        const workshopId = data.replace('student_pay_workshop_', '');
        return this.handleStudentPayWorkshop(chatId, messageId, userId, workshopId, callbackQueryId);
      } else if (data.startsWith('pay_workshop_')) {
        const workshopId = data.replace('pay_workshop_', '');
        return this.handlePayment(chatId, messageId, userId, workshopId, callbackQueryId);
      } else if (data === 'student_back_to_workshops') {
        return this.handleStudentBackToWorkshops(chatId, messageId, userId, callbackQueryId);
      } else if (data === 'student_back_to_menu') {
        return this.handleStudentBackToMenu(chatId, messageId, callbackQueryId);
      }
      // Callback های مربوط به ادمین‌ها
      else if (data === 'kargah_add') {
        return this.handleAddWorkshop(chatId, messageId, userId, callbackQueryId);
      } else if (data === 'kargah_back') {
        return this.handleBackToMain(chatId, messageId, callbackQueryId);
      } else if (data === 'kargah_list') {
        return this.handleListWorkshops(chatId, messageId, callbackQueryId);
      } else if (data.startsWith('kargah_view_')) {
        const workshopId = data.replace('kargah_view_', '');
        return this.handleViewWorkshop(chatId, messageId, workshopId, callbackQueryId);
      } else if (data.startsWith('kargah_edit_instructor_')) {
        const workshopId = data.replace('kargah_edit_instructor_', '');
        return this.handleEditInstructor(chatId, messageId, userId, workshopId, callbackQueryId);
      } else if (data.startsWith('kargah_edit_phone_')) {
        const workshopId = data.replace('kargah_edit_phone_', '');
        return this.handleEditPhone(chatId, messageId, userId, workshopId, callbackQueryId);
      } else if (data.startsWith('kargah_edit_cost_')) {
        const workshopId = data.replace('kargah_edit_cost_', '');
        return this.handleEditCost(chatId, messageId, userId, workshopId, callbackQueryId);
      } else if (data.startsWith('kargah_edit_link_')) {
        const workshopId = data.replace('kargah_edit_link_', '');
        return this.handleEditLink(chatId, messageId, userId, workshopId, callbackQueryId);
      } else if (data.startsWith('kargah_delete_')) {
        const workshopId = data.replace('kargah_delete_', '');
        return this.handleDeleteWorkshop(chatId, messageId, workshopId, callbackQueryId);
      } else if (data === 'kargah_confirm_save') {
        return this.handleConfirmSaveWorkshop(chatId, messageId, userId, callbackQueryId);
      } else if (data === 'kargah_restart_add') {
        return this.handleRestartAddWorkshop(chatId, messageId, userId, callbackQueryId);
      } else {
        console.warn(`Unknown kargah callback data: ${data}`);
        return false;
      }
    } catch (error) {
      console.error('Error in kargah callback routing:', error.message);
      return false;
    }
  }
  
  async handleListWorkshops(chatId, messageId, callbackQueryId) {
    let text = '';
    if (!this.workshops.coach || Object.keys(this.workshops.coach).length === 0) {
      text = `📋 *لیست ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME}‌ها*\n\n❌ هیچ ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME}ی ثبت نشده است.`;
    } else {
      text = `📋 *لیست ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME}‌ها*\n\n`;
      for (const [coachId, coach] of Object.entries(this.workshops.coach)) {
        const instructorName = coach.name || 'نامشخص';
        const cost = coach.cost || 'نامشخص';
        const link = coach.link || 'نامشخص';
        // نمایش نام مربی به جای ID کارگاه
        text += `🏭 *${instructorName}*\n`;
        text += `💰 هزینه: ${cost}\n`;
        text += `🔗 لینک: ${link}\n\n`;
      }
    }
    
    const replyMarkup = this.getWorkshopListKeyboard();
    await this.editMessageWithInlineKeyboard(chatId, messageId, text, replyMarkup.inline_keyboard);
    return true;
  }
  
  async handleAddWorkshop(chatId, messageId, userId, callbackQueryId) {
    console.log(`🔍 [KARGAH] Setting user state for ${userId} to kargah_add_instructor`);
    this.userStates[userId] = 'kargah_add_instructor';
    this.tempData[userId] = {};
    console.log(`🔍 [KARGAH] User state set. isUserInState(${userId}): ${this.isUserInState(userId)}`);
    console.log(`🔍 [KARGAH] Current userStates:`, this.userStates);
    
    const text = `📝 *اضافه کردن ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME} جدید*\n\nلطفاً ${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.INSTRUCTOR_NAME} را وارد کنید:`;
    const keyboard = [[{ text: '🔙 بازگشت', callback_data: 'kargah_list' }]];
    await this.editMessageWithInlineKeyboard(chatId, messageId, text, keyboard);
    return true;
  }
  
  async handleAddWorkshopStep(chatId, userId, text, userState) {
    try {
      console.log(`Processing add workshop step: ${userState}`);
      console.log(`Text received: "${text}"`);
      
      // اطمینان از وجود tempData برای کاربر
      if (!this.tempData[userId]) {
        this.tempData[userId] = {};
      }
      
      if (userState === 'kargah_add_instructor') {
        // ساده‌سازی اعتبارسنجی نام مربی - فقط بررسی خالی نبودن
        if (!text || text.trim().length === 0) {
          await this.sendMessage(chatId, `❌ ${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.INSTRUCTOR_NAME} نمی‌تواند خالی باشد. لطفاً ${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.INSTRUCTOR_NAME} را وارد کنید:`);
          return true;
        }
        
        console.log(`✅ Accepting instructor name: "${text.trim()}"`);
        this.tempData[userId].instructor_name = text.trim();
        this.userStates[userId] = 'kargah_add_cost';
        
        const responseText = `✅ ${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.INSTRUCTOR_NAME} ثبت شد: *${text.trim()}*\n\n💰 لطفاً ${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.COST} ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME} را وارد کنید:\n\n📝 مثال‌های صحیح:\n• 500,000 تومان\n• 750000 تومان\n• ۱,۰۰۰,۰۰۰ تومان\n• 1000000 تومان`;
        await this.sendMessage(chatId, responseText);
        
      } else if (userState === 'kargah_add_cost') {
        // بررسی اعتبار هزینه
        const normalizedCost = this.normalizeCostText(text);
        if (!normalizedCost || normalizedCost === 'نامشخص') {
          await this.sendMessage(chatId, '❌ هزینه وارد شده نامعتبر است. لطفاً دوباره وارد کنید:\n\nمثال‌های صحیح:\n• 500,000 تومان\n• 750000 تومان\n• ۱,۰۰۰,۰۰۰ تومان');
          return true;
        }
        
        this.tempData[userId].cost = normalizedCost;
        this.userStates[userId] = 'kargah_add_phone';
        
        const responseText = `✅ ${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.COST} ثبت شد: *${normalizedCost}*\n\n📱 لطفاً ${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.PHONE} را وارد کنید (اختیاری):\n\n📝 مثال‌های صحیح:\n• 09123456789\n• 0912 345 6789\n• 0 برای رد کردن`;
        await this.sendMessage(chatId, responseText);
        
      } else if (userState === 'kargah_add_phone') {
        // پردازش شماره تلفن مربی (اختیاری)
        let instructorPhone = '';
        if (text && text.trim() !== '0' && text.trim() !== '') {
          // تمیز کردن شماره تلفن
          instructorPhone = text.replace(/\s/g, '').replace(/[۰-۹]/g, function(w) {
            return String.fromCharCode(w.charCodeAt(0) - '۰'.charCodeAt(0) + '0'.charCodeAt(0));
          });
          
          // بررسی اعتبار شماره تلفن (اختیاری)
          if (!/^09\d{9}$/.test(instructorPhone)) {
            instructorPhone = ''; // اگر نامعتبر باشد، خالی بگذار
          }
        }
        
        this.tempData[userId].instructor_phone = instructorPhone;
        this.userStates[userId] = 'kargah_add_link';
        
        const phoneStatus = instructorPhone ? `✅ ${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.PHONE}: *${instructorPhone}*` : `⏭️ ${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.PHONE} رد شد`;
        const responseText = `${phoneStatus}\n\n🔗 لطفاً ${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.LINK} را وارد کنید:\n\n📝 مثال‌های صحیح:\n• https://t.me/workshop_group\n• https://t.me/+abcdefghijk\n• t.me/workshop_group`;
        await this.sendMessage(chatId, responseText);
        
      } else if (userState === 'kargah_add_link') {
        // حذف کامل اعتبارسنجی لینک - هر متنی پذیرفته شود
        this.tempData[userId].link = text;
        
        // نمایش خلاصه کارگاه قبل از ذخیره
        const phoneDisplay = this.tempData[userId].instructor_phone ? `\n📱 *${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.PHONE}:* ${this.tempData[userId].instructor_phone}` : `\n📱 *${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.PHONE}:* وارد نشده`;
        const summaryText = `📋 *خلاصه ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME} جدید*\n\n👨‍🏫 *${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.INSTRUCTOR_NAME}:* ${this.tempData[userId].instructor_name}${phoneDisplay}\n💰 *${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.COST}:* ${this.tempData[userId].cost}\n🔗 *${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.LINK}:* ${this.tempData[userId].link}\n\n✅ آیا می‌خواهید این ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME} را ذخیره کنید؟`;
        
        const keyboard = [
          [{ text: '✅ بله، ذخیره کن', callback_data: 'kargah_confirm_save' }],
          [{ text: '❌ خیر، دوباره شروع کن', callback_data: 'kargah_restart_add' }]
        ];
        
        await this.sendMessageWithInlineKeyboard(chatId, summaryText, keyboard);
        
        // تغییر وضعیت به انتظار تایید
        this.userStates[userId] = 'kargah_waiting_confirmation';
      }
      
      return true;
    } catch (error) {
      console.error('Error in add workshop step:', error.message);
      // پاک کردن وضعیت در صورت خطا
      if (userId in this.userStates) {
        delete this.userStates[userId];
      }
      if (userId in this.tempData) {
        delete this.tempData[userId];
      }
      
      const responseText = `❌ خطا در اضافه کردن ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME}. لطفاً دوباره تلاش کنید.`;
      const replyMarkup = this.getWorkshopManagementKeyboard();
      await this.sendMessageWithInlineKeyboard(chatId, responseText, replyMarkup.inline_keyboard);
      return false;
    }
  }
  
  async handleViewWorkshop(chatId, messageId, workshopId, callbackQueryId) {
    // بررسی نوع ID (coach یا assistant)
    let workshop = null;
    let workshopType = '';
    
    if (workshopId.startsWith('coach_')) {
      const coachId = workshopId.replace('coach_', '');
      workshop = this.workshops.coach?.[coachId];
      workshopType = 'coach';
    } else if (workshopId.startsWith('assistant_')) {
      const assistantId = workshopId.replace('assistant_', '');
      workshop = this.workshops.assistant?.[assistantId];
      workshopType = 'assistant';
    } else {
      // برای backward compatibility
      workshop = this.workshops.coach?.[workshopId] || this.workshops.assistant?.[workshopId];
      if (this.workshops.coach?.[workshopId]) {
        workshopType = 'coach';
      } else if (this.workshops.assistant?.[workshopId]) {
        workshopType = 'assistant';
      }
    }
    
    if (!workshop) {
      const text = '❌ کارگاه مورد نظر یافت نشد.';
      const replyMarkup = this.getWorkshopManagementKeyboard();
      await this.editMessageWithInlineKeyboard(chatId, messageId, text, replyMarkup.inline_keyboard);
      return true;
    }
    
    const instructorName = workshop.name || workshop.instructor_name || 'نامشخص';
    const instructorPhone = workshop.phone || workshop.instructor_phone || 'وارد نشده';
    const cost = workshop.cost || 'نامشخص';
    const link = workshop.link || 'نامشخص';
    const description = workshop.description || 'توضیحات موجود نیست';
    const capacity = workshop.capacity || 'نامشخص';
    const duration = workshop.duration || 'نامشخص';
    const level = workshop.level || 'نامشخص';
    
    let text = `🏭 *جزئیات ${workshopType === 'coach' ? 'کارگاه' : 'کمک مربی'}*\n\n`;
    text += `👨‍🏫 *نام ${workshopType === 'coach' ? 'مربی' : 'کمک مربی'}:* ${instructorName}\n`;
    text += `📱 *تلفن:* ${instructorPhone}\n`;
    if (workshopType === 'coach') {
      text += `💰 *هزینه:* ${cost}\n`;
      text += `📝 *توضیحات:* ${description}\n`;
      text += `👥 *ظرفیت:* ${capacity} نفر\n`;
      text += `⏱️ *مدت دوره:* ${duration}\n`;
      text += `📊 *سطح:* ${level}\n`;
      text += `🔗 *لینک گروه:* ${link}\n`;
    }
    text += `🆔 *کد:* ${workshopId}`;
    
    const replyMarkup = this.getWorkshopEditKeyboard(workshopId);
    await this.editMessageWithInlineKeyboard(chatId, messageId, text, replyMarkup.inline_keyboard);
    return true;
  }
  
  async handleEditInstructor(chatId, messageId, userId, workshopId, callbackQueryId) {
    // بررسی نوع ID (coach یا assistant)
    let workshop = null;
    let workshopType = '';
    
    if (workshopId.startsWith('coach_')) {
      const coachId = workshopId.replace('coach_', '');
      workshop = this.workshops.coach?.[coachId];
      workshopType = 'coach';
    } else if (workshopId.startsWith('assistant_')) {
      const assistantId = workshopId.replace('assistant_', '');
      workshop = this.workshops.assistant?.[assistantId];
      workshopType = 'assistant';
    } else {
      // برای backward compatibility
      workshop = this.workshops.coach?.[workshopId] || this.workshops.assistant?.[workshopId];
      if (this.workshops.coach?.[workshopId]) {
        workshopType = 'coach';
      } else if (this.workshops.assistant?.[workshopId]) {
        workshopType = 'assistant';
      }
    }
    
    if (!workshop) {
      return false;
    }
    
    this.userStates[userId] = `kargah_edit_instructor_${workshopId}`;
    this.tempData[userId] = { workshop_id: workshopId, workshop_type: workshopType };
    
    const text = '👨‍🏫 لطفاً نام جدید مربی را وارد کنید:';
    const keyboard = [[{ text: '🔙 بازگشت', callback_data: `kargah_view_${workshopId}` }]];
    await this.editMessageWithInlineKeyboard(chatId, messageId, text, keyboard);
    return true;
  }
  
  async handleEditPhone(chatId, messageId, userId, workshopId, callbackQueryId) {
    // بررسی نوع ID (coach یا assistant)
    let workshop = null;
    let workshopType = '';
    
    if (workshopId.startsWith('coach_')) {
      const coachId = workshopId.replace('coach_', '');
      workshop = this.workshops.coach?.[coachId];
      workshopType = 'coach';
    } else if (workshopId.startsWith('assistant_')) {
      const assistantId = workshopId.replace('assistant_', '');
      workshop = this.workshops.assistant?.[assistantId];
      workshopType = 'assistant';
    } else {
      // برای backward compatibility
      workshop = this.workshops.coach?.[workshopId] || this.workshops.assistant?.[workshopId];
      if (this.workshops.coach?.[workshopId]) {
        workshopType = 'coach';
      } else if (this.workshops.assistant?.[workshopId]) {
        workshopType = 'assistant';
      }
    }
    
    if (!workshop) {
      return false;
    }
    
    this.userStates[userId] = `kargah_edit_phone_${workshopId}`;
    this.tempData[userId] = { workshop_id: workshopId, workshop_type: workshopType };
    
    const currentPhone = workshop.phone || 'وارد نشده';
    const text = `📱 *ویرایش تلفن مربی*\n\nتلفن فعلی: ${currentPhone}\n\nلطفاً شماره تلفن جدید را وارد کنید:\n\nمثال‌ها:\n• 09123456789\n• 0912 345 6789\n• 0 برای پاک کردن`;
    const keyboard = [[{ text: '🔙 بازگشت', callback_data: `kargah_view_${workshopId}` }]];
    await this.editMessageWithInlineKeyboard(chatId, messageId, text, keyboard);
    return true;
  }
  
  async handleEditCost(chatId, messageId, userId, workshopId, callbackQueryId) {
    // بررسی نوع ID (coach یا assistant)
    let workshop = null;
    let workshopType = '';
    
    if (workshopId.startsWith('coach_')) {
      const coachId = workshopId.replace('coach_', '');
      workshop = this.workshops.coach?.[coachId];
      workshopType = 'coach';
    } else if (workshopId.startsWith('assistant_')) {
      const assistantId = workshopId.replace('assistant_', '');
      workshop = this.workshops.assistant?.[assistantId];
      workshopType = 'assistant';
    } else {
      // برای backward compatibility
      workshop = this.workshops.coach?.[workshopId] || this.workshops.assistant?.[workshopId];
      if (this.workshops.coach?.[workshopId]) {
        workshopType = 'coach';
      } else if (this.workshops.assistant?.[workshopId]) {
        workshopType = 'assistant';
      }
    }
    
    if (!workshop) {
      return false;
    }
    
    this.userStates[userId] = `kargah_edit_cost_${workshopId}`;
    this.tempData[userId] = { workshop_id: workshopId, workshop_type: workshopType };
    
    const currentCost = workshop.cost || 'نامشخص';
    const text = `💰 *ویرایش هزینه کارگاه*\n\nهزینه فعلی: ${currentCost}\n\nلطفاً هزینه جدید را وارد کنید:\n\nمثال‌ها:\n• 500,000 تومان\n• 750000 تومان\n• 1000000 تومان\n• ۱,۰۰۰,۰۰۰ تومان`;
    const keyboard = [[{ text: '🔙 بازگشت', callback_data: `kargah_view_${workshopId}` }]];
    await this.editMessageWithInlineKeyboard(chatId, messageId, text, keyboard);
    return true;
  }
  
  async handleEditLink(chatId, messageId, userId, workshopId, callbackQueryId) {
    // بررسی نوع ID (coach یا assistant)
    let workshop = null;
    let workshopType = '';
    
    if (workshopId.startsWith('coach_')) {
      const coachId = workshopId.replace('coach_', '');
      workshop = this.workshops.coach?.[coachId];
      workshopType = 'coach';
    } else if (workshopId.startsWith('assistant_')) {
      const assistantId = workshopId.replace('assistant_', '');
      workshop = this.workshops.assistant?.[assistantId];
      workshopType = 'assistant';
    } else {
      // برای backward compatibility
      workshop = this.workshops.coach?.[workshopId] || this.workshops.assistant?.[workshopId];
      if (this.workshops.coach?.[workshopId]) {
        workshopType = 'coach';
      } else if (this.workshops.assistant?.[workshopId]) {
        workshopType = 'assistant';
      }
    }
    
    if (!workshop) {
      return false;
    }
    
    this.userStates[userId] = `kargah_edit_link_${workshopId}`;
    this.tempData[userId] = { workshop_id: workshopId, workshop_type: workshopType };
    
    const text = '🔗 لطفاً لینک جدید را وارد کنید:';
    const keyboard = [[{ text: '🔙 بازگشت', callback_data: `kargah_view_${workshopId}` }]];
    await this.editMessageWithInlineKeyboard(chatId, messageId, text, keyboard);
    return true;
  }
  
  async handleEditWorkshopStep(chatId, userId, text, userState) {
    try {
      console.log(`Processing edit workshop step: ${userState}`);
      
      if (userState.startsWith('kargah_edit_instructor_')) {
        const workshopId = userState.replace('kargah_edit_instructor_', '');
        const userData = this.tempData[userId];
        const workshopType = userData?.workshop_type || 'coach';
        
        let workshop = null;
        if (workshopType === 'coach') {
          if (workshopId.startsWith('coach_')) {
            const coachId = workshopId.replace('coach_', '');
            workshop = this.workshops.coach?.[coachId];
          } else {
            workshop = this.workshops.coach?.[workshopId];
          }
        } else if (workshopType === 'assistant') {
          if (workshopId.startsWith('assistant_')) {
            const assistantId = workshopId.replace('assistant_', '');
            workshop = this.workshops.assistant?.[assistantId];
          } else {
            workshop = this.workshops.assistant?.[workshopId];
          }
        }
        
        if (workshop) {
          // ساده‌سازی اعتبارسنجی نام مربی - فقط بررسی خالی نبودن
          if (!text || text.trim().length === 0) {
            await this.sendMessage(chatId, '❌ نام مربی نمی‌تواند خالی باشد. لطفاً نام مربی را وارد کنید:');
            return true;
          }
          
          const oldName = workshop.name || 'نامشخص';
          workshop.name = text.trim();
          this.saveWorkshops();
          
          delete this.userStates[userId];
          if (userId in this.tempData) {
            delete this.tempData[userId];
          }
          
          const responseText = `✅ نام مربی کارگاه *${workshopId}* با موفقیت تغییر یافت!\n\n👤 *قبل:* ${oldName}\n👤 *بعد:* ${text.trim()}`;
          const replyMarkup = this.getWorkshopManagementKeyboard();
          await this.sendMessageWithInlineKeyboard(chatId, responseText, replyMarkup.inline_keyboard);
        }
        
      } else if (userState.startsWith('kargah_edit_phone_')) {
        const workshopId = userState.replace('kargah_edit_phone_', '');
        const userData = this.tempData[userId];
        const workshopType = userData?.workshop_type || 'coach';
        
        let workshop = null;
        if (workshopType === 'coach') {
          if (workshopId.startsWith('coach_')) {
            const coachId = workshopId.replace('coach_', '');
            workshop = this.workshops.coach?.[coachId];
          } else {
            workshop = this.workshops.coach?.[workshopId];
          }
        } else if (workshopType === 'assistant') {
          if (workshopId.startsWith('assistant_')) {
            const assistantId = workshopId.replace('assistant_', '');
            workshop = this.workshops.assistant?.[assistantId];
          } else {
            workshop = this.workshops.assistant?.[workshopId];
          }
        }
        
        if (workshop) {
          // پردازش شماره تلفن مربی (اختیاری)
          let instructorPhone = '';
          if (text && text.trim() !== '0' && text.trim() !== '') {
            // تمیز کردن شماره تلفن
            instructorPhone = text.replace(/\s/g, '').replace(/[۰-۹]/g, function(w) {
              return String.fromCharCode(w.charCodeAt(0) - '۰'.charCodeAt(0) + '0'.charCodeAt(0));
            });
            
            // بررسی اعتبار شماره تلفن (اختیاری)
            if (!/^09\d{9}$/.test(instructorPhone)) {
              instructorPhone = ''; // اگر نامعتبر باشد، خالی بگذار
            }
          }
          
          const oldPhone = workshop.phone || 'وارد نشده';
          workshop.phone = instructorPhone;
          this.saveWorkshops();
          
          delete this.userStates[userId];
          if (userId in this.tempData) {
            delete this.tempData[userId];
          }
          
          const newPhoneDisplay = instructorPhone ? instructorPhone : 'حذف شد';
          const responseText = `✅ تلفن مربی کارگاه *${workshopId}* با موفقیت تغییر یافت!\n\n📱 *قبل:* ${oldPhone}\n📱 *بعد:* ${newPhoneDisplay}`;
          const replyMarkup = this.getWorkshopManagementKeyboard();
          await this.sendMessageWithInlineKeyboard(chatId, responseText, replyMarkup.inline_keyboard);
        }
        
      } else if (userState.startsWith('kargah_edit_cost_')) {
        const workshopId = userState.replace('kargah_edit_cost_', '');
        const userData = this.tempData[userId];
        const workshopType = userData?.workshop_type || 'coach';
        
        let workshop = null;
        if (workshopType === 'coach') {
          if (workshopId.startsWith('coach_')) {
            const coachId = workshopId.replace('coach_', '');
            workshop = this.workshops.coach?.[coachId];
          } else {
            workshop = this.workshops.coach?.[workshopId];
          }
        } else if (workshopType === 'assistant') {
          if (workshopId.startsWith('assistant_')) {
            const assistantId = workshopId.replace('assistant_', '');
            workshop = this.workshops.assistant?.[assistantId];
          } else {
            workshop = this.workshops.assistant?.[workshopId];
          }
        }
        
        if (workshop) {
          // بررسی اعتبار هزینه
          const normalizedCost = this.normalizeCostText(text);
          if (!normalizedCost || normalizedCost === 'نامشخص') {
            await this.sendMessage(chatId, '❌ هزینه وارد شده نامعتبر است. لطفاً دوباره وارد کنید:\n\nمثال‌های صحیح:\n• 500,000 تومان\n• 750000 تومان\n• ۱,۰۰۰,۰۰۰ تومان');
            return true;
          }
          
          const oldCost = workshop.cost;
          workshop.cost = normalizedCost;
          this.saveWorkshops();
          
          delete this.userStates[userId];
          if (userId in this.tempData) {
            delete this.tempData[userId];
          }
          
          const responseText = `✅ هزینه کارگاه *${workshopId}* با موفقیت تغییر یافت!\n\n💰 *قبل:* ${oldCost}\n💰 *بعد:* ${normalizedCost}`;
          const replyMarkup = this.getWorkshopManagementKeyboard();
          await this.sendMessageWithInlineKeyboard(chatId, responseText, replyMarkup.inline_keyboard);
        }
        
      } else if (userState.startsWith('kargah_edit_link_')) {
        const workshopId = userState.replace('kargah_edit_link_', '');
        const userData = this.tempData[userId];
        const workshopType = userData?.workshop_type || 'coach';
        
        let workshop = null;
        if (workshopType === 'coach') {
          if (workshopId.startsWith('coach_')) {
            const coachId = workshopId.replace('coach_', '');
            workshop = this.workshops.coach?.[coachId];
          } else {
            workshop = this.workshops.coach?.[workshopId];
          }
        } else if (workshopType === 'assistant') {
          if (workshopId.startsWith('assistant_')) {
            const assistantId = workshopId.replace('assistant_', '');
            workshop = this.workshops.assistant?.[assistantId];
          } else {
            workshop = this.workshops.assistant?.[workshopId];
          }
        }
        
        if (workshop) {
          // حذف کامل اعتبارسنجی لینک - هر متنی پذیرفته شود
          const oldLink = workshop.link;
          workshop.link = text;
          this.saveWorkshops();
          
          delete this.userStates[userId];
          if (userId in this.tempData) {
            delete this.tempData[userId];
          }
          
          const responseText = `✅ لینک کارگاه *${workshopId}* با موفقیت تغییر یافت!\n\n🔗 *قبل:* ${oldLink}\n🔗 *بعد:* ${text}`;
          const replyMarkup = this.getWorkshopManagementKeyboard();
          await this.sendMessageWithInlineKeyboard(chatId, responseText, replyMarkup.inline_keyboard);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in edit workshop step:', error.message);
      // پاک کردن وضعیت در صورت خطا
      if (userId in this.userStates) {
        delete this.userStates[userId];
      }
      if (userId in this.tempData) {
        delete this.tempData[userId];
      }
      
      const responseText = '❌ خطا در ویرایش کارگاه. لطفاً دوباره تلاش کنید.';
      const replyMarkup = this.getWorkshopManagementKeyboard();
      await this.sendMessageWithInlineKeyboard(chatId, responseText, replyMarkup.inline_keyboard);
      return false;
    }
  }
  
  async handleDeleteWorkshop(chatId, messageId, workshopId, callbackQueryId) {
    // بررسی نوع ID (coach یا assistant)
    let workshop = null;
    let workshopType = '';
    
    if (workshopId.startsWith('coach_')) {
      const coachId = workshopId.replace('coach_', '');
      workshop = this.workshops.coach?.[coachId];
      workshopType = 'coach';
    } else if (workshopId.startsWith('assistant_')) {
      const assistantId = workshopId.replace('assistant_', '');
      workshop = this.workshops.assistant?.[assistantId];
      workshopType = 'assistant';
    } else {
      // برای backward compatibility
      workshop = this.workshops.coach?.[workshopId] || this.workshops.assistant?.[workshopId];
      if (this.workshops.coach?.[workshopId]) {
        workshopType = 'coach';
      } else if (this.workshops.assistant?.[workshopId]) {
        workshopType = 'assistant';
      }
    }
    
    if (!workshop) {
      return false;
    }
    
    const workshopName = workshop.name || workshop.instructor_name || 'نامشخص';
    const instructorPhone = workshop.phone || workshop.instructor_phone;
    
    // حذف کارگاه
    if (workshopType === 'coach') {
      const coachId = workshopId.startsWith('coach_') ? workshopId.replace('coach_', '') : workshopId;
      delete this.workshops.coach[coachId];
    } else if (workshopType === 'assistant') {
      const assistantId = workshopId.startsWith('assistant_') ? workshopId.replace('assistant_', '') : workshopId;
      delete this.workshops.assistant[assistantId];
    }
    
    this.saveWorkshops();
    
    // حذف مربی از لیست COACH اگر شماره تلفن داشته باشد
    if (instructorPhone && instructorPhone.trim() !== '') {
      try {
        const result = removeCoachByPhone(instructorPhone);
        if (result.success) {
          console.log(`✅ [KARGAH] Coach with phone ${instructorPhone} removed from COACH role`);
        } else {
          console.log(`⚠️ [KARGAH] Failed to remove coach: ${result.message}`);
        }
      } catch (error) {
        console.error('❌ [KARGAH] Error removing coach from COACH role:', error);
      }
    }
    
    const text = `🗑️ ${workshopType === 'coach' ? 'کارگاه' : 'کمک مربی'} ${workshopName} با موفقیت حذف شد!`;
    const replyMarkup = this.getWorkshopManagementKeyboard();
    await this.editMessageWithInlineKeyboard(chatId, messageId, text, replyMarkup.inline_keyboard);
    return true;
  }
  
  async handleBackToMain(chatId, messageId, callbackQueryId) {
    const text = '🏭 *مدیریت کارگاه‌ها*\n\nلطفاً یکی از گزینه‌های زیر را انتخاب کنید:';
    const replyMarkup = this.getWorkshopManagementKeyboard();
    await this.editMessageWithInlineKeyboard(chatId, messageId, text, replyMarkup.inline_keyboard);
    return true;
  }
  
  async handleConfirmSaveWorkshop(chatId, messageId, userId, callbackQueryId) {
    try {
      if (!this.tempData[userId]) {
        return false;
      }
      
      // ایجاد کارگاه جدید در بخش coach
      const coachId = String(Object.keys(this.workshops.coach || {}).length + 1);
      const workshopData = { ...this.tempData[userId] };
      
      // تبدیل فیلدهای قدیمی به جدید
      const newCoachData = {
        name: workshopData.instructor_name,
        phone: workshopData.instructor_phone,
        cost: workshopData.cost,
        link: workshopData.link,
        description: workshopData.description || WORKSHOP_CONFIG.DEFAULTS.DESCRIPTION,
        capacity: workshopData.capacity || WORKSHOP_CONFIG.DEFAULTS.CAPACITY,
        duration: workshopData.duration || WORKSHOP_CONFIG.DEFAULTS.DURATION,
        level: workshopData.level || WORKSHOP_CONFIG.DEFAULTS.LEVEL
      };
      
      // اطمینان از وجود بخش coach
      if (!this.workshops.coach) {
        this.workshops.coach = {};
      }
      
      this.workshops.coach[coachId] = newCoachData;
      this.saveWorkshops();
      
      // اضافه کردن مربی به لیست COACH اگر شماره تلفن داشته باشد
      if (workshopData.instructor_phone && workshopData.instructor_phone.trim() !== '') {
        try {
          const result = addCoachByPhone(workshopData.instructor_phone, workshopData.instructor_name);
          if (result.success) {
            console.log(`✅ [KARGAH] Coach ${workshopData.instructor_name} with phone ${workshopData.instructor_phone} added to COACH role`);
          } else {
            console.log(`⚠️ [KARGAH] Failed to add coach: ${result.message}`);
          }
        } catch (error) {
          console.error('❌ [KARGAH] Error adding coach to COACH role:', error);
        }
      }
      
      // نمایش پیام موفقیت
      const responseText = `✅ ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME} *${workshopData.instructor_name}* با موفقیت اضافه شد!\n\n🆔 *کد ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME}:* coach_${coachId}\n👨‍🏫 *${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.INSTRUCTOR_NAME}:* ${workshopData.instructor_name}\n💰 *${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.COST}:* ${workshopData.cost}\n🔗 *${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.LINK}:* ${workshopData.link}`;
      const replyMarkup = this.getWorkshopManagementKeyboard();
      await this.editMessageWithInlineKeyboard(chatId, messageId, responseText, replyMarkup.inline_keyboard);
      
      // پاک کردن داده‌های موقت
      delete this.userStates[userId];
      delete this.tempData[userId];
      
      return true;
    } catch (error) {
      console.error('Error in confirm save workshop:', error.message);
      return false;
    }
  }
  
  async handleRestartAddWorkshop(chatId, messageId, userId, callbackQueryId) {
    try {
      // پاک کردن داده‌های موقت
      delete this.userStates[userId];
      delete this.tempData[userId];
      
      // شروع مجدد فرآیند اضافه کردن
      this.userStates[userId] = 'kargah_add_instructor';
      this.tempData[userId] = {};
      
      const text = `📝 *اضافه کردن ${WORKSHOP_CONFIG.WORKSHOP_DISPLAY_NAME} جدید*\n\nلطفاً ${WORKSHOP_CONFIG.FIELD_DISPLAY_NAMES.INSTRUCTOR_NAME} را وارد کنید:`;
      const keyboard = [[{ text: '🔙 بازگشت', callback_data: 'kargah_list' }]];
      await this.editMessageWithInlineKeyboard(chatId, messageId, text, keyboard);
      
      return true;
    } catch (error) {
      console.error('Error in restart add workshop:', error.message);
      return false;
    }
  }
  
  // متدهای مربوط به دانش‌آموزان
  showWorkshopsForStudent(chatId, userId) {
    if (!this.workshops || !this.workshops.coach || Object.keys(this.workshops.coach).length === 0) {
      const text = `📚 **انتخاب کلاس**

❌ در حال حاضر هیچ کلاسی برای ثبت‌نام موجود نیست.
لطفاً بعداً دوباره تلاش کنید یا با مدیر تماس بگیرید.`;
      
      if (this.sendMessage) {
        this.sendMessage(chatId, text);
      } else {
        const { sendMessage } = require('./4bale');
        sendMessage(chatId, text);
      }
    } else {
      const text = `📚 **انتخاب کلاس**

لطفاً یکی از کلاس‌های زیر را انتخاب کنید:`;
      
      // ساخت کیبورد برای انتخاب کارگاه
      const keyboard = [];
      for (const [coachId, workshop] of Object.entries(this.workshops.coach)) {
        const instructorName = workshop.name || 'نامشخص';
        const cost = workshop.cost || 'نامشخص';
        
        // فیلتر کردن کارگاه‌های نامعتبر (با نام‌های کوتاه یا نامعتبر)
        if (instructorName.length > 2 && instructorName !== 'نامشخص' && 
            cost.length > 5 && cost !== 'نامشخص') {
          keyboard.push([{
            text: `📚 ${instructorName} - ${cost}`,
            callback_data: `student_select_workshop_coach_${coachId}`
          }]);
        }
      }
      
      keyboard.push([{ text: '🏠 بازگشت به منو', callback_data: 'student_back_to_menu' }]);
      
      const replyMarkup = { inline_keyboard: keyboard };
      if (this.sendMessageWithInlineKeyboard) {
        this.sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      } else {
        const { sendMessageWithInlineKeyboard } = require('./4bale');
        sendMessageWithInlineKeyboard(chatId, text, replyMarkup.inline_keyboard);
      }
    }
  }
  
  async handleStudentSelectWorkshop(chatId, messageId, userId, workshopId, callbackQueryId) {
    // بررسی نوع ID (coach یا assistant)
    let workshop = null;
    
    if (workshopId.startsWith('coach_')) {
      const coachId = workshopId.replace('student_select_workshop_coach_', '');
      workshop = this.workshops.coach?.[coachId];
    } else if (workshopId.startsWith('assistant_')) {
      const assistantId = workshopId.replace('student_select_workshop_assistant_', '');
      workshop = this.workshops.assistant?.[assistantId];
    } else {
      // برای backward compatibility
      workshop = this.workshops.coach?.[workshopId] || this.workshops.assistant?.[workshopId];
    }
    
    if (!workshop) {
      return false;
    }
    
    const instructorName = workshop.name || 'نامشخص';
    const cost = workshop.cost || 'نامشخص';
    const link = workshop.link || 'نامشخص';
    
    const text = `📚 **جزئیات کلاس انتخاب شده**

🏭 **مربی:** ${instructorName}
💰 **هزینه:** ${cost}
🔗 **لینک گروه:** ${link}
📝 **توضیحات:** ${workshop.description || 'توضیحات موجود نیست'}
⏱️ **مدت دوره:** ${workshop.duration || 'نامشخص'}
👥 **ظرفیت:** ${workshop.capacity || 'نامشخص'} نفر
📊 **سطح:** ${workshop.level || 'نامشخص'}

✅ شما این کلاس را انتخاب کرده‌اید.
برای تکمیل ثبت‌نام، لطفاً روی دکمه پرداخت کلیک کنید.`;
    
    const keyboard = [
      [{ text: '💳 پرداخت و ثبت‌نام', callback_data: `student_pay_workshop_${workshopId}` }],
      [{ text: '🔙 بازگشت به لیست کلاس‌ها', callback_data: 'student_back_to_workshops' }],
      [{ text: '🏠 بازگشت به منو', callback_data: 'student_back_to_menu' }]
    ];
    
    const replyMarkup = { inline_keyboard: keyboard };
    await this.editMessageWithInlineKeyboard(chatId, messageId, text, replyMarkup.inline_keyboard);
    return true;
  }
  
  async handleStudentPayWorkshop(chatId, messageId, userId, workshopId, callbackQueryId) {
    // بررسی نوع ID (coach یا assistant)
    let workshop = null;
    
    if (workshopId.startsWith('student_pay_workshop_coach_')) {
      const coachId = workshopId.replace('student_pay_workshop_coach_', '');
      workshop = this.workshops.coach?.[coachId];
    } else if (workshopId.startsWith('student_pay_workshop_assistant_')) {
      const assistantId = workshopId.replace('student_pay_workshop_assistant_', '');
      workshop = this.workshops.assistant?.[assistantId];
    } else {
      // برای backward compatibility
      workshop = this.workshops.coach?.[workshopId] || this.workshops.assistant?.[workshopId];
    }
    
    if (!workshop) {
      return false;
    }
    
    const instructorName = workshop.name || 'نامشخص';
    const cost = workshop.cost || 'نامشخص';
    
    const text = `💳 **پرداخت و ثبت‌نام**

🏭 **کلاس انتخاب شده:** ${instructorName}
💰 **هزینه:** ${cost}
📝 **توضیحات:** ${workshop.description || 'توضیحات موجود نیست'}

✅ **مراحل تکمیل ثبت‌نام:**
1️⃣ پرداخت هزینه کلاس
2️⃣ دریافت لینک گروه کلاس
3️⃣ شروع یادگیری

برای تکمیل ثبت‌نام، لطفاً روی دکمه پرداخت کلیک کنید.`;
    
    const keyboard = [
                      [{ text: '💳 پرداخت', callback_data: `pay_workshop_${workshopId}` }],
      [{ text: '🔙 بازگشت', callback_data: `student_select_workshop_${workshopId}` }]
    ];
    
    const replyMarkup = { inline_keyboard: keyboard };
    await this.editMessageWithInlineKeyboard(chatId, messageId, text, replyMarkup.inline_keyboard);
    return true;
  }
  
  async handleStudentRegistration(chatId, messageId, userId, callbackQueryId) {
    const text = `📝 **ثبت نام قرآن آموز**

🎯 **مراحل ثبت نام:**
1️⃣ **انتخاب کلاس:** یکی از کلاس‌های موجود را انتخاب کنید
2️⃣ **تکمیل اطلاعات:** نام و شماره تماس خود را وارد کنید
3️⃣ **پرداخت:** هزینه کلاس را پرداخت کنید
4️⃣ **تایید:** ثبت نام شما تایید خواهد شد

📚 **کلاس‌های موجود:**`;
    
    if (!this.workshops || Object.keys(this.workshops).length === 0) {
      const noWorkshopsText = text + `\n\n❌ در حال حاضر هیچ کلاسی برای ثبت‌نام موجود نیست.
لطفاً بعداً دوباره تلاش کنید یا با مدیر تماس بگیرید.`;
      
      const keyboard = [
        [{ text: '🏠 بازگشت به منو', callback_data: 'student_back_to_menu' }]
      ];
      
      const replyMarkup = { inline_keyboard: keyboard };
      await this.editMessageWithInlineKeyboard(chatId, messageId, noWorkshopsText, replyMarkup.inline_keyboard);
    } else {
      // ساخت کیبورد برای انتخاب کارگاه
      const keyboard = [];
      for (const [coachId, workshop] of Object.entries(this.workshops.coach)) {
        const instructorName = workshop.name || 'نامشخص';
        const cost = workshop.cost || 'نامشخص';
        keyboard.push([{
          text: `📚 ${instructorName} - ${cost}`,
          callback_data: `student_select_workshop_coach_${coachId}`
        }]);
      }
      
      keyboard.push([{ text: '🏠 بازگشت به منو', callback_data: 'student_back_to_menu' }]);
      
      const replyMarkup = { inline_keyboard: keyboard };
      await this.editMessageWithInlineKeyboard(chatId, messageId, text, replyMarkup.inline_keyboard);
    }
    
    return true;
  }
  
  async handleStudentBackToMenu(chatId, messageId, callbackQueryId) {
    // حذف پیام فعلی و ارسال پیام جدید با کیبورد اصلی
    try {
      await this.deleteMessage(chatId, messageId);
    } catch (error) {
      console.log('Could not delete message, continuing...');
    }
    
    const text = `🏠 **بازگشت به منوی اصلی**

🌟 خوش آمدید! به مدرسه تلاوت خوش آمدید!`;
    
    // استفاده از registration module برای نمایش منوی اصلی
    try {
      const { registrationModule } = require('./registration_module');
      await registrationModule.handleStartCommand(chatId, chatId.toString());
    } catch (error) {
      console.error('Error returning to main menu:', error);
      // fallback keyboard
      const keyboard = [
        ['ربات', 'معرفی مدرسه'],
        ['ثبت‌نام', 'خروج']
      ];
      await this.sendMessage(chatId, text, { keyboard: keyboard.map(row => row.map(btn => ({ text: btn }))), resize_keyboard: true });
    }
    return true;
  }
  
  async handleStudentBackToWorkshops(chatId, messageId, userId, callbackQueryId) {
    if (!this.workshops || Object.keys(this.workshops).length === 0) {
      const text = `📚 **انتخاب کلاس**

❌ در حال حاضر هیچ کلاسی برای ثبت‌نام موجود نیست.
لطفاً بعداً دوباره تلاش کنید یا با مدیر تماس بگیرید.`;
      
      await this.editMessageWithInlineKeyboard(chatId, messageId, text, []);
    } else {
      const text = `📚 **انتخاب کلاس**

لطفاً یکی از کلاس‌های زیر را انتخاب کنید:`;
      
      // ساخت کیبورد برای انتخاب کارگاه
      const keyboard = [];
      for (const [coachId, workshop] of Object.entries(this.workshops.coach)) {
        const instructorName = workshop.name || 'نامشخص';
        const cost = workshop.cost || 'نامشخص';
        
        // فیلتر کردن کارگاه‌های نامعتبر (با نام‌های کوتاه یا نامعتبر)
        if (instructorName.length > 2 && instructorName !== 'نامشخص' && 
            cost.length > 5 && cost !== 'نامشخص') {
          keyboard.push([{
            text: `📚 ${instructorName} - ${cost}`,
            callback_data: `student_select_workshop_coach_${coachId}`
          }]);
        }
      }
      
      keyboard.push([{ text: '🏠 بازگشت به منو', callback_data: 'student_back_to_menu' }]);
      
      const replyMarkup = { inline_keyboard: keyboard };
      await this.editMessageWithInlineKeyboard(chatId, messageId, text, replyMarkup.inline_keyboard);
    }
  }

  async handlePayment(chatId, messageId, userId, workshopId, callbackQueryId) {
    // بررسی نوع ID (coach یا assistant)
    let workshop = null;
    
    if (workshopId.startsWith('pay_workshop_coach_')) {
      const coachId = workshopId.replace('pay_workshop_coach_', '');
      workshop = this.workshops.coach?.[coachId];
    } else if (workshopId.startsWith('pay_workshop_assistant_')) {
      const assistantId = workshopId.replace('pay_workshop_assistant_', '');
      workshop = this.workshops.assistant?.[assistantId];
    } else {
      // برای backward compatibility
      workshop = this.workshops.coach?.[workshopId] || this.workshops.assistant?.[workshopId];
    }
    
    if (!workshop) {
      return false;
    }
    
    const instructorName = workshop.name || 'نامشخص';
    const cost = workshop.cost || 'نامشخص';
    const link = workshop.link || 'نامشخص';
    
    const text = `🎉 **ثبت‌نام با موفقیت انجام شد!**

🏭 **کلاس انتخاب شده:** ${instructorName}
💰 **هزینه:** ${cost}
🔗 **لینک گروه:** ${link}

✅ **مراحل بعدی:**
1️⃣ روی لینک گروه کلیک کنید
2️⃣ در گروه عضو شوید
3️⃣ با مربی تماس بگیرید
4️⃣ شروع یادگیری کنید

🌟 **موفق باشید!**`;
    
    const keyboard = [
      [{ text: '🔗 عضویت در گروه', url: link }],
      [{ text: '🏠 بازگشت به منو', callback_data: 'student_back_to_menu' }]
    ];
    
    const replyMarkup = { inline_keyboard: keyboard };
    await this.editMessageWithInlineKeyboard(chatId, messageId, text, replyMarkup.inline_keyboard);
    return true;
  }
  
  // متدهای کمکی
  normalizeCostText(text) {
    // تبدیل اعداد فارسی به انگلیسی
    const persianToEnglish = {
      '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
      '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
    };
    
    let normalizedText = text;
    for (const [persian, english] of Object.entries(persianToEnglish)) {
      normalizedText = normalizedText.replace(new RegExp(persian, 'g'), english);
    }
    
    // حذف فاصله‌های اضافی
    normalizedText = normalizedText.trim();
    
    // بررسی اعتبار هزینه
    if (!normalizedText || normalizedText.length < 3) {
      return null;
    }
    
    // اگر فقط عدد وارد شده، تومان اضافه کن
    if (/^\d+$/.test(normalizedText)) {
      normalizedText = `${normalizedText} تومان`;
    }
    
    // بررسی فرمت نهایی
    if (!normalizedText.includes('تومان') && !normalizedText.includes('ریال')) {
      normalizedText = `${normalizedText} تومان`;
    }
    
    return normalizedText;
  }

  isUserInState(userId) {
    return !!this.userStates[userId];
  }
  getUserState(userId) {
    return this.userStates[userId] || '';
  }
}

const kargahModule = new KargahModule();
module.exports = kargahModule;