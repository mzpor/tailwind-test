//🚫 09:15:00 🗓️ دوشنبه 13 مرداد 1404
// ماژول مدیریت بستن گروه‌ها با کیبورد شیشه‌ای زیبا

const { sendMessage, sendMessageWithInlineKeyboard, deleteMessage, getChat } = require('./4bale');
const { isAdmin, isGroupAdmin, getUserRole } = require('./6mid');
const { hasGroupCloseManagementAccess } = require('./3config');
const { loadMembersData, saveMembersData } = require('./7group');
const { getTimeStamp } = require('./1time');
const fs = require('fs');

// فایل ذخیره وضعیت بسته بودن گروه‌ها
const GROUP_CLOSE_FILE = './data/group_close_status.json';

// تابع فرمت کردن اطلاعات زمان‌بندی
function formatScheduleInfo(groupData) {
  if (!groupData || !groupData.schedule) {
    return '🕐 تنظیم نشده (پیش‌فرض: 09:00-18:00، همه روزها)';
  }
  
  const schedule = groupData.schedule;
  const days = schedule.activeDays || [];
  const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  
  let daysText = '';
  if (days.length === 7) {
    daysText = 'همه روزها';
  } else if (days.length === 0) {
    daysText = 'هیچ روزی';
  } else {
    daysText = days.map(day => dayNames[day]).join('، ');
  }
  
  return `🕐 ${schedule.startTime || '09:00'} تا ${schedule.endTime || '18:00'}
📅 روزها: ${daysText}`;
}

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
  
  // دکمه‌های زمان‌بندی
  keyboard.push([
    {
      text: '⏰ تنظیم ساعت باز/بسته',
      callback_data: `set_schedule_${groupId}`
    }
  ]);
  
  keyboard.push([
    {
      text: '📅 تنظیم روزهای هفته',
      callback_data: `set_days_${groupId}`
    }
  ]);
  
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

⏰ تنظیمات زمان‌بندی:
${formatScheduleInfo(closeData.groups[groupId])}

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
      
    } else if (action.startsWith('set_schedule_')) {
      // تنظیم ساعت باز/بسته شدن گروه
      const groupId = action.replace('set_schedule_', '');
      const closeData = loadGroupCloseData();
      
      if (!closeData.groups[groupId]) {
        closeData.groups[groupId] = {};
      }
      
      if (!closeData.groups[groupId].schedule) {
        closeData.groups[groupId].schedule = {
          startTime: '09:00',
          endTime: '18:00',
          activeDays: [0, 1, 2, 3, 4, 5, 6]
        };
      }
      
      const keyboard = [
        [{
          text: '🕐 تغییر ساعت شروع',
          callback_data: `set_start_time_${groupId}`
        }],
        [{
          text: '🕐 تغییر ساعت پایان',
          callback_data: `set_end_time_${groupId}`
        }],
        [{
          text: '🔙 بازگشت',
          callback_data: `close_group_${groupId}`
        }]
      ];
      
      const text = `⏰ تنظیم ساعت باز/بسته شدن گروه

📛 گروه: ${(await getGroupsList()).find(g => g.id === groupId)?.title || 'نامشخص'}
🕐 ساعت شروع: ${closeData.groups[groupId].schedule.startTime}
🕐 ساعت پایان: ${closeData.groups[groupId].schedule.endTime}

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      return { text, keyboard };
      
    } else if (action.startsWith('set_start_time_')) {
      // تنظیم ساعت شروع
      const groupId = action.replace('set_start_time_', '');
      const closeData = loadGroupCloseData();
      
      if (!closeData.groups[groupId]) {
        closeData.groups[groupId] = {};
      }
      
      if (!closeData.groups[groupId].schedule) {
        closeData.groups[groupId].schedule = {
          startTime: '09:00',
          endTime: '18:00',
          activeDays: [0, 1, 2, 3, 4, 5, 6]
        };
      }
      
      // فعلاً ساعت پیش‌فرض تنظیم می‌شود
      // در نسخه‌های بعدی می‌توان قابلیت ورود ساعت را اضافه کرد
      const newStartTime = '19:20';
      closeData.groups[groupId].schedule.startTime = newStartTime;
      saveGroupCloseData(closeData);
      
      const keyboard = [
        [{
          text: '🕐 تغییر ساعت پایان',
          callback_data: `set_end_time_${groupId}`
        }],
        [{
          text: '🔙 بازگشت',
          callback_data: `set_schedule_${groupId}`
        }]
      ];
      
      const text = `🕐 ساعت شروع تغییر کرد

📛 گروه: ${(await getGroupsList()).find(g => g.id === groupId)?.title || 'نامشخص'}
🕐 ساعت شروع جدید: ${newStartTime}
🕐 ساعت پایان: ${closeData.groups[groupId].schedule.endTime}

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      return { text, keyboard };
      
    } else if (action.startsWith('set_end_time_')) {
      // تنظیم ساعت پایان
      const groupId = action.replace('set_end_time_', '');
      const closeData = loadGroupCloseData();
      
      if (!closeData.groups[groupId]) {
        closeData.groups[groupId] = {};
      }
      
      if (!closeData.groups[groupId].schedule) {
        closeData.groups[groupId].schedule = {
          startTime: '09:00',
          endTime: '18:00',
          activeDays: [0, 1, 2, 3, 4, 5, 6]
        };
      }
      
      // فعلاً ساعت پیش‌فرض تنظیم می‌شود
      const newEndTime = '19:40';
      closeData.groups[groupId].schedule.endTime = newEndTime;
      saveGroupCloseData(closeData);
      
      const keyboard = [
        [{
          text: '🔙 بازگشت',
          callback_data: `set_schedule_${groupId}`
        }]
      ];
      
      const text = `🕐 ساعت پایان تغییر کرد

📛 گروه: ${(await getGroupsList()).find(g => g.id === groupId)?.title || 'نامشخص'}
🕐 ساعت شروع: ${closeData.groups[groupId].schedule.startTime}
🕐 ساعت پایان جدید: ${newEndTime}

✅ تنظیمات زمان‌بندی تکمیل شد!

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      return { text, keyboard };
      
    } else if (action.startsWith('set_days_')) {
      // تنظیم روزهای هفته
      const groupId = action.replace('set_days_', '');
      const closeData = loadGroupCloseData();
      
      if (!closeData.groups[groupId]) {
        closeData.groups[groupId] = {};
      }
      
      if (!closeData.groups[groupId].schedule) {
        closeData.groups[groupId].schedule = {
          startTime: '09:00',
          endTime: '18:00',
          activeDays: [0, 1, 2, 3, 4, 5, 6]
        };
      }
      
      const currentDays = closeData.groups[groupId].schedule.activeDays || [0, 1, 2, 3, 4, 5, 6];
      const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
      
      const keyboard = [];
      for (let i = 0; i < 7; i++) {
        const isActive = currentDays.includes(i);
        keyboard.push([{
          text: `${isActive ? '✅' : '❌'} ${dayNames[i]}`,
          callback_data: `toggle_day_${groupId}_${i}`
        }]);
      }
      
      keyboard.push([{
        text: '🔙 بازگشت',
        callback_data: `close_group_${groupId}`
      }]);
      
      const text = `📅 تنظیم روزهای هفته

📛 گروه: ${(await getGroupsList()).find(g => g.id === groupId)?.title || 'نامشخص'}
📅 روزهای فعال: ${currentDays.map(day => dayNames[day]).join('، ')}

👆 لطفاً روزهای مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      return { text, keyboard };
      
    } else if (action.startsWith('toggle_day_')) {
      // تغییر وضعیت روز
      const parts = action.replace('toggle_day_', '').split('_');
      const groupId = parts[0];
      const dayIndex = parseInt(parts[1]);
      
      const closeData = loadGroupCloseData();
      
      if (!closeData.groups[groupId]) {
        closeData.groups[groupId] = {};
      }
      
      if (!closeData.groups[groupId].schedule) {
        closeData.groups[groupId].schedule = {
          startTime: '09:00',
          endTime: '18:00',
          activeDays: [0, 1, 2, 3, 4, 5, 6]
        };
      }
      
      const currentDays = closeData.groups[groupId].schedule.activeDays || [0, 1, 2, 3, 4, 5, 6];
      
      if (currentDays.includes(dayIndex)) {
        // حذف روز
        closeData.groups[groupId].schedule.activeDays = currentDays.filter(day => day !== dayIndex);
      } else {
        // اضافه کردن روز
        closeData.groups[groupId].schedule.activeDays = [...currentDays, dayIndex].sort();
      }
      
      saveGroupCloseData(closeData);
      
      // بازگشت به تنظیم روزها
      return await handleGroupCloseManagement(userId, `set_days_${groupId}`);
      
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

// بررسی وضعیت بسته بودن گروه با در نظر گرفتن زمان‌بندی
function isGroupClosed(groupId) {
  const closeData = loadGroupCloseData();
  const groupData = closeData.groups[groupId];
  
  // اگر گروه به صورت دستی بسته شده باشد
  if (groupData?.closed) {
    return true;
  }
  
  // اگر زمان‌بندی تنظیم نشده باشد، گروه باز است
  if (!groupData?.schedule) {
    return false;
  }
  
  const schedule = groupData.schedule;
  const now = new Date();
  // تبدیل JavaScript getDay() (0=یکشنبه) به فرمت کاربر (0=شنبه)
  const currentDay = (now.getDay() + 1) % 7; // 0=شنبه، 1=یکشنبه، 2=دوشنبه، ...
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM
  
  console.log(`🔍 DEBUG: Group ${groupId} schedule check:`);
  console.log(`  Current day: ${now.getDay()} (JS) -> ${currentDay} (user format)`);
  console.log(`  Current time: ${currentTime}`);
  console.log(`  Schedule: ${JSON.stringify(schedule)}`);
  console.log(`  Active days: ${schedule.activeDays}`);
  console.log(`  Time range: ${schedule.startTime} - ${schedule.endTime}`);
  
  // بررسی روز هفته
  if (!schedule.activeDays.includes(currentDay)) {
    console.log(`  ❌ Day ${currentDay} not in active days ${schedule.activeDays}`);
    return true; // گروه در این روز بسته است
  }
  
  // بررسی ساعت
  if (currentTime < schedule.startTime || currentTime > schedule.endTime) {
    console.log(`  ❌ Time ${currentTime} not in range ${schedule.startTime}-${schedule.endTime}`);
    return true; // گروه در این ساعت بسته است
  }
  
  console.log(`  ✅ Group is OPEN - day ${currentDay} and time ${currentTime} are valid`);
  return false; // گروه باز است
}

// دریافت پیام بسته بودن گروه
function getGroupCloseMessage(groupId) {
  const closeData = loadGroupCloseData();
  const groupData = closeData.groups[groupId];
  
  // اگر پیام سفارشی تنظیم شده باشد
  if (groupData?.message) {
    return groupData.message;
  }
  
  // اگر زمان‌بندی تنظیم شده باشد، پیام مناسب را برگردان
  if (groupData?.schedule) {
    const schedule = groupData.schedule;
    const now = new Date();
    // تبدیل JavaScript getDay() (0=یکشنبه) به فرمت کاربر (0=شنبه)
    const currentDay = (now.getDay() + 1) % 7;
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (!schedule.activeDays.includes(currentDay)) {
      return `🚫 گروه در روز ${getDayName(currentDay)} بسته است.`;
    }
    
    if (currentTime < schedule.startTime) {
      return `🚫 گروه از ساعت ${schedule.startTime} باز می‌شود.`;
    }
    
    if (currentTime > schedule.endTime) {
      return `🚫 گروه تا ساعت ${schedule.endTime} باز بود.`;
    }
  }
  
  return '🚫 گروه موقتاً بسته است.';
}

// تابع کمکی برای نام روز
function getDayName(dayIndex) {
  const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  return dayNames[dayIndex];
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
