//⏰ 09:12:00 🗓️ دوشنبه 13 مرداد 1404
// ماژول مدیریت گزارش ورود بات به گروه‌ها

const { sendMessage, getChatAdministrators, getChatMember, getChat } = require('./4bale');
const { REPORT_GROUP_ID, hasPermission } = require('./6mid');
const fs = require('fs');
const SettingsModule = require('./11settings');

// فایل ذخیره اعضا
const MEMBERS_FILE = './members.json';

// خواندن داده‌های ذخیره شده
function loadMembersData() {
  console.log('📂 [GROUP] loadMembersData called');
  try {
    if (fs.existsSync(MEMBERS_FILE)) {
      console.log('📂 [GROUP] Members file exists, reading...');
      const data = fs.readFileSync(MEMBERS_FILE, 'utf8');
      const parsedData = JSON.parse(data);
      console.log('📂 [GROUP] Members data loaded successfully:', JSON.stringify(parsedData, null, 2));
      return parsedData;
    } else {
      console.log('📂 [GROUP] Members file does not exist, returning default data');
      return { groups: {} };
    }
  } catch (error) {
    console.error('❌ [GROUP] Error loading members data:', error.message);
    console.error('❌ [GROUP] Error stack:', error.stack);
    return { groups: {} };
  }
}

// ذخیره داده‌های اعضا
function saveMembersData(data) {
  console.log('💾 [GROUP] saveMembersData called');
  console.log('💾 [GROUP] Data to save:', JSON.stringify(data, null, 2));
  try {
    fs.writeFileSync(MEMBERS_FILE, JSON.stringify(data, null, 2));
    console.log('✅ [GROUP] Members data saved successfully');
  } catch (error) {
    console.error('❌ [GROUP] Error saving members data:', error.message);
    console.error('❌ [GROUP] Error stack:', error.stack);
  }
}

// دریافت نام کامل کاربر
function getFullName(user) {
  console.log('👤 [GROUP] getFullName called');
  console.log('👤 [GROUP] User object:', JSON.stringify(user, null, 2));
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  console.log('👤 [GROUP] Generated full name:', fullName);
  return fullName;
}

// بررسی دسترسی ادمین (جدید)
function isGroupAdmin(userId) {
  console.log(`🔍 [GROUP] isGroupAdmin called for userId: ${userId}`);
  const result = hasPermission(userId, 'COACH');
  console.log(`✅ [GROUP] isGroupAdmin result for ${userId}: ${result}`);
  return result;
}

async function handleGroupJoin(chat) {
  console.log('🤖 [GROUP] handleGroupJoin called');
  console.log('🤖 [GROUP] Chat object:', JSON.stringify(chat, null, 2));
  
  // بررسی وضعیت گزارش از فایل مشترک
  const { getReportsEnabled } = require('./3config');
  if (!getReportsEnabled()) {
    console.log('📋 [GROUP] Reports disabled, skipping bot join report');
    return;
  }
  
  try {
    const text = `🤖 ربات در گروه جدید فعال شد:
📛 ${chat.title}
⏰ ${new Date().toLocaleString('fa-IR')}`;
    console.log(`📤 [GROUP] Sending bot join report to ${REPORT_GROUP_ID}: ${chat.title}`);
    console.log(`📤 [GROUP] Message text: ${text}`);
    await sendMessage(REPORT_GROUP_ID, text);
    console.log(`✅ [GROUP] Bot join report sent successfully`);
  } catch (error) {
    console.error('❌ [GROUP] Error sending bot join report:', error.message);
    console.error('❌ [GROUP] Error stack:', error.stack);
  }
}

// دریافت لیست اعضای گروه و دسته‌بندی
async function getGroupMembers(chatId) {
  console.log(`👥 [GROUP] getGroupMembers called for chatId: ${chatId}`);
  try {
    console.log(`👥 [GROUP] Getting administrators for chatId: ${chatId}...`);
    const admins = await getChatAdministrators(chatId);
    console.log(`👥 [GROUP] Found ${admins.length} administrators:`, JSON.stringify(admins, null, 2));
    
    // خواندن اعضای ذخیره شده
    console.log(`👥 [GROUP] Loading members data...`);
    const membersData = loadMembersData();
    const groupMembers = membersData.groups[chatId] || [];
    console.log(`👥 [GROUP] Found ${groupMembers.length} stored members for chatId: ${chatId}`);
    
    const adminList = admins.map(admin => getFullName(admin.user));
    console.log(`👥 [GROUP] Admin list:`, adminList);
    
    // فیلتر کردن اعضای غیر ادمین
    const nonAdminMembers = groupMembers.filter(member => 
      !admins.some(admin => admin.user.id === member.id)
    );
    console.log(`👥 [GROUP] Non-admin members:`, nonAdminMembers.map(m => m.name));
    
    const result = {
      admins: adminList,
      members: nonAdminMembers.map(member => member.name),
      totalAdmins: adminList.length,
      totalMembers: nonAdminMembers.length
    };
    
    console.log(`👥 [GROUP] Final result:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`❌ [GROUP] Error getting group members for chatId ${chatId}:`, error.message);
    console.error(`❌ [GROUP] Error stack:`, error.stack);
    return null;
  }
}

// گزارش لیست اعضای گروه
async function reportGroupMembers(chatId, chatTitle) {
  console.log(`📊 [GROUP] reportGroupMembers called for chatId: ${chatId}, chatTitle: ${chatTitle}`);
  
  // بررسی وضعیت گزارش از فایل مشترک
  const { getReportsEnabled } = require('./3config');
  if (!getReportsEnabled()) {
    console.log('📋 [GROUP] Reports disabled, skipping group members report');
    return;
  }
  
  const members = await getGroupMembers(chatId);
  if (!members) {
    console.log(`❌ [GROUP] No members data available for chatId: ${chatId}`);
    return;
  }
  
  console.log(`📊 [GROUP] Members data for report:`, JSON.stringify(members, null, 2));
  
  const text = `📊 گزارش اعضای گروه: ${chatTitle}

👑 ادمین‌ها (${members.totalAdmins}):
${members.admins.map((admin, index) => `${index + 1}. ${admin}`).join('\n')}

👥 اعضا (${members.totalMembers}):
${members.members.map((member, index) => `${index + 1}. ${member}`).join('\n')}

📈 آمار کلی:
👑 ادمین: ${members.totalAdmins}
👥 عضو: ${members.totalMembers}
📊 کل: ${members.totalAdmins + members.totalMembers}`;

  console.log(`📤 [GROUP] Sending group members report to ${REPORT_GROUP_ID}`);
  console.log(`📤 [GROUP] Message text: ${text}`);
  await sendMessage(REPORT_GROUP_ID, text);
  console.log(`✅ [GROUP] Group members report sent successfully`);
}

// تشکر از عضو در گروه (برای سازگاری)
async function thankMember(chatId, userName) {
  try {
    const thankText = `🎉 ممنون از عضویت ${userName} عزیز!`;
    
    await sendMessage(chatId, thankText);
  } catch (error) {
    console.error('Error in thankMember:', error.message);
  }
}

// اضافه کردن عضو جدید - به‌روزرسانی شده در 1404/05/15 ساعت 23:30
async function addMember(chatId, chatTitle, userId, userName) {
  try {
    const membersData = loadMembersData();
    
    if (!membersData.groups[chatId]) {
      membersData.groups[chatId] = [];
    }
    
    // بررسی اینکه آیا عضو قبلاً وجود دارد
    const existingMember = membersData.groups[chatId].find(member => member.id === userId);
    
    if (!existingMember) {
      // عضو جدید
      membersData.groups[chatId].push({
        id: userId,
        name: userName,
        joinedAt: new Date().toISOString()
      });
      
      saveMembersData(membersData);
      
      // پیام عضویت جدید
      const thankText = `✅ قرآن آموز ${userName} عضو شد`;
      await sendMessage(chatId, thankText);
      
      // گزارش لیست به‌روزرسانی شده (شامل ادمین‌ها و کاربران)
      try {
        await reportGroupMembers(chatId, chatTitle);
      } catch (error) {
        console.error('Error reporting group members:', error.message);
      }
      
    } else {
      // عضو قدیمی - پیام مجدد
      console.log(`👤 ${userName} is already a member, thanking them`);
      const thankText = `✅ قرآن آموز ${userName} مجدد عوض شد`;
      await sendMessage(chatId, thankText);
      
      // گزارش لیست به‌روزرسانی شده (شامل ادمین‌ها و کاربران)
      try {
        await reportGroupMembers(chatId, chatTitle);
      } catch (error) {
        console.error('Error reporting group members:', error.message);
      }
    }
  } catch (error) {
    console.error('Error in addMember:', error.message);
  }
}

// گزارش لیست به‌روزرسانی شده - شامل ادمین‌ها و کاربران
async function reportUpdatedMembersList(chatId, chatTitle, newMemberName) {
  try {
    // بررسی وضعیت گزارش از فایل مشترک
    const { getReportsEnabled } = require('./3config');
    if (!getReportsEnabled()) {
      console.log('📋 [GROUP] Reports disabled, skipping updated members list report');
      return;
    }
    
    const members = await getGroupMembers(chatId);
    if (!members) return;
    
    const text = `👤 ${newMemberName} اضافه شد

📋 لیست کامل گروه:
📛 گروه: ${chatTitle}

👑 ادمین‌ها (${members.totalAdmins}):
${members.admins.map((admin, index) => `${index + 1}. ${admin}`).join('\n')}
${members.admins.length === 0 ? '📝 هیچ ادمینی یافت نشد.' : ''}

👥 قرآن آموزان (${members.totalMembers}):
${members.members.map((member, index) => `${index + 1}. ${member}`).join('\n')}
${members.members.length === 0 ? '📝 هنوز قرآن آموزی ثبت نشده است.' : ''}

📊 آمار کلی:
👑 ادمین: ${members.totalAdmins}
👥 قرآن آموز: ${members.totalMembers}
📊 کل: ${members.totalAdmins + members.totalMembers}
⏰ ${new Date().toLocaleString('fa-IR')}`;

    await sendMessage(REPORT_GROUP_ID, text);
  } catch (error) {
    console.error('Error in reportUpdatedMembersList:', error.message);
  }
}

// اعلام فعال شدن ربات
async function announceBotActivation(chatId, chatTitle) {
  const text = `🤖 ربات فعال شد
لطفاً /عضو شوید تا لیست اعضای خود را به‌روزرسانی کنید.`;
  
  await sendMessage(chatId, text);
}

// حذف عضو از لیست
async function removeMember(chatId, userId) {
  try {
    const membersData = loadMembersData();
    
    if (membersData.groups[chatId]) {
      const memberIndex = membersData.groups[chatId].findIndex(member => member.id === userId);
      if (memberIndex !== -1) {
        const removedMember = membersData.groups[chatId][memberIndex];
        membersData.groups[chatId].splice(memberIndex, 1);
        saveMembersData(membersData);
        
        // گزارش حذف عضو
        try {
          // بررسی وضعیت گزارش از فایل مشترک
          const { getReportsEnabled } = require('./3config');
          if (getReportsEnabled()) {
            const text = `👤 ${removedMember.name} از گروه خارج شد
📛 گروه: ${chatId}
⏰ ${new Date().toLocaleString('fa-IR')}`;
            
            await sendMessage(REPORT_GROUP_ID, text);
          } else {
            console.log('📋 [GROUP] Reports disabled, skipping remove member report');
          }
        } catch (error) {
          console.error('Error sending remove member report:', error.message);
        }
      }
    }
  } catch (error) {
    console.error('Error in removeMember:', error.message);
  }
}

// بررسی و به‌روزرسانی لیست اعضا - به‌روزرسانی شده در 1404/05/15 ساعت 23:00
async function checkAndUpdateMembersList(chatId, chatTitle) {
  try {
    const membersData = loadMembersData();
    const groupMembers = membersData.groups[chatId] || [];
    
    if (groupMembers.length > 0) {
      // دریافت ادمین‌های گروه
      const admins = await getChatAdministrators(chatId);
      const adminIds = admins.map(admin => admin.user.id);
      
      // فیلتر کردن کاربران غیر ادمین
      const regularMembers = groupMembers.filter(member => !adminIds.includes(member.id));
      
      if (regularMembers.length > 0) {
        const text = ` گروه: ${chatTitle}

${regularMembers.map((member, index) => `${index + 1}. ${member.name}`).join('\n')}

📊 تعداد قرآن آموزان: ${regularMembers.length}
📊 کل اعضا: ${groupMembers.length}

🔍 قرآن آموزان عزیز،
برای ثبت در /لیست لطفا /عضو شوید.

⏰ اکنون: ${new Date().toLocaleTimeString('fa-IR')}
📅 تاریخ: ${new Date().toLocaleDateString('fa-IR')}`;
        
        await sendMessage(chatId, text);
      } else {
        const text = `📝 هیچ قرآن آموزی در این گروه ثبت نشده است.

لطفاً قرآن آموزان /عضو شوید تا در لیست ثبت شوند.`;
        
        await sendMessage(chatId, text);
      }
    } else {
      const text = `📝 لیست خالی است
لطفاً قرآن آموزان /عضو شوید تا لیست تهیه شود.`;
      
      await sendMessage(chatId, text);
    }
  } catch (error) {
    console.error('Error in checkAndUpdateMembersList:', error.message);
    // در صورت خطا، لیست کامل نمایش بده
    const text = ` گروه: ${chatTitle}

${groupMembers.map((member, index) => `${index + 1}. ${member.name}`).join('\n')}

📊 تعداد اعضا: ${groupMembers.length}

🔍 قرآن آموزان عزیز،
برای ثبت در /لیست لطفا /عضو شوید.

⏰ اکنون: ${new Date().toLocaleTimeString('fa-IR')}
📅 ${new Date().toLocaleDateString('fa-IR')}`;
    
    await sendMessage(chatId, text);
  }
}

// اعلام فعال شدن ربات برای ادمین‌ها - به‌روزرسانی شده در 1404/05/13 ساعت 10:10
async function announceBotActivationForAdmin(chatId, chatTitle) {
  const text = `🤖 ربات قرآنی فعال شد

📚 وظایف ربات:
• ثبت قرآن آموزان
• مدیریت لیست اعضا
• گزارش‌گیری
• حضور و غیاب

👑 دستورات مدیران و مربی‌ها:
/ربات - معرفی ربات
/لیست - نمایش لیست قرآن آموزان

👥 دستورات قرآن آموزان:
/عضو - ثبت عضویت

📖 قرآن آموزان عزیز، لطفاً /عضو شوید تا در لیست ثبت شوید.`;
  
  await sendMessage(chatId, text);
}

// گزارش وضعیت ادمین ربات - غیرفعال شده
async function reportBotAdminStatus(chatId, chatTitle, isAdmin) {
  // این تابع غیرفعال شده تا پیام "ربات ❌ ادمین نشده" ارسال نشود
  console.log(`📋 [GROUP] Bot admin status report disabled for group: ${chatTitle}`);
  return;
}

// تابع جدید برای خلاصه گروه‌ها - به‌روزرسانی شده در 1404/05/15 ساعت 22:00
async function getGroupsSummary() {
  console.log('📊 [GROUP] getGroupsSummary called');
  try {
    const membersData = loadMembersData();
    console.log('📊 [GROUP] Members data loaded:', JSON.stringify(membersData, null, 2));
    const groups = membersData.groups || {};
    console.log('📊 [GROUP] Groups object:', JSON.stringify(groups, null, 2));
    
    let summary = '';
    let groupCount = 0;
    
    // تبدیل Object.keys به آرایه و مرتب‌سازی بر اساس تعداد اعضا
    const groupEntries = Object.entries(groups);
    console.log('📊 [GROUP] Group entries:', groupEntries);
    const sortedGroups = groupEntries.sort((a, b) => {
      const aTotal = a[1].length;
      const bTotal = b[1].length;
      return bTotal - aTotal; // نزولی
    });
    console.log('📊 [GROUP] Sorted groups:', sortedGroups);
    
    for (const [chatId, members] of sortedGroups) {
      groupCount++;
      console.log(`📊 [GROUP] Processing group ${groupCount}: ${chatId} with ${members.length} members`);
      
      // شمارش ادمین‌ها و کاربران عادی
      let adminCount = 0;
      let userCount = 0;
      
      // بررسی وضعیت ادمین‌ها
      try {
        console.log(`📊 [GROUP] Getting administrators for group ${chatId}...`);
        const admins = await getChatAdministrators(chatId);
        adminCount = admins.length;
        console.log(`📊 [GROUP] Found ${adminCount} administrators for group ${chatId}`);
        
        // کاربران عادی = کل اعضا - ادمین‌ها
        userCount = Math.max(0, members.length - adminCount);
        console.log(`📊 [GROUP] Calculated ${userCount} regular users for group ${chatId}`);
      } catch (error) {
        console.error(`❌ [GROUP] Error getting administrators for group ${chatId}:`, error.message);
        // در صورت خطا، همه را کاربر عادی در نظر بگیر
        userCount = members.length;
        console.log(`📊 [GROUP] Using fallback: ${userCount} users for group ${chatId}`);
      }
      
      summary += `👨‍🏫 ربات ${groupCount}\n`;
      summary += `${adminCount} ادمین | ${userCount} کاربر 📋\n\n`;
      console.log(`📊 [GROUP] Added to summary: ربات ${groupCount} (${adminCount} ادمین | ${userCount} کاربر)`);
    }
    
    console.log('📊 [GROUP] Final summary:', summary);
    return summary;
  } catch (error) {
    console.error('❌ [GROUP] Error getting groups summary:', error.message);
    console.error('❌ [GROUP] Error stack:', error.stack);
    return '';
  }
}

// تابع جدید برای ایجاد کیبورد inline گروه‌ها
async function createGroupsInlineKeyboard() {
  console.log('🔘 [GROUP] createGroupsInlineKeyboard called');
  try {
    const membersData = loadMembersData();
    const { getGroupName } = require('./3config.js');
    const keyboard = [];
    
    for (const [groupId, members] of Object.entries(membersData.groups)) {
      if (members.length > 0) {
        try {
          const chatInfo = await getChat(groupId);
          // استفاده از نام گروه از config یا عنوان گروه از API
          const groupTitle = await getGroupName(groupId) || chatInfo.title || `گروه ${groupId}`;
          keyboard.push([{
            text: `${groupTitle} (${members.length} عضو)`,
            callback_data: `group_${groupId}`
          }]);
        } catch (error) {
          // اگر نتوانستیم اطلاعات گروه را دریافت کنیم، از نام گروه از config استفاده کنیم
          const groupTitle = await getGroupName(groupId) || `گروه ${groupId}`;
          keyboard.push([{
            text: `${groupTitle} (${members.length} عضو)`,
            callback_data: `group_${groupId}`
          }]);
        }
      }
    }
    
    // دکمه بازگشت
    keyboard.push([{
      text: '🔙 بازگشت به منوی اصلی',
      callback_data: 'back_to_main'
    }]);
    
    console.log('🔘 [GROUP] Created inline keyboard:', JSON.stringify(keyboard, null, 2));
    return keyboard;
  } catch (error) {
    console.error('❌ [GROUP] Error creating groups inline keyboard:', error.message);
    return [[{
      text: '🔙 بازگشت به منوی اصلی',
      callback_data: 'back_to_main'
    }]];
  }
}

module.exports = { 
  handleGroupJoin, 
  getGroupMembers, 
  reportGroupMembers, 
  thankMember, 
  addMember,
  removeMember,
  checkAndUpdateMembersList,
  reportUpdatedMembersList,
  announceBotActivation,
  announceBotActivationForAdmin,
  reportBotAdminStatus,
  getGroupsSummary,
  loadMembersData,
  saveMembersData,
  createGroupsInlineKeyboard
};