//⏰ 09:15:00 🗓️ دوشنبه 13 مرداد 1404
// ماژول مدیریت گروه‌ها با کیبورد شیشه‌ای زیبا

const { sendMessage, sendMessageWithInlineKeyboard, deleteMessage, getChat } = require('./4bale');
const { isAdmin, isGroupAdmin, getUserRole } = require('./6mid');
const { loadMembersData, saveMembersData } = require('./7group');
const { getTimeStamp } = require('./1time');
const fs = require('fs');

// فایل ذخیره وضعیت حضور و غیاب
const ATTENDANCE_FILE = './attendance.json';

// خواندن داده‌های حضور و غیاب
function loadAttendanceData() {
  try {
    if (fs.existsSync(ATTENDANCE_FILE)) {
      const data = fs.readFileSync(ATTENDANCE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading attendance data:', error.message);
  }
  return { groups: {} };
}

// ذخیره داده‌های حضور و غیاب
function saveAttendanceData(data) {
  try {
    fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving attendance data:', error.message);
  }
}

// دریافت لیست گروه‌ها
async function getGroupsList() {
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
    
    return groups;
  } catch (error) {
    console.error('Error getting groups list:', error.message);
    return [];
  }
}

// ایجاد کیبورد شیشه‌ای برای لیست گروه‌ها
function createGroupsKeyboard(groups) {
  const keyboard = [];
  let row = [];
  
  groups.forEach((group, index) => {
    const buttonText = `${index + 1}️⃣ ${group.title} (${group.memberCount} عضو)`;
    row.push({
      text: buttonText,
      callback_data: `group_${group.id}`
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
  
  return keyboard;
}

// ایجاد کیبورد شیشه‌ای برای مدیریت حضور و غیاب
function createAttendanceKeyboard(groupId, members) {
  const keyboard = [];
  let row = [];
  
  members.forEach((member, index) => {
    const attendanceData = loadAttendanceData();
    const groupAttendance = attendanceData.groups[groupId] || {};
    const memberStatus = groupAttendance[member.id] || 'none';
    
    let statusEmoji = '⚪'; // هیچ وضعیتی
    switch (memberStatus) {
      case 'present':
        statusEmoji = '✅';
        break;
      case 'absent':
        statusEmoji = '❌';
        break;
      case 'late':
        statusEmoji = '⏰';
        break;
      case 'excused':
        statusEmoji = '📝';
        break;
    }
    
    const buttonText = `${statusEmoji} ${member.name}`;
    row.push({
      text: buttonText,
      callback_data: `member_${groupId}_${member.id}`
    });
    
    if (row.length === 1) { // هر عضو در یک ردیف جداگانه
      keyboard.push(row);
      row = [];
    }
  });
  
  // دکمه‌های عملیات گروهی
  keyboard.push([
    {
      text: '✅ همه حاضر',
      callback_data: `all_present_${groupId}`
    },
    {
      text: '❌ همه غایب',
      callback_data: `all_absent_${groupId}`
    }
  ]);
  
  keyboard.push([
    {
      text: '⏰ همه با تاخیر',
      callback_data: `all_late_${groupId}`
    },
    {
      text: '📝 همه غیبت موجه',
      callback_data: `all_excused_${groupId}`
    }
  ]);
  
  // دکمه‌های مدیریت
  keyboard.push([
    {
      text: '📊 گزارش حضور و غیاب',
      callback_data: `report_${groupId}`
    },
    {
      text: '🔄 ریست کردن',
      callback_data: `reset_${groupId}`
    }
  ]);
  
  // دکمه بازگشت
  keyboard.push([{
    text: '🔙 بازگشت به لیست گروه‌ها',
    callback_data: 'back_to_groups'
  }]);
  
  return keyboard;
}

// ایجاد کیبورد شیشه‌ای برای انتخاب وضعیت عضو
function createMemberStatusKeyboard(groupId, memberId, memberName) {
  const keyboard = [
    [{
      text: '✅ حاضر',
      callback_data: `status_${groupId}_${memberId}_present`
    }],
    [{
      text: '❌ غایب',
      callback_data: `status_${groupId}_${memberId}_absent`
    }],
    [{
      text: '⏰ حاضر با تاخیر',
      callback_data: `status_${groupId}_${memberId}_late`
    }],
    [{
      text: '📝 غیبت موجه',
      callback_data: `status_${groupId}_${memberId}_excused`
    }],
    [{
      text: '🔙 بازگشت',
      callback_data: `group_${groupId}`
    }]
  ];
  
  return keyboard;
}

// مدیریت حضور و غیاب
async function handleAttendanceManagement(userId, callbackData) {
  try {
    // بررسی دسترسی کاربر
    if (!isAdmin(userId) && !isGroupAdmin(userId)) {
      return {
        text: '⚠️ شما دسترسی لازم برای مدیریت گروه‌ها را ندارید.',
        keyboard: null
      };
    }
    
    const parts = callbackData.split('_');
    const action = parts[0];
    
    if (action === 'groups') {
      // نمایش لیست گروه‌ها
      const groups = await getGroupsList();
      
      if (groups.length === 0) {
        return {
          text: '📝 هیچ گروهی یافت نشد.\n\nبرای شروع، لطفاً قرآن آموزان در گروه‌ها /عضو شوند.',
          keyboard: [[{
            text: '🔙 بازگشت به منوی اصلی',
            callback_data: 'back_to_main'
          }]]
        };
      }
      
      const keyboard = createGroupsKeyboard(groups);
      const text = `🏫 مدیریت گروه‌ها

📋 گروه‌های موجود:
${groups.map((group, index) => `${index + 1}️⃣ ${group.title} (${group.memberCount} عضو)`).join('\n')}

👆 لطفاً گروه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      return { text, keyboard };
      
    } else if (action === 'group') {
      // نمایش اعضای گروه
      const groupId = parts[1];
      const membersData = loadMembersData();
      const members = membersData.groups[groupId] || [];
      
      if (members.length === 0) {
        return {
          text: '📝 این گروه هیچ عضوی ندارد.\n\nلطفاً قرآن آموزان /عضو شوند.',
          keyboard: [[{
            text: '🔙 بازگشت به لیست گروه‌ها',
            callback_data: 'groups'
          }]]
        };
      }
      
      const keyboard = createAttendanceKeyboard(groupId, members);
      const text = `👥 مدیریت حضور و غیاب

📛 گروه: ${groupId}
👥 تعداد اعضا: ${members.length}

📋 لیست قرآن آموزان:
${members.map((member, index) => `${index + 1}. ${member.name}`).join('\n')}

👆 لطفاً عضو مورد نظر را انتخاب کنید یا عملیات گروهی را انجام دهید:
⏰ ${getTimeStamp()}`;
      
      return { text, keyboard };
      
    } else if (action === 'member') {
      // نمایش وضعیت عضو
      const groupId = parts[1];
      const memberId = parseInt(parts[2]);
      const membersData = loadMembersData();
      const member = membersData.groups[groupId]?.find(m => m.id === memberId);
      
      if (!member) {
        return {
          text: '❌ عضو مورد نظر یافت نشد.',
          keyboard: [[{
            text: '🔙 بازگشت',
            callback_data: `group_${groupId}`
          }]]
        };
      }
      
      const attendanceData = loadAttendanceData();
      const groupAttendance = attendanceData.groups[groupId] || {};
      const currentStatus = groupAttendance[memberId] || 'none';
      
      let statusText = '⚪ هیچ وضعیتی ثبت نشده';
      switch (currentStatus) {
        case 'present':
          statusText = '✅ حاضر';
          break;
        case 'absent':
          statusText = '❌ غایب';
          break;
        case 'late':
          statusText = '⏰ حاضر با تاخیر';
          break;
        case 'excused':
          statusText = '📝 غیبت موجه';
          break;
      }
      
      const keyboard = createMemberStatusKeyboard(groupId, memberId, member.name);
      const text = `👤 مدیریت وضعیت عضو

👤 نام: ${member.name}
📛 گروه: ${groupId}
📊 وضعیت فعلی: ${statusText}

👆 لطفاً وضعیت جدید را انتخاب کنید:
⏰ ${getTimeStamp()}`;
      
      return { text, keyboard };
      
    } else if (action === 'status') {
      // تغییر وضعیت عضو
      const groupId = parts[1];
      const memberId = parseInt(parts[2]);
      const status = parts[3];
      
      const attendanceData = loadAttendanceData();
      if (!attendanceData.groups[groupId]) {
        attendanceData.groups[groupId] = {};
      }
      
      attendanceData.groups[groupId][memberId] = status;
      saveAttendanceData(attendanceData);
      
      const membersData = loadMembersData();
      const member = membersData.groups[groupId]?.find(m => m.id === memberId);
      
      let statusText = '';
      switch (status) {
        case 'present':
          statusText = '✅ حاضر';
          break;
        case 'absent':
          statusText = '❌ غایب';
          break;
        case 'late':
          statusText = '⏰ حاضر با تاخیر';
          break;
        case 'excused':
          statusText = '📝 غیبت موجه';
          break;
      }
      
      const keyboard = [[{
        text: '🔙 بازگشت',
        callback_data: `group_${groupId}`
      }]];
      
      const text = `✅ وضعیت به‌روزرسانی شد

👤 ${member?.name || 'عضو'}
📊 وضعیت جدید: ${statusText}
⏰ ${getTimeStamp()}`;
      
      return { text, keyboard };
      
    } else if (action === 'all') {
      // عملیات گروهی
      const operation = parts[1];
      const groupId = parts[2];
      
      const membersData = loadMembersData();
      const members = membersData.groups[groupId] || [];
      
      if (members.length === 0) {
        return {
          text: '📝 این گروه هیچ عضوی ندارد.',
          keyboard: [[{
            text: '🔙 بازگشت',
            callback_data: `group_${groupId}`
          }]]
        };
      }
      
      const attendanceData = loadAttendanceData();
      if (!attendanceData.groups[groupId]) {
        attendanceData.groups[groupId] = {};
      }
      
      let status = '';
      let operationText = '';
      
      switch (operation) {
        case 'present':
          status = 'present';
          operationText = '✅ همه حاضر';
          break;
        case 'absent':
          status = 'absent';
          operationText = '❌ همه غایب';
          break;
        case 'late':
          status = 'late';
          operationText = '⏰ همه با تاخیر';
          break;
        case 'excused':
          status = 'excused';
          operationText = '📝 همه غیبت موجه';
          break;
      }
      
      // اعمال وضعیت به همه اعضا
      members.forEach(member => {
        attendanceData.groups[groupId][member.id] = status;
      });
      
      saveAttendanceData(attendanceData);
      
      const keyboard = [[{
        text: '🔙 بازگشت',
        callback_data: `group_${groupId}`
      }]];
      
      const text = `✅ عملیات گروهی انجام شد

📛 گروه: ${groupId}
👥 تعداد اعضا: ${members.length}
📊 عملیات: ${operationText}
⏰ ${getTimeStamp()}`;
      
      return { text, keyboard };
      
    } else if (action === 'report') {
      // گزارش حضور و غیاب
      const groupId = parts[1];
      const membersData = loadMembersData();
      const members = membersData.groups[groupId] || [];
      const attendanceData = loadAttendanceData();
      const groupAttendance = attendanceData.groups[groupId] || {};
      
      if (members.length === 0) {
        return {
          text: '📝 این گروه هیچ عضوی ندارد.',
          keyboard: [[{
            text: '🔙 بازگشت',
            callback_data: `group_${groupId}`
          }]]
        };
      }
      
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;
      let noneCount = 0;
      
      const memberReports = members.map(member => {
        const status = groupAttendance[member.id] || 'none';
        let statusEmoji = '⚪';
        let statusText = 'ثبت نشده';
        
        switch (status) {
          case 'present':
            statusEmoji = '✅';
            statusText = 'حاضر';
            presentCount++;
            break;
          case 'absent':
            statusEmoji = '❌';
            statusText = 'غایب';
            absentCount++;
            break;
          case 'late':
            statusEmoji = '⏰';
            statusText = 'با تاخیر';
            lateCount++;
            break;
          case 'excused':
            statusEmoji = '📝';
            statusText = 'غیبت موجه';
            excusedCount++;
            break;
          default:
            noneCount++;
        }
        
        return `${statusEmoji} ${member.name} (${statusText})`;
      });
      
      const keyboard = [[{
        text: '🔙 بازگشت',
        callback_data: `group_${groupId}`
      }]];
      
      const text = `📊 گزارش حضور و غیاب

📛 گروه: ${groupId}
👥 تعداد کل: ${members.length}

📈 آمار:
✅ حاضر: ${presentCount}
❌ غایب: ${absentCount}
⏰ با تاخیر: ${lateCount}
📝 غیبت موجه: ${excusedCount}
⚪ ثبت نشده: ${noneCount}

📋 لیست اعضا:
${memberReports.join('\n')}

⏰ ${getTimeStamp()}`;
      
      return { text, keyboard };
      
    } else if (action === 'reset') {
      // ریست کردن حضور و غیاب
      const groupId = parts[1];
      const attendanceData = loadAttendanceData();
      
      if (attendanceData.groups[groupId]) {
        delete attendanceData.groups[groupId];
        saveAttendanceData(attendanceData);
      }
      
      const keyboard = [[{
        text: '🔙 بازگشت',
        callback_data: `group_${groupId}`
      }]];
      
      const text = `🔄 حضور و غیاب ریست شد

📛 گروه: ${groupId}
✅ همه وضعیت‌ها پاک شد
⏰ ${getTimeStamp()}`;
      
      return { text, keyboard };
      
    } else if (action === 'back') {
      // بازگشت
      const destination = parts[1];
      
      if (destination === 'main') {
        return {
          text: '🏠 منوی اصلی',
          keyboard: null
        };
      } else if (destination === 'groups') {
        return await handleAttendanceManagement(userId, 'groups');
      }
    }
    
    return {
      text: '❌ عملیات نامعتبر',
      keyboard: [[{
        text: '🔙 بازگشت',
        callback_data: 'groups'
      }]]
    };
    
  } catch (error) {
    console.error('Error in handleAttendanceManagement:', error.message);
    return {
      text: '❌ خطا در پردازش درخواست',
      keyboard: [[{
        text: '🔙 بازگشت',
        callback_data: 'groups'
      }]]
    };
  }
}

// نمایش منوی مدیریت گروه‌ها
async function showGroupManagementPanel(userId) {
  try {
    if (!isAdmin(userId) && !isGroupAdmin(userId)) {
      return {
        text: '⚠️ شما دسترسی لازم برای مدیریت گروه‌ها را ندارید.',
        keyboard: null
      };
    }
    
    const keyboard = [[{
      text: '🏫 مدیریت گروه‌ها',
      callback_data: 'groups'
    }]];
    
    const text = `🔧 پنل مدیریت گروه‌ها

👑 دسترسی: ${isAdmin(userId) ? 'مدیر مدرسه' : 'ادمین گروه'}
📊 قابلیت‌ها:
• مشاهده لیست گروه‌ها
• مدیریت حضور و غیاب
• گزارش‌گیری
• عملیات گروهی

👆 لطفاً گزینه مورد نظر را انتخاب کنید:
⏰ ${getTimeStamp()}`;
    
    return { text, keyboard };
    
  } catch (error) {
    console.error('Error in showGroupManagementPanel:', error.message);
    return {
      text: '❌ خطا در نمایش پنل مدیریت',
      keyboard: null
    };
  }
}

module.exports = {
  handleAttendanceManagement,
  showGroupManagementPanel,
  loadAttendanceData,
  saveAttendanceData
}; 