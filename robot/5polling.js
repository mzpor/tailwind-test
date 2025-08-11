//⏰ 09:10:00 🗓️ دوشنبه 13 مرداد 1404
// ماژول اجرای حلقه اصلی دریافت پیام‌ها و کنترل ورود گروه

const { getUpdates, sendMessage, sendMessageWithInlineKeyboard, deleteMessage, getChat, getChatMember, answerCallbackQuery } = require('./4bale');
const { getTimeStamp } = require('./1time');
const { 
  isAdmin, 
  isGroupAdmin, 
  isCoach, 
  isAssistant, 
  getUserRole, 
  getRoleKeyboard, 
  REPORT_GROUP_ID,
  hasPermission,
  getAvailableRoles,
  getAllUsersWithRoles
} = require('./6mid');
const { ROLES, USERS_BY_ROLE, isButtonVisible, setButtonVisibility, getButtonVisibilityConfig } = require('./3config');
const { 
  getCurrentCoachId, 
  getCurrentAssistantId, 
  getCurrentGroupAdminIds 
} = require('./3config');
const { handleGroupJoin, reportGroupMembers, thankMember, addMember, removeMember, checkAndUpdateMembersList, announceBotActivation, announceBotActivationForAdmin, reportBotAdminStatus, loadMembersData } = require('./7group');
const { attendanceManager } = require('./10attendance_manager');
const { logError, logConnectionStatus } = require('./8logs');
const { BASE_URL } = require('./3config');
const SettingsModule = require('./11settings');
const KargahModule = require('./12kargah');
const SmartRegistrationModule = require('./13reg');
// const { roleManager } = require('./role_manager'); // مدیریت نقش‌ها غیرفعال شده

let lastId = 0;

// بررسی وضعیت ادمین ربات
async function checkBotAdminStatus(chatId) {
  try {
    const { getChatMember } = require('./4bale');
    // بررسی وضعیت ادمین ربات
    const botInfo = await getChatMember(chatId);
    const isBotAdmin = botInfo && botInfo.status === 'administrator';
    return isBotAdmin;
  } catch (error) {
    console.error('Error checking bot admin status:', error.message);
    return false;
  }
}
let consecutiveErrors = 0;
let lastStartupMessage = 0;
let lastPanelMessage = 0;

// مدیریت پیام‌های تکراری برای همه نقش‌ها
const messageTimestamps = {
  startup: {},
  panel: {},
  intro: {}
};

// تنظیمات نقش‌ها - به‌روزرسانی شده در 1404/05/13 ساعت 16:47 - نسخه 1.4.1
const roleConfig = {
  [ROLES.SCHOOL_ADMIN]: {
    name: 'مدیر مدرسه',
    emoji: '🛡️',
    panelText: 'مدیر',
    get keyboard() { return generateDynamicKeyboard(ROLES.SCHOOL_ADMIN); },
    commands: ['/شروع', '/خروج', '/ربات', '/مدیر', '/تنظیمات', '/کارگاه']
    // دستور /نقش‌ها غیرفعال شده
  },

  [ROLES.COACH]: {
    name: 'مربی',
    emoji: '🏋️',
    panelText: 'مربی',
    get keyboard() { return generateDynamicKeyboard(ROLES.COACH); },
    commands: ['/شروع', '/خروج', '/ربات', '/مربی']
  },
  [ROLES.ASSISTANT]: {
    name: 'کمک مربی',
    emoji: '👨‍🏫',
    panelText: 'کمک مربی',
    get keyboard() { return generateDynamicKeyboard(ROLES.ASSISTANT); },
    commands: ['/شروع', '/خروج', '/ربات', '/کمک مربی']
  },
  [ROLES.STUDENT]: {
    name: 'قرآن آموز',
    emoji: '📖',
    panelText: 'قرآن آموز',
    get keyboard() { return generateDynamicKeyboard(ROLES.STUDENT); },
    commands: ['/شروع', '/خروج', '/ربات', '/قرآن آموز']
  }
};

// تابع تولید keyboard بر اساس کانفیگ نمایش دکمه‌ها
function generateDynamicKeyboard(role) {
  const baseKeyboard = [['شروع', 'خروج']];
  const secondRow = [];
  
  // اضافه کردن دکمه ربات بر اساس کانفیگ
  if (isButtonVisible('ROBOT_BUTTON')) {
    secondRow.push('ربات');
  }
  
  // اضافه کردن سایر دکمه‌ها بر اساس نقش
  if (role === ROLES.SCHOOL_ADMIN) {
    secondRow.push('مدیر', 'تنظیمات');
    
    // اضافه کردن دکمه نقش‌ها بر اساس کانفیگ
    if (isButtonVisible('ROLES_BUTTON')) {
      secondRow.push('نقش‌ها');
    }
  } else if (role === ROLES.COACH) {
    secondRow.push('مربی');
  } else if (role === ROLES.ASSISTANT) {
    secondRow.push('کمک مربی');
  } else if (role === ROLES.STUDENT) {
    secondRow.push('قرآن آموز');
  }
  
  if (secondRow.length > 0) {
    baseKeyboard.push(secondRow);
  }
  
  return baseKeyboard;
}

console.log('🔧 [POLLING] roleConfig loaded:', JSON.stringify(roleConfig, null, 2));

let lastConnectionError = 0;
let connectionErrorCount = 0;

// مدیریت وضعیت اتصال
function handleConnectionStatus(connected) {
  const now = Date.now();
  
  if (!connected) {
    connectionErrorCount++;
    // فقط هر 30 ثانیه یک بار پیام خطا بده
    if (now - lastConnectionError > 30000) {
      console.log(`🌐 Internet connection weak (${connectionErrorCount} errors)`);
      // گزارش به گروه در صورت خطاهای زیاد
      if (connectionErrorCount > 10) {
        logConnectionStatus(`اتصال ضعیف - ${connectionErrorCount} خطا`);
      }
      lastConnectionError = now;
    }
  } else {
    if (connectionErrorCount > 0) {
      console.log('🌐 Internet connection restored');
      // گزارش برقراری اتصال
      if (connectionErrorCount > 5) {
        logConnectionStatus('اتصال برقرار شد');
      }
      connectionErrorCount = 0;
    }
  }
}

// ارسال پیام با مدیریت خطا
async function safeSendMessage(chatId, text, keyboard = null) {
  console.log('📤 [POLLING] safeSendMessage STARTED');
  console.log(`📤 [POLLING] ChatId: ${chatId}, Text: ${text.substring(0, 100)}...`);
  console.log(`📤 [POLLING] Keyboard:`, JSON.stringify(keyboard, null, 2));
  
  try {
    console.log('📤 [POLLING] Calling sendMessage...');
    await sendMessage(chatId, text, keyboard);
    console.log('📤 [POLLING] safeSendMessage SUCCESS');
    return true;
  } catch (error) {
    // فقط خطاهای مهم را نمایش بده
    if (error.response?.status !== 429) { // rate limit
      console.error('❌ [POLLING] safeSendMessage ERROR:', error.message);
      console.error('❌ [POLLING] Error response:', error.response?.data);
    } else {
      console.log('⚠️ [POLLING] Rate limit hit, ignoring error');
    }
    return false;
  }
}

// بررسی محدودیت زمانی برای جلوگیری از اسپم
function canSendMessage(chatId, messageType, cooldownMs = 30000) {
  const now = Date.now();
  const lastTime = messageTimestamps[messageType][chatId] || 0;
  
  if (now - lastTime < cooldownMs) {
    return false;
  }
  
  messageTimestamps[messageType][chatId] = now;
  return true;
}

// پاک کردن timestamp های قدیمی برای جلوگیری از مصرف حافظه
function cleanupOldTimestamps() {
  const now = Date.now();
  const maxAge = 300000; // 5 دقیقه
  
  Object.keys(messageTimestamps).forEach(type => {
    Object.keys(messageTimestamps[type]).forEach(chatId => {
      if (now - messageTimestamps[type][chatId] > maxAge) {
        delete messageTimestamps[type][chatId];
      }
    });
  });
}

// دریافت لیست گروه‌ها
async function getGroupsList(userId = null) {
  try {
    const membersData = loadMembersData();
    const groups = [];
    const { getGroupName } = require('./3config.js');
    
    for (const [groupId, members] of Object.entries(membersData.groups)) {
      if (members.length > 0) {
        try {
          const chatInfo = await getChat(groupId);
          // استفاده از نام گروه از config یا عنوان گروه از API
          const groupTitle = await getGroupName(groupId) || chatInfo.title || `گروه ${groupId}`;
          
          // اگر userId داده شده و مربی یا کمک مربی است، فقط گروه‌هایی که ادمینه را نشان بده
          if (userId && (isCoach(userId) || isAssistant(userId))) {
              // برای مربی و کمک مربی، اگر در GROUP_ADMIN_IDS باشد، همه گروه‌ها را نشان بده
  if (getCurrentGroupAdminIds().includes(userId)) {
              groups.push({
                id: groupId,
                title: groupTitle,
                memberCount: members.length
              });
            }
          } else {
            // برای مدیران و ادمین‌های گروه، همه گروه‌ها را نشان بده
            groups.push({
              id: groupId,
              title: groupTitle,
              memberCount: members.length
            });
          }
        } catch (error) {
          // اگر نتوانستیم اطلاعات گروه را دریافت کنیم، از نام گروه از config استفاده کنیم
          const groupTitle = await getGroupName(groupId) || `گروه ${groupId}`;
          
          // اگر userId داده شده و مربی یا کمک مربی است، فقط گروه‌هایی که ادمینه را نشان بده
          if (userId && (isCoach(userId) || isAssistant(userId))) {
            // برای مربی و کمک مربی، فقط گروه‌های شناخته شده را نشان بده
            if (getCurrentGroupAdminIds().includes(userId)) {
              groups.push({
                id: groupId,
                title: groupTitle,
                memberCount: members.length
              });
            }
          } else {
            // برای مدیران و ادمین‌های گروه، همه گروه‌ها را نشان بده
            groups.push({
              id: groupId,
              title: groupTitle,
              memberCount: members.length
            });
          }
        }
      }
    }
    
    return groups;
  } catch (error) {
    console.error('Error getting groups list:', error.message);
    return [];
  }
}

// ایجاد کیبورد شیشه‌ای برای لیست گروه‌ها
function createGroupsKeyboard(groups) {
  const keyboard = [];
  
  groups.forEach((group, index) => {
    const buttonText = `${index + 1}️⃣ ${group.title} (${group.memberCount} عضو)`;
    keyboard.push([{
      text: buttonText,
      callback_data: `group_${group.id}`
    }]);
  });
  
  // دکمه بازگشت
  keyboard.push([{
    text: '🔙 بازگشت به منوی اصلی',
    callback_data: 'back_to_main'
  }]);
  
  return keyboard;
}

// تابع جامع برای پردازش پیام‌های نقش‌ها - به‌روزرسانی شده در 1404/05/15 ساعت 23:30 - نسخه 1.6.0
async function handleRoleMessage(msg, role) {
  console.log(`🔍 [POLLING] Processing message: "${msg.text}" from role: ${role}`);
  console.log(`🔍 [POLLING] User ID: ${msg.from.id}, Chat ID: ${msg.chat.id}`);
  
  const config = roleConfig[role];
  if (!config) {
    console.log('❌ [POLLING] No config found for role:', role);
    return;
  }
  
  console.log('✅ [POLLING] Config found for role:', role);
  console.log('✅ [POLLING] Config:', JSON.stringify(config, null, 2));
  
  let reply = '';
  let keyboard = null;
  
      if (msg.text === 'شروع' || msg.text === '/start') {
      // بررسی نقش کاربر با استفاده از ساختار مرکزی
      const userRole = getUserRole(msg.from.id);
      console.log(`🔍 [POLLING] User role determined: ${userRole}`);
      
      if (userRole === ROLES.STUDENT) {
        // برای قرآن آموز - استفاده از ماژول ثبت‌نام
        const regModule = new SmartRegistrationModule();
        await regModule.handleStartCommand(msg.chat.id, msg.from.id.toString());
        return; // ادامه حلقه بدون ارسال پیام معمولی
      } else {
        // برای سایر نقش‌ها - پنل معمولی با بررسی دسترسی
        const hasAccess = hasPermission(msg.from.id, role);
        if (hasAccess) {
          reply = `${config.emoji} پنل ${config.name} فعال شد\n⏰ ${getTimeStamp()}`;
          keyboard = config.keyboard;
          console.log(`✅ [POLLING] Access granted for user ${msg.from.id} to role ${role}`);
        } else {
          reply = `❌ شما دسترسی لازم برای این پنل را ندارید.\nنقش شما: ${userRole}`;
          console.log(`❌ [POLLING] Access denied for user ${msg.from.id} to role ${role}`);
        }
      }
  } else if (msg.text === 'خروج') {
    reply = `👋 پنل ${config.name} بسته شد\n⏰ ${getTimeStamp()}`;
    keyboard = config.keyboard;
  } else if (msg.text === 'ربات') {
    // دستور ربات - فقط برای مدیر مدرسه
    if (!isAdmin(msg.from.id)) {
      reply = '⚠️ فقط مدیر مدرسه می‌تواند از دستور ربات استفاده کند.';
      keyboard = config.keyboard;
    } else {
      // نمایش وضعیت فعلی و امکان تغییر
      const currentStatus = isButtonVisible('ROBOT_BUTTON');
      const statusText = currentStatus ? 'نمایش داده می‌شود' : 'نمایش داده نمی‌شود';
      const toggleText = currentStatus ? 'مخفی کردن' : 'نمایش دادن';
      const toggleValue = currentStatus ? 0 : 1;
      
      const inlineKeyboard = [
        [{ text: `🔄 ${toggleText} دکمه ربات`, callback_data: `toggle_robot_button_${toggleValue}` }],
        [{ text: '📊 وضعیت فعلی', callback_data: 'robot_button_status' }],
        [{ text: '🔙 بازگشت', callback_data: 'back_to_main' }]
      ];
      
      reply = `🤖 کنترل دکمه ربات

📋 وضعیت فعلی:
• دکمه ربات: ${statusText}

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      await sendMessageWithInlineKeyboard(msg.chat.id, reply, inlineKeyboard);
      return; // ادامه حلقه بدون ارسال پیام معمولی
    }
  } else if (msg.text === config.panelText) {
    // if (!canSendMessage(msg.chat.id, 'panel', 5000)) {
    //   return; // پیام را نادیده بگیر
    // }
    
    // بررسی نقش کاربر برای نمایش پنل مناسب
    if (isCoach(msg.from.id)) {
      // پنل مربی - فقط دو گزینه
      const inlineKeyboard = [
        [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }],
        [{ text: '🏫 مدیریت گروه‌ها', callback_data: 'coach_groups' }]
      ];
      
      reply = `👨‍🏫 پنل مربی

📋 گزینه‌های موجود:
• 🤖 معرفی ربات
• 🏫 مدیریت گروه‌ها (حضور و غیاب)

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      await sendMessageWithInlineKeyboard(msg.chat.id, reply, inlineKeyboard);
      return; // ادامه حلقه بدون ارسال پیام معمولی
    } else if (isAssistant(msg.from.id)) {
      // پنل کمک مربی - فقط دو گزینه
      const inlineKeyboard = [
        [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }],
        [{ text: '🏫 مدیریت گروه‌ها', callback_data: 'assistant_groups' }]
      ];
      
      reply = `👨‍🏫 پنل کمک مربی

📋 گزینه‌های موجود:
• 🤖 معرفی ربات
• 🏫 مدیریت گروه‌ها (حضور و غیاب)

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      await sendMessageWithInlineKeyboard(msg.chat.id, reply, inlineKeyboard);
      return; // ادامه حلقه بدون ارسال پیام معمولی
    } else if (getUserRole(msg.from.id) === ROLES.STUDENT) {
      // پنل قرآن آموز - بررسی وضعیت ثبت‌نام
      let inlineKeyboard = [
        [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }]
      ];
      
      let reply = `📖 پنل قرآن آموز

📋 گزینه‌های موجود:
• 🤖 معرفی ربات`;
      
      // بررسی وضعیت ثبت‌نام
      try {
        const { readJson } = require('./server/utils/jsonStore');
        const { getRegistrationMonthText } = require('./1time');
        const siteStatus = await readJson('data/site-status.json', {
          registration: { enabled: true }
        });
        
        if (siteStatus.registration.enabled) {
          const buttonText = getRegistrationMonthText(true);
          inlineKeyboard.push([{ text: buttonText, callback_data: 'student_registration' }]);
          reply += '\n• 📝 ثبت نام';
        } else {
          // وقتی ثبت‌نام غیرفعال است، دکمه کاملاً حذف می‌شود
          // فقط پیام اطلاع‌رسانی نمایش داده می‌شود
          const nextMonthText = getRegistrationMonthText(false);
          reply += `\n• ${nextMonthText}`;
        }
      } catch (error) {
        console.log('⚠️ [POLLING] Could not read registration status, registration button will not be shown');
        // در صورت خطا، دکمه ثبت‌نام نمایش داده نمی‌شود
        reply += '\n• 📝 ثبت نام (وضعیت نامشخص)';
      }
      
      reply += `

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      await sendMessageWithInlineKeyboard(msg.chat.id, reply, inlineKeyboard);
      return; // ادامه حلقه بدون ارسال پیام معمولی
    } else {
      // پنل مدیر - همه گزینه‌ها
      const inlineKeyboard = [
        [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }],
        [{ text: '🏫 مدیریت گروه‌ها', callback_data: 'groups' }],
        [{ text: '🏭 کارگاه‌ها', callback_data: 'kargah_management' }]
      ];
      
      reply = `🔧 پنل ${config.name}

📋 گزینه‌های موجود:
• 🤖 معرفی ربات
• 🏫 مدیریت گروه‌ها (حضور و غیاب)
• 🏭 کارگاه‌ها

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      await sendMessageWithInlineKeyboard(msg.chat.id, reply, inlineKeyboard);
      return; // ادامه حلقه بدون ارسال پیام معمولی
    }
  } else if (msg.text === '🏫 مدیریت گروه‌ها') {
    // if (!canSendMessage(msg.chat.id, 'group_management', 5000)) {
    //   return; // پیام را نادیده بگیر
    // }
    
    // بررسی دسترسی کاربر - اصلاح شده
    if (!isAdmin(msg.from.id) && !isGroupAdmin(msg.from.id)) {
      reply = '⚠️ شما دسترسی لازم برای مدیریت گروه‌ها را ندارید.';
      keyboard = config.keyboard;
    } else {
      // نمایش پنل مدیریت گروه‌ها با استفاده از ماژول جدید
      const groups = await getGroupsList();
      
      if (groups.length === 0) {
        reply = '📝 هیچ گروهی یافت نشد.\n\nبرای شروع، لطفاً قرآن آموزان در گروه‌ها /عضو شوند.';
        keyboard = [[{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]];
      } else {
        const keyboard = createGroupsKeyboard(groups);
        reply = `🏫 مدیریت گروه‌ها

📋 گروه‌های موجود:
${groups.map((group, index) => `${index + 1}️⃣ ${group.title} (${group.memberCount} عضو)`).join('\n')}

👆 لطفاً گروه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
        
        await sendMessageWithInlineKeyboard(msg.chat.id, reply, keyboard);
        return; // ادامه حلقه بدون ارسال پیام معمولی
      }
    }
  } else if (msg.text === 'تنظیمات' || msg.text === '/تنظیمات') {
    // بررسی دسترسی کاربر برای تنظیمات - فقط مدیر مدرسه
    if (!isAdmin(msg.from.id)) {
     // reply = '⚠️ فقط مدیر مدرسه می‌تواند از تنظیمات استفاده کند.';
      keyboard = config.keyboard;
    } else {
      // نمایش منوی تنظیمات با استفاده از ماژول تنظیمات
      const settingsModule = new SettingsModule();
      const success = settingsModule.handleSettingsCommand(msg.chat.id, msg.from.id);
      
      if (success) {
        return; // ادامه حلقه بدون ارسال پیام معمولی
      } else {
        reply = '❌ خطا در نمایش تنظیمات';
        keyboard = config.keyboard;
      }
    }
  } else if (msg.text === 'نقش‌ها' || msg.text === '/نقش‌ها') {
    // مدیریت نقش‌ها - فقط برای مدیر مدرسه
    if (!isAdmin(msg.from.id)) {
      reply = '⚠️ فقط مدیر مدرسه می‌تواند نقش‌ها را مدیریت کند.';
      keyboard = config.keyboard;
    } else {
      // نمایش پنل مدیریت نقش‌ها
      reply = `🎭 *پنل مدیریت نقش‌ها*

👥 **کاربران فعلی:**
${getAllUsersWithRoles().map(user => `• ${user.name} (${user.role})`).join('\n')}

📝 **دستورات:**
• /نقش [شماره تلفن] [نقش] - تخصیص نقش
• /حذف_نقش [شماره تلفن] - حذف نقش

⏰ ${getTimeStamp()}`;
      keyboard = config.keyboard;
    }
  } else if (msg.text === '/گروه') {
    // دستور /گروه - فقط در گروه گزارش و فقط برای مدیر مدرسه
    if (msg.chat.id !== REPORT_GROUP_ID) {
      reply = '⚠️ این دستور فقط در گروه گزارش قابل استفاده است.';
      keyboard = config.keyboard;
    } else if (!isAdmin(msg.from.id)) {
      reply = '⚠️ فقط مدیر مدرسه می‌تواند از این دستور استفاده کند.';
      keyboard = config.keyboard;
    } else {
      // نمایش لیست گروه‌ها برای مدیر مدرسه با Inline Keyboard
      const { createGroupsInlineKeyboard } = require('./7group');
      
      try {
        const inlineKeyboard = await createGroupsInlineKeyboard();
        
        if (inlineKeyboard.length <= 1) { // فقط دکمه بازگشت
          reply = '📝 هیچ گروهی یافت نشد.\n\nبرای شروع، لطفاً قرآن آموزان در گروه‌ها /عضو شوند.';
          keyboard = config.keyboard;
        } else {
          reply = `📋 لیست گروه‌های فعال:

👆 لطفاً گروه مورد نظر را انتخاب کنید تا جزئیات آن را ببینید:
⏰ ${getTimeStamp()}`;
          
          await sendMessageWithInlineKeyboard(msg.chat.id, reply, inlineKeyboard);
          return; // ادامه حلقه بدون ارسال پیام معمولی
        }
      } catch (error) {
        console.error('Error creating groups keyboard:', error.message);
        reply = '❌ خطا در دریافت لیست گروه‌ها';
        keyboard = config.keyboard;
      }
    }
  } else if (msg.text === '/شروع') {
    reply = `${config.emoji} پنل ${config.name} فعال شد\n⏰ ${getTimeStamp()}`;
    keyboard = config.keyboard;
  } else if (msg.text === '/خروج') {
    reply = `👋 پنل ${config.name} بسته شد\n⏰ ${getTimeStamp()}`;
    keyboard = config.keyboard;
  } else if (msg.text === 'ربات' || msg.text === '/ربات' || msg.text === '🤖 ربات') {
    // دستور معرفی ربات
    reply = `🤖 *ربات قرآنی هوشمند*

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

⏰ ${getTimeStamp()}`;
    keyboard = config.keyboard;
  } else if (msg.text === '/تنظیمات' || msg.text === '⚙️ تنظیمات' || msg.text === 'تنظیمات') {
    console.log('🔍 [POLLING] Settings command detected:', msg.text);
    console.log(`🔍 [POLLING] User ID: ${msg.from.id}, Chat ID: ${msg.chat.id}`);
    // دستور تنظیمات - فقط برای مدیر مدرسه
    if (!isAdmin(msg.from.id)) {
      console.log('❌ [POLLING] User is not admin for settings command');
      reply = '⚠️ فقط مدیر مدرسه می‌تواند از تنظیمات استفاده کند.';
      keyboard = config.keyboard;
    } else {
      // نمایش پنل تنظیمات
      console.log('🔍 [POLLING] User is admin, calling handleSettingsCommand...');
      const settingsModule = new SettingsModule();
      console.log('🔍 [POLLING] SettingsModule created');
      const success = settingsModule.handleSettingsCommand(msg.chat.id, msg.from.id);
      console.log('🔍 [POLLING] handleSettingsCommand result:', success);
      
      if (success) {
        console.log('✅ [POLLING] Settings command handled successfully, returning');
        return; // ادامه حلقه بدون ارسال پیام معمولی
      } else {
        console.log('❌ [POLLING] Settings command failed, sending error message');
        reply = '❌ خطا در نمایش تنظیمات';
        keyboard = config.keyboard;
      }
    }
  } else if (msg.text === '/کارگاه' || msg.text === '🏭 کارگاه‌ها') {
    // دستور کارگاه‌ها - فقط برای مدیر مدرسه
    if (!isAdmin(msg.from.id)) {
      reply = '⚠️ فقط مدیر مدرسه می‌تواند از کارگاه‌ها استفاده کند.';
      keyboard = config.keyboard;
    } else {
      // نمایش پنل کارگاه‌ها
      const kargahModule = require('./12kargah');
      // متصل کردن متدهای ارسال پیام
      kargahModule.sendMessage = sendMessage;
      kargahModule.sendMessageWithInlineKeyboard = sendMessageWithInlineKeyboard;
      kargahModule.editMessageWithInlineKeyboard = require('./4bale').editMessageWithInlineKeyboard;
      const success = await kargahModule.handleKargahCommand(msg.chat.id, msg.from.id);
      
      if (success) {
        return; // ادامه حلقه بدون ارسال پیام معمولی
      } else {
        reply = '❌ خطا در نمایش کارگاه‌ها';
        keyboard = config.keyboard;
      }
    }
  } else {
    // بررسی وضعیت کاربر در ماژول‌های مختلف - اولویت با وضعیت‌ها
    const settingsModule = new SettingsModule();
    const kargahModule = require('./12kargah');
    
    // بررسی وضعیت در تنظیمات
    if (settingsModule.isUserInState(msg.from.id)) {
      const userState = settingsModule.getUserState(msg.from.id);
      await settingsModule.handleSettingsStep(msg.chat.id, msg.from.id, msg.text, userState);
      return;
    }
    
    // بررسی وضعیت در کارگاه‌ها - اولویت بالا
    console.log(`🔍 [POLLING] Checking kargah state for user ${msg.from.id}`);
    
    // متصل کردن متدهای ارسال پیام
    kargahModule.sendMessage = sendMessage;
    kargahModule.sendMessageWithInlineKeyboard = sendMessageWithInlineKeyboard;
    kargahModule.editMessageWithInlineKeyboard = require('./4bale').editMessageWithInlineKeyboard;
    
    console.log(`🔍 [POLLING] isUserInState result: ${kargahModule.isUserInState(msg.from.id)}`);
    
    if (kargahModule.isUserInState(msg.from.id)) {
      console.log(`🔍 [POLLING] User ${msg.from.id} is in kargah state`);
      const userState = kargahModule.getUserState(msg.from.id);
      console.log(`🔍 [POLLING] User state: ${userState}`);
      
      // بررسی نوع وضعیت و پردازش مناسب
      if (userState.startsWith('kargah_add_')) {
        console.log(`🔍 [POLLING] Processing add workshop step: ${userState}`);
        await kargahModule.handleAddWorkshopStep(msg.chat.id, msg.from.id, msg.text, userState);
      } else if (userState.startsWith('kargah_edit_')) {
        console.log(`🔍 [POLLING] Processing edit workshop step: ${userState}`);
        await kargahModule.handleEditWorkshopStep(msg.chat.id, msg.from.id, msg.text, userState);
      }
      return;
    }
    
    // کد مربوط به پردازش پیام‌های عادی
    // نادیده گرفتن کلمات خاص
    if (['ربات', 'bot', 'سلام', 'hi', 'hello', 'خداحافظ', 'bye'].includes(msg.text.toLowerCase())) {
      return;
    }
    
    reply = `❓ پیام شما قابل فهم نیست\n\nلطفاً از دکمه‌های منو استفاده کنید یا دستورات زیر را امتحان کنید:\n\n`;
    reply += config.commands.map(cmd => `• ${cmd}`).join('\n');
    keyboard = config.keyboard;
  }
  
  await safeSendMessage(msg.chat.id, reply, keyboard);
}

function startPolling() {
  let pollingInterval = 1000; // شروع با 1 ثانیه
  let isFirstRun = true; // برای تشخیص اولین اجرا
  
  const poll = async () => {
    try {
      const updates = await getUpdates(lastId + 1);
      consecutiveErrors = 0; // ریست کردن شمارنده خطاها
      handleConnectionStatus(true);
      
      // اگر اتصال برقرار است، polling را سریع‌تر کن
      if (pollingInterval > 1000) {
        pollingInterval = 1000;
      }
      
      // هر 5 دقیقه یک بار cleanup انجام بده
      if (Date.now() % 300000 < 1000) {
        cleanupOldTimestamps();
      }
      
      // در اولین اجرا، بررسی لیست‌های موجود
      if (isFirstRun) {
        console.log('🤖 Checking existing lists...');
        isFirstRun = false;
      }
      
      for (const update of updates) {
        lastId = update.update_id;
        const msg = update.message;
        const callback_query = update.callback_query;
        
        // پردازش callback query (کیبورد شیشه‌ای)
        if (callback_query) {
          console.log('🔄 [POLLING] Callback query detected');
          console.log(`🔄 [POLLING] Callback data: ${callback_query.data}`);
          console.log(`🔄 [POLLING] User ID: ${callback_query.from.id}, Chat ID: ${callback_query.message.chat.id}`);
          console.log(`🔄 [POLLING] Callback data type: ${typeof callback_query.data}`);
          console.log(`🔄 [POLLING] Callback data length: ${callback_query.data.length}`);
          console.log(`🔄 [POLLING] Callback data starts with 'practice_': ${callback_query.data.startsWith('practice_')}`);
          console.log(`🔄 [POLLING] Callback data starts with 'evaluation_': ${callback_query.data.startsWith('evaluation_')}`);
          console.log(`🔄 [POLLING] Callback data === 'practice_evaluation_days_settings': ${callback_query.data === 'practice_evaluation_days_settings'}`);
          
          // حذف پیام قبلی که کیبورد شیشه‌ای داشت - فقط برای callback های غیر کارگاه و غیر بازگشت
          if (!callback_query.data.startsWith('kargah_') && 
              !callback_query.data.startsWith('student_') && 
              callback_query.data !== 'back_to_groups' && 
              callback_query.data !== 'back_to_main') {
            try {
              console.log('🗑️ [POLLING] Attempting to delete previous message...');
              await deleteMessage(callback_query.message.chat.id, callback_query.message.message_id);
              console.log('🗑️ [POLLING] Previous message deleted successfully');
            } catch (error) {
              console.log('🗑️ [POLLING] Could not delete previous message:', error.message);
            }
          }
          
          // تشخیص نقش کاربر - به‌روزرسانی شده در 1404/05/13 ساعت 09:50
          const role = getUserRole(callback_query.from.id);
          console.log(`🔄 [POLLING] User role: ${role}`);
          
          // بررسی callback data برای مدیریت گروه‌ها
          console.log(`🔍 [POLLING] Checking callback conditions for: ${callback_query.data}`);
          console.log(`🔍 [POLLING] Starts with 'group_': ${callback_query.data.startsWith('group_')}`);
          console.log(`🔍 [POLLING] Starts with 'settings_': ${callback_query.data.startsWith('settings_')}`);
          console.log(`🔍 [POLLING] Starts with 'toggle_': ${callback_query.data.startsWith('toggle_')}`);
          console.log(`🔍 [POLLING] Starts with 'select_': ${callback_query.data.startsWith('select_')}`);
          console.log(`🔍 [POLLING] Starts with 'practice_': ${callback_query.data.startsWith('practice_')}`);
          console.log(`🔍 [POLLING] Starts with 'evaluation_': ${callback_query.data.startsWith('evaluation_')}`);
          console.log(`🔍 [POLLING] Equals 'practice_evaluation_days_settings': ${callback_query.data === 'practice_evaluation_days_settings'}`);
          
          if (callback_query.data.startsWith('group_') || 
              callback_query.data.startsWith('member_') ||
              callback_query.data.startsWith('status_') ||
              callback_query.data.startsWith('all_') ||
              callback_query.data.startsWith('report_') ||
              callback_query.data.startsWith('reset_') ||
              callback_query.data === 'groups' ||
              callback_query.data === 'coach_groups' ||
              callback_query.data === 'assistant_groups' ||
              callback_query.data === 'back_to_groups' ||
              callback_query.data === 'back_to_main') {
            
            console.log('🔄 [POLLING] Group management callback detected');
            // پردازش مدیریت گروه‌ها با استفاده از ماژول جدید
            await handleGroupManagementCallback(callback_query);
            
            } else if (callback_query.data === 'intro_quran_bot') {
            
            console.log('🔄 [POLLING] Quran bot intro callback detected');
            const config = roleConfig[role];
            const reply = `📖 ربات قرآنی هوشمند

🤖 این ربات برای آموزش قرآن کریم طراحی شده است
📚 قابلیت‌های اصلی:
• آموزش تلاوت قرآن
• حفظ آیات کریمه
• تفسیر آیات
• آزمون‌های قرآنی
• گزارش پیشرفت

⏰ ${getTimeStamp()}`;
            
            await safeSendMessage(callback_query.from.id, reply, config.keyboard);
          } else if (callback_query.data.startsWith('toggle_robot_button_')) {
            // تغییر وضعیت نمایش دکمه ربات
            if (!isAdmin(callback_query.from.id)) {
              await answerCallbackQuery(callback_query.id, '⚠️ فقط مدیر مدرسه می‌تواند این کار را انجام دهد.', true);
              return;
            }
            
            const newValue = parseInt(callback_query.data.split('_')[3]);
            const success = setButtonVisibility('ROBOT_BUTTON', newValue === 1);
            
            if (success) {
              const statusText = newValue === 1 ? 'نمایش داده می‌شود' : 'نمایش داده نمی‌شود';
              const reply = `✅ دکمه ربات با موفقیت تغییر کرد

📊 وضعیت جدید:
• دکمه ربات: ${statusText}

🔄 تغییرات در پنل بعدی اعمال خواهد شد.

⏰ ${getTimeStamp()}`;
              
              await safeSendMessage(callback_query.from.id, reply);
            } else {
              await answerCallbackQuery(callback_query.id, '❌ خطا در تغییر وضعیت دکمه ربات', true);
            }
          } else if (callback_query.data === 'robot_button_status') {
            // نمایش وضعیت فعلی دکمه ربات
            if (!isAdmin(callback_query.from.id)) {
              await answerCallbackQuery(callback_query.id, '⚠️ فقط مدیر مدرسه می‌تواند این کار را انجام دهد.', true);
              return;
            }
            
            const currentStatus = isButtonVisible('ROBOT_BUTTON');
            const statusText = currentStatus ? 'نمایش داده می‌شود' : 'نمایش داده نمی‌شود';
            const config = getButtonVisibilityConfig();
            
            const reply = `📊 وضعیت دکمه ربات

🔍 اطلاعات فعلی:
• دکمه ربات: ${statusText}
• مقدار کانفیگ: ${config.ROBOT_BUTTON}

⚙️ برای تغییر وضعیت، از منوی ربات استفاده کنید.

⏰ ${getTimeStamp()}`;
            
            await safeSendMessage(callback_query.from.id, reply);
          } else if (callback_query.data === 'back_to_main') {
            // بازگشت به منوی اصلی
            const role = getUserRole(callback_query.from.id);
            const config = roleConfig[role];
            
            if (config) {
              const reply = `${config.emoji} پنل ${config.name} فعال شد\n⏰ ${getTimeStamp()}`;
              await safeSendMessage(callback_query.from.id, reply, config.keyboard);
            } else {
              const reply = '❌ خطا در بارگذاری پنل. لطفاً دوباره تلاش کنید.';
              await safeSendMessage(callback_query.from.id, reply);
            }
          } else if (callback_query.data === 'school_intro') {
            
            console.log('🔄 [POLLING] School intro callback detected');
            const reply = `🏫 *معرفی مدرسه تلاوت*

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
ثبت‌نام به صورت ماهانه انجام می‌شود و مدیر مدرسه زمان آن را مشخص می‌کند.

⏰ ${getTimeStamp()}`;
            
            const inlineKeyboard = [
              [{ text: '📝 ثبت‌نام', callback_data: 'start_registration' }],
              [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }]
            ];
            
            await sendMessageWithInlineKeyboard(callback_query.from.id, reply, inlineKeyboard);
          } else if (callback_query.data === 'start_registration') {
            
            console.log('🔄 [POLLING] Start registration callback detected');
            // پردازش شروع ثبت‌نام با استفاده از ماژول ثبت‌نام هوشمند
            const regModule = new SmartRegistrationModule();
            const success = await regModule.handleRegistrationStart(callback_query.from.id, callback_query.from.id.toString());
            
            if (!success) {
              const reply = '❌ خطا در شروع فرآیند ثبت‌نام. لطفاً دوباره تلاش کنید.';
              await safeSendMessage(callback_query.from.id, reply);
            }
          } else if (callback_query.data === 'student_registration') {
            
            console.log('🔄 [POLLING] Student registration callback detected');
            
            // بررسی وضعیت ثبت‌نام قبل از شروع
            try {
              const { readJson } = require('./server/utils/jsonStore');
              const siteStatus = await readJson('data/site-status.json', {
                registration: { enabled: true }
              });
              
              if (!siteStatus.registration.enabled) {
                const reply = '⚠️ ثبت‌نام در حال حاضر غیرفعال است.\n\nلطفاً بعداً تلاش کنید یا با مدیر تماس بگیرید.';
                await safeSendMessage(callback_query.from.id, reply);
                return;
              }
            } catch (error) {
              console.log('⚠️ [POLLING] Could not read registration status, proceeding with registration');
            }
            
            // پردازش ثبت‌نام قرآن آموز با استفاده از ماژول ثبت‌نام هوشمند
            const regModule = new SmartRegistrationModule();
            const success = await regModule.handleRegistrationStart(callback_query.from.id, callback_query.from.id.toString());
            
            if (!success) {
              const reply = '❌ خطا در شروع فرآیند ثبت‌نام. لطفاً دوباره تلاش کنید.';
              await safeSendMessage(callback_query.from.id, reply);
            }
          } else if (callback_query.data.startsWith('role_')) {
            
            console.log('🔄 [POLLING] Role management callback detected');
            // بررسی دسترسی کاربر - فقط ادمین‌ها می‌توانند نقش‌ها را مدیریت کنند
            if (!isAdmin(callback_query.from.id)) {
              await answerCallbackQuery(callback_query.id, '⚠️ فقط مدیر مدرسه می‌تواند نقش‌ها را مدیریت کند.');
            } else {
              // پردازش callback های مدیریت نقش‌ها
              const roleManager = require('./role_manager');
              const success = await roleManager.handleCallback(callback_query);
              
              if (!success) {
                console.error('❌ [POLLING] Error handling role management callback');
                await answerCallbackQuery(callback_query.id, '❌ خطا در پردازش درخواست نقش‌ها');
              }
            }
          } else if (callback_query.data === 'kargah_management') {
            
            console.log('🔄 [POLLING] Kargah management callback detected');
            // بررسی دسترسی کاربر - فقط ادمین‌ها می‌توانند کارگاه‌ها را مدیریت کنند
            if (!isAdmin(callback_query.from.id)) {
              const config = roleConfig[role];
              const reply = '⚠️ فقط مدیر مدرسه می‌تواند کارگاه‌ها را مدیریت کند.';
              await safeSendMessage(callback_query.from.id, reply, config.keyboard);
            } else {
              // نمایش منوی کارگاه‌ها با استفاده از ماژول کارگاه‌ها
              const kargahModule = require('./12kargah');
              // متصل کردن متدهای ارسال پیام
              kargahModule.sendMessage = sendMessage;
              kargahModule.sendMessageWithInlineKeyboard = sendMessageWithInlineKeyboard;
              kargahModule.editMessageWithInlineKeyboard = require('./4bale').editMessageWithInlineKeyboard;
              const success = await kargahModule.handleKargahCommand(callback_query.message.chat.id, callback_query.from.id);
              
              if (!success) {
                const config = roleConfig[role];
                const reply = '❌ خطا در نمایش منوی کارگاه‌ها';
                await safeSendMessage(callback_query.from.id, reply, config.keyboard);
              }
            }
          } else           if (callback_query.data.startsWith('settings_') ||
                     callback_query.data.startsWith('toggle_') ||
                     callback_query.data.startsWith('select_') ||
                     callback_query.data.startsWith('practice_') ||
                     callback_query.data.startsWith('evaluation_') ||
                     callback_query.data === 'practice_evaluation_days_settings' ||
                     callback_query.data === 'practice_days_settings' ||
                     callback_query.data === 'evaluation_days_settings' ||
                     callback_query.data === 'attendance_days_settings') {
            // پردازش callback های تنظیمات
            console.log(`🔍 [POLLING] Settings callback detected: ${callback_query.data}`);
            
            // لوگ مخصوص برای دکمه روزهای تمرین و ارزیابی
            if (callback_query.data === 'practice_evaluation_days_settings') {
              console.log('🎯 [POLLING] PRACTICE+EVALUATION DAYS BUTTON CLICKED!');
              console.log('🎯 [POLLING] About to route to settings module...');
            }
            
            console.log(`🔍 [POLLING] Callback query object:`, JSON.stringify(callback_query, null, 2));
            console.log(`🔍 [POLLING] User ID: ${callback_query.from.id}, Chat ID: ${callback_query.message.chat.id}`);
            
            const settingsModule = new SettingsModule();
            console.log('🔍 [POLLING] SettingsModule created, calling handleCallback...');
            const success = await settingsModule.handleCallback(callback_query);
            
            if (!success) {
              console.error('❌ [POLLING] Error handling settings callback');
              console.error('❌ [POLLING] Settings callback failed for data:', callback_query.data);
            } else {
              console.log('✅ [POLLING] Settings callback handled successfully');
              console.log('✅ [POLLING] Settings callback completed for data:', callback_query.data);
            }
          } else if (callback_query.data.startsWith('kargah_') || callback_query.data.startsWith('student_')) {
            console.log('🔄 [POLLING] Kargah callback detected');
            console.log(`🔄 [POLLING] Kargah callback data: ${callback_query.data}`);
            // پردازش callback های کارگاه‌ها
            const kargahModule = require('./12kargah');
            // متصل کردن متدهای ارسال پیام
            kargahModule.sendMessage = sendMessage;
            kargahModule.sendMessageWithInlineKeyboard = sendMessageWithInlineKeyboard;
            kargahModule.editMessageWithInlineKeyboard = require('./4bale').editMessageWithInlineKeyboard;
            const success = await kargahModule.handleCallback(callback_query);
            
            if (!success) {
              console.error('❌ [POLLING] Error handling kargah callback');
              console.error(`❌ [POLLING] Kargah callback failed for data: ${callback_query.data}`);
            } else {
              console.log('✅ [POLLING] Kargah callback handled successfully');
            }
          } else if (callback_query.data.startsWith('start_registration') || 
                     callback_query.data.startsWith('edit_') || 
                     callback_query.data.startsWith('final_confirm') || 
                     callback_query.data.startsWith('quran_student_panel') || 
                     callback_query.data.startsWith('complete_registration') ||
                     callback_query.data === 'school_intro' ||
                     callback_query.data === 'intro_quran_bot') {
            console.log('🔄 [POLLING] Registration callback detected');
            console.log(`🔄 [POLLING] Registration callback data: ${callback_query.data}`);
            // پردازش callback های ثبت‌نام
            const regModule = new SmartRegistrationModule();
            const success = await regModule.handleCallback(callback_query);
            
            if (!success) {
              console.error('❌ [POLLING] Error handling registration callback');
              console.error(`❌ [POLLING] Registration callback failed for data: ${callback_query.data}`);
            } else {
              console.log('✅ [POLLING] Registration callback handled successfully');
            }
          } else {
            console.log(`⚠️ [POLLING] Unknown callback data: ${callback_query.data}`);
            console.log(`⚠️ [POLLING] Callback data type: ${typeof callback_query.data}`);
            console.log(`⚠️ [POLLING] Callback data length: ${callback_query.data.length}`);
            console.log(`⚠️ [POLLING] Callback data starts with 'practice_': ${callback_query.data.startsWith('practice_')}`);
            console.log(`⚠️ [POLLING] Callback data starts with 'evaluation_': ${callback_query.data.startsWith('evaluation_')}`);
            console.log(`⚠️ [POLLING] Callback data === 'practice_evaluation_days_settings': ${callback_query.data === 'practice_evaluation_days_settings'}`);
          }
          continue;
        }
        
        if (!msg || !msg.chat) continue;
        
        // اگر پیام text ندارد اما contact دارد، آن را پردازش کن
        if (!msg.text && !msg.contact) continue;

        // اگر گروه بود، دستورات گروه را پردازش کن
        if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
          // بررسی اینکه آیا ربات ادمین است
          const isBotAdmin = await checkBotAdminStatus(msg.chat.id);
          
          // گزارش وضعیت ادمین ربات - غیرفعال شده
          // if (!this.botAdminStatusReported) {
          //   await reportBotAdminStatus(msg.chat.id, msg.chat.title, isBotAdmin);
          //   this.botAdminStatusReported = true;
          // }
          
          // پردازش ورود و خروج اعضا
          if (msg.new_chat_member) {
            // اگر عضو جدید ربات باشد، گزارش ورود ربات
            if (msg.new_chat_member.is_bot) {
              await handleGroupJoin(msg.chat);
            }
            continue;
          }
          
          if (msg.left_chat_member) {
            await removeMember(msg.chat.id, msg.left_chat_member.id);
            continue;
          }
          
          // دستورات ادمین و مربی‌ها - به‌روزرسانی شده در 1404/05/13 ساعت 10:45 - نسخه 1.4.0
          const userRole = getUserRole(msg.from.id);
          const canUseAdminCommands = isAdmin(msg.from.id) || isGroupAdmin(msg.from.id) || isCoach(msg.from.id) || isAssistant(msg.from.id);
          
          if (canUseAdminCommands) {
            if (msg.text === '/ربات') {
              await announceBotActivationForAdmin(msg.chat.id, msg.chat.title);
              continue;
            }
            if (msg.text === '/لیست') {
              await reportGroupMembers(msg.chat.id, msg.chat.title);
              await checkAndUpdateMembersList(msg.chat.id, msg.chat.title);
              continue;
            }
            if (msg.text === '/عضو') {
              await sendMessage(msg.chat.id, '⚠️ این دستور برای قرآن آموزان است. ادمین‌ها و مربی‌ها نیازی به /عضو ندارند.');
              continue;
            }
          }
          
          // دستورات اعضا
          if (msg.text === '/عضو') {
            console.log(`👤 /عضو command detected from ${msg.from.first_name}`);
            const userName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
            await addMember(msg.chat.id, msg.chat.title, msg.from.id, userName);
            continue;
          }
          

          
          // دستورات غیرمجاز برای اعضا
          if (msg.text === '/ربات' || msg.text === '/لیست') {
            await sendMessage(msg.chat.id, '⚠️ این دستورات فقط برای ادمین‌ها و مربی‌ها است.');
            continue;
          }
          
          // نادیده گرفتن کلمات خاص که نباید پردازش شوند
          if (msg.text === 'بررسی' || msg.text === 'بررسی' || msg.text === 'check' || msg.text === 'Check') {
            // این کلمات را نادیده بگیر
            continue;
          }
          
          // این قسمت حذف شد - گزارش ورود ربات فقط در زمان واقعی join باید اتفاق بیفتد
          // await handleGroupJoin(msg.chat);
          continue;
        }

        // پردازش پیام‌های خصوصی - اولویت‌بندی بر اساس نقش
        if (msg.chat.type === 'private') {
          console.log('🔄 [POLLING] Private message detected');
          const userRole = getUserRole(msg.from.id);
          
          // اولویت‌بندی: مدیر -> مربی -> کمک مربی -> قرآن‌آموز
          if (userRole === ROLES.SCHOOL_ADMIN || userRole === ROLES.COACH || userRole === ROLES.ASSISTANT) {
            console.log(`🔄 [POLLING] Admin/Coach/Assistant detected, using role-based handling`);
            
            // بررسی role manager برای پیام‌ها - غیرفعال شده
            // const roleManagerResult = await roleManager.handleMessage(msg);
            // if (roleManagerResult) {
            //   console.log('🔄 [POLLING] Role manager handled message');
            //   await sendMessageWithInlineKeyboard(msg.chat.id, roleManagerResult.text, roleManagerResult.keyboard);
            // } else {
            //   await handleRoleMessage(msg, userRole);
            // }
            
            // مستقیماً از handleRoleMessage استفاده کن
            await handleRoleMessage(msg, userRole);
          } else {
            // برای قرآن‌آموز و ناشناس‌ها، از ماژول ثبت‌نام هوشمند استفاده کن
            console.log(`🔄 [POLLING] Student/Unknown user detected, using smart registration module`);
            const regModule = new SmartRegistrationModule();
            const success = await regModule.handleMessage(msg);
            
            if (!success) {
              console.log('🔄 [POLLING] Registration module did not handle message, falling back to role-based handling');
              await handleRoleMessage(msg, userRole);
            } else {
              console.log('✅ [POLLING] Registration module handled message successfully');
            }
          }
        } else {
          // پردازش پیام‌های بر اساس نقش - به‌روزرسانی شده در 1404/05/13 ساعت 10:00
          const userRole = getUserRole(msg.from.id); // تصحیح: از from.id بگیر نه chat.id
          await handleRoleMessage(msg, userRole);
        }
      }
    } catch (e) {
      consecutiveErrors++;
      handleConnectionStatus(false);
      
      // اگر خطاهای متوالی زیاد شد، polling را کندتر کن
      if (consecutiveErrors > 3) {
        pollingInterval = Math.min(pollingInterval * 2, 10000); // حداکثر 10 ثانیه
        console.log(`⏱️ Reducing polling speed to ${pollingInterval/1000} seconds`);
      }
      
      // فقط خطاهای مهم را نمایش بده
      if (consecutiveErrors <= 3) {
        console.error('🔴 Polling error:', e.response?.data || e.message);
      }
      
      // گزارش خطاهای مهم به گروه
      if (consecutiveErrors > 5) {
        logError('خطای polling', `خطاهای متوالی: ${consecutiveErrors}`);
      }
    }
    
    // ادامه polling با interval متغیر
    setTimeout(poll, pollingInterval);
  };
  
  // شروع polling
  poll();
}

// مدیریت callback های مدیریت گروه‌ها
async function handleGroupManagementCallback(callback_query) {
  try {
    const chatId = callback_query.message.chat.id;
    const messageId = callback_query.message.message_id;
    const userId = callback_query.from.id;
    const data = callback_query.data;
    const callbackQueryId = callback_query.id;
    
    console.log(`Processing group management callback: ${data}`);
    
    // بررسی دسترسی
    if (!isAdmin(userId) && !isGroupAdmin(userId) && !isCoach(userId) && !isAssistant(userId)) {
      await safeSendMessage(chatId, '⚠️ شما دسترسی لازم برای مدیریت گروه‌ها را ندارید.');
      return;
    }
    
    const parts = data.split('_');
    const action = data === 'back_to_main' ? 'back_to_main' : parts[0];
    
    if (action === 'groups' || action === 'coach' || action === 'assistant') {
      // نمایش لیست گروه‌ها
      console.log('🔍 [DEBUG] Getting groups list for user:', userId);
      const groups = await getGroupsList(userId);
      console.log('🔍 [DEBUG] Groups returned:', groups);
      
      if (groups.length === 0) {
        console.log('🔍 [DEBUG] No groups found, sending empty message');
        await sendMessageWithInlineKeyboard(chatId, 
          '📝 هیچ گروهی یافت نشد.\n\nبرای شروع، لطفاً قرآن آموزان در گروه‌ها /عضو شوند.',
          [[{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]]
        );
        return;
      }
      
      console.log('🔍 [DEBUG] Creating keyboard for groups');
      const keyboard = createGroupsKeyboard(groups);
      console.log('🔍 [DEBUG] Keyboard created:', keyboard);
      
      const text = `🏫 مدیریت گروه‌ها

📋 گروه‌های موجود:
${groups.map((group, index) => `${index + 1}️⃣ ${group.title} (${group.memberCount} عضو)`).join('\n')}

👆 لطفاً گروه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      console.log('🔍 [DEBUG] Sending message with text:', text);
      await sendMessageWithInlineKeyboard(chatId, text, keyboard);
      console.log('🔍 [DEBUG] Message sent successfully');
      
    } else if (action === 'group') {
      // نمایش اعضای گروه
      const groupId = parts[1];
      const membersData = loadMembersData();
      const members = membersData.groups[groupId] || [];
      
      if (members.length === 0) {
        await sendMessageWithInlineKeyboard(chatId,
          '📝 این گروه هیچ عضوی ندارد.\n\nلطفاً قرآن آموزان /عضو شوند.',
          [[{ text: '🔙 بازگشت به لیست گروه‌ها', callback_data: 'groups' }]]
        );
        return;
      }
      
      // تنظیم کاربران در ماژول حضور و غیاب
      attendanceManager.setUsers(members.map(m => m.id), groupId);
      
      // ایجاد کیبورد حضور و غیاب
      const keyboard = createAttendanceKeyboard(groupId, members);
      
      // دریافت نام واقعی گروه به جای ID
      let groupDisplayName = `گروه ${groupId}`;
      try {
        const { GROUP_NAMES } = require('./3config');
        if (GROUP_NAMES[groupId]) {
          groupDisplayName = GROUP_NAMES[groupId];
        }
      } catch (error) {
        console.log(`Could not get group name for ${groupId}:`, error.message);
      }
      
      const text = `👥 مدیریت حضور و غیاب

📛 گروه: ${groupDisplayName}
👥 تعداد اعضا: ${members.length}

📋 لیست قرآن آموزان:
${members.map((member, index) => `${index + 1}. ${member.name}`).join('\n')}

👆 لطفاً عضو مورد نظر را انتخاب کنید یا عملیات گروهی را انجام دهید:
⏰ ${getTimeStamp()}`;
      
      await sendMessageWithInlineKeyboard(chatId, text, keyboard);
      
    } else if (action === 'member') {
      // انتخاب عضو برای تغییر وضعیت
      const groupId = parts[1];
      const memberId = parseInt(parts[2]);
      const membersData = loadMembersData();
      const members = membersData.groups[groupId] || [];
      const member = members.find(m => m.id === memberId);
      
      if (!member) {
        await safeSendMessage(chatId, '❌ عضو مورد نظر یافت نشد.');
        return;
      }
      
      // ایجاد کیبورد وضعیت عضو
      const keyboard = createMemberStatusKeyboard(groupId, memberId, member.name);
      const text = `👤 مدیریت وضعیت عضو

📛 نام: ${member.name}
🆔 آیدی: ${memberId}
📅 تاریخ عضویت: ${new Date(member.joinedAt).toLocaleDateString('fa-IR')}

👆 لطفاً عملیات مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      await sendMessageWithInlineKeyboard(chatId, text, keyboard);
      
    } else if (action === 'group_details') {
      // نمایش جزئیات گروه برای دستور /گروه
      const groupId = parts[1];
      const { getGroupDetails } = require('./7group');
      
      const result = await getGroupDetails(groupId);
      await sendMessageWithInlineKeyboard(chatId, result.text, result.keyboard);
      
    } else if (action === 'back_to_groups') {
      // بازگشت به لیست گروه‌ها
      const { createGroupsInlineKeyboard } = require('./7group');
      
      const keyboard = await createGroupsInlineKeyboard();
      const text = `📋 لیست گروه‌های فعال:

👆 لطفاً گروه مورد نظر را انتخاب کنید تا جزئیات آن را ببینید:
⏰ ${getTimeStamp()}`;
      
      await sendMessageWithInlineKeyboard(chatId, text, keyboard);
      
      // پاسخ به callback query
      await answerCallbackQuery(callbackQueryId, '✅ بازگشت به لیست گروه‌ها');
      
    } else if (action === 'back_to_main') {
      // بازگشت به منوی اصلی - نمایش کیبورد مناسب نقش کاربر
      const role = getUserRole(userId);
      console.log(`🔙 [POLLING] Back to main for user ${userId} with role: ${role}`);
      
      if (isCoach(userId)) {
        // پنل مربی
        const inlineKeyboard = [
          [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }],
          [{ text: '🏫 مدیریت گروه‌ها', callback_data: 'groups' }]
        ];
        
        const reply = `👨‍🏫 پنل مربی

📋 گزینه‌های موجود:
• 🤖 معرفی ربات
• 🏫 مدیریت گروه‌ها (حضور و غیاب)

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
        
        await sendMessageWithInlineKeyboard(chatId, reply, inlineKeyboard);
      } else if (isAssistant(userId)) {
        // پنل کمک مربی
        const inlineKeyboard = [
          [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }],
          [{ text: '🏫 مدیریت گروه‌ها', callback_data: 'groups' }]
        ];
        
        const reply = `👨‍🏫 پنل کمک مربی

📋 گزینه‌های موجود:
• 🤖 معرفی ربات
• 🏫 مدیریت گروه‌ها (حضور و غیاب)

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
        
        await sendMessageWithInlineKeyboard(chatId, reply, inlineKeyboard);
      } else {
        // پنل مدیر - همه گزینه‌ها
        const inlineKeyboard = [
          [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }],
          [{ text: '🏫 مدیریت گروه‌ها', callback_data: 'groups' }],
          [{ text: '🏭 کارگاه‌ها', callback_data: 'kargah_management' }]
        ];
        
        const reply = `🔧 پنل مدیر مدرسه

📋 گزینه‌های موجود:
• 🤖 معرفی ربات
• 🏫 مدیریت گروه‌ها (حضور و غیاب)
• 🏭 کارگاه‌ها

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
        
        await sendMessageWithInlineKeyboard(chatId, reply, inlineKeyboard);
      }
      
      // پاسخ به callback query
      await answerCallbackQuery(callbackQueryId, '✅ بازگشت به منوی اصلی');
      
    } else if (action === 'status') {
      // تغییر وضعیت عضو
      const groupId = parts[1];
      const memberId = parseInt(parts[2]);
      const status = parts[3];
      
      if (attendanceManager.setUserStatus(memberId, status)) {
        const membersData = loadMembersData();
        const member = membersData.groups[groupId]?.find(m => m.id === memberId);
        
        await sendMessageWithInlineKeyboard(chatId,
          `✅ وضعیت به‌روزرسانی شد\n\n👤 ${member?.name || 'عضو'}\n📊 وضعیت جدید: ${status}\n⏰ ${getTimeStamp()}`,
          [[{ text: '🔙 بازگشت', callback_data: `group_${groupId}` }]]
        );
      } else {
        await sendMessageWithInlineKeyboard(chatId,
          '❌ خطا در تغییر وضعیت',
          [[{ text: '🔙 بازگشت', callback_data: `group_${groupId}` }]]
        );
      }
      
    } else if (action === 'all') {
      // عملیات گروهی
      const operation = parts[1];
      const groupId = parts[2];
      const membersData = loadMembersData();
      const members = membersData.groups[groupId] || [];
      
      if (members.length === 0) {
        await sendMessageWithInlineKeyboard(chatId,
          '📝 این گروه هیچ عضوی ندارد.',
          [[{ text: '🔙 بازگشت', callback_data: `group_${groupId}` }]]
        );
        return;
      }
      
      let status = '';
      let operationText = '';
      
      switch (operation) {
        case 'present':
          status = 'حاضر';
          operationText = '✅ همه حاضر';
          break;
        case 'absent':
          status = 'غایب';
          operationText = '❌ همه غایب';
          break;
        case 'late':
          status = 'حضور با تاخیر';
          operationText = '⏰ همه با تاخیر';
          break;
        case 'excused':
          status = 'غیبت(موجه)';
          operationText = '📝 همه غیبت موجه';
          break;
      }
      
      // اعمال وضعیت به همه اعضا
      members.forEach(member => {
        attendanceManager.setUserStatus(member.id, status);
      });
      
      await sendMessageWithInlineKeyboard(chatId,
        `✅ عملیات گروهی انجام شد\n\n📛 گروه: ${groupId}\n👥 تعداد اعضا: ${members.length}\n📊 عملیات: ${operationText}\n⏰ ${getTimeStamp()}`,
        [[{ text: '🔙 بازگشت', callback_data: `group_${groupId}` }]]
      );
      
    } else if (action === 'report') {
      // گزارش حضور و غیاب
      const groupId = parts[1];
      const membersData = loadMembersData();
      const members = membersData.groups[groupId] || [];
      
      if (members.length === 0) {
        await sendMessageWithInlineKeyboard(chatId,
          '📝 این گروه هیچ عضوی ندارد.',
          [[{ text: '🔙 بازگشت', callback_data: `group_${groupId}` }]]
        );
        return;
      }
      
      const reportText = attendanceManager.getAttendanceList();
      await sendMessageWithInlineKeyboard(chatId, reportText,
        [[{ text: '🔙 بازگشت', callback_data: `group_${groupId}` }]]
      );
      
    } else if (action === 'reset') {
      // ریست کردن حضور و غیاب
      const groupId = parts[1];
      attendanceManager.resetAttendance();
      
      // دریافت نام واقعی گروه به جای ID
      let groupDisplayName = `گروه ${groupId}`;
      try {
        const { GROUP_NAMES } = require('./3config');
        if (GROUP_NAMES[groupId]) {
          groupDisplayName = GROUP_NAMES[groupId];
        }
      } catch (error) {
        console.log(`Could not get group name for ${groupId}:`, error.message);
      }
      
      const text = `🔄 حضور و غیاب ریست شد

📛 گروه: ${groupDisplayName}
✅ همه وضعیت‌ها پاک شد
⏰ ${getTimeStamp()}`;
      
      await sendMessageWithInlineKeyboard(chatId, text, [[{ text: '🔙 بازگشت', callback_data: `group_${groupId}` }]]
      );
      
    } else if (action === 'back') {
      if (parts[1] === 'main') {
        // بازگشت به منوی اصلی
        const role = getUserRole(userId);
        const config = roleConfig[role];
        const text = `🏠 منوی اصلی\n⏰ ${getTimeStamp()}`;
        await sendMessageWithInlineKeyboard(chatId, text, config.keyboard);
      } else if (parts[1] === 'groups') {
        // بازگشت به لیست گروه‌ها
        const groups = await getGroupsList();
        
        if (groups.length === 0) {
          await sendMessageWithInlineKeyboard(chatId, 
            '📝 هیچ گروهی یافت نشد.\n\nبرای شروع، لطفاً قرآن آموزان در گروه‌ها /عضو شوند.',
            [[{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]]
          );
          return;
        }
        
        const keyboard = createGroupsKeyboard(groups);
        const text = `🏫 مدیریت گروه‌ها

📋 گروه‌های موجود:
${groups.map((group, index) => `${index + 1}️⃣ ${group.title} (${group.memberCount} عضو)`).join('\n')}

👆 لطفاً گروه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
        
        await sendMessageWithInlineKeyboard(chatId, text, keyboard);
      }
    } else if (action === 'settings_back') {
      // بازگشت از تنظیمات به منوی اصلی
      const text = `🏠 *بازگشت به منوی اصلی*

تنظیمات با موفقیت ذخیره شد.
برای ادامه کار، از دکمه‌های منوی اصلی استفاده کنید.`;
      
      // این باید به منوی اصلی برگردد - به main.py واگذار می‌شود
      // فعلاً پیام ساده نمایش می‌دهیم
      await sendMessage(chatId, text);
      return;
      
    } else if (action.startsWith('settings_') || action.startsWith('toggle_') || action.startsWith('select_')) {
      // پردازش callback های تنظیمات
      const settingsModule = new SettingsModule();
      const success = await settingsModule.handleCallback(callback_query);
      
      if (!success) {
        console.error('Error handling settings callback');
      }
      return;
    } else if (action.startsWith('kargah_') || action.startsWith('student_')) {
      // پردازش callback های کارگاه‌ها
      const kargahModule = require('./12kargah');
      // متصل کردن متدهای ارسال پیام
      kargahModule.sendMessage = sendMessage;
      kargahModule.sendMessageWithInlineKeyboard = sendMessageWithInlineKeyboard;
      kargahModule.editMessageWithInlineKeyboard = require('./4bale').editMessageWithInlineKeyboard;
      const success = await kargahModule.handleCallback(callback_query);
      
      if (!success) {
        console.error('Error handling kargah callback');
      }
      return;
    }
    
  } catch (error) {
    console.error(`Error in handleGroupManagementCallback: ${error.message}`);
    await safeSendMessage(callback_query.message.chat.id, '❌ خطا در پردازش درخواست');
  }
}

// ایجاد کیبورد حضور و غیاب
function createAttendanceKeyboard(groupId, members) {
  const keyboard = [];
  
  members.forEach((member, index) => {
    const status = attendanceManager.getUserStatus(member.id);
    let statusEmoji = '⚪'; // هیچ وضعیتی
    
    if (status) {
      switch (status) {
        case 'حاضر':
          statusEmoji = '✅';
          break;
        case 'غایب':
          statusEmoji = '❌';
          break;
        case 'حضور با تاخیر':
          statusEmoji = '⏰';
          break;
        case 'غیبت(موجه)':
          statusEmoji = '📝';
          break;
        default:
          statusEmoji = '⚪';
      }
    }
    
    keyboard.push([{
      text: `${statusEmoji} ${member.name}`,
      callback_data: `member_${groupId}_${member.id}`
    }]);
  });
  
  // دکمه‌های عملیات گروهی
  keyboard.push([
    { text: '✅ همه حاضر', callback_data: `all_present_${groupId}` },
    { text: '❌ همه غایب', callback_data: `all_absent_${groupId}` }
  ]);
  
  keyboard.push([
    { text: '⏰ همه با تاخیر', callback_data: `all_late_${groupId}` },
    { text: '📝 همه غیبت موجه', callback_data: `all_excused_${groupId}` }
  ]);
  
  // دکمه‌های مدیریت
  keyboard.push([
    { text: '📊 گزارش حضور و غیاب', callback_data: `report_${groupId}` },
    { text: '🔄 ریست کردن', callback_data: `reset_${groupId}` }
  ]);
  
  // دکمه بازگشت
  keyboard.push([{
    text: '🔙 بازگشت به لیست گروه‌ها',
    callback_data: 'back_to_groups'
  }]);
  
  return keyboard;
}

// ایجاد کیبورد انتخاب وضعیت عضو
function createMemberStatusKeyboard(groupId, memberId, memberName) {
  return [
    [
      { text: '✅ حاضر', callback_data: `status_${groupId}_${memberId}_حاضر` },
      { text: '⏰ حضور با تاخیر', callback_data: `status_${groupId}_${memberId}_حضور با تاخیر` }
    ],
    [
      { text: '❌ غایب', callback_data: `status_${groupId}_${memberId}_غایب` },
      { text: '📝 غیبت(موجه)', callback_data: `status_${groupId}_${memberId}_غیبت(موجه)` }
    ],
    [{ text: '🔙 بازگشت', callback_data: `group_${groupId}` }]
  ];
}

module.exports = { startPolling };