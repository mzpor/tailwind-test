//⏰ 09:20:00 🗓️ دوشنبه 13 مرداد 1404
// ماژول مدیریت حضور و غیاب - بازنویسی شده با الهام از کد Python

const { sendMessage, sendMessageWithInlineKeyboard, deleteMessage, getChat, getChatMember } = require('./4bale');
const { isAdmin, isGroupAdmin, getUserRole, hasPermission } = require('./6mid');
const { loadMembersData, saveMembersData } = require('./7group');
const { getTimeStamp } = require('./1time');
const fs = require('fs');

// فایل ذخیره حضور و غیاب
const ATTENDANCE_FILE = './attendance.json';

// کلاس مدیریت حضور و غیاب
class AttendanceManager {
  constructor() {
    this.users = [];
    this.attendanceData = {};
    this.currentGroupId = null;
    this.userNamesCache = {};
    this.groupNamesCache = {};
    
    // آیکون‌های وضعیت
    this.statusIcons = {
      "حاضر": "✅",
      "حضور با تاخیر": "⏰", 
      "غایب": "❌",
      "غیبت(موجه)": "📄",
      "در انتظار": "⏳"
    };
    
    // وضعیت‌های معتبر
    this.validStatuses = new Set(["حاضر", "حضور با تاخیر", "غایب", "غیبت(موجه)", "در انتظار"]);
    
    console.log("✅ AttendanceManager initialized successfully");
  }

  // خواندن داده‌های حضور و غیاب
  loadAttendanceData() {
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
  saveAttendanceData(data) {
    try {
      fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving attendance data:', error.message);
      return false;
    }
  }

  // ارسال پیام با مدیریت خطا
  async sendMessage(chatId, text, replyMarkup = null) {
    if (!text || !text.trim()) {
      console.error("Empty message text provided");
      return false;
    }
    
    try {
      await sendMessage(chatId, text, replyMarkup ? { inline_keyboard: replyMarkup } : null);
      console.log(`✅ Message sent successfully to ${chatId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send message to ${chatId}:`, error.message);
      return false;
    }
  }

  // ویرایش پیام با مدیریت خطا
  async editMessage(chatId, messageId, text, replyMarkup = null) {
    if (!text || !text.trim()) {
      console.error("Empty message text provided for edit");
      return false;
    }
    
    try {
      await sendMessageWithInlineKeyboard(chatId, text, replyMarkup || []);
      console.log(`✅ Message edited successfully in ${chatId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to edit message in ${chatId}:`, error.message);
      return false;
    }
  }

  // پاسخ به callback query
  async answerCallbackQuery(callbackQueryId, text = null) {
    try {
      console.log(`✅ Callback query answered: ${callbackQueryId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to answer callback query:`, error.message);
      return false;
    }
  }

  // دریافت نام کاربر
  async getUserName(userId, userInfo = null) {
    if (!Number.isInteger(userId)) {
      console.error(`Invalid user_id type: ${typeof userId}`);
      return "کاربر نامعلوم";
    }
    
    // بررسی کش
    if (this.userNamesCache[userId]) {
      return this.userNamesCache[userId];
    }
    
    // استفاده از userInfo ارائه شده
    if (userInfo && typeof userInfo === 'object') {
      const name = this.extractUserName(userInfo, userId);
      if (name) {
        this.userNamesCache[userId] = name;
        return name;
      }
    }
    
    // تلاش برای دریافت از گروه‌ها
    const name = await this.getUserNameFromGroups(userId);
    if (name) {
      this.userNamesCache[userId] = name;
      return name;
    }
    
    // نام پیش‌فرض
    const defaultName = `کاربر ${userId}`;
    this.userNamesCache[userId] = defaultName;
    return defaultName;
  }

  // استخراج نام کاربر از اطلاعات userInfo
  extractUserName(userInfo, userId) {
    try {
      const firstName = (userInfo.first_name || "").trim();
      const lastName = (userInfo.last_name || "").trim();
      const username = (userInfo.username || "").trim();
      
      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      } else if (firstName && username) {
        return `${firstName} (@${username})`;
      } else if (firstName) {
        return firstName;
      } else if (username) {
        return `@${username}`;
      }
    } catch (error) {
      console.error(`Error extracting user name: ${error.message}`);
    }
    
    return null;
  }

  // دریافت نام کاربر از گروه‌ها
  async getUserNameFromGroups(userId) {
    try {
      const membersData = loadMembersData();
      for (const [groupId, members] of Object.entries(membersData.groups)) {
        const member = members.find(m => m.id === userId);
        if (member) {
          return member.name;
        }
      }
    } catch (error) {
      console.error(`Error getting user name from groups: ${error.message}`);
    }
    
    return null;
  }

  // بررسی مجوز کاربر (بهینه‌سازی شده)
  isUserAuthorized(userId) {
    if (!Number.isInteger(userId)) {
      console.error(`Invalid user_id type for authorization: ${typeof userId}`);
      return false;
    }
    
    // استفاده از ساختار مرکزی برای بررسی دسترسی
    const authorized = hasPermission(userId, 'COACH');
    console.log(`Authorization check for user ${userId}: ${authorized}`);
    return authorized;
  }

  // تولید لیست حضور و غیاب
  getAttendanceList() {
    if (!this.users.length) {
      console.warn("Attendance list requested but user list is empty");
      return "❌ لیست کاربران خالی است!";
    }
    
    try {
      const currentTime = getTimeStamp();
      const groupName = this.currentGroupId ? `گروه ${this.currentGroupId}` : "کلاس";
      
      let text = `📊 **لیست حضور و غیاب - ${groupName}**\n`;
      text += `🕐 آخرین بروزرسانی: ${currentTime}\n\n`;
      
      // نمایش لیست کاربران
      for (let i = 0; i < this.users.length; i++) {
        const user = this.users[i];
        if (!Number.isInteger(user)) {
          console.error(`Invalid user type in list: ${typeof user}`);
          continue;
        }
        
        const status = this.attendanceData[user] || "در انتظار";
        if (!this.validStatuses.has(status)) {
          console.warn(`Invalid status for user ${user}: ${status}`);
          status = "در انتظار";
        }
        
        const icon = this.statusIcons[status] || "⏳";
        const userName = this.userNamesCache[user] || `کاربر ${user}`;
        text += `${(i + 1).toString().padStart(2)}. ${icon} ${userName} - ${status}\n`;
      }
      
      // محاسبه آمار
      const stats = this.calculateAttendanceStats();
      text += `\n📈 **آمار:**\n`;
      text += `✅ حاضر: ${stats.present} | ⏰ تاخیر: ${stats.late}\n`;
      text += `❌ غایب: ${stats.absent} | 📄 موجه: ${stats.justified} | ⏳ در انتظار: ${stats.pending}`;
      
      console.log("✅ Attendance list generated successfully");
      return text;
      
    } catch (error) {
      console.error(`Error generating attendance list: ${error.message}`);
      return "❌ خطا در تولید لیست حضور و غیاب!";
    }
  }

  // محاسبه آمار حضور و غیاب
  calculateAttendanceStats() {
    try {
      const total = this.users.length;
      const present = Object.values(this.attendanceData).filter(status => status === "حاضر").length;
      const late = Object.values(this.attendanceData).filter(status => status === "حضور با تاخیر").length;
      const absent = Object.values(this.attendanceData).filter(status => status === "غایب").length;
      const justified = Object.values(this.attendanceData).filter(status => status === "غیبت(موجه)").length;
      const pending = total - Object.keys(this.attendanceData).length;
      
      return {
        total,
        present,
        late,
        absent,
        justified,
        pending
      };
    } catch (error) {
      console.error(`Error calculating stats: ${error.message}`);
      return { total: 0, present: 0, late: 0, absent: 0, justified: 0, pending: 0 };
    }
  }

  // منوی اصلی
  getMainMenu(userId) {
    if (!this.isUserAuthorized(userId)) {
      return [[{ text: "ℹ️ راهنما", callback_data: "help" }]];
    }
    
    // منوی اصلی برای همه کاربران مجاز
    const keyboard = [
      [{ text: "👥 مدیریت گروه‌ها", callback_data: "group_menu" }],
      [{ text: "📊 مشاهده لیست حضور و غیاب", callback_data: "view_attendance" }],
      [{ text: "✏️ ثبت حضور و غیاب سریع", callback_data: "quick_attendance" }],
      [{ text: "🔄 پاک کردن داده‌ها", callback_data: "clear_all" }],
      [{ text: "📈 آمار کلی", callback_data: "statistics" }]
    ];
    
    // اضافه کردن گزینه مدیریت برای مدیران
    if (isAdmin(userId)) {
      keyboard.push([{ text: "🏭 مدیریت کارگاه‌ها", callback_data: "kargah_menu" }]);
      keyboard.push([{ text: "👨‍🏫 مربی ها", callback_data: "instructors_menu" }]);
    }
    
    return keyboard;
  }

  // تنظیم لیست کاربران
  setUsers(users, groupId = null) {
    try {
      // اعتبارسنجی ورودی
      if (!Array.isArray(users)) {
        console.error(`Invalid users type: ${typeof users}`);
        return false;
      }
      
      // فیلتر کردن user_id های معتبر
      const validUsers = users.filter(user => Number.isInteger(user) && user > 0);
      const invalidUsers = users.filter(user => !Number.isInteger(user) || user <= 0);
      
      if (invalidUsers.length > 0) {
        console.warn(`Invalid user_ids filtered out: ${invalidUsers.join(', ')}`);
      }
      
      this.users = validUsers;
      this.currentGroupId = groupId;
      
      // پاک کردن داده‌های قدیمی حضور و غیاب برای کاربران غیرمعتبر
      const invalidAttendanceUsers = Object.keys(this.attendanceData).filter(user => !validUsers.includes(parseInt(user)));
      for (const user of invalidAttendanceUsers) {
        delete this.attendanceData[user];
        console.log(`Removed attendance data for invalid user: ${user}`);
      }
      
      console.log(`✅ Users set successfully: ${validUsers.length} users for group ${groupId}`);
      return true;
      
    } catch (error) {
      console.error(`Error setting users: ${error.message}`);
      return false;
    }
  }

  // تنظیم وضعیت کاربر
  setUserStatus(userId, status) {
    try {
      if (!Number.isInteger(userId)) {
        console.error(`Invalid user_id type: ${typeof userId}`);
        return false;
      }
      
      if (!this.validStatuses.has(status)) {
        console.error(`Invalid status: ${status}`);
        return false;
      }
      
      if (!this.users.includes(userId)) {
        console.warn(`User ${userId} not in users list`);
        return false;
      }
      
      this.attendanceData[userId] = status;
      console.log(`✅ Status set for user ${userId}: ${status}`);
      return true;
      
    } catch (error) {
      console.error(`Error setting status for user ${userId}: ${error.message}`);
      return false;
    }
  }

  // دریافت وضعیت کاربر
  getUserStatus(userId) {
    try {
      if (!Number.isInteger(userId)) {
        console.error(`Invalid user_id type: ${typeof userId}`);
        return null;
      }
      
      return this.attendanceData[userId] || null;
      
    } catch (error) {
      console.error(`Error getting status for user ${userId}: ${error.message}`);
      return null;
    }
  }
}

// ایجاد نمونه سراسری
const attendanceManager = new AttendanceManager();

module.exports = { attendanceManager }; 