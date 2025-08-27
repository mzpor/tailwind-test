//🚫 09:15:00 🗓️ دوشنبه 13 مرداد 1404
// ماژول مدیریت بستن گروه‌ها با کیبورد شیشه‌ای زیبا

const { sendMessage, sendMessageWithInlineKeyboard, deleteMessage, getChat } = require('./4bale');
const { isAdmin, isGroupAdmin, getUserRole } = require('./6mid');
const { hasGroupCloseManagementAccess } = require('./3config');
const { loadMembersData, saveMembersData } = require('./7group');
const { getTimeStamp } = require('./1time');
const fs = require('fs');

// فایل ذخیره وضعیت بسته بودن گروه‌ها
const GROUP_CLOSE_FILE = './group_close_status.json';

// خواندن داده‌های وضعیت بسته بودن گروه‌ها
function loadGroupCloseData() {
  try {
    if (fs.existsSync(GROUP_CLOSE_FILE)) {
      const data = fs.readFileSync(GROUP_CLOSE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading group close data:', error.message);
  }
  return { groups: {} };
}

// ذخیره داده‌های وضعیت بسته بودن گروه‌ها
function saveGroupCloseData(data) {
  try {
    fs.writeFileSync(GROUP_CLOSE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving group close data:', error.message);
  }
}

// دریافت لیست گروه‌ها
async function getGroupsList() {
  try {
    console.log('🔍 DEBUG: getGroupsList called');
    const membersData = loadMembersData();
    console.log('🔍 DEBUG: Members data loaded:', membersData);
    console.log('🔍 DEBUG: Members data groups:', membersData.groups);
    const groups = [];
    const { getGroupName, GROUP_NAMES } = require('./3config.js');
    
    for (const [groupId, members] of Object.entries(membersData.groups)) {
      if (members.length > 0) {
        try {
          const chatInfo = await getChat(groupId);
          // استفاده از نام گروه از config یا عنوان گروه از API
          const groupTitle = await getGroupName(groupId) || chatInfo.title || `گروه ${groupId}`;
          groups.push({
            id: groupId,
            title: groupTitle,
            memberCount: members.length
          });
        } catch (error) {
          // اگر نتوانستیم اطلاعات گروه را دریافت کنیم، از نام گروه از config استفاده کنیم
          const groupTitle = await getGroupName(groupId) || `گروه ${groupId}`;
          groups.push({
            id: groupId,
            title: groupTitle,
            memberCount: members.length
          });
        }
      }
    }
    
    // سپس گروه‌هایی که در config تعریف شده‌اند اما در members data نیستند را اضافه می‌کنیم
    for (const [groupId, groupName] of Object.entries(GROUP_NAMES)) {
      console.log('🔍 DEBUG: Checking config group:', groupId, 'with name:', groupName);
      if (!groups.find(g => g.id === groupId)) {
        console.log('🔍 DEBUG: Adding config group:', groupId, groupName);
        groups.push({
          id: groupId,
          title: groupName,
          memberCount: 0 // فعلاً 0 عضو
        });
      }
    }
    
    console.log('🔍 DEBUG: Final groups array:', groups);
    return groups;
  } catch (error) {
    console.error('Error getting groups list:', error.message);
    return [];
  }
}

// ایجاد کیبورد شیشه‌ای برای لیست گروه‌ها
function createGroupsKeyboard(groups) {
  console.log('🔍 DEBUG: createGroupsKeyboard called with groups:', groups);
  const keyboard = [];
  let row = [];
  
  groups.forEach((group, index) => {
    const buttonText = `${index + 1}️⃣ ${group.title} (${group.memberCount} عضو)`;
    row.push({
      text: buttonText,
      callback_data: `close_group_${group.id}`
    });
    
    if (row.length === 1) { // هر گروه در یک ردیف جداگانه
      keyboard.push(row);
      row = [];
    }
  });
  
  // دکمه بازگشت
  keyboard.push([{
    text: '🔙 بازگشت به منوی اصلی',
    callback_data: 'back_to_main'
  }]);
  
  console.log('🔍 DEBUG: Final keyboard created:', keyboard);
  return keyboard;
}

// ایجاد کیبورد شیشه‌ای برای مدیریت بستن گروه
function createGroupCloseKeyboard(groupId, groupTitle) {
  console.log('🔍 DEBUG: createGroupCloseKeyboard called with groupId:', groupId, 'groupTitle:', groupTitle);
  const closeData = loadGroupCloseData();
  console.log('🔍 DEBUG: Close data in createGroupCloseKeyboard:', closeData);
  const isClosed = closeData.groups[groupId]?.closed || false;
  console.log('🔍 DEBUG: Group isClosed status:', isClosed);
  
  const keyboard = [
    [{
      text: isClosed ? '✅ گروه باز است' : '🚫 گروه بسته است',
      callback_data: `toggle_close_${groupId}`
    }]
  ];
  
  if (isClosed) {
    keyboard.push([{
      text: '📝 تغییر پیام بسته بودن',
      callback_data: `change_message_${groupId}`
    }]);
  }
  
  // دکمه بازگشت
  keyboard.push([{
    text: '🔙 بازگشت به لیست گروه‌ها',
    callback_data: 'back_to_groups'
  }]);
  
  console.log('🔍 DEBUG: Final keyboard created in createGroupCloseKeyboard:', keyboard);
  return keyboard;
}

// پردازش مدیریت بستن گروه‌ها
async function handleGroupCloseManagement(userId, action) {
  try {
    console.log('🔍 DEBUG: handleGroupCloseManagement called with userId:', userId, 'action:', action);
    
    // بررسی دسترسی کاربر
    console.log('🔍 DEBUG: Checking access for userId:', userId);
    const userRole = await getUserRole(userId);
    console.log('🔍 DEBUG: User role:', userRole);
    
    if (!hasGroupCloseManagementAccess(userRole)) {
      console.log('🔍 DEBUG: Access denied for role:', userRole);
      return {
        text: '⚠️ شما دسترسی لازم برای بستن گروه‌ها را ندارید.',
        keyboard: null
      };
    }
    
    console.log('🔍 DEBUG: Access granted, processing action:', action);
    
    if (action === 'groups') {
      // نمایش لیست گروه‌ها
      console.log('🔍 DEBUG: Getting groups list');
      const groups = await getGroupsList();
      console.log('🔍 DEBUG: Groups list:', groups);
      
      if (groups.length === 0) {
        console.log('🔍 DEBUG: No groups found');
        return {
          text: '📝 هیچ گروهی یافت نشد.',
          keyboard: [[{
            text: '🔙 بازگشت به منوی اصلی',
            callback_data: 'back_to_main'
          }]]
        };
      }
      
      console.log('🔍 DEBUG: Creating groups keyboard');
      const keyboard = createGroupsKeyboard(groups);
      console.log('🔍 DEBUG: Keyboard created:', keyboard);
      
      const text = `🚫 مدیریت بستن گروه‌ها

📋 گروه‌های موجود:
${groups.map((group, index) => `${index + 1}️⃣ ${group.title} (${group.memberCount} عضو)`).join('\n')}

👆 لطفاً گروه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      console.log('🔍 DEBUG: Returning result with text and keyboard');
      return { text, keyboard };
      
    } else if (action.startsWith('close_group_')) {
      // نمایش مدیریت بستن گروه خاص
      console.log('🔍 DEBUG: Processing close_group_ action:', action);
      const groupId = action.replace('close_group_', '');
      console.log('🔍 DEBUG: Extracted groupId:', groupId);
      
      console.log('🔍 DEBUG: Getting groups list for close_group_');
      const groups = await getGroupsList();
      console.log('🔍 DEBUG: Groups list for close_group_:', groups);
      
      const group = groups.find(g => g.id === groupId);
      console.log('🔍 DEBUG: Found group:', group);
      
      if (!group) {
        console.log('🔍 DEBUG: Group not found, returning error');
        return {
          text: '❌ گروه مورد نظر یافت نشد.',
          keyboard: [[{
            text: '🔙 بازگشت به لیست گروه‌ها',
            callback_data: 'groups'
          }]]
        };
      }
      
      console.log('🔍 DEBUG: Creating group close keyboard for groupId:', groupId, 'title:', group.title);
      const keyboard = createGroupCloseKeyboard(groupId, group.title);
      console.log('🔍 DEBUG: Group close keyboard created:', keyboard);
      
      const closeData = loadGroupCloseData();
      console.log('🔍 DEBUG: Close data loaded:', closeData);
      const isClosed = closeData.groups[groupId]?.closed || false;
      const closeMessage = closeData.groups[groupId]?.message || '🚫 گروه موقتاً بسته است.';
      console.log('🔍 DEBUG: Group status - isClosed:', isClosed, 'closeMessage:', closeMessage);
      
      const text = `🚫 مدیریت بستن گروه

📛 گروه: ${group.title}
👥 تعداد اعضا: ${group.memberCount}
🔒 وضعیت: ${isClosed ? 'بسته' : 'باز'}
📝 پیام: ${closeMessage}

👆 لطفاً عملیات مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      console.log('🔍 DEBUG: Generated text for close_group_:', text);
      console.log('🔍 DEBUG: Returning result for close_group_ with text length:', text.length, 'and keyboard:', keyboard);
      
      return { text, keyboard };
      
    } else if (action.startsWith('toggle_close_')) {
      // تغییر وضعیت بسته بودن گروه
      const groupId = action.replace('toggle_close_', '');
      const closeData = loadGroupCloseData();
      
      if (!closeData.groups[groupId]) {
        closeData.groups[groupId] = {};
      }
      
      const newStatus = !closeData.groups[groupId].closed;
      closeData.groups[groupId].closed = newStatus;
      
      // تنظیم پیام پیش‌فرض
      if (newStatus && !closeData.groups[groupId].message) {
        closeData.groups[groupId].message = '🚫 گروه موقتاً بسته است.';
      }
      
      saveGroupCloseData(closeData);
      
      const groups = await getGroupsList();
      const group = groups.find(g => g.id === groupId);
      const keyboard = createGroupCloseKeyboard(groupId, group.title);
      
      const text = `🚫 وضعیت گروه تغییر کرد

📛 گروه: ${group.title}
🔒 وضعیت جدید: ${newStatus ? 'بسته' : 'باز'}
📝 پیام: ${closeData.groups[groupId].message || '🚫 گروه موقتاً بسته است.'}

👆 لطفاً عملیات مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      return { text, keyboard };
      
    } else if (action.startsWith('change_message_')) {
      // تغییر پیام بسته بودن گروه
      const groupId = action.replace('change_message_', '');
      const closeData = loadGroupCloseData();
      
      if (!closeData.groups[groupId]?.closed) {
        return {
          text: '❌ این گروه بسته نیست.',
          keyboard: [[{
            text: '🔙 بازگشت',
            callback_data: `close_group_${groupId}`
          }]]
        };
      }
      
      // فعلاً پیام پیش‌فرض تنظیم می‌شود
      // در نسخه‌های بعدی می‌توان قابلیت تغییر پیام را اضافه کرد
      const defaultMessages = [
        '🚫 گروه موقتاً بسته است.',
        '🚫 گروه در حال تعمیر است.',
        '🚫 گروه تا اطلاع بعدی بسته است.',
        '🚫 گروه در ساعات غیرکاری بسته است.'
      ];
      
      const randomMessage = defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
      closeData.groups[groupId].message = randomMessage;
      saveGroupCloseData(closeData);
      
      const groups = await getGroupsList();
      const group = groups.find(g => g.id === groupId);
      const keyboard = createGroupCloseKeyboard(groupId, group.title);
      
      const text = `📝 پیام گروه تغییر کرد

📛 گروه: ${group.title}
🔒 وضعیت: بسته
📝 پیام جدید: ${randomMessage}

👆 لطفاً عملیات مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      return { text, keyboard };
      
    } else if (action === 'back_to_groups') {
      // بازگشت به لیست گروه‌ها
      return await handleGroupCloseManagement(userId, 'groups');
    }
    
    return {
      text: '❌ عملیات نامعتبر',
      keyboard: [[{
        text: '🔙 بازگشت',
        callback_data: 'groups'
      }]]
    };
    
  } catch (error) {
    console.error('Error in handleGroupCloseManagement:', error.message);
    return {
      text: '❌ خطا در پردازش درخواست',
      keyboard: [[{
        text: '🔙 بازگشت',
        callback_data: 'groups'
      }]]
    };
  }
}

// نمایش منوی مدیریت بستن گروه‌ها
async function showGroupCloseManagementPanel(userId) {
  try {
    if (!isAdmin(userId) && !isGroupAdmin(userId)) {
      return {
        text: '⚠️ شما دسترسی لازم برای بستن گروه‌ها را ندارید.',
        keyboard: null
      };
    }
    
    const keyboard = [[{
      text: '🚫 مدیریت بستن گروه‌ها',
      callback_data: 'close_groups'
    }]];
    
    const text = `🚫 پنل مدیریت بستن گروه‌ها

👑 دسترسی: ${isAdmin(userId) ? 'مدیر مدرسه' : 'ادمین گروه'}
📊 قابلیت‌ها:
• مشاهده لیست گروه‌ها
• بستن/باز کردن گروه‌ها
• تنظیم پیام بسته بودن
• مدیریت وضعیت گروه‌ها

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
    
    return { text, keyboard };
    
  } catch (error) {
    console.error('Error in showGroupCloseManagementPanel:', error.message);
    return {
      text: '❌ خطا در نمایش پنل مدیریت',
      keyboard: null
    };
  }
}

// بررسی وضعیت بسته بودن گروه
function isGroupClosed(groupId) {
  const closeData = loadGroupCloseData();
  return closeData.groups[groupId]?.closed || false;
}

// دریافت پیام بسته بودن گروه
function getGroupCloseMessage(groupId) {
  const closeData = loadGroupCloseData();
  return closeData.groups[groupId]?.message || '🚫 گروه موقتاً بسته است.';
}

module.exports = {
  handleGroupCloseManagement,
  showGroupCloseManagementPanel,
  loadGroupCloseData,
  saveGroupCloseData,
  isGroupClosed,
  getGroupCloseMessage,
  getGroupsList
};
