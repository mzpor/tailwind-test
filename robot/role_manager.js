//⏰ 09:30:00 🗓️ دوشنبه 13 مرداد 1404
// ماژول مدیریت نقش‌ها - نسخه 1.0.0

const fs = require('fs');
const { sendMessage, sendMessageWithInlineKeyboard, deleteMessage, answerCallbackQuery, editMessage } = require('./4bale');
const { 
  USERS_BY_ROLE, 
  USERS, 
  getUserInfo, 
  getUserRoleFromCentral, 
  getUserNameFromCentral,
  getUsersByRole,
  addUserToRole,
  removeUserFromRole
} = require('./3config');
const { hasPermission, getAvailableRoles } = require('./6mid');
const { getTimeStamp } = require('./1time');

class RoleManager {
  constructor() {
    this.userStates = {}; // برای ذخیره وضعیت کاربران
    this.rolesFile = 'roles_data.json';
    this.loadRolesData();
    console.log('✅ RoleManager initialized successfully');
  }
  
  // خواندن داده‌های نقش‌ها
  loadRolesData() {
    try {
      if (fs.existsSync(this.rolesFile)) {
        const data = fs.readFileSync(this.rolesFile, 'utf8');
        this.rolesData = JSON.parse(data);
        console.log('✅ Roles data loaded successfully');
      } else {
        this.rolesData = {
          roleHistory: [],
          roleRequests: [],
          roleChanges: []
        };
        this.saveRolesData();
      }
    } catch (error) {
      console.error('Error loading roles data:', error.message);
      this.rolesData = {
        roleHistory: [],
        roleRequests: [],
        roleChanges: []
      };
    }
  }
  
  // ذخیره داده‌های نقش‌ها
  saveRolesData() {
    try {
      fs.writeFileSync(this.rolesFile, JSON.stringify(this.rolesData, null, 2), 'utf8');
      console.log('✅ Roles data saved successfully');
    } catch (error) {
      console.error('Error saving roles data:', error.message);
    }
  }
  
  // بررسی دسترسی کاربر
  isUserAuthorized(userId) {
    return hasPermission(userId, 'SCHOOL_ADMIN');
  }
  
  // دریافت منوی اصلی مدیریت نقش‌ها
  getMainRoleMenu(userId) {
    if (!this.isUserAuthorized(userId)) {
      return {
        text: '❌ شما دسترسی لازم برای مدیریت نقش‌ها را ندارید.',
        keyboard: [[{ text: '🔙 بازگشت', callback_data: 'back_to_main' }]]
      };
    }
    
    const text = `🛡️ **پنل مدیریت نقش‌ها**

📋 گزینه‌های موجود:
• 👥 مشاهده نقش‌ها
• ➕ اضافه کردن نقش
• ➖ حذف نقش
• 📊 آمار نقش‌ها
• 📝 درخواست‌های نقش
• 🔄 تاریخچه تغییرات

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
    
    const keyboard = [
      [{ text: '👥 مشاهده نقش‌ها', callback_data: 'role_view_all' }],
      [{ text: '➕ اضافه کردن نقش', callback_data: 'role_add' }],
      [{ text: '➖ حذف نقش', callback_data: 'role_remove' }],
      [{ text: '📊 آمار نقش‌ها', callback_data: 'role_stats' }],
      [{ text: '📝 درخواست‌های نقش', callback_data: 'role_requests' }],
      [{ text: '🔄 تاریخچه تغییرات', callback_data: 'role_history' }],
      [{ text: '🔙 بازگشت', callback_data: 'back_to_main' }]
    ];
    
    return { text, keyboard };
  }
  
  // نمایش تمام نقش‌ها
  getRolesView() {
    let text = `👥 **لیست تمام نقش‌ها**\n\n`;
    
    Object.entries(USERS_BY_ROLE).forEach(([role, users]) => {
      const emoji = this.getRoleEmoji(role);
      text += `${emoji} **${this.getRoleDisplayName(role)}** (${users.length} نفر):\n`;
      
      users.forEach((user, index) => {
        text += `  ${index + 1}. ${user.name} (ID: ${user.id})\n`;
      });
      text += '\n';
    });
    
    text += `⏰ ${getTimeStamp()}`;
    
    const keyboard = [
      [{ text: '🔙 بازگشت', callback_data: 'role_main_menu' }]
    ];
    
    return { text, keyboard };
  }
  
  // دریافت آمار نقش‌ها
  getRolesStats() {
    let text = `📊 **آمار نقش‌ها**\n\n`;
    
    const totalUsers = Object.values(USERS_BY_ROLE).reduce((sum, users) => sum + users.length, 0);
    text += `👥 **کل کاربران:** ${totalUsers}\n\n`;
    
    Object.entries(USERS_BY_ROLE).forEach(([role, users]) => {
      const emoji = this.getRoleEmoji(role);
      const percentage = totalUsers > 0 ? ((users.length / totalUsers) * 100).toFixed(1) : 0;
      text += `${emoji} **${this.getRoleDisplayName(role)}:** ${users.length} نفر (${percentage}%)\n`;
    });
    
    text += `\n⏰ ${getTimeStamp()}`;
    
    const keyboard = [
      [{ text: '🔙 بازگشت', callback_data: 'role_main_menu' }]
    ];
    
    return { text, keyboard };
  }
  
  // دریافت منوی اضافه کردن نقش
  getAddRoleMenu(userId) {
    if (!this.isUserAuthorized(userId)) {
      return {
        text: '❌ شما دسترسی لازم برای اضافه کردن نقش را ندارید.',
        keyboard: [[{ text: '🔙 بازگشت', callback_data: 'role_main_menu' }]]
      };
    }
    
    const text = `➕ **اضافه کردن نقش جدید**

📝 برای اضافه کردن نقش جدید، لطفاً اطلاعات زیر را وارد کنید:

1️⃣ **شناسه کاربر (User ID):**
2️⃣ **نام کاربر:**
3️⃣ **نقش مورد نظر:**

👆 لطفاً شناسه کاربر را وارد کنید:
⏰ ${getTimeStamp()}`;
    
    const keyboard = [
      [{ text: '🔙 بازگشت', callback_data: 'role_main_menu' }]
    ];
    
    return { text, keyboard };
  }
  
  // دریافت منوی حذف نقش
  getRemoveRoleMenu(userId) {
    if (!this.isUserAuthorized(userId)) {
      return {
        text: '❌ شما دسترسی لازم برای حذف نقش را ندارید.',
        keyboard: [[{ text: '🔙 بازگشت', callback_data: 'role_main_menu' }]]
      };
    }
    
    let text = `➖ **حذف نقش**\n\n`;
    text += `👥 کاربران موجود:\n\n`;
    
    const keyboard = [];
    
    Object.entries(USERS_BY_ROLE).forEach(([role, users]) => {
      if (users.length > 0) {
        const emoji = this.getRoleEmoji(role);
        text += `${emoji} **${this.getRoleDisplayName(role)}:**\n`;
        
        users.forEach((user, index) => {
          const buttonText = `${user.name} (${user.id})`;
          const callbackData = `role_remove_user_${user.id}`;
          keyboard.push([{ text: buttonText, callback_data: callbackData }]);
        });
        text += '\n';
      }
    });
    
    text += `👆 لطفاً کاربر مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
    
    keyboard.push([{ text: '🔙 بازگشت', callback_data: 'role_main_menu' }]);
    
    return { text, keyboard };
  }
  
  // اضافه کردن کاربر به نقش
  async addUserToRole(userId, targetUserId, targetUserName, role) {
    try {
      // بررسی دسترسی
      if (!this.isUserAuthorized(userId)) {
        return { success: false, message: '❌ شما دسترسی لازم برای این عملیات را ندارید.' };
      }
      
      // بررسی وجود کاربر
      const existingUser = getUserInfo(targetUserId);
      if (existingUser.role !== 'STUDENT') {
        return { success: false, message: '❌ این کاربر قبلاً دارای نقش است.' };
      }
      
      // اضافه کردن نقش
      addUserToRole(role, targetUserId, targetUserName);
      
      // ثبت در تاریخچه
      this.rolesData.roleChanges.push({
        timestamp: new Date().toISOString(),
        action: 'ADD',
        adminId: userId,
        targetUserId: targetUserId,
        targetUserName: targetUserName,
        role: role
      });
      
      this.saveRolesData();
      
      return { 
        success: true, 
        message: `✅ کاربر ${targetUserName} با موفقیت به نقش ${this.getRoleDisplayName(role)} اضافه شد.` 
      };
    } catch (error) {
      console.error('Error adding user to role:', error.message);
      return { success: false, message: '❌ خطا در اضافه کردن نقش.' };
    }
  }
  
  // حذف نقش کاربر
  async removeUserFromRole(userId, targetUserId) {
    try {
      // بررسی دسترسی
      if (!this.isUserAuthorized(userId)) {
        return { success: false, message: '❌ شما دسترسی لازم برای این عملیات را ندارید.' };
      }
      
      // بررسی وجود کاربر
      const existingUser = getUserInfo(targetUserId);
      if (existingUser.role === 'STUDENT') {
        return { success: false, message: '❌ این کاربر قبلاً نقش خاصی ندارد.' };
      }
      
      const userName = existingUser.name;
      const role = existingUser.role;
      
      // حذف نقش
      removeUserFromRole(role, targetUserId);
      
      // ثبت در تاریخچه
      this.rolesData.roleChanges.push({
        timestamp: new Date().toISOString(),
        action: 'REMOVE',
        adminId: userId,
        targetUserId: targetUserId,
        targetUserName: userName,
        role: role
      });
      
      this.saveRolesData();
      
      return { 
        success: true, 
        message: `✅ نقش ${this.getRoleDisplayName(role)} از کاربر ${userName} حذف شد.` 
      };
    } catch (error) {
      console.error('Error removing user from role:', error.message);
      return { success: false, message: '❌ خطا در حذف نقش.' };
    }
  }
  
  // دریافت تاریخچه تغییرات
  getRoleHistory() {
    let text = `🔄 **تاریخچه تغییرات نقش‌ها**\n\n`;
    
    if (this.rolesData.roleChanges.length === 0) {
      text += '📝 هیچ تغییری ثبت نشده است.\n';
    } else {
      const recentChanges = this.rolesData.roleChanges.slice(-10); // آخرین 10 تغییر
      
      recentChanges.reverse().forEach((change, index) => {
        const date = new Date(change.timestamp).toLocaleString('fa-IR');
        const action = change.action === 'ADD' ? '➕' : '➖';
        const roleName = this.getRoleDisplayName(change.role);
        
        text += `${action} **${change.targetUserName}** - ${roleName}\n`;
        text += `   📅 ${date}\n\n`;
      });
    }
    
    text += `⏰ ${getTimeStamp()}`;
    
    const keyboard = [
      [{ text: '🔙 بازگشت', callback_data: 'role_main_menu' }]
    ];
    
    return { text, keyboard };
  }
  
  // توابع کمکی
  getRoleEmoji(role) {
    const emojis = {
      'SCHOOL_ADMIN': '🛡️',
      'COACH': '🏋️',
      'ASSISTANT': '👨‍🏫',
      'STUDENT': '📖'
    };
    return emojis[role] || '👤';
  }
  
  getRoleDisplayName(role) {
    const names = {
      'SCHOOL_ADMIN': 'مدیر مدرسه',
      'COACH': 'مربی',
      'ASSISTANT': 'کمک مربی',
      'STUDENT': 'قرآن آموز'
    };
    return names[role] || role;
  }
  
  // مدیریت وضعیت کاربر
  isUserInState(userId) {
    return this.userStates.hasOwnProperty(userId);
  }
  
  getUserState(userId) {
    return this.userStates[userId] || null;
  }
  
  setUserState(userId, state) {
    this.userStates[userId] = state;
  }
  
  clearUserState(userId) {
    delete this.userStates[userId];
  }
  
  // پردازش پیام‌ها
  async handleMessage(message) {
    const userId = message.from.id;
    const text = message.text;
    
    if (!this.isUserInState(userId)) {
      return null;
    }
    
    const state = this.getUserState(userId);
    
    if (state.type === 'ADD_ROLE_USER_ID') {
      // دریافت شناسه کاربر
      const targetUserId = parseInt(text);
      if (isNaN(targetUserId)) {
        return {
          text: '❌ لطفاً یک عدد معتبر وارد کنید.',
          keyboard: [[{ text: '🔙 بازگشت', callback_data: 'role_main_menu' }]]
        };
      }
      
      this.setUserState(userId, {
        type: 'ADD_ROLE_USER_NAME',
        targetUserId: targetUserId
      });
      
      return {
        text: `✅ شناسه کاربر: ${targetUserId}\n\n📝 حالا لطفاً نام کاربر را وارد کنید:`,
        keyboard: [[{ text: '🔙 بازگشت', callback_data: 'role_main_menu' }]]
      };
    }
    
    if (state.type === 'ADD_ROLE_USER_NAME') {
      const targetUserName = text;
      
      this.setUserState(userId, {
        type: 'ADD_ROLE_SELECT_ROLE',
        targetUserId: state.targetUserId,
        targetUserName: targetUserName
      });
      
      const keyboard = [
        [{ text: '🛡️ مدیر مدرسه', callback_data: 'role_add_final_SCHOOL_ADMIN' }],
        [{ text: '🏋️ مربی', callback_data: 'role_add_final_COACH' }],
        [{ text: '👨‍🏫 کمک مربی', callback_data: 'role_add_final_ASSISTANT' }],
        [{ text: '🔙 بازگشت', callback_data: 'role_main_menu' }]
      ];
      
      return {
        text: `✅ نام کاربر: ${targetUserName}\n\n👆 لطفاً نقش مورد نظر را انتخاب کنید:`,
        keyboard: keyboard
      };
    }
    
    return null;
  }
  
  // پردازش callback ها
  async handleCallback(callback) {
    const data = callback.data;
    const userId = callback.from.id;
    const chatId = callback.message.chat.id;
    const messageId = callback.message.message_id;
    const callbackQueryId = callback.id;
    
    console.log(`🔍 [ROLE_MANAGER] Processing callback: ${data}`);
    
    try {
      await this.routeCallback(chatId, messageId, userId, data, callbackQueryId);
    } catch (error) {
      console.error('Error handling callback:', error.message);
      await answerCallbackQuery(callbackQueryId, '❌ خطا در پردازش درخواست');
    }
  }
  
  // مسیریابی callback ها
  async routeCallback(chatId, messageId, userId, data, callbackQueryId) {
    switch (data) {
      case 'role_main_menu':
        await this.handleMainMenu(chatId, messageId, callbackQueryId);
        break;
      case 'role_view_all':
        await this.handleViewRoles(chatId, messageId, callbackQueryId);
        break;
      case 'role_add':
        await this.handleAddRole(chatId, messageId, userId, callbackQueryId);
        break;
      case 'role_remove':
        await this.handleRemoveRole(chatId, messageId, userId, callbackQueryId);
        break;
      case 'role_stats':
        await this.handleRoleStats(chatId, messageId, callbackQueryId);
        break;
      case 'role_history':
        await this.handleRoleHistory(chatId, messageId, callbackQueryId);
        break;
      default:
        if (data.startsWith('role_add_final_')) {
          const role = data.replace('role_add_final_', '');
          await this.handleAddRoleFinal(chatId, messageId, userId, role, callbackQueryId);
        } else if (data.startsWith('role_remove_user_')) {
          const targetUserId = parseInt(data.replace('role_remove_user_', ''));
          await this.handleRemoveRoleConfirm(chatId, messageId, userId, targetUserId, callbackQueryId);
        } else {
          await answerCallbackQuery(callbackQueryId, '❌ گزینه نامعتبر');
        }
    }
  }
  
  // پردازش منوی اصلی
  async handleMainMenu(chatId, messageId, callbackQueryId) {
    const menu = this.getMainRoleMenu(chatId);
    await editMessage(chatId, messageId, menu.text, menu.keyboard);
    await answerCallbackQuery(callbackQueryId, '✅ منوی اصلی مدیریت نقش‌ها');
  }
  
  // پردازش مشاهده نقش‌ها
  async handleViewRoles(chatId, messageId, callbackQueryId) {
    const view = this.getRolesView();
    await editMessage(chatId, messageId, view.text, view.keyboard);
    await answerCallbackQuery(callbackQueryId, '✅ لیست نقش‌ها نمایش داده شد');
  }
  
  // پردازش اضافه کردن نقش
  async handleAddRole(chatId, messageId, userId, callbackQueryId) {
    const menu = this.getAddRoleMenu(userId);
    this.setUserState(userId, { type: 'ADD_ROLE_USER_ID' });
    await editMessage(chatId, messageId, menu.text, menu.keyboard);
    await answerCallbackQuery(callbackQueryId, '✅ لطفاً شناسه کاربر را وارد کنید');
  }
  
  // پردازش حذف نقش
  async handleRemoveRole(chatId, messageId, userId, callbackQueryId) {
    const menu = this.getRemoveRoleMenu(userId);
    await editMessage(chatId, messageId, menu.text, menu.keyboard);
    await answerCallbackQuery(callbackQueryId, '✅ لطفاً کاربر مورد نظر را انتخاب کنید');
  }
  
  // پردازش آمار نقش‌ها
  async handleRoleStats(chatId, messageId, callbackQueryId) {
    const stats = this.getRolesStats();
    await editMessage(chatId, messageId, stats.text, stats.keyboard);
    await answerCallbackQuery(callbackQueryId, '✅ آمار نقش‌ها نمایش داده شد');
  }
  
  // پردازش تاریخچه نقش‌ها
  async handleRoleHistory(chatId, messageId, callbackQueryId) {
    const history = this.getRoleHistory();
    await editMessage(chatId, messageId, history.text, history.keyboard);
    await answerCallbackQuery(callbackQueryId, '✅ تاریخچه تغییرات نمایش داده شد');
  }
  
  // پردازش نهایی اضافه کردن نقش
  async handleAddRoleFinal(chatId, messageId, userId, role, callbackQueryId) {
    const state = this.getUserState(userId);
    if (!state || state.type !== 'ADD_ROLE_SELECT_ROLE') {
      await answerCallbackQuery(callbackQueryId, '❌ خطا در پردازش درخواست');
      return;
    }
    
    const result = await this.addUserToRole(userId, state.targetUserId, state.targetUserName, role);
    this.clearUserState(userId);
    
    const keyboard = [[{ text: '🔙 بازگشت', callback_data: 'role_main_menu' }]];
    await editMessage(chatId, messageId, result.message, keyboard);
    await answerCallbackQuery(callbackQueryId, result.success ? '✅ نقش اضافه شد' : '❌ خطا در اضافه کردن نقش');
  }
  
  // پردازش تایید حذف نقش
  async handleRemoveRoleConfirm(chatId, messageId, userId, targetUserId, callbackQueryId) {
    const result = await this.removeUserFromRole(userId, targetUserId);
    
    const keyboard = [[{ text: '🔙 بازگشت', callback_data: 'role_main_menu' }]];
    await editMessage(chatId, messageId, result.message, keyboard);
    await answerCallbackQuery(callbackQueryId, result.success ? '✅ نقش حذف شد' : '❌ خطا در حذف نقش');
  }
}

// ایجاد نمونه سراسری
const roleManager = new RoleManager();

module.exports = { roleManager };
