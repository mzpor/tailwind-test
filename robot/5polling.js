//⏰ 09:10:00 🗓️ دوشنبه 13 مرداد 1404
// ماژول اجرای حلقه اصلی دریافت پیام‌ها و کنترل ورود گروه

const { getUpdates, sendMessage, sendMessageWithInlineKeyboard, deleteMessage, getChat, getChatMember, answerCallbackQuery, editMessageWithInlineKeyboard } = require('./4bale');
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
const { 
  ROLES, 
  USERS_BY_ROLE, 
  isButtonVisible, 
  setButtonVisible, 
  getButtonVisibilityConfig,
  isGroupEnabled,
  setGroupStatus,
  getAllGroupsStatus,
  isGroupManagementEnabled,
  hasGroupManagementAccess,
  isOsatdManagementEnabled,
  hasOsatdManagementAccess,
  MAIN_BUTTONS_CONFIG,
  getRoleDisplayName
} = require('./3config');
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
const SmartRegistrationModule = require('./15reg.js');
const PaymentModule = require('./16pay');
const { practiceManager } = require('./practice_manager');
const { ArzyabiModule } = require('./17arzyabi');
const SabtManager = require('./18sabt');
// const { roleManager } = require('./role_manager'); // مدیریت نقش‌ها غیرفعال شده

// ایجاد یک instance واحد از SmartRegistrationModule
const registrationModule = new SmartRegistrationModule();

// ایجاد یک instance واحد از PaymentModule
const paymentModule = new PaymentModule();

// ایجاد یک instance واحد از ArzyabiModule
const arzyabiModule = new ArzyabiModule();

// ایجاد یک instance واحد از SabtManager
const sabtManager = new SabtManager();

// تابع گزارش هوشمند ورود ربات به گروه
async function reportBotJoinToGroup(chat) {
  try {
    const { BOT_JOIN_REPORT_CONFIG } = require('./3config');
    
    // اگر گزارش غیرفعال است، خروج
    if (!BOT_JOIN_REPORT_CONFIG.enabled) {
      console.log('📝 Bot join reporting is disabled');
      return;
    }
    
    console.log(`🤖 Reporting bot join to group ${chat.id} (${chat.title})`);
    
    // دریافت اطلاعات کامل گروه
    const { getChat, getChatAdministrators } = require('./4bale');
    
    // دریافت تعداد اعضا
    let memberCount = 0;
    try {
      const chatInfo = await getChat(chat.id);
      memberCount = chatInfo.member_count || 0;
      console.log(`✅ Got member count: ${memberCount}`);
    } catch (error) {
      console.log('⚠️ Could not get member count:', error.message);
    }
    
    // دریافت لیست ادمین‌ها
    let admins = [];
    try {
      const adminsResponse = await getChatAdministrators(chat.id);
      if (adminsResponse && adminsResponse.length > 0) {
        admins = adminsResponse.filter(member => 
          member.status === 'administrator' || member.status === 'creator'
        ).map(admin => {
          const name = admin.user.first_name + (admin.user.last_name ? ' ' + admin.user.last_name : '');
          return `${name} (@${admin.user.username || 'بدون یوزرنیم'})`;
        });
        console.log(`✅ Got ${admins.length} admins`);
      }
    } catch (error) {
      console.log('⚠️ Could not get admins list:', error.message);
    }
    
    // ساخت پیام گزارش
    let reportText = `🤖 **ربات وارد گروه شد!**\n\n`;
    reportText += `📛 **نام گروه:** ${chat.title}\n`;
    reportText += `🆔 **آیدی گروه:** ${chat.id}\n`;
    
    if (chat.invite_link) {
      reportText += `🔗 **لینک گروه:** ${chat.invite_link}\n`;
    }
    
    reportText += `👥 **تعداد اعضا:** ${memberCount}\n`;
    reportText += `📅 **نوع گروه:** ${chat.type}\n`;
    
    if (BOT_JOIN_REPORT_CONFIG.details_level === 'full' && admins.length > 0) {
      reportText += `\n👑 **ادمین‌ها:**\n`;
      admins.forEach((admin, index) => {
        reportText += `${index + 1}. ${admin}\n`;
      });
    }
    
    reportText += `\n⏰ **زمان ورود:** ${new Date().toLocaleString('fa-IR')}`;
    
    // ارسال گزارش به گروه گزارش
    const reportGroupId = BOT_JOIN_REPORT_CONFIG.report_to_group;
    console.log(`📤 Sending report to group ${reportGroupId}`);
    await sendMessage(reportGroupId, reportText);
    
    console.log(`✅ Bot join report sent to group ${reportGroupId}`);
    
  } catch (error) {
    console.error(`❌ Error reporting bot join:`, error.message);
    console.error(`❌ Error stack:`, error.stack);
  }
}

// تابع حذف ربات از گروه
async function removeBotFromGroup(groupId) {
  try {
    console.log(`🗑️ Removing bot from group ${groupId}`);
    
    // حذف از groups_config.json
    try {
      const { loadGroupsConfig, saveGroupsConfig } = require('./3config');
      const groupsConfig = loadGroupsConfig();
      if (groupsConfig.groups[groupId]) {
        delete groupsConfig.groups[groupId];
        saveGroupsConfig(groupsConfig);
        console.log(`✅ Group ${groupId} removed from groups_config.json`);
      }
    } catch (error) {
      console.error(`❌ Error removing from groups_config.json:`, error.message);
    }
    
    // حذف از members.json
    try {
      const { loadMembersData, saveMembersData } = require('./7group');
      const membersData = loadMembersData();
      if (membersData.groups[groupId]) {
        delete membersData.groups[groupId];
        saveMembersData(membersData);
        console.log(`✅ Group ${groupId} removed from members.json`);
      }
    } catch (error) {
      console.error(`❌ Error removing from members.json:`, error.message);
    }
    
    // حذف از attendance.json
    try {
      const { AttendanceManager } = require('./10attendance_manager');
      const attendanceManager = new AttendanceManager(groupId);
      const attendanceData = attendanceManager.loadAttendanceData();
      if (attendanceData.groups && attendanceData.groups[groupId]) {
        delete attendanceData.groups[groupId];
        attendanceManager.saveAttendanceData(attendanceData);
        console.log(`✅ Group ${groupId} removed from attendance.json`);
      }
    } catch (error) {
      console.error(`❌ Error removing from attendance.json:`, error.message);
    }
    
    console.log(`✅ Bot successfully removed from group ${groupId}`);
    
  } catch (error) {
    console.error(`❌ Error removing bot from group ${groupId}:`, error.message);
  }
}

// تنظیم توکن بات در ماژول پرداخت
const { BOT_TOKEN } = require('./3config');
paymentModule.setBotToken(BOT_TOKEN);

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

// تابع گزارش دوره‌ای وضعیت ربات
async function reportBotStatus() {
  try {
    const { BOT_STATUS_REPORT_CONFIG, loadGroupsConfig } = require('./3config');
    
    // اگر گزارش غیرفعال است، خروج
    if (!BOT_STATUS_REPORT_CONFIG.enabled) {
      return;
    }
    
    console.log('🤖 [STATUS] ===== BOT STATUS REPORT =====');
    
    // دریافت لیست گروه‌های فعال
    const groupsConfig = loadGroupsConfig();
    const activeGroups = Object.keys(groupsConfig.groups).filter(groupId => 
      groupsConfig.groups[groupId].enabled === 1
    );
    
    console.log(`🤖 [STATUS] Active groups count: ${activeGroups.length}`);
    
    // بررسی وضعیت ربات در هر گروه
    for (const groupId of activeGroups) {
      try {
        const groupInfo = groupsConfig.groups[groupId];
        const isAdmin = await checkBotAdminStatus(groupId);
        
        if (BOT_STATUS_REPORT_CONFIG.report_level === 'basic') {
          console.log(`🤖 [STATUS] Group: ${groupInfo.name || groupId} (${groupId}) - Bot Admin: ${isAdmin ? '✅ بله' : '❌ خیر'}`);
        } else {
          // گزارش کامل
          const { getChat } = require('./4bale');
          let memberCount = 'نامشخص';
          let groupType = 'نامشخص';
          
          try {
            const chatInfo = await getChat(groupId);
            memberCount = chatInfo.member_count || 'نامشخص';
            groupType = chatInfo.type || 'نامشخص';
          } catch (error) {
            console.log(`⚠️ [STATUS] Could not get group info for ${groupId}:`, error.message);
          }
          
          console.log(`🤖 [STATUS] Group: ${groupInfo.name || groupId} (${groupId})`);
          console.log(`🤖 [STATUS] Bot Admin: ${isAdmin ? '✅ بله' : '❌ خیر'}`);
          console.log(`🤖 [STATUS] Group Members: ${memberCount}`);
          console.log(`🤖 [STATUS] Group Type: ${groupType}`);
          console.log(`🤖 [STATUS] Last Update: ${groupInfo.lastUpdate || 'نامشخص'}`);
          console.log(`🤖 [STATUS] Updated By: ${groupInfo.updatedBy || 'نامشخص'}`);
          console.log('🤖 [STATUS] ---');
        }
      } catch (error) {
        console.error(`❌ [STATUS] Error checking group ${groupId}:`, error.message);
      }
    }
    
    console.log(`🤖 [STATUS] Report Time: ${new Date().toLocaleString('fa-IR')}`);
    console.log('🤖 [STATUS] ===== END REPORT =====');
    
  } catch (error) {
    console.error('❌ [STATUS] Error in status report:', error.message);
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
    name: getRoleDisplayName('COACH'),
    emoji: '🏋️',
    panelText: getRoleDisplayName('COACH'),
    get keyboard() { return generateDynamicKeyboard(ROLES.COACH); },
    commands: ['/شروع', '/خروج', '/ربات', `/${getRoleDisplayName('COACH')}`]
  },
  [ROLES.ASSISTANT]: {
    name: getRoleDisplayName('ASSISTANT'),
    emoji: '👨‍🏫',
    panelText: getRoleDisplayName('ASSISTANT'),
    get keyboard() { return generateDynamicKeyboard(ROLES.ASSISTANT); },
    commands: ['/شروع', '/خروج', '/ربات', `/${getRoleDisplayName('ASSISTANT')}`]
  },
  [ROLES.STUDENT]: {
    name: 'قرآن آموز',
    emoji: '📖',
    panelText: 'قرآن آموز',
    get keyboard() { return generateDynamicKeyboard(ROLES.STUDENT); },
    commands: ['/شروع', '/خروج', '/ربات', '/قرآن آموز'],
    // تابع جدید برای تولید keyboard با userId
    getKeyboard: function(userId) { return generateDynamicKeyboard(ROLES.STUDENT, userId); }
  }
};

// تابع بررسی ثبت‌نام کاربر
function isUserRegistered(userId) {
  try {
    return registrationModule.isUserRegistered(userId);
  } catch (error) {
    console.error('❌ [POLLING] Error checking user registration:', error.message);
    return false;
  }
}

// تابع تولید keyboard بر اساس کانفیگ نمایش دکمه‌ها
function generateDynamicKeyboard(role, userId = null) {
  const baseKeyboard = [['شروع', 'خروج']];
  const secondRow = [];
  
  // اضافه کردن دکمه ربات بر اساس کانفیگ
  if (isButtonVisible('ROBOT_BUTTON')) {
    secondRow.push('ربات');
  }
  
  // اضافه کردن سایر دکمه‌ها بر اساس نقش
  if (role === ROLES.SCHOOL_ADMIN) {
    secondRow.push('مدیر');
    
    // اضافه کردن دکمه تنظیمات بر اساس کانفیگ
    if (MAIN_BUTTONS_CONFIG.SETTINGS === 1) {
      secondRow.push('تنظیمات');
    }
    
    // اضافه کردن دکمه ثبت اطلاعات بر اساس کانفیگ (برای مشاهده گزارشات مربیان)
    if (MAIN_BUTTONS_CONFIG.REGISTER_INFO === 1) {
      secondRow.push('ثبت اطلاعات');
    }
    
    // اضافه کردن دکمه نقش‌ها بر اساس کانفیگ
    if (isButtonVisible('ROLES_BUTTON')) {
      secondRow.push('نقش‌ها');
    }
  } else if (role === ROLES.COACH) {
    secondRow.push('مربی');
    
    // اضافه کردن دکمه ثبت اطلاعات بر اساس کانفیگ
    if (MAIN_BUTTONS_CONFIG.REGISTER_INFO === 1) {
      secondRow.push('ثبت اطلاعات');
    }
  } else if (role === ROLES.ASSISTANT) {
    secondRow.push('کمک مربی');
    
    // اضافه کردن دکمه ثبت اطلاعات بر اساس کانفیگ
    if (MAIN_BUTTONS_CONFIG.REGISTER_INFO === 1) {
      secondRow.push('ثبت اطلاعات');
    }
  } else if (role === ROLES.STUDENT) {
    // دکمه "قرآن آموز" برای همه کاربران با نقش STUDENT
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

// تابع تست کانفیگ گروه‌ها
function testGroupConfig() {
  console.log('🧪 [TEST] Testing group configuration...');
  
  try {
    // تست تغییر وضعیت گروه‌ها
    console.log('🧪 [TEST] Setting group 5668045453 to disabled (0)...');
    setGroupStatus(5668045453, false, 'test_user');
    
    console.log('🧪 [TEST] Setting group 5417069312 to enabled (1)...');
    setGroupStatus(5417069312, true, 'test_user');
    
    // تست بررسی وضعیت
    console.log('🧪 [TEST] Checking group 5668045453 status...');
    const group1Status = isGroupEnabled(5668045453);
    console.log(`🧪 [TEST] Group 5668045453 enabled: ${group1Status}`);
    
    console.log('🧪 [TEST] Checking group 5417069312 status...');
    const group2Status = isGroupEnabled(5417069312);
    console.log(`🧪 [TEST] Group 5417069312 enabled: ${group2Status}`);
    
    // نمایش تمام وضعیت‌ها
    console.log('🧪 [TEST] All groups status:');
    const allStatus = getAllGroupsStatus();
    console.log(JSON.stringify(allStatus, null, 2));
    
    console.log('✅ [TEST] Group configuration test completed successfully');
    return true;
  } catch (error) {
    console.error('❌ [TEST] Group configuration test failed:', error);
    return false;
  }
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
    const { getGroupName, GROUP_VISIBILITY_CONFIG } = require('./3config.js');
    
    for (const [groupId, members] of Object.entries(membersData.groups)) {
      if (members.length > 0) {
        try {
          const chatInfo = await getChat(groupId);
          // استفاده از نام گروه از config یا عنوان گروه از API
          const groupTitle = await getGroupName(groupId) || chatInfo.title || `گروه ${groupId}`;
          
          let shouldShowGroup = false;
          
          if (userId && isCoach(userId)) {
            // برای مربی
            if (GROUP_VISIBILITY_CONFIG.COACH_SEE_ALL_GROUPS === 1) {
              // اگر 1 باشد، همه گروه‌ها را نشان بده
              shouldShowGroup = true;
            } else {
              // اگر 0 باشد، فقط گروه‌هایی که مربی در آن‌ها ادمین است را نشان بده
              shouldShowGroup = getCurrentGroupAdminIds().includes(userId);
            }
          } else if (userId && isAssistant(userId)) {
            // برای کمک مربی
            if (GROUP_VISIBILITY_CONFIG.ASSISTANT_SEE_ALL_GROUPS === 1) {
              // اگر 1 باشد، همه گروه‌ها را نشان بده
              shouldShowGroup = true;
            } else {
              // اگر 0 باشد، فقط گروه‌هایی که کمک مربی در آن‌ها ادمین است را نشان بده
              shouldShowGroup = getCurrentGroupAdminIds().includes(userId);
            }
          } else {
            // برای مدیران و ادمین‌های گروه، همه گروه‌ها را نشان بده
            shouldShowGroup = true;
          }
          
          if (shouldShowGroup) {
            groups.push({
              id: groupId,
              title: groupTitle,
              memberCount: members.length
            });
          }
        } catch (error) {
          // اگر نتوانستیم اطلاعات گروه را دریافت کنیم، از نام گروه از config استفاده کنیم
          const groupTitle = await getGroupName(groupId) || `گروه ${groupId}`;
          
          let shouldShowGroup = false;
          
          if (userId && isCoach(userId)) {
            // برای مربی
            if (GROUP_VISIBILITY_CONFIG.COACH_SEE_ALL_GROUPS === 1) {
              shouldShowGroup = true;
            } else {
              shouldShowGroup = getCurrentGroupAdminIds().includes(userId);
            }
          } else if (userId && isAssistant(userId)) {
            // برای کمک مربی
            if (GROUP_VISIBILITY_CONFIG.ASSISTANT_SEE_ALL_GROUPS === 1) {
              shouldShowGroup = true;
            } else {
              shouldShowGroup = getCurrentGroupAdminIds().includes(userId);
            }
          } else {
            shouldShowGroup = true;
          }
          
          if (shouldShowGroup) {
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

  // 🎤 بررسی ریپلای صوتی به صوتی (اولویت بالاترین)
  if (msg.voice && msg.reply_to_message) {
    console.log('🎤 [POLLING] Voice message with reply detected, checking if voice reply to voice...');

    if (practiceManager.isVoiceReplyToVoice(msg)) {
      console.log('✅ [POLLING] Voice reply to voice confirmed, handling practice...');
      const handled = await practiceManager.handleVoiceReplyToVoice(msg);
      if (handled) {
        console.log('✅ [POLLING] Voice reply practice handled successfully');
        return; // پایان پردازش، پیام توسط practiceManager مدیریت شد
      }
    }
  }

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
        await registrationModule.handleStartCommand(msg.chat.id, msg.from.id.toString());
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
        // دستور ربات - برای همه کاربران (معرفی ساده)
        reply = `🤖 **معرفی ربات قرآنی هوشمند**

📚 **قابلیت‌های اصلی:**
• 👥 حضور و غیاب
• 📊 ارزیابی و نظر سنجی
• 🏫 مدیریت گروه‌ها
• 📝 ثبت‌نام ماهانه

🎯 **این ربات برای کمک به آموزش قرآن کریم طراحی شده است**

💡 **نکات مهم:**
• همه کاربران می‌توانند از قابلیت‌های عمومی استفاده کنند
• برای مدیریت پیشرفته، دسترسی ادمین لازم است

⏰ ${getTimeStamp()}`;
        keyboard = config.keyboard;
      } else if (msg.text === 'ثبت اطلاعات') {
        // دکمه ثبت اطلاعات - بررسی کانفیگ
        console.log(`🔍 [POLLING] ثبت اطلاعات درخواست شد. REGISTER_INFO: ${MAIN_BUTTONS_CONFIG.REGISTER_INFO}`);
        
        if (MAIN_BUTTONS_CONFIG.REGISTER_INFO !== 1) {
          console.log(`❌ [POLLING] دکمه ثبت اطلاعات غیرفعال است (REGISTER_INFO: ${MAIN_BUTTONS_CONFIG.REGISTER_INFO})`);
          reply = '❌ دکمه ثبت اطلاعات در حال حاضر غیرفعال است.';
          keyboard = config.keyboard;
        } else {
          // دکمه ثبت اطلاعات - برای مربی، کمک مربی و مدیر مدرسه
          const userRole = getUserRole(msg.from.id);
          console.log(`🔍 [POLLING] نقش کاربر: ${userRole}, ROLES.COACH: ${ROLES.COACH}, ROLES.ASSISTANT: ${ROLES.ASSISTANT}, ROLES.SCHOOL_ADMIN: ${ROLES.SCHOOL_ADMIN}`);
          console.log(`🔍 [POLLING] آیا مربی است؟ ${userRole === ROLES.COACH}`);
          console.log(`🔍 [POLLING] آیا کمک مربی است؟ ${userRole === ROLES.ASSISTANT}`);
          console.log(`🔍 [POLLING] آیا مدیر مدرسه است؟ ${userRole === ROLES.SCHOOL_ADMIN}`);
          
          if (userRole === ROLES.COACH || userRole === ROLES.ASSISTANT || userRole === ROLES.SCHOOL_ADMIN) {
            console.log(`📝 [POLLING] ثبت اطلاعات درخواست شد توسط ${userRole}`);
            console.log(`🔍 [POLLING] فراخوانی sabtManager.startReport...`);
            const result = sabtManager.startReport(msg.chat.id, msg.from.id, msg.from.first_name || 'کاربر');
            console.log(`🔍 [POLLING] نتیجه startReport:`, JSON.stringify(result, null, 2));
            
            if (result && result.text && result.keyboard) {
              console.log(`✅ [POLLING] ارسال پیام با کیبرد اینلاین...`);
              await sendMessageWithInlineKeyboard(msg.chat.id, result.text, result.keyboard);
              console.log(`✅ [POLLING] پیام ارسال شد، بازگشت از حلقه`);
              return; // ادامه حلقه بدون ارسال پیام معمولی
            } else {
              console.log(`❌ [POLLING] نتیجه startReport نامعتبر است`);
              reply = '❌ خطا در شروع ثبت اطلاعات';
              keyboard = config.keyboard;
            }
          } else {
            console.log(`❌ [POLLING] کاربر نقش مناسب ندارد: ${userRole}`);
            reply = '❌ فقط مربی، کمک مربی و مدیر مدرسه می‌توانند از ثبت اطلاعات استفاده کنند.';
            keyboard = config.keyboard;
          }
        }
      } else if (msg.text === 'تنظیمات') {
        // دکمه تنظیمات - بررسی کانفیگ
        if (MAIN_BUTTONS_CONFIG.SETTINGS !== 1) {
          console.log(`❌ [POLLING] دکمه تنظیمات غیرفعال است (SETTINGS: ${MAIN_BUTTONS_CONFIG.SETTINGS})`);
          reply = '❌ دکمه تنظیمات در حال حاضر غیرفعال است.';
          keyboard = config.keyboard;
        } else {
          // دکمه تنظیمات - برای همه کاربران
          console.log(`⚙️ [POLLING] تنظیمات درخواست شد`);
          // بررسی دسترسی کاربر برای تنظیمات - فقط مدیر مدرسه
          if (!isAdmin(msg.from.id)) {
            console.log('❌ [POLLING] User is not admin for settings command');
            reply = '⚠️ فقط مدیر مدرسه می‌تواند از تنظیمات استفاده کند.';
            keyboard = config.keyboard;
          } else {
            // نمایش پنل تنظیمات
            console.log('🔍 [POLLING] User is admin, calling handleSettingsCommand...');
            const settingsModule = new SettingsModule();
            console.log('🔍 [POLLING] SettingsModule created');
            const success = await settingsModule.handleSettingsCommand(msg.chat.id, msg.from.id);
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
        }
      } else if (msg.text === config.panelText) {
      // if (!canSendMessage(msg.chat.id, 'panel', 5000)) {
      //   return; // پیام را نادیده بگیر
      // }
      
      // بررسی نقش کاربر برای نمایش پنل مناسب
      if (isCoach(msg.from.id)) {
        // پنل مربی - استفاده از handleCoachButton از 15reg.js
        console.log(`🏋️ [POLLING] Coach panel requested, delegating to 15reg.js`);
        await registrationModule.handleCoachButton(msg);
        return; // ادامه حلقه بدون ارسال پیام معمولی
          } else if (isAssistant(msg.from.id)) {
        // پنل کمک مربی - بررسی کانفیگ مدیریت گروه‌ها
        const inlineKeyboard = [
          [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }]
        ];
        
        // اضافه کردن دکمه مدیریت گروه‌ها فقط اگر فعال باشد
        if (hasGroupManagementAccess('ASSISTANT')) {
          inlineKeyboard.push([{ text: '🏫 مدیریت گروه‌ها', callback_data: 'assistant_groups' }]);
        }
        
        const groupManagementText = hasGroupManagementAccess('ASSISTANT') 
          ? '• 🏫 مدیریت گروه‌ها (حضور و غیاب)\n' 
          : '';
        
        const { getRoleDisplayName } = require('./3config');
        reply = `👨‍🏫 پنل ${getRoleDisplayName('ASSISTANT')}

📋 گزینه‌های موجود:
• 🤖 معرفی ربات
${groupManagementText}👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
        
        await sendMessageWithInlineKeyboard(msg.chat.id, reply, inlineKeyboard);
        return; // ادامه حلقه بدون ارسال پیام معمولی
    } else if (getUserRole(msg.from.id) === ROLES.STUDENT) {
      // پنل قرآن آموز - نمایش ساده بدون Inline Keyboard
      const { getRoleDisplayName } = require('./3config');
      reply = `📖 **پنل ${getRoleDisplayName('STUDENT')}**

📋 **گزینه‌های موجود:**
• 🤖 معرفی ربات
• 📝 ثبت نام

👆 **لطفاً گزینه مورد نظر را انتخاب کنید:**
⏰ ${getTimeStamp()}`;
      keyboard = config.keyboard;
    } else {
      // پنل مدیر - بررسی کانفیگ مدیریت گروه‌ها
      const inlineKeyboard = [
        [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }]
      ];
      
      // اضافه کردن دکمه مدیریت گروه‌ها فقط اگر فعال باشد
      if (hasGroupManagementAccess('SCHOOL_ADMIN')) {
        inlineKeyboard.push([{ text: '🏫 مدیریت گروه‌ها', callback_data: 'groups' }]);
      }
      
      inlineKeyboard.push([{ text: '🏭 کارگاه‌ها', callback_data: 'kargah_management' }]);
      // اضافه کردن دکمه استادها فقط اگر فعال باشد
      if (hasOsatdManagementAccess('SCHOOL_ADMIN')) {
        inlineKeyboard.push([{ text: '👨‍🏫 استادها', callback_data: 'osatd_management' }]);
      }
      
      const groupManagementText = hasGroupManagementAccess('SCHOOL_ADMIN') 
        ? '• 🏫 مدیریت گروه‌ها (حضور و غیاب)\n' 
        : '';
      
      const osatdText = hasOsatdManagementAccess('SCHOOL_ADMIN') 
        ? '• 👨‍🏫 استادها\n' 
        : '';
      
              const { getRoleDisplayName } = require('./3config');
        reply = `🔧 پنل ${getRoleDisplayName('SCHOOL_ADMIN')}

📋 گزینه‌های موجود:
• 🤖 معرفی ربات
${groupManagementText}• 🏭 کارگاه‌ها
${osatdText}

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      await sendMessageWithInlineKeyboard(msg.chat.id, reply, inlineKeyboard);
      return; // ادامه حلقه بدون ارسال پیام معمولی
    }
  } else if (msg.text === '/g') {
    // گزارش کامل اطلاعات گروه
    await logGroupDetails(msg);
  } else if (msg.text === '/l') {
    // لیست اعضا بر اساس ID
    await listMembersByID(msg);
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
      const success = await settingsModule.handleSettingsCommand(msg.chat.id, msg.from.id);
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
    keyboard = config.getKeyboard ? config.getKeyboard(msg.from.id) : config.keyboard;
  } else if (msg.text === '/خروج') {
    reply = `👋 پنل ${config.name} بسته شد\n⏰ ${getTimeStamp()}`;
    keyboard = config.getKeyboard ? config.getKeyboard(msg.from.id) : config.keyboard;
  } else if (msg.text === 'ربات' || msg.text === '/ربات' || msg.text === '🤖 ربات') {
    // دستور معرفی ربات - برای همه کاربران
    reply = `🤖 **معرفی ربات قرآنی هوشمند**

📚 **قابلیت‌های اصلی:**
• 👥 حضور و غیاب
• 📊 ارزیابی و نظر سنجی
• 🏫 مدیریت گروه‌ها
• 📝 ثبت‌نام ماهانه

🎯 **این ربات برای کمک به آموزش قرآن کریم طراحی شده است**

💡 **نکات مهم:**
• همه کاربران می‌توانند از قابلیت‌های عمومی استفاده کنند
• برای مدیریت پیشرفته، دسترسی ادمین لازم است

⏰ ${getTimeStamp()}`;
    keyboard = config.keyboard;
  } else if (msg.text === 'قرآن آموز' || msg.text === '/قرآن آموز') {
    // دستور قرآن آموز - نمایش پنل قرآن آموز
    reply = `📖 **پنل قرآن آموز**

📋 **گزینه‌های موجود:**
• 🤖 معرفی ربات
• 📝 ثبت نام

👆 **لطفاً گزینه مورد نظر را انتخاب کنید:**
⏰ ${getTimeStamp()}`;
    keyboard = config.keyboard;

  } else if (msg.text === '/کارگاه' || msg.text === '🏭 کارگاه‌ها') {
    // دستور کارگاه‌ها - فقط برای مدیر مدرسه
    if (!isAdmin(msg.from.id)) {
      reply = '⚠️ فقط مدیر مدرسه می‌تواند از کارگاه‌ها استفاده کند.';
      keyboard = config.keyboard;
    } else {
      // نمایش پنل کارگاه‌ها
      const kargahModule = require('./12kargah');
      // متصل کردن متدهای ارسال پیام
      kargahModule.setSendMessage(sendMessage);
      kargahModule.setSendMessageWithInlineKeyboard(sendMessageWithInlineKeyboard);
      kargahModule.setEditMessageWithInlineKeyboard(require('./4bale').editMessageWithInlineKeyboard);
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
    kargahModule.setSendMessage(sendMessage);
    kargahModule.setSendMessageWithInlineKeyboard(sendMessageWithInlineKeyboard);
    kargahModule.setEditMessageWithInlineKeyboard(require('./4bale').editMessageWithInlineKeyboard);
    
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
    
    // 🔥 برای قرآن‌آموز، پیام مناسب‌تری نمایش بده
    if (role === ROLES.STUDENT) {
      reply = `📖 **قرآن‌آموز عزیز**

💡 **لطفاً از دکمه‌های منو استفاده کنید:**
• 🤖 معرفی ربات
• 📝 ثبت نام
• 🏠 بازگشت به منوی اصلی

🎯 **یا از دکمه‌های زیر استفاده کنید:**`;
      keyboard = config.keyboard;
    } else {
      reply = `❓ پیام شما قابل فهم نیست\n\nلطفاً از دکمه‌های منو استفاده کنید یا دستورات زیر را امتحان کنید:\n\n`;
      reply += config.commands.map(cmd => `• ${cmd}`).join('\n');
      keyboard = config.keyboard;
    }
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
        const pre_checkout_query = update.pre_checkout_query;
        const successful_payment = update.message?.successful_payment;
        
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
            !callback_query.data.startsWith('quran_student_') &&
            !callback_query.data.startsWith('coach_') &&
            !callback_query.data.startsWith('attendance_') &&
            !callback_query.data.startsWith('report_') &&
            !callback_query.data.startsWith('coaches_list') &&
            !callback_query.data.startsWith('back_to_coaches') &&
            !callback_query.data.startsWith('back_to_workshops') &&
            !callback_query.data.startsWith('back_to_students_') &&
            !callback_query.data.startsWith('sabt_') &&
            callback_query.data !== 'back_to_groups' &&
            callback_query.data !== 'back_to_main' &&
            callback_query.data !== 'kargah_management') {
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
              callback_query.data.startsWith('reset_') ||
              callback_query.data === 'groups' ||
              callback_query.data === 'coach_groups' ||
              callback_query.data === 'assistant_groups' ||
              callback_query.data === 'back_to_groups' ||
              callback_query.data === 'back_to_main') {
            
            // بررسی کانفیگ مدیریت گروه‌ها
            if (!isGroupManagementEnabled()) {
              console.log('❌ [POLLING] Group management is disabled by config');
              await answerCallbackQuery(callback_query.id, '⚠️ مدیریت گروه‌ها غیرفعال است', true);
              return;
            }
            
            // بررسی دسترسی کاربر
            const userRole = getUserRole(callback_query.from.id);
            if (!hasGroupManagementAccess(userRole)) {
              console.log(`❌ [POLLING] User ${callback_query.from.id} with role ${userRole} has no access to group management`);
              await answerCallbackQuery(callback_query.id, '⚠️ شما دسترسی لازم برای مدیریت گروه‌ها را ندارید', true);
              return;
            }
            
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

🌟 مدرسه‌ای معتبر با ۱۰+ سال سابقه در آموزش قرآن کریم

⏰ ${getTimeStamp()}`;
            
            const inlineKeyboard = [
              [{ text: '📝 ثبت‌نام', callback_data: 'start_registration' }],
              [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }]
            ];
            
            await sendMessageWithInlineKeyboard(callback_query.from.id, reply, inlineKeyboard);
          } else if (callback_query.data === 'start_registration') {
            
            console.log('🔄 [POLLING] Start registration callback detected');
            // پردازش شروع ثبت‌نام با استفاده از ماژول ثبت‌نام هوشمند
            const success = await registrationModule.handleRegistrationStart(callback_query.from.id, callback_query.from.id.toString());
            
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
            const success = await registrationModule.handleRegistrationStart(callback_query.from.id, callback_query.from.id.toString());
            
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
              kargahModule.setSendMessage(sendMessage);
              kargahModule.setSendMessageWithInlineKeyboard(sendMessageWithInlineKeyboard);
              kargahModule.setEditMessageWithInlineKeyboard(require('./4bale').editMessageWithInlineKeyboard);
              const success = await kargahModule.handleKargahCommand(callback_query.message.chat.id, callback_query.from.id);
              
              if (!success) {
                const config = roleConfig[role];
                const reply = '❌ خطا در نمایش منوی کارگاه‌ها';
                await safeSendMessage(callback_query.from.id, reply, config.keyboard);
              }
            }
          } else if (callback_query.data === 'osatd_management') {
            
            console.log('🔄 [POLLING] Osatd management callback detected');
            
            // بررسی کانفیگ - آیا مدیریت استادها فعال است؟
            if (!isOsatdManagementEnabled()) {
              const config = roleConfig[role];
              const reply = '⚠️ مدیریت استادها در حال حاضر غیرفعال است.';
              await safeSendMessage(callback_query.from.id, reply, config.keyboard);
              return;
            }
            
            // بررسی دسترسی کاربر
            if (!hasOsatdManagementAccess('SCHOOL_ADMIN')) {
              const config = roleConfig[role];
              const reply = '⚠️ شما دسترسی لازم برای مدیریت استادها را ندارید.';
              await safeSendMessage(callback_query.from.id, reply, config.keyboard);
              return;
            }
            
            // نمایش منوی استادها با استفاده از ماژول استادها
            const osatdModule = require('./10osatd');
            const result = await osatdModule.handleCoachesCallback({
              ...callback_query,
              data: 'coaches_list' // تغییر callback data به coaches_list برای سازگاری
            });
            
            if (result && result.keyboard) {
              await sendMessageWithInlineKeyboard(callback_query.message.chat.id, result.text, result.keyboard);
            } else {
              const config = roleConfig[role];
              const reply = '❌ خطا در نمایش منوی استادها';
              await safeSendMessage(callback_query.from.id, reply, config.keyboard);
            }
          } else if ((callback_query.data.startsWith('practice_') && !callback_query.data.includes('_days_settings') && !callback_query.data.includes('_hours_settings')) || 
                     (callback_query.data.startsWith('evaluation_') && !callback_query.data.includes('_days_settings')) || 
                     callback_query.data.startsWith('satisfaction_')) {
            // پردازش callback های تمرین، ارزیابی و نظرسنجی (به جز تنظیمات روزها)
            console.log(`🎯 [POLLING] Practice/Evaluation/Satisfaction callback detected: ${callback_query.data}`);
            
            // بررسی نقش کاربر برای callback های ارزیابی
            if (callback_query.data.startsWith('evaluate_')) {
              const userRole = getUserRole(callback_query.from.id);
              console.log(`🔍 [POLLING] Evaluation callback by user ${callback_query.from.id} with role: ${userRole}`);
              
              // فقط مربیان و کمک مربیان می‌توانند ارزیابی کنند
              if (!['COACH', 'ASSISTANT', 'teacher', 'assistant_teacher'].includes(userRole)) {
                console.log(`❌ [POLLING] User ${callback_query.from.id} (${userRole}) attempted to evaluate but is not authorized`);
                await answerCallbackQuery(callback_query.id, '⚠️ فقط مربیان و کمک مربیان می‌توانند ارزیابی کنند', true);
                
                // ارسال گزارش به گروه ادمین
                try {
                  const { REPORT_GROUP_ID } = require('./6mid');
                  const reportText = `🚨 **هشدار امنیتی!**\n\n` +
                    `👤 کاربر: ${callback_query.from.first_name} ${callback_query.from.last_name || ''}\n` +
                    `🆔 شناسه: ${callback_query.from.id}\n` +
                    `📊 نقش: ${userRole}\n` +
                    `⚠️ اقدام: تلاش برای ارزیابی تمرین\n` +
                    `📅 تاریخ: ${new Date().toLocaleString('fa-IR')}\n\n` +
                    `🔒 این کاربر مجاز به ارزیابی نیست!`;
                  
                  await sendMessage(REPORT_GROUP_ID, reportText);
                  console.log('📤 گزارش امنیتی به گروه ادمین ارسال شد');
                } catch (error) {
                  console.error('❌ [POLLING] Error sending security report:', error.message);
                }
                
                continue;
              }
              
              console.log(`✅ [POLLING] User ${callback_query.from.id} (${userRole}) is authorized to evaluate`);
            }
            
            // متصل کردن متدهای ارسال پیام به ماژول ارزیابی
            arzyabiModule.setSendMessage(sendMessage);
            arzyabiModule.setSendMessageWithInlineKeyboard(sendMessageWithInlineKeyboard);
            arzyabiModule.setEditMessageWithInlineKeyboard(require('./4bale').editMessageWithInlineKeyboard);
            
            let success = false;
            
            // تشخیص نوع callback
            if (callback_query.data.startsWith('satisfaction_')) {
              // نظرسنجی
              success = await arzyabiModule.handleSatisfactionCallback(
                callback_query.data, 
                callback_query.from.id, 
                callback_query.from.first_name + (callback_query.from.last_name ? ' ' + callback_query.from.last_name : '')
              );
            } else if (callback_query.data.startsWith('evaluate_')) {
              // ارزیابی - با بررسی نقش
              const userRole = getUserRole(callback_query.from.id);
              success = await arzyabiModule.processEvaluationCallback(
                callback_query.data, 
                callback_query.from.id, 
                callback_query.from.first_name + (callback_query.from.last_name ? ' ' + callback_query.from.last_name : ''),
                userRole
              );
            } else {
              // تمرین
              success = await arzyabiModule.handleEvaluationCallback(
                callback_query.data, 
                callback_query.from.id, 
                callback_query.from.first_name + (callback_query.from.last_name ? ' ' + callback_query.from.last_name : '')
              );
            }
            
            if (!success) {
              console.error('❌ [POLLING] Error handling practice/evaluation/satisfaction callback');
              console.error(`❌ [POLLING] Callback failed for data: ${callback_query.data}`);
            } else {
              console.log('✅ [POLLING] Practice/Evaluation/Satisfaction callback handled successfully');
            }
          } else if (callback_query.data.startsWith('settings_') ||
                     callback_query.data.startsWith('toggle_') ||
                     callback_query.data.startsWith('select_') ||
                     callback_query.data === 'practice_evaluation_days_settings' ||
                     callback_query.data === 'practice_days_settings' ||
                     callback_query.data === 'practice_hours_settings' ||
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
          } else if (callback_query.data.startsWith('kargah_')) {
            console.log('🔄 [POLLING] Kargah callback detected');
            console.log(`🔄 [POLLING] Kargah callback data: ${callback_query.data}`);
            // پردازش callback های کارگاه‌ها
            const kargahModule = require('./12kargah');
            // متصل کردن متدهای ارسال پیام
            kargahModule.setSendMessage(sendMessage);
            kargahModule.setSendMessageWithInlineKeyboard(sendMessageWithInlineKeyboard);
            kargahModule.setEditMessageWithInlineKeyboard(require('./4bale').editMessageWithInlineKeyboard);
            const success = await kargahModule.handleCallback(callback_query);
            
            if (!success) {
              console.error('❌ [POLLING] Error handling kargah callback');
              console.error(`❌ [POLLING] Kargah callback failed for data: ${callback_query.data}`);
            } else {
              console.log('✅ [POLLING] Kargah callback handled successfully');
            }
          } else if (callback_query.data.startsWith('sabt_')) {
            console.log('📝 [POLLING] Sabt callback detected');
            console.log(`📝 [POLLING] Sabt callback data: ${callback_query.data}`);
            // پردازش callback های ثبت اطلاعات
            const result = sabtManager.handleAnswer(callback_query.message.chat.id, callback_query.data);
            
            if (result && result.text) {
              await sendMessageWithInlineKeyboard(callback_query.message.chat.id, result.text, result.keyboard || []);
              console.log('✅ [POLLING] Sabt callback handled successfully');
            } else {
              console.error('❌ [POLLING] Error handling sabt callback');
              console.error(`❌ [POLLING] Sabt callback failed for data: ${callback_query.data}`);
            }
          } else if (callback_query.data === 'cancel_report' || 
                     callback_query.data === 'edit_report' ||
                     callback_query.data.startsWith('answer_') ||
                     callback_query.data.startsWith('satisfaction_') ||
                     callback_query.data === 'confirm_report') {
            console.log('📝 [POLLING] Sabt inline keyboard callback detected');
            console.log(`📝 [POLLING] Sabt callback data: ${callback_query.data}`);
            // پردازش callback های کیبرد اینلاین ثبت اطلاعات
            const result = sabtManager.handleCallback(callback_query.message.chat.id, callback_query.data);
            
            if (result && result.text) {
              if (result.keyboard) {
                // اگر کیبرد دارد، پیام جدید ارسال کن
                await sendMessageWithInlineKeyboard(callback_query.message.chat.id, result.text, result.keyboard);
              } else {
                // اگر فقط متن دارد، پیام را ویرایش کن
                await editMessageWithInlineKeyboard(
                  callback_query.message.chat.id,
                  callback_query.message.message_id,
                  result.text
                );
              }
              console.log('✅ [POLLING] Sabt inline keyboard callback handled successfully');
            } else {
              console.error('❌ [POLLING] Error handling sabt inline keyboard callback');
              console.error(`❌ [POLLING] Sabt callback failed for data: ${callback_query.data}`);
            }
          } else if (callback_query.data.startsWith('coach_') || 
                     callback_query.data.startsWith('attendance_') || 
                     callback_query.data.startsWith('attendance_all_') ||
                     callback_query.data.startsWith('report_') || 
                     callback_query.data.startsWith('student_') ||
                     callback_query.data === 'coaches_list' ||
                     callback_query.data === 'back_to_coaches' ||
                     callback_query.data === 'back_to_workshops' ||
                     callback_query.data.startsWith('back_to_students_')) {
            console.log('🔄 [POLLING] Coaches callback detected');
            console.log(`🔄 [POLLING] Coaches callback data: ${callback_query.data}`);
            // پردازش callback های استادها و حضور و غیاب
            const osatdModule = require('./10osatd');
            const result = await osatdModule.handleCoachesCallback(callback_query);
            
            if (result) {
              // پاسخ به callback query برای حذف spinner
              await answerCallbackQuery(callback_query.id);
              
              if (result.edit_message) {
                // اگر edit_message = true، پیام قبلی را ویرایش کن
                if (result.keyboard) {
                  await editMessageWithInlineKeyboard(
                    callback_query.message.chat.id,
                    callback_query.message.message_id,
                    result.text,
                    result.keyboard
                  );
                } else {
                  await editMessageWithInlineKeyboard(
                    callback_query.message.chat.id,
                    callback_query.message.message_id,
                    result.text
                  );
                }
              } else if (result.keyboard) {
                // اگر کیبرد دارد، پیام جدید ارسال کن
                await sendMessageWithInlineKeyboard(callback_query.message.chat.id, result.text, result.keyboard);
              } else {
                // اگر فقط متن دارد، پیام را ویرایش کن
                await editMessageWithInlineKeyboard(
                  callback_query.message.chat.id,
                  callback_query.message.message_id,
                  result.text
                );
              }
              console.log('✅ [POLLING] Coaches callback handled successfully');
            } else {
              console.error('❌ [POLLING] Error handling coaches callback');
              console.error(`❌ [POLLING] Coaches callback failed for data: ${callback_query.data}`);
            }
          } else if (callback_query.data.startsWith('start_registration') || 
                     callback_query.data.startsWith('edit_') || 
                     callback_query.data.startsWith('final_confirm') || 
                     callback_query.data.startsWith('quran_student_panel') || 
                     callback_query.data.startsWith('complete_registration') ||
                     callback_query.data.startsWith('quran_student_') ||
                     callback_query.data.startsWith('payment_confirm_') ||
                     callback_query.data.startsWith('pay_workshop_') ||
                     callback_query.data === 'school_intro' ||
                     callback_query.data === 'intro_quran_bot' ||
                     callback_query.data === 'next_month_registration' ||
                     callback_query.data === 'start_next_month_registration' ||
                     callback_query.data === 'back_to_main' ||
                     callback_query.data === 'manage_assistant' ||
                     callback_query.data === 'coach_groups' ||
                     callback_query.data.startsWith('assistant_')) {
            console.log('🔄 [POLLING] Registration callback detected');
            console.log(`🔄 [POLLING] Registration callback data: ${callback_query.data}`);
            // پردازش callback های ثبت‌نام و مدیریت کمک مربی
            const success = await registrationModule.handleCallback(callback_query);
            
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
        
        // پردازش PreCheckoutQuery (پیش از پرداخت)
        if (pre_checkout_query) {
          console.log('💰 [POLLING] PreCheckoutQuery detected');
          try {
            const success = await paymentModule.handlePreCheckoutQuery(pre_checkout_query);
            if (success) {
              console.log('✅ [POLLING] PreCheckoutQuery handled successfully');
            } else {
              console.error('❌ [POLLING] PreCheckoutQuery handling failed');
            }
          } catch (error) {
            console.error('❌ [POLLING] Error handling PreCheckoutQuery:', error);
          }
          continue;
        }
        
        // پردازش پرداخت موفق
        if (successful_payment) {
          console.log('💸 [POLLING] Successful payment detected');
          try {
            const success = await paymentModule.handleSuccessfulPayment(msg);
            if (success) {
              console.log('✅ [POLLING] Successful payment handled successfully');
            } else {
              console.error('❌ [POLLING] Successful payment handling failed');
            }
          } catch (error) {
            console.error('❌ [POLLING] Error handling successful payment:', error);
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
              // گزارش هوشمند ورود ربات
              await reportBotJoinToGroup(msg.chat);
            } else {
              // اگر کاربر جدید وارد گروه شد
              await autoCollectNewMember(msg);
            }
            continue;
          }
          
          if (msg.left_chat_member) {
            // اگر ربات از گروه خارج شد
            if (msg.left_chat_member.id === parseInt(BOT_TOKEN.split(':')[0])) {
              console.log(`🤖 Bot left group ${msg.chat.id} (${msg.chat.title})`);
              await removeBotFromGroup(msg.chat.id);
            } else {
              // اگر کاربر عادی از گروه خارج شد
              await removeMember(msg.chat.id, msg.left_chat_member.id);
            }
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
              // استفاده از ماژول ارزیابی برای نمایش لیست تمرین‌ها
              const success = await arzyabiModule.handleListCommand(msg.chat.id, msg.chat.title);
              if (!success) {
                // اگر ماژول ارزیابی کار نکرد، از روش قدیمی استفاده کن
                await reportGroupMembers(msg.chat.id, msg.chat.title);
                await checkAndUpdateMembersList(msg.chat.id, msg.chat.title);
              }
              continue;
            }
            if (msg.text === '/عضو') {
              const { getRoleDisplayName } = require('./3config');
        await sendMessage(msg.chat.id, `⚠️ این دستور برای ${getRoleDisplayName('STUDENT')}ان است. ادمین‌ها و ${getRoleDisplayName('COACH')}ها نیازی به /عضو ندارند.`);
              continue;
            }
            if (msg.text === '/جمع‌آوری') {
              await handleAutoCollectCommand(msg);
              continue;
            }
            if (msg.text === '/عضو-جدید') {
              await handleNewMemberCommand(msg);
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
          
          // 🎯 پردازش پیام‌های تمرین (صوتی با کپشن تمرین)
          if (arzyabiModule.isPracticeSubmission(msg)) {
            console.log(`🎯 [POLLING] Practice message detected in group ${msg.chat.title}`);
            
            // دریافت نقش کاربر
            const userRole = getUserRole(msg.from.id);
            const userData = {
              user_type: userRole,
              full_name: msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : ''),
              first_name: msg.from.first_name,
              last_name: msg.from.last_name || '',
              username: msg.from.username || ''
            };
            
            const result = await arzyabiModule.processPracticeMessage(msg, userData);
            if (result && result.success) {
              console.log('✅ [POLLING] Practice message handled successfully');
              // ارسال پیام پاسخ به کاربر
              await sendMessage(msg.chat.id, result.message);
              
              // اگر کیبورد ارزیابی وجود دارد، آن را ارسال کن
              if (result.keyboard) {
                await sendMessageWithInlineKeyboard(msg.chat.id, result.keyboard.text, result.keyboard.keyboard);
              }
            } else {
              console.error('❌ [POLLING] Failed to handle practice message');
              if (result && result.message) {
                await sendMessage(msg.chat.id, result.message);
              }
            }
            continue;
          }
          
          // 🔄 جمع‌آوری خودکار اطلاعات کاربران از پیام‌های گروهی
          await autoCollectUserInfo(msg);
          
          // دستورات غیرمجاز برای اعضا
          if (msg.text === '/ربات' || msg.text === '/لیست') {
            const { getRoleDisplayName } = require('./3config');
        await sendMessage(msg.chat.id, `⚠️ این دستورات فقط برای ادمین‌ها و ${getRoleDisplayName('COACH')}ها است.`);
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
          
          // 🔥 اولویت 1: بررسی دستورات شروع برای قرآن‌آموز
          if (userRole === ROLES.STUDENT && 
              (msg.text === '/start' || msg.text === 'شروع' || msg.text === '/شروع' || msg.text === 'استارت')) {
            console.log(`🚀 [POLLING] Start command detected for student, using registration module`);
            const success = await registrationModule.handleStartCommand(msg.chat.id, msg.from.id.toString());
            if (success) {
              console.log('✅ [POLLING] Start command processed successfully by registration module');
              continue;
            }
          }
          
          // 🔥 اولویت 2: بررسی پیام‌های عادی برای قرآن‌آموز
          if (userRole === ROLES.STUDENT && msg.text) {
            console.log(`📝 [POLLING] Text message detected for student, using registration module`);
            // ساخت ctx مصنوعی برای compatibility با registrationModule
            const artificialCtx = {
              from: { id: msg.from.id, first_name: msg.from.first_name || 'کاربر' },
              chat: { id: msg.chat.id },
              text: msg.text,
              contact: msg.contact || null
            };
            const success = await registrationModule.handleMessage(artificialCtx);
            if (success) {
              console.log('✅ [POLLING] Message processed successfully by registration module');
              continue;
            }
          }
          
          // 🔥 اولویت 2: بررسی contact برای قرآن‌آموز
          if (msg.contact && userRole === ROLES.STUDENT) {
            console.log(`📱 [POLLING] Contact detected for student, processing with registration module`);
            const success = await registrationModule.handleStartCommand(msg.chat.id, msg.from.id.toString(), msg.contact);
            if (success) {
              console.log('✅ [POLLING] Contact processed successfully by registration module');
              continue;
            }
          }
          
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
            // ساخت ctx مصنوعی برای compatibility با registrationModule
            const artificialCtx = {
              from: { id: msg.from.id, first_name: msg.from.first_name || 'کاربر' },
              chat: { id: msg.chat.id },
              text: msg.text,
              contact: msg.contact || null
            };
            const success = await registrationModule.handleMessage(artificialCtx);
            
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
  
  // راه‌اندازی تایمر دوره‌ای برای گزارش وضعیت ربات
  startStatusReportTimer();
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
        // پنل مربی - بررسی کانفیگ مدیریت گروه‌ها
        const inlineKeyboard = [
          [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }]
        ];
        
        // اضافه کردن دکمه مدیریت گروه‌ها فقط اگر فعال باشد
        if (hasGroupManagementAccess('COACH')) {
          inlineKeyboard.push([{ text: '🏫 مدیریت گروه‌ها', callback_data: 'groups' }]);
        }
        
        const groupManagementText = hasGroupManagementAccess('COACH') 
          ? '• 🏫 مدیریت گروه‌ها (حضور و غیاب)\n' 
          : '';
        
        const reply = `👨‍🏫 پنل مربی

📋 گزینه‌های موجود:
• 🤖 معرفی ربات
${groupManagementText}👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
        
        await sendMessageWithInlineKeyboard(chatId, reply, inlineKeyboard);
      } else if (isAssistant(userId)) {
        // پنل کمک مربی - بررسی کانفیگ مدیریت گروه‌ها
        const inlineKeyboard = [
          [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }]
        ];
        
        // اضافه کردن دکمه مدیریت گروه‌ها فقط اگر فعال باشد
        if (hasGroupManagementAccess('ASSISTANT')) {
          inlineKeyboard.push([{ text: '🏫 مدیریت گروه‌ها', callback_data: 'groups' }]);
        }
        
        const groupManagementText = hasGroupManagementAccess('ASSISTANT') 
          ? '• 🏫 مدیریت گروه‌ها (حضور و غیاب)\n' 
          : '';
        
        const reply = `👨‍🏫 پنل کمک مربی

📋 گزینه‌های موجود:
• 🤖 معرفی ربات
${groupManagementText}👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
        
        await sendMessageWithInlineKeyboard(chatId, reply, inlineKeyboard);
      } else {
        // پنل مدیر - بررسی کانفیگ مدیریت گروه‌ها
        const inlineKeyboard = [
          [{ text: '🤖 معرفی ربات', callback_data: 'intro_quran_bot' }]
        ];
        
        // اضافه کردن دکمه مدیریت گروه‌ها فقط اگر فعال باشد
        if (hasGroupManagementAccess('SCHOOL_ADMIN')) {
          inlineKeyboard.push([{ text: '🏫 مدیریت گروه‌ها', callback_data: 'groups' }]);
        }
        
        inlineKeyboard.push([{ text: '🏭 کارگاه‌ها', callback_data: 'kargah_management' }]);
        // اضافه کردن دکمه استادها فقط اگر فعال باشد
        if (hasOsatdManagementAccess('SCHOOL_ADMIN')) {
          inlineKeyboard.push([{ text: '👨‍🏫 استادها', callback_data: 'osatd_management' }]);
        }
        
        const groupManagementText = hasGroupManagementAccess('SCHOOL_ADMIN') 
          ? '• 🏫 مدیریت گروه‌ها (حضور و غیاب)\n' 
          : '';
        
        const osatdText = hasOsatdManagementAccess('SCHOOL_ADMIN') 
          ? '• 👨‍🏫 استادها\n' 
          : '';
        
        const reply = `🔧 پنل مدیر مدرسه

📋 گزینه‌های موجود:
• 🤖 معرفی ربات
${groupManagementText}• 🏭 کارگاه‌ها
${osatdText}

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
        // به جای نمایش صفحه "وضعیت به‌روزرسانی شد"، مستقیماً صفحه مدیریت گروه را نمایش می‌دهیم
        const membersData = loadMembersData();
        const members = membersData.groups[groupId] || [];
        
        // تنظیم کاربران در ماژول حضور و غیاب
        attendanceManager.setUsers(members.map(m => m.id), groupId);
        
        // ایجاد کیبورد حضور و غیاب با وضعیت جدید
        const keyboard = createAttendanceKeyboard(groupId, members);
        
        // دریافت نام واقعی گروه
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
      
      // به جای رفتن به صفحه جدید، همان صفحه را با وضعیت جدید نمایش می‌دهیم
      const keyboard = createAttendanceKeyboard(groupId, members);
      const text = `👥 مدیریت حضور و غیاب

📛 گروه: ${groupId}
👥 تعداد اعضا: ${members.length}

📋 لیست قرآن آموزان:
${members.map((member, index) => `${index + 1}. ${member.name}`).join('\n')}

👆 لطفاً عضو مورد نظر را انتخاب کنید یا عملیات گروهی را انجام دهید:
⏰ ${getTimeStamp()}`;
      
      await sendMessageWithInlineKeyboard(chatId, text, keyboard);
      
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
    } else if (action.startsWith('kargah_')) {
      // پردازش callback های کارگاه‌ها
      const kargahModule = require('./12kargah');
      // متصل کردن متدهای ارسال پیام
      kargahModule.setSendMessage(sendMessage);
      kargahModule.setSendMessageWithInlineKeyboard(sendMessageWithInlineKeyboard);
      kargahModule.setEditMessageWithInlineKeyboard(require('./4bale').editMessageWithInlineKeyboard);
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

// راه‌اندازی تایمر دوره‌ای برای گزارش وضعیت ربات
let statusReportTimer = null;

function startStatusReportTimer() {
  try {
    const { BOT_STATUS_REPORT_CONFIG } = require('./3config');
    
    if (!BOT_STATUS_REPORT_CONFIG.enabled) {
      console.log('🤖 [STATUS] Status report timer is disabled');
      return;
    }
    
    const intervalMs = BOT_STATUS_REPORT_CONFIG.interval_seconds * 1000;
    console.log(`🤖 [STATUS] Starting status report timer every ${BOT_STATUS_REPORT_CONFIG.interval_seconds} seconds (${intervalMs}ms)`);
    
    statusReportTimer = setInterval(async () => {
      await reportBotStatus();
    }, intervalMs);
    
    console.log('🤖 [STATUS] Status report timer started successfully');
    
  } catch (error) {
    console.error('❌ [STATUS] Error starting status report timer:', error.message);
  }
}

function stopStatusReportTimer() {
  if (statusReportTimer) {
    clearInterval(statusReportTimer);
    statusReportTimer = null;
    console.log('🤖 [STATUS] Status report timer stopped');
  }
}

// تابع گزارش کامل اطلاعات گروه
async function logGroupDetails(msg) {
  try {
    console.log('🔍 [/g] ===== /g COMMAND DETECTED =====');
    console.log(`🔍 [/g] Full message object:`, JSON.stringify(msg, null, 2));
    console.log(`🔍 [/g] User ID: ${msg.from.id}`);
    console.log(`🔍 [/g] User Name: ${msg.from.first_name} ${msg.from.last_name || ''}`);
    console.log(`🔍 [/g] Username: @${msg.from.username || 'بدون یوزرنیم'}`);
    console.log(`🔍 [/g] Chat ID: ${msg.chat.id}`);
    console.log(`🔍 [/g] Chat Type: ${msg.chat.type}`);
    
    // دریافت اطلاعات کامل گروه
    try {
      console.log(`🔍 [/g] Calling getChat(${msg.chat.id})...`);
      const chatInfo = await getChat(msg.chat.id);
      console.log(`🔍 [/g] Group Title: ${chatInfo.title || 'نامشخص'}`);
      console.log(`🔍 [/g] Group Username: @${chatInfo.username || 'بدون یوزرنیم'}`);
      console.log(`🔍 [/g] Group Invite Link: ${chatInfo.invite_link || 'بدون لینک'}`);
      console.log(`🔍 [/g] Group Description: ${chatInfo.description || 'بدون توضیحات'}`);
      console.log(`🔍 [/g] Group Member Count: ${chatInfo.member_count || 'نامشخص'}`);
      console.log(`🔍 [/g] Group Slow Mode: ${chatInfo.slow_mode_delay || 'غیرفعال'}`);
      console.log(`🔍 [/g] Group Join By Link: ${chatInfo.join_by_link || false}`);
      console.log(`🔍 [/g] Group Join Date: ${chatInfo.date ? new Date(chatInfo.date * 1000).toLocaleString('fa-IR') : 'نامشخص'}`);
      console.log(`🔍 [/g] Full Chat Object:`, JSON.stringify(chatInfo, null, 2));
    } catch (error) {
      console.log(`⚠️ [/g] Could not get group info:`, error.message);
      console.log(`⚠️ [/g] Error details:`, error);
    }
    
    // دریافت اطلاعات کاربر در گروه
    try {
      console.log(`🔍 [/g] Calling getChatMember(${msg.chat.id}, ${msg.from.id})...`);
      const { getChatMember } = require('./4bale');
      const memberInfo = await getChatMember(msg.chat.id, msg.from.id);
      console.log(`🔍 [/g] User Status: ${memberInfo.status}`);
      console.log(`🔍 [/g] User Permissions:`, JSON.stringify(memberInfo, null, 2));
      
      // بررسی اجازه‌های کاربر
      if (memberInfo.status === 'administrator' || memberInfo.status === 'creator') {
        console.log(`🔍 [/g] User is admin with permissions:`);
        if (memberInfo.can_manage_chat) console.log(`  - تغییر اطلاعات: بله`);
        if (memberInfo.can_delete_messages) console.log(`  - حذف پیام: بله`);
        if (memberInfo.can_manage_video_chats) console.log(`  - مدیریت ویدیو چت: بله`);
        if (memberInfo.can_restrict_members) console.log(`  - محدود کردن اعضا: بله`);
        if (memberInfo.can_promote_members) console.log(`  - ارتقا اعضا: بله`);
        if (memberInfo.can_change_info) console.log(`  - تغییر اطلاعات: بله`);
        if (memberInfo.can_invite_users) console.log(`  - دعوت کاربران: بله`);
        if (memberInfo.can_pin_messages) console.log(`  - پین کردن پیام: بله`);
        if (memberInfo.can_manage_topics) console.log(`  - مدیریت موضوعات: بله`);
      }
    } catch (error) {
      console.log(`⚠️ [/g] Could not get user member info:`, error.message);
      console.log(`⚠️ [/g] Error details:`, error);
    }
    
    // دریافت لیست ادمین‌ها
    try {
      console.log(`🔍 [/g] Calling getChatAdministrators(${msg.chat.id})...`);
      const { getChatAdministrators } = require('./4bale');
      const admins = await getChatAdministrators(msg.chat.id);
      console.log(`🔍 [/g] Group Administrators (${admins.length}):`);
      admins.forEach((admin, index) => {
        const adminUser = admin.user;
        const adminName = adminUser.first_name + (adminUser.last_name ? ' ' + adminUser.last_name : '');
        console.log(`  ${index + 1}. ${adminName} (@${adminUser.username || 'بدون یوزرنیم'}) - Status: ${admin.status}`);
        if (admin.status === 'administrator') {
          console.log(`    Permissions:`, JSON.stringify(admin, null, 2));
        }
      });
    } catch (error) {
      console.log(`⚠️ [/g] Could not get administrators list:`, error.message);
      console.log(`⚠️ [/g] Error details:`, error);
    }
    
    console.log(`🔍 [/g] Report Time: ${new Date().toLocaleString('fa-IR')}`);
    console.log('🔍 [/g] ===== END /g REPORT =====');
    
  } catch (error) {
    console.error('❌ [/g] Error in logGroupDetails:', error.message);
  }
}

// تابع لیست اعضا بر اساس ID
async function listMembersByID(msg) {
  try {
    console.log('👥 [/l] ===== /l COMMAND DETECTED =====');
    console.log(`👥 [/l] Chat ID: ${msg.chat.id}`);
    console.log(`👥 [/l] Chat Type: ${msg.chat.type}`);
    
    // بررسی اینکه آیا در گروه هستیم
    if (msg.chat.type === 'private') {
      console.log('⚠️ [/l] Command used in private chat, not in group');
      return;
    }
    
    // دریافت نام گروه
    let groupTitle = 'نامشخص';
    try {
      const chatInfo = await getChat(msg.chat.id);
      groupTitle = chatInfo.title || 'نامشخص';
      console.log(`👥 [/l] Group Title: ${groupTitle}`);
    } catch (error) {
      console.log(`⚠️ [/l] Could not get group info:`, error.message);
    }
    
    // دریافت لیست ادمین‌ها
    let admins = [];
    try {
      const { getChatAdministrators } = require('./4bale');
      admins = await getChatAdministrators(msg.chat.id);
      console.log(`👥 [/l] Found ${admins.length} administrators`);
    } catch (error) {
      console.log(`⚠️ [/l] Could not get administrators:`, error.message);
    }
    
    // دریافت لیست اعضای ذخیره شده
    const { loadMembersData } = require('./7group');
    const membersData = loadMembersData();
    const groupMembers = membersData.groups[msg.chat.id] || [];
    console.log(`👥 [/l] Found ${groupMembers.length} stored members`);
    
    // ساخت گزارش
    let report = `📋 لیست اعضای گروه: ${groupTitle}\n\n`;
    
    // ادمین‌ها
    if (admins.length > 0) {
      report += `👑 ادمین‌ها (${admins.length}):\n`;
      admins.forEach((admin, index) => {
        const adminUser = admin.user;
        const adminName = adminUser.first_name + (adminUser.last_name ? ' ' + adminUser.last_name : '');
        report += `${index + 1}. ${adminName} (ID: ${adminUser.id})\n`;
        if (adminUser.username) {
          report += `   @${adminUser.username}\n`;
        }
        report += `   Status: ${admin.status}\n\n`;
      });
    }
    
    // اعضای عادی
    if (groupMembers.length > 0) {
      report += `👥 اعضای عادی (${groupMembers.length}):\n`;
      groupMembers.forEach((member, index) => {
        report += `${index + 1}. ${member.name} (ID: ${member.id})\n`;
        if (member.username) {
          report += `   @${member.username}\n`;
        }
        report += `   Join Date: ${member.joinDate || 'نامشخص'}\n\n`;
      });
    }
    
    // آمار کلی
    const totalMembers = admins.length + groupMembers.length;
    report += `📊 آمار کلی:\n`;
    report += `👑 ادمین: ${admins.length}\n`;
    report += `👥 عضو: ${groupMembers.length}\n`;
    report += `📊 کل: ${totalMembers}\n\n`;
    report += `⏰ ${new Date().toLocaleString('fa-IR')}`;
    
    // ارسال گزارش
    console.log(`📤 [/l] Sending members list report`);
    await sendMessage(msg.chat.id, report);
    console.log(`✅ [/l] Members list report sent successfully`);
    
    // ارسال به گروه گزارش (اگر فعال باشد)
    try {
      const { getReportsEnabled } = require('./3config');
      if (getReportsEnabled()) {
        const reportText = `📋 دستور /l در گروه ${groupTitle} اجرا شد\n👤 توسط: ${msg.from.first_name} ${msg.from.last_name || ''}\n⏰ ${new Date().toLocaleString('fa-IR')}`;
        await sendMessage(REPORT_GROUP_ID, reportText);
        console.log(`📤 [/l] Report sent to report group`);
      }
    } catch (error) {
      console.log(`⚠️ [/l] Could not send report to report group:`, error.message);
    }
    
    console.log('👥 [/l] ===== END /l REPORT =====');
    
  } catch (error) {
    console.error('❌ [/l] Error in listMembersByID:', error.message);
    // ارسال پیام خطا به کاربر
    try {
      await sendMessage(msg.chat.id, '❌ خطا در دریافت لیست اعضا. لطفاً دوباره تلاش کنید.');
    } catch (sendError) {
      console.error('❌ [/l] Could not send error message:', sendError.message);
    }
  }
}

// تابع مدیریت دستور جمع‌آوری خودکار
async function handleAutoCollectCommand(msg) {
  try {
    console.log(`🔧 [AUTO-COLLECT] Auto-collect command detected from ${msg.from.first_name}`);
    
    const { AUTO_COLLECT_USER_CONFIG } = require('./3config');
    
    let statusText = `🔧 **وضعیت جمع‌آوری خودکار**\n\n`;
    statusText += `📊 **وضعیت فعلی:** ${AUTO_COLLECT_USER_CONFIG.enabled ? '✅ فعال' : '❌ غیرفعال'}\n`;
    statusText += `📝 **جمع‌آوری از:** ${AUTO_COLLECT_USER_CONFIG.collect_from_all_messages ? 'همه پیام‌ها' : 'فقط پیام‌های متنی'}\n`;
    statusText += `🔄 **به‌روزرسانی کاربران موجود:** ${AUTO_COLLECT_USER_CONFIG.update_existing_users ? '✅ فعال' : '❌ غیرفعال'}\n\n`;
    
    // آمار کاربران جمع‌آوری شده
    try {
      const { loadMembersData } = require('./7group');
      const membersData = loadMembersData();
      const groupMembers = membersData.groups[msg.chat.id] || [];
      const autoCollectedMembers = groupMembers.filter(member => member.autoCollected);
      
      statusText += `📈 **آمار گروه:**\n`;
      statusText += `👥 کل اعضا: ${groupMembers.length}\n`;
      statusText += `🤖 جمع‌آوری خودکار: ${autoCollectedMembers.length}\n`;
      statusText += `📅 آخرین به‌روزرسانی: ${autoCollectedMembers.length > 0 ? new Date(autoCollectedMembers[0].lastMessageDate || autoCollectedMembers[0].joinDate).toLocaleString('fa-IR') : 'نامشخص'}\n\n`;
    } catch (error) {
      statusText += `⚠️ خطا در دریافت آمار: ${error.message}\n\n`;
    }
    
    statusText += `💡 **راهنما:**\n`;
    statusText += `• برای تغییر تنظیمات، فایل 3config.js را ویرایش کنید\n`;
    statusText += `• کانفیگ: AUTO_COLLECT_USER_CONFIG\n`;
    statusText += `⏰ ${new Date().toLocaleString('fa-IR')}`;
    
    await sendMessage(msg.chat.id, statusText);
    console.log(`✅ [AUTO-COLLECT] Status report sent successfully`);
    
  } catch (error) {
    console.error('❌ [AUTO-COLLECT] Error in handleAutoCollectCommand:', error.message);
    try {
      await sendMessage(msg.chat.id, '❌ خطا در نمایش وضعیت جمع‌آوری خودکار');
    } catch (sendError) {
      console.error('❌ [AUTO-COLLECT] Could not send error message:', sendError.message);
    }
  }
}

// تابع جمع‌آوری خودکار اطلاعات کاربران از پیام‌های گروهی
async function autoCollectUserInfo(msg) {
  try {
    // بررسی کانفیگ
    const { AUTO_COLLECT_USER_CONFIG } = require('./3config');
    if (!AUTO_COLLECT_USER_CONFIG.enabled) {
      return; // اگر غیرفعال است، خروج
    }

    // فقط در گروه‌ها و سوپرگروه‌ها
    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
      return;
    }

    // بررسی اینکه آیا ربات ادمین است
    const isBotAdmin = await checkBotAdminStatus(msg.chat.id);
    if (!isBotAdmin) {
      console.log(`🤖 [AUTO-COLLECT] Bot is not admin in group ${msg.chat.id}, skipping auto-collection`);
      return;
    }

    // بررسی اینکه آیا پیام از کاربر معتبر است
    if (!msg.from || !msg.from.id || !msg.from.first_name) {
      return;
    }

    // بررسی نوع پیام (اگر فقط پیام‌های متنی)
    if (!AUTO_COLLECT_USER_CONFIG.collect_from_all_messages && !msg.text) {
      return;
    }

    // دریافت اطلاعات کاربر
    const userId = msg.from.id;
    const userName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
    const username = msg.from.username || null;

    console.log(`👤 [AUTO-COLLECT] Auto-collecting user info: ${userName} (ID: ${userId}) in group ${msg.chat.title}`);

    // بررسی اینکه آیا کاربر قبلاً در لیست اعضا وجود دارد
    const { loadMembersData } = require('./7group');
    const membersData = loadMembersData();
    const groupMembers = membersData.groups[msg.chat.id] || [];
    
    const existingMember = groupMembers.find(member => member.id === userId);
    
    if (!existingMember) {
      // اضافه کردن کاربر جدید به لیست اعضا
      console.log(`➕ [AUTO-COLLECT] Adding new user to members list: ${userName}`);
      
      const newMember = {
        id: userId,
        name: userName,
        username: username,
        joinDate: new Date().toISOString(),
        autoCollected: true,
        lastMessageDate: new Date().toISOString()
      };

      groupMembers.push(newMember);
      membersData.groups[msg.chat.id] = groupMembers;

      // ذخیره اطلاعات جدید
      const { saveMembersData } = require('./7group');
      saveMembersData(membersData);

      console.log(`✅ [AUTO-COLLECT] Successfully added user ${userName} to group ${msg.chat.title}`);
      
      // ارسال گزارش به گروه گزارش (اگر فعال باشد)
      if (AUTO_COLLECT_USER_CONFIG.report_to_admin) {
        try {
          const { getReportsEnabled } = require('./3config');
          if (getReportsEnabled()) {
            const reportText = `👤 کاربر جدید به صورت خودکار اضافه شد\n📛 گروه: ${msg.chat.title}\n👤 کاربر: ${userName} (ID: ${userId})\n⏰ ${new Date().toLocaleString('fa-IR')}`;
            await sendMessage(REPORT_GROUP_ID, reportText);
            console.log(`📤 [AUTO-COLLECT] Report sent to report group`);
          }
        } catch (error) {
          console.log(`⚠️ [AUTO-COLLECT] Could not send report:`, error.message);
        }
      }
    } else if (AUTO_COLLECT_USER_CONFIG.update_existing_users) {
      // به‌روزرسانی تاریخ آخرین پیام
      existingMember.lastMessageDate = new Date().toISOString();
      existingMember.autoCollected = true;
      
      // ذخیره تغییرات
      const { saveMembersData } = require('./7group');
      saveMembersData(membersData);
      
      console.log(`🔄 [AUTO-COLLECT] Updated last message date for existing user: ${userName}`);
    }

  } catch (error) {
    console.error('❌ [AUTO-COLLECT] Error in autoCollectUserInfo:', error.message);
  }
}

// تابع جمع‌آوری خودکار اطلاعات کاربران جدید که وارد گروه می‌شوند
async function autoCollectNewMember(msg) {
  try {
    // بررسی کانفیگ
    const { AUTO_COLLECT_USER_CONFIG } = require('./3config');
    if (!AUTO_COLLECT_USER_CONFIG.enabled) {
      return; // اگر غیرفعال است، خروج
    }

    // فقط در گروه‌ها و سوپرگروه‌ها
    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
      return;
    }

    // بررسی اینکه آیا ربات ادمین است
    const isBotAdmin = await checkBotAdminStatus(msg.chat.id);
    if (!isBotAdmin) {
      console.log(`🤖 [NEW-MEMBER] Bot is not admin in group ${msg.chat.id}, skipping new member collection`);
      return;
    }

    // بررسی اینکه آیا این یک کاربر جدید است (نه ربات)
    if (!msg.new_chat_member || msg.new_chat_member.is_bot) {
      return;
    }

    // دریافت اطلاعات کاربر جدید
    const newMember = msg.new_chat_member;
    const userId = newMember.id;
    const userName = newMember.first_name + (newMember.last_name ? ' ' + newMember.last_name : '');
    const username = newMember.username || null;

    console.log(`🆕 [NEW-MEMBER] New member joined: ${userName} (ID: ${userId}) in group ${msg.chat.title}`);

    // بررسی اینکه آیا کاربر قبلاً در لیست اعضا وجود دارد
    const { loadMembersData } = require('./7group');
    const membersData = loadMembersData();
    const groupMembers = membersData.groups[msg.chat.id] || [];
    
    const existingMember = groupMembers.find(member => member.id === userId);
    
    if (!existingMember) {
      // اضافه کردن کاربر جدید به لیست اعضا
      console.log(`➕ [NEW-MEMBER] Adding new member to members list: ${userName}`);
      
      const newMemberData = {
        id: userId,
        name: userName,
        username: username,
        joinDate: new Date().toISOString(),
        autoCollected: true,
        joinMethod: 'group_join',
        lastMessageDate: new Date().toISOString()
      };

      groupMembers.push(newMemberData);
      membersData.groups[msg.chat.id] = groupMembers;

      // ذخیره اطلاعات جدید
      const { saveMembersData } = require('./7group');
      saveMembersData(membersData);

      console.log(`✅ [NEW-MEMBER] Successfully added new member ${userName} to group ${msg.chat.title}`);
      
      // ارسال گزارش به گروه گزارش (اگر فعال باشد)
      if (AUTO_COLLECT_USER_CONFIG.report_to_admin) {
        try {
          const { getReportsEnabled } = require('./3config');
          if (getReportsEnabled()) {
            const reportText = `🆕 عضو جدید وارد گروه شد\n📛 گروه: ${msg.chat.title}\n👤 کاربر: ${userName} (ID: ${userId})\n⏰ ${new Date().toLocaleString('fa-IR')}`;
            await sendMessage(REPORT_GROUP_ID, reportText);
            console.log(`📤 [NEW-MEMBER] Report sent to report group`);
          }
        } catch (error) {
          console.log(`⚠️ [NEW-MEMBER] Could not send report:`, error.message);
        }
      }
    } else {
      // به‌روزرسانی اطلاعات کاربر موجود
      existingMember.joinMethod = 'group_join';
      existingMember.lastJoinDate = new Date().toISOString();
      
      // ذخیره تغییرات
      const { saveMembersData } = require('./7group');
      saveMembersData(membersData);
      
      console.log(`🔄 [NEW-MEMBER] Updated join info for existing member: ${userName}`);
    }

  } catch (error) {
    console.error('❌ [NEW-MEMBER] Error in autoCollectNewMember:', error.message);
  }
}

// تابع مدیریت دستور عضو جدید
async function handleNewMemberCommand(msg) {
  try {
    console.log(`🔧 [NEW-MEMBER] New member command detected from ${msg.from.first_name}`);
    
    const { AUTO_COLLECT_USER_CONFIG } = require('./3config');
    
    let statusText = `🔧 **وضعیت جمع‌آوری خودکار اعضای جدید**\n\n`;
    statusText += `📊 **وضعیت فعلی:** ${AUTO_COLLECT_USER_CONFIG.enabled ? '✅ فعال' : '❌ غیرفعال'}\n`;
    statusText += `🆕 **جمع‌آوری از ورود گروه:** ${AUTO_COLLECT_USER_CONFIG.enabled ? '✅ فعال' : '❌ غیرفعال'}\n`;
    statusText += `📤 **گزارش به ادمین:** ${AUTO_COLLECT_USER_CONFIG.report_to_admin ? '✅ فعال' : '❌ غیرفعال'}\n\n`;
    
    // آمار اعضای جدید
    try {
      const { loadMembersData } = require('./7group');
      const membersData = loadMembersData();
      const groupMembers = membersData.groups[msg.chat.id] || [];
      const newJoinMembers = groupMembers.filter(member => member.joinMethod === 'group_join');
      
      statusText += `📈 **آمار گروه:**\n`;
      statusText += `👥 کل اعضا: ${groupMembers.length}\n`;
      statusText += `🆕 ورود خودکار: ${newJoinMembers.length}\n`;
      statusText += `📅 آخرین ورود: ${newJoinMembers.length > 0 ? new Date(newJoinMembers[0].lastJoinDate || newJoinMembers[0].joinDate).toLocaleString('fa-IR') : 'نامشخص'}\n\n`;
    } catch (error) {
      statusText += `⚠️ خطا در دریافت آمار: ${error.message}\n\n`;
    }
    
    statusText += `💡 **راهنما:**\n`;
    statusText += `• این قابلیت به صورت خودکار ID کاربران جدید را جمع‌آوری می‌کند\n`;
    statusText += `• فقط زمانی کار می‌کند که ربات ادمین باشد\n`;
    statusText += `• تنظیمات در AUTO_COLLECT_USER_CONFIG قابل تغییر است\n`;
    statusText += `⏰ ${new Date().toLocaleString('fa-IR')}`;
    
    await sendMessage(msg.chat.id, statusText);
    console.log(`✅ [NEW-MEMBER] Status report sent successfully`);
    
  } catch (error) {
    console.error('❌ [NEW-MEMBER] Error in handleNewMemberCommand:', error.message);
    try {
      await sendMessage(msg.chat.id, '❌ خطا در نمایش وضعیت جمع‌آوری اعضای جدید');
    } catch (sendError) {
      console.error('❌ [NEW-MEMBER] Could not send error message:', sendError.message);
    }
  }
}

module.exports = { 
  startPolling,
  testGroupConfig,
  startStatusReportTimer,
  stopStatusReportTimer
};