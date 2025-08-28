// 🎯 مدیریت تمرین‌ها - نسخه 1.2.0
// تشکر از ارسال تمرین صوتی و مدیریت ریپلای به صوتی
// اضافه شده: مدیریت "تلاوتم" و لیست تمرین‌ها
// اضافه شده: مدیریت تحلیل تمرین از مربی/کمک مربی

const { sendMessage } = require('./4bale');
const { getTimeStamp } = require('./1time');
const fs = require('fs');
const moment = require('moment-jalaali');
moment.loadPersian({ usePersianDigits: false });

class PracticeManager {
  constructor() {
    console.log('✅ [PRACTICE_MANAGER] Practice Manager initialized successfully');
    this.usersWaitingForExplanation = new Map(); // userId -> {chatId, studentId}
  }

  // بررسی اینکه آیا پیام "تلاوتم" است (ریپلای به صوت خود کاربر)
  isTalawatMessage(message) {
    try {
      // بررسی اینکه آیا پیام متنی است
      if (!message.text) {
        return false;
      }

      // خواندن کلمات کلیدی از کانفیگ
      const settingsPath = './data/settings.json';
      let practiceKeywords = ['تلاوتم']; // مقدار پیش‌فرض
      
      if (fs.existsSync(settingsPath)) {
        try {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          practiceKeywords = settings.practice_keywords || ['تلاوتم'];
        } catch (error) {
          console.error('❌ [PRACTICE_MANAGER] Error reading practice keywords from config:', error);
        }
      }

      // بررسی اینکه آیا شامل کلمات کلیدی است
      const text = message.text.trim();
      const isValidKeyword = practiceKeywords.some(keyword => text === keyword);
      
      if (!isValidKeyword) {
        console.log(`❌ [PRACTICE_MANAGER] Text "${text}" not in practice keywords: [${practiceKeywords.join(', ')}]`);
        return false;
      }

      // بررسی اینکه آیا ریپلای به پیام دیگری است
      if (!message.reply_to_message) {
        console.log('❌ [PRACTICE_MANAGER] Message is not a reply');
        return false;
      }

      // بررسی اینکه آیا پیام اصلی صوتی است
      if (!message.reply_to_message.voice) {
        console.log('❌ [PRACTICE_MANAGER] Reply is not to a voice message');
        return false;
      }

      // بررسی اینکه آیا پیام اصلی متعلق به همان کاربر است
      if (message.reply_to_message.from.id !== message.from.id) {
        console.log(`❌ [PRACTICE_MANAGER] User ${message.from.id} is replying to ${message.reply_to_message.from.id}'s voice (not their own)`);
        return false;
      }

      console.log('✅ [PRACTICE_MANAGER] Talawat message detected (user replying to their own voice)');
      return true;

    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error checking talawat message:', error);
      return false;
    }
  }

  // مدیریت پیام "تلاوتم"
  async handleTalawatMessage(message) {
    try {
      const chatId = message.chat.id;
      const userId = message.from.id;
      const userName = message.from.first_name + (message.from.last_name ? ' ' + message.from.last_name : '');

      console.log(`🎤 [PRACTICE_MANAGER] handleTalawatMessage STARTED for ${userName} in chat ${chatId}`);
      console.log(`👤 [PRACTICE_MANAGER] User ID: ${userId}, Chat ID: ${chatId}`);

      // بررسی زمان تمرین
      console.log('⏰ [PRACTICE_MANAGER] Checking practice time...');
      const practiceTimeResult = this.isPracticeTime();
      console.log(`⏰ [PRACTICE_MANAGER] Practice time check result: ${practiceTimeResult}`);
      
      if (!practiceTimeResult) {
        console.log('⏰ [PRACTICE_MANAGER] Not practice time, sending guidance message');
        await this.sendNotPracticeTimeMessage(chatId);
        return true;
      }

      // بررسی اینکه آیا گروه باز است
      console.log('🚫 [PRACTICE_MANAGER] Checking group status...');
      try {
        const { isGroupClosed } = require('./9group_close_management');
        const groupClosedResult = isGroupClosed(chatId);
        console.log(`🚫 [PRACTICE_MANAGER] Group closed check result: ${groupClosedResult ? '🚫 CLOSED' : '✅ OPEN'}`);
        
        if (groupClosedResult) {
          console.log('🚫 [PRACTICE_MANAGER] Group is closed, cannot accept practice');
          const { getGroupCloseMessage } = require('./9group_close_management');
          const closeMessage = getGroupCloseMessage(chatId);
          console.log(`🚫 [PRACTICE_MANAGER] Sending close message: ${closeMessage}`);
          await sendMessage(chatId, closeMessage);
          return true;
        } else {
          console.log('✅ [PRACTICE_MANAGER] Group is open, proceeding with practice registration');
        }
      } catch (error) {
        console.error('❌ [PRACTICE_MANAGER] Error checking group status:', error.message);
        console.log('⚠️ [PRACTICE_MANAGER] Continuing despite group status check error');
        // ادامه پردازش حتی اگر بررسی وضعیت گروه با خطا مواجه شود
      }

      // ثبت تمرین
      console.log('📝 [PRACTICE_MANAGER] Registering practice...');
      const registered = await this.registerPractice(message);
      if (!registered) {
        console.error(`❌ [PRACTICE_MANAGER] Failed to register practice for ${userName}`);
        return false;
      }
      console.log(`✅ [PRACTICE_MANAGER] Practice registered successfully for ${userName}`);

      // ارسال لیست تمرین‌های امروز
      console.log('📋 [PRACTICE_MANAGER] Sending today\'s practice list...');
      const listSent = await this.sendTodayPracticeList(chatId);
      if (!listSent) {
        console.error(`❌ [PRACTICE_MANAGER] Failed to send practice list for ${userName}`);
        return false;
      }
      console.log(`✅ [PRACTICE_MANAGER] Practice list sent successfully`);

      console.log(`✅ [PRACTICE_MANAGER] Talawat message handled successfully for ${userName}`);
      console.log(`🎯 [PRACTICE_MANAGER] handleTalawatMessage COMPLETED successfully`);
      return true;

    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error handling talawat message:', error);
      return false;
    }
  }

  // ارسال لیست تمرین‌های امروز
  async sendTodayPracticeList(chatId) {
    try {
      const todayPractices = this.getTodayPractices();
      const allGroupMembers = this.getAllGroupMembers(chatId);
      
      if (!allGroupMembers || allGroupMembers.length === 0) {
        console.log('❌ [PRACTICE_MANAGER] No group members found');
        return false;
      }

      // جداسازی کاربرانی که تمرین فرستاده‌اند و آنهایی که نکرده‌اند
      const submittedUsers = todayPractices.filter(practice => 
        practice.chat_id === chatId
      );
      const submittedUserIds = submittedUsers.map(practice => practice.user_id);
      
      const pendingUsers = allGroupMembers.filter(member => 
        !submittedUserIds.includes(member.id)
      );

      // ایجاد متن لیست
      const today = moment().format('jYYYY/jMM/jDD');
      const dayName = this.getPersianDayName(moment().day());
      
      let listText = `📋 لیست ارسال تمرین ${dayName} ${today}\n\n`;
      
      // کاربرانی که تمرین فرستاده‌اند
      if (submittedUsers.length > 0) {
        listText += `✅ تمرین‌های ارسال شده:\n`;
        submittedUsers.forEach((practice, index) => {
          const submissionTime = moment(practice.submission_time).format('HH:mm');
          listText += `${index + 1}- ${practice.user_name} ارسال شد (${submissionTime})\n`;
        });
        listText += '\n';
      }

      // کاربرانی که هنوز تمرین نفرستاده‌اند (بدون ادمین‌ها)
      const regularPendingUsers = pendingUsers.filter(member => {
        // بررسی اینکه آیا کاربر در لیست ادمین‌ها قرار دارد
        const { USERS_BY_ROLE } = require('./3config');
        
        const isSchoolAdmin = USERS_BY_ROLE.SCHOOL_ADMIN.some(admin => 
          (typeof admin === 'object' ? admin.id : admin) === member.id
        );
        const isCoach = USERS_BY_ROLE.COACH.some(coach => 
          (typeof coach === 'object' ? coach.id : coach) === member.id
        );
        const isAssistant = USERS_BY_ROLE.ASSISTANT.some(assistant => 
          (typeof assistant === 'object' ? assistant.id : assistant) === member.id
        );
        
        const isAdmin = isSchoolAdmin || isCoach || isAssistant;
        
        if (isAdmin) {
          const roleType = isSchoolAdmin ? 'SCHOOL_ADMIN' : isCoach ? 'COACH' : 'ASSISTANT';
          console.log(`🚫 [PRACTICE_MANAGER] Filtering out admin from pending list: ${member.name} (id: ${member.id}, role: ${roleType})`);
        }
        
        return !isAdmin; // فقط کاربران غیر ادمین
      });
      
      if (regularPendingUsers.length > 0) {
        listText += `⏳ در انتظار ارسال تلاوت:\n`;
        regularPendingUsers.forEach((member, index) => {
          listText += `${index + 1} ${member.name} در انتظار ارسال تلاوت\n`;
        });
      } else {
        listText += `🎉 همه اعضا تمرین خود را ارسال کرده‌اند!`;
      }

      listText += `\n\n⏰ ${getTimeStamp()}`;

      const result = await sendMessage(chatId, listText);
      
      if (result) {
        console.log(`✅ [PRACTICE_MANAGER] Practice list sent successfully to ${chatId}`);
        return true;
      } else {
        console.error(`❌ [PRACTICE_MANAGER] Failed to send practice list to ${chatId}`);
        return false;
      }

    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error sending practice list:', error);
      return false;
    }
  }

  // دریافت تمام اعضای گروه (بدون ادمین‌ها)
  getAllGroupMembers(chatId) {
    try {
      const membersDataPath = './members.json';
      if (!fs.existsSync(membersDataPath)) {
        console.log('❌ [PRACTICE_MANAGER] Members file not found');
        return [];
      }

      const membersData = JSON.parse(fs.readFileSync(membersDataPath, 'utf8'));
      const allGroupMembers = membersData.groups[chatId] || [];
      
      // فیلتر کردن ادمین‌ها (فقط کاربران عادی)
      const regularMembers = allGroupMembers.filter(member => {
        // بررسی اینکه آیا کاربر ادمین است یا نه
        const userRole = member.role || 'STUDENT';
        const isAdmin = userRole === 'SCHOOL_ADMIN' || userRole === 'GROUP_ADMIN';
        
        if (isAdmin) {
          console.log(`🚫 [PRACTICE_MANAGER] Filtering out admin user: ${member.name} (role: ${userRole})`);
        }
        
        return !isAdmin; // فقط کاربران غیر ادمین
      });
      
      console.log(`📊 [PRACTICE_MANAGER] Found ${allGroupMembers.length} total members, ${regularMembers.length} regular members (admins filtered out) in group ${chatId}`);
      return regularMembers;

    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error getting group members:', error);
      return [];
    }
  }

  // دریافت نام فارسی روز هفته
  getPersianDayName(dayIndex) {
    // تبدیل JavaScript getDay() (0=یکشنبه) به فرمت کاربر (0=شنبه)
    const userDayIndex = (dayIndex + 1) % 7;
    const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
    return dayNames[userDayIndex] || 'نامشخص';
  }

  // بررسی اینکه آیا زمان فعلی زمان تمرین است
  isPracticeTime() {
    try {
      const now = moment();
      // تبدیل JavaScript getDay() (0=یکشنبه) به فرمت کاربر (0=شنبه)
      const currentDay = (now.day() + 1) % 7; // 0=شنبه، 1=یکشنبه، 2=دوشنبه، ...
      const currentHour = now.hour();

      // خواندن تنظیمات تمرین
      const settingsPath = './data/settings.json';
      if (!fs.existsSync(settingsPath)) {
        console.error('❌ [PRACTICE_MANAGER] Settings file not found');
        return false;
      }

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const practiceDays = settings.practice_days || [];
      const practiceHours = settings.practice_hours || [];

      console.log(`⏰ [PRACTICE_MANAGER] ===== PRACTICE TIME CHECK START =====`);
      console.log(`⏰ [PRACTICE_MANAGER] Current moment: ${now.format('YYYY-MM-DD HH:mm:ss')}`);
      console.log(`⏰ [PRACTICE_MANAGER] JavaScript day: ${now.day()} (0=Sunday, 1=Monday, ...)`);
      console.log(`⏰ [PRACTICE_MANAGER] User format day: ${currentDay} (0=شنبه, 1=یکشنبه, ...)`);
      console.log(`⏰ [PRACTICE_MANAGER] Current hour: ${currentHour}`);
      console.log(`📅 [PRACTICE_MANAGER] Practice days from settings: ${practiceDays.join(', ')} (user format)`);
      console.log(`🕐 [PRACTICE_MANAGER] Practice hours from settings: ${practiceHours.join(', ')}`);

      const isValidDay = practiceDays.includes(currentDay);
      const isValidHour = practiceHours.includes(currentHour);

      console.log(`🔍 [PRACTICE_MANAGER] Day validation: ${currentDay} in [${practiceDays.join(', ')}] = ${isValidDay ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`🔍 [PRACTICE_MANAGER] Hour validation: ${currentHour} in [${practiceHours.join(', ')}] = ${isValidHour ? '✅ VALID' : '❌ INVALID'}`);

      const result = isValidDay && isValidHour;
      console.log(`✅ [PRACTICE_MANAGER] Final practice time result: ${result ? '✅ YES - Practice time is active' : '❌ NO - Not practice time'}`);
      console.log(`⏰ [PRACTICE_MANAGER] ===== PRACTICE TIME CHECK END =====`);

      return result;

    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error checking practice time:', error);
      return false;
    }
  }

  // دریافت اطلاعات زمان تمرین بعدی
  getNextPracticeTime() {
    try {
      const now = moment();
      const settings = JSON.parse(fs.readFileSync('./data/settings.json', 'utf8'));
      const practiceDays = settings.practice_days || [];
      const practiceHours = settings.practice_hours || [];

      // تبدیل فرمت کاربر (0=شنبه) به JavaScript getDay() (0=یکشنبه)
      const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

      let nextPracticeTime = null;
      let minDiff = Infinity;

      for (const day of practiceDays) {
        for (const hour of practiceHours) {
          // تبدیل فرمت کاربر (0=شنبه) به JavaScript getDay() (0=یکشنبه)
          const jsDay = (day + 1) % 7;
          const practiceTime = moment().day(jsDay).hour(hour).minute(0).second(0);

          // اگر زمان گذشته بود، به هفته بعد برو
          if (practiceTime.isBefore(now)) {
            practiceTime.add(7, 'days');
          }

          const diff = practiceTime.diff(now, 'minutes');
          if (diff < minDiff) {
            minDiff = diff;
            nextPracticeTime = {
              day: dayNames[day],
              hour: hour,
              time: practiceTime
            };
          }
        }
      }

      return nextPracticeTime;

    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error getting next practice time:', error);
      return null;
    }
  }

  // بررسی اینکه آیا پیام تمرین است
  isPracticeMessage(message) {
    try {
      // بررسی اینکه آیا پیام صوتی است
      if (!message.voice) {
        return false;
      }

      // بررسی اینکه آیا کپشن دارد
      if (!message.caption) {
        return false;
      }

      // خواندن کلمات کلیدی از کانفیگ
      const settingsPath = './data/settings.json';
      let practiceKeywords = ['تمرین', 'tamrin', 'practice', 'تمرینات', 'tamrinat']; // مقدار پیش‌فرض
      
      if (fs.existsSync(settingsPath)) {
        try {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          practiceKeywords = settings.practice_keywords || ['تمرین', 'tamrin', 'practice', 'تمرینات', 'tamrinat'];
        } catch (error) {
          console.error('❌ [PRACTICE_MANAGER] Error reading practice keywords from config:', error);
        }
      }

      // بررسی اینکه آیا کپشن شامل کلمات کلیدی است
      const caption = message.caption.toLowerCase();
      const isValidKeyword = practiceKeywords.some(keyword => caption.includes(keyword));
      
      if (isValidKeyword) {
        console.log(`✅ [PRACTICE_MANAGER] Practice message detected with keyword in caption: "${caption}"`);
      } else {
        console.log(`❌ [PRACTICE_MANAGER] Caption "${caption}" not in practice keywords: [${practiceKeywords.join(', ')}]`);
      }
      
      return isValidKeyword;
      
    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error checking practice message:', error);
      return false;
    }
  }

  // تشکر از ارسال تمرین
  async thankForPractice(chatId, userName) {
    try {
      const thankMessage = `🎯 ممنون از ارسال تمرین!

👤 ${userName}
🎵 تمرین شما با موفقیت دریافت شد
⏰ ${getTimeStamp()}

💡 نکات مهم:
• تمرین‌ها توسط مربیان بررسی می‌شوند
• نتیجه بررسی به زودی اعلام خواهد شد
• ادامه تمرین‌ها را فراموش نکنید

🌟 موفق باشید!`;

      const result = await sendMessage(chatId, thankMessage);
      
      if (result) {
        console.log(`✅ [PRACTICE_MANAGER] Thank message sent successfully to ${chatId}`);
        return true;
      } else {
        console.error(`❌ [PRACTICE_MANAGER] Failed to send thank message to ${chatId}`);
        return false;
      }
      
    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error sending thank message:', error);
      return false;
    }
  }

  // بررسی اینکه آیا پیام ریپلای به صوتی است
  isVoiceReplyToVoice(message) {
    try {
      // بررسی اینکه آیا پیام صوتی است و به پیام دیگری ریپلای کرده
      if (!message.voice || !message.reply_to_message) {
        return false;
      }

      // بررسی اینکه آیا پیام اصلی (ریپلای شده) صوتی است
      if (!message.reply_to_message.voice) {
        return false;
      }

      console.log('✅ [PRACTICE_MANAGER] Voice reply to voice message detected');
      return true;

    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error checking voice reply:', error);
      return false;
    }
  }

  // ثبت تمرین در فایل داده‌ها
  async registerPractice(message) {
    try {
      const practiceDataPath = '../data/practice_data.json';
      let practiceData = {
        daily_practices: {},
        practice_schedule: { enabled: 1, hours: [], days: [] }
      };

      // خواندن داده‌های موجود
      if (fs.existsSync(practiceDataPath)) {
        practiceData = JSON.parse(fs.readFileSync(practiceDataPath, 'utf8'));
      }

      const today = moment().format('YYYY-MM-DD');
      const userId = message.from.id;
      const userName = message.from.first_name + (message.from.last_name ? ' ' + message.from.last_name : '');
      const chatId = message.chat.id;

      // ایجاد ساختار برای روز جاری اگر وجود ندارد
      if (!practiceData.daily_practices[today]) {
        practiceData.daily_practices[today] = {
          date: today,
          practices: {}
        };
      }

      // ثبت تمرین کاربر
      practiceData.daily_practices[today].practices[userId] = {
        user_id: userId,
        user_name: userName,
        chat_id: chatId,
        message_id: message.message_id,
        submission_time: new Date().toISOString(),
        status: "completed"
      };

      // ذخیره داده‌ها
      fs.writeFileSync(practiceDataPath, JSON.stringify(practiceData, null, 2));
      console.log(`✅ [PRACTICE_MANAGER] Practice registered for ${userName} (${userId})`);

      return true;

    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error registering practice:', error);
      return false;
    }
  }

  // دریافت لیست تمرین‌های امروز
  getTodayPractices() {
    try {
      const practiceDataPath = '../data/practice_data.json';
      if (!fs.existsSync(practiceDataPath)) {
        return [];
      }

      const practiceData = JSON.parse(fs.readFileSync(practiceDataPath, 'utf8'));
      const today = moment().format('YYYY-MM-DD');

      if (!practiceData.daily_practices[today]) {
        return [];
      }

      const practices = Object.values(practiceData.daily_practices[today].practices);
      console.log(`📊 [PRACTICE_MANAGER] Found ${practices.length} practices for today`);

      return practices;

    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error getting today practices:', error);
      return [];
    }
  }

  // ارسال پیام تایید ثبت تمرین
  async sendPracticeConfirmation(chatId, userName) {
    try {
      const todayPractices = this.getTodayPractices();
      const practiceList = todayPractices.map(practice =>
        `• ${practice.user_name}`
      ).join('\n');

      const message = `🎯 تمرین شما ثبت شد!

👤 ${userName}
⏰ ${getTimeStamp()}

📋 لیست تمرین‌های امروز (${todayPractices.length} نفر):
${practiceList}

✅ تمرین شما با موفقیت ثبت گردید.
💡 ادامه دهید، شما عالی هستید! 🌟`;

      const result = await sendMessage(chatId, message);

      if (result) {
        console.log(`✅ [PRACTICE_MANAGER] Practice confirmation sent successfully to ${chatId}`);
        return true;
      } else {
        console.error(`❌ [PRACTICE_MANAGER] Failed to send practice confirmation to ${chatId}`);
        return false;
      }

    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error sending practice confirmation:', error);
      return false;
    }
  }

  // ارسال پیام زمانی که زمان تمرین نیست
  async sendNotPracticeTimeMessage(chatId) {
    try {
      const nextPractice = this.getNextPracticeTime();
      let nextTimeMessage = '';

      if (nextPractice) {
        nextTimeMessage = `\n\n⏰ زمان تمرین بعدی:
📅 ${nextPractice.day} ساعت ${nextPractice.hour}:00`;
      }

      // خواندن تنظیمات برای نمایش زمان‌های دقیق
      let practiceDaysInfo = '';
      let practiceHoursInfo = '';
      
      try {
        const settings = JSON.parse(fs.readFileSync('./data/settings.json', 'utf8'));
        const practiceDays = settings.practice_days || [];
        const practiceHours = settings.practice_hours || [];
        
        const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
        const activeDays = practiceDays.map(day => dayNames[day]).join('، ');
        
        practiceDaysInfo = activeDays;
        practiceHoursInfo = practiceHours.map(hour => `${hour}:00`).join('، ');
      } catch (error) {
        console.error('❌ [PRACTICE_MANAGER] Error reading settings for message:', error);
        practiceDaysInfo = 'تنظیم نشده';
        practiceHoursInfo = 'تنظیم نشده';
      }

      const message = `⚠️ زمان تمرین هنوز فرا نرسیده!

📝 برای ثبت تمرین باید در زمان تعیین شده اقدام کنید.

🎯 زمان‌های تمرین فعال:
📅 روزهای تمرین: ${practiceDaysInfo}
🕐 ساعت‌های تمرین: ${practiceHoursInfo}${nextTimeMessage}

💡 لطفاً در زمان مناسب تمرین خود را ارسال کنید.`;

      const result = await sendMessage(chatId, message);

      if (result) {
        console.log(`✅ [PRACTICE_MANAGER] Not practice time message sent successfully to ${chatId}`);
        return true;
      } else {
        console.error(`❌ [PRACTICE_MANAGER] Failed to send not practice time message to ${chatId}`);
        return false;
      }

    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error sending not practice time message:', error);
      return false;
    }
  }

  // پردازش ریپلای صوتی به صوتی
  async handleVoiceReplyToVoice(message) {
    try {
      const chatId = message.chat.id;
      const userName = message.from.first_name + (message.from.last_name ? ' ' + message.from.last_name : '');

      console.log(`🎤 [PRACTICE_MANAGER] Voice reply to voice detected from ${userName} in chat ${chatId}`);

      // بررسی زمان تمرین
      if (!this.isPracticeTime()) {
        console.log('⏰ [PRACTICE_MANAGER] Not practice time, sending guidance message');
        await this.sendNotPracticeTimeMessage(chatId);
        return true; // پیام پردازش شد اما تمرین ثبت نشد
      }

      // ثبت تمرین
      const registered = await this.registerPractice(message);
      if (!registered) {
        console.error(`❌ [PRACTICE_MANAGER] Failed to register practice for ${userName}`);
        return false;
      }

      // ارسال پیام تایید
      const confirmed = await this.sendPracticeConfirmation(chatId, userName);
      if (!confirmed) {
        console.error(`❌ [PRACTICE_MANAGER] Failed to send confirmation for ${userName}`);
        return false;
      }

      console.log(`✅ [PRACTICE_MANAGER] Voice reply practice handled successfully for ${userName}`);
      return true;

    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error handling voice reply to voice:', error);
      return false;
    }
  }

  // پردازش پیام تمرین
  async handlePracticeMessage(message) {
    try {
      const chatId = message.chat.id;
      const userName = message.from.first_name + (message.from.last_name ? ' ' + message.from.last_name : '');

      console.log(`🎯 [PRACTICE_MANAGER] Practice message detected from ${userName} in chat ${chatId}`);

      // ارسال تشکر
      const success = await this.thankForPractice(chatId, userName);

      if (success) {
        console.log(`✅ [PRACTICE_MANAGER] Practice message handled successfully for ${userName}`);
        return true;
      } else {
        console.error(`❌ [PRACTICE_MANAGER] Failed to handle practice message for ${userName}`);
        return false;
      }

    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error handling practice message:', error);
      return false;
    }
  }

  // بررسی اینکه آیا پیام تحلیل تمرین است
  async isPracticeAnalysisMessage(message) {
    try {
      // خواندن کلمات کلیدی تحلیل از کانفیگ
      const settingsPath = './data/settings.json';
      let analysisKeywords = ['تحلیل']; // مقدار پیش‌فرض
      
      if (fs.existsSync(settingsPath)) {
        try {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          analysisKeywords = settings.analysis_keywords || ['تحلیل'];
        } catch (error) {
          console.error('❌ [PRACTICE_MANAGER] Error reading analysis keywords from config:', error);
        }
      }
      
      // بررسی اینکه آیا پیام متنی با کلمات کلیدی تحلیل است یا پیام صوتی
      const isTextAnalysis = message.text && analysisKeywords.includes(message.text.trim());
      const isVoiceAnalysis = message.voice;
      
      if (!isTextAnalysis && !isVoiceAnalysis) {
        console.log(`❌ [PRACTICE_MANAGER] Text "${message.text}" not in analysis keywords: [${analysisKeywords.join(', ')}]`);
        return false;
      }
      
      // بررسی اینکه آیا ریپلای به پیام دیگری است
      if (!message.reply_to_message) {
        return false;
      }
      
      // بررسی اینکه آیا کاربر ادمین است (هر نقش ادمین یا ادمین گروه)
      const userId = message.from.id;
      const chatId = message.chat.id;
      
      // بررسی نقش‌های تعریف شده در USERS_BY_ROLE
      const { USERS_BY_ROLE } = require('./3config');
      let isAdmin = false;
      let userRole = null;
      
      // بررسی تمام نقش‌های موجود در USERS_BY_ROLE
      Object.entries(USERS_BY_ROLE).forEach(([role, users]) => {
        if (role !== 'STUDENT') { // فقط نقش‌های غیر دانش‌آموز
          const hasRole = users.some(user => (typeof user === 'object' ? user.id : user) === userId);
          if (hasRole) {
            isAdmin = true;
            userRole = role;
            console.log(`✅ [PRACTICE_MANAGER] User ${userId} has admin role: ${role}`);
          }
        }
      });
      
      // اگر کاربر نقش ادمین ندارد، بررسی کن که آیا ادمین گروه است
      if (!isAdmin) {
        try {
          const { getChatMember } = require('./4bale');
          const memberInfo = await getChatMember(chatId, userId);
          
          if (memberInfo && (memberInfo.status === 'administrator' || memberInfo.status === 'creator')) {
            isAdmin = true;
            userRole = memberInfo.status === 'creator' ? 'GROUP_CREATOR' : 'GROUP_ADMIN';
            console.log(`✅ [PRACTICE_MANAGER] User ${userId} is group admin with status: ${memberInfo.status}`);
          } else {
            console.log(`❌ [PRACTICE_MANAGER] User ${userId} is not group admin, status: ${memberInfo?.status || 'unknown'}`);
          }
        } catch (error) {
          console.error('❌ [PRACTICE_MANAGER] Error checking group admin status:', error);
        }
      }
      
      if (!isAdmin) {
        console.log(`❌ [PRACTICE_MANAGER] User ${userId} is not admin/coach/assistant or group admin`);
        return false;
      }
      
      // بررسی اینکه آیا پیام اصلی تمرین است (صوتی)
      const originalMessage = message.reply_to_message;
      if (!originalMessage.voice) {
        console.log(`❌ [PRACTICE_MANAGER] Original message is not voice`);
        return false;
      }
      
      const analysisType = isTextAnalysis ? "text_analysis" : "voice_analysis";
      console.log(`✅ [PRACTICE_MANAGER] Practice analysis message detected from admin with role ${userRole} (type: ${analysisType})`);
      return true;
    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error checking practice analysis message:', error);
      return false;
    }
  }

  // مدیریت پیام تحلیل تمرین
  async handlePracticeAnalysis(message) {
    try {
      const chatId = message.chat.id;
      const coachName = message.from.first_name + (message.from.last_name ? ' ' + message.from.last_name : '');
      const originalMessage = message.reply_to_message;
      const studentName = originalMessage.from.first_name + (originalMessage.last_name ? ' ' + originalMessage.last_name : '');
      const studentId = originalMessage.from.id;
      
      console.log(`🎤 [PRACTICE_MANAGER] Practice analysis from ${coachName} for ${studentName}`);
      
      // ثبت تحلیل تمرین
      const analysisRegistered = await this.registerPracticeAnalysis(message);
      if (!analysisRegistered) {
        console.error(`❌ [PRACTICE_MANAGER] Failed to register practice analysis`);
        return false;
      }
      
      // ارسال کیبورد نظرسنجی به گروه
      const feedbackSent = await this.sendFeedbackKeyboardToStudent(studentId, chatId, studentName, coachName);
      if (!feedbackSent) {
        console.error(`❌ [PRACTICE_MANAGER] Failed to send feedback keyboard to group`);
      }
      
      // ارسال لیست تحلیل‌های امروز در همان گروه
      const listSent = await this.sendTodayAnalysisList(chatId);
      if (!listSent) {
        console.error(`❌ [PRACTICE_MANAGER] Failed to send analysis list to group`);
        return false;
      }
      
      // ارسال لیست تحلیل‌های امروز به گروه گزارش
      const reportSent = await this.sendTodayAnalysisListToReportGroup(chatId);
      if (!reportSent) {
        console.error(`❌ [PRACTICE_MANAGER] Failed to send analysis list to report group`);
      }
      
      console.log(`✅ [PRACTICE_MANAGER] Practice analysis handled successfully`);
      return true;
      
    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error handling practice analysis:', error);
      return false;
    }
  }

  // ثبت تحلیل تمرین در فایل
  async registerPracticeAnalysis(message) {
    try {
      const analysisDataPath = './robot/data/practice_analysis.json';
      let analysisData = { analyses: {} };
      
      if (fs.existsSync(analysisDataPath)) {
        analysisData = JSON.parse(fs.readFileSync(analysisDataPath, 'utf8'));
      }
      
      const today = moment().format('YYYY-MM-DD');
      const coachId = message.from.id;
      const coachName = message.from.first_name + (message.from.last_name ? ' ' + message.from.last_name : '');
      const originalMessage = message.reply_to_message;
      const studentId = originalMessage.from.id;
      const studentName = originalMessage.from.first_name + (originalMessage.last_name ? ' ' + originalMessage.last_name : '');
      const chatId = message.chat.id;
      
      // دریافت نقش کاربر (شامل نقش‌های تعریف شده و ادمین گروه)
      let userRole = 'UNKNOWN';
      
      // ابتدا بررسی نقش‌های تعریف شده در USERS_BY_ROLE
      const { USERS_BY_ROLE } = require('./3config');
      let isAdmin = false;
      
      Object.entries(USERS_BY_ROLE).forEach(([role, users]) => {
        if (role !== 'STUDENT') {
          const hasRole = users.some(user => (typeof user === 'object' ? user.id : user) === coachId);
          if (hasRole) {
            userRole = role;
            isAdmin = true;
            console.log(`✅ [PRACTICE_MANAGER] User ${coachId} has role: ${role}`);
          }
        }
      });
      
      // اگر نقش تعریف شده ندارد، بررسی ادمین گروه
      if (!isAdmin) {
        try {
          const { getChatMember } = require('./4bale');
          const memberInfo = await getChatMember(chatId, coachId);
          
          if (memberInfo && (memberInfo.status === 'administrator' || memberInfo.status === 'creator')) {
            userRole = memberInfo.status === 'creator' ? 'GROUP_CREATOR' : 'GROUP_ADMIN';
            console.log(`✅ [PRACTICE_MANAGER] User ${coachId} is group admin with status: ${memberInfo.status}`);
          }
        } catch (error) {
          console.error('❌ [PRACTICE_MANAGER] Error checking group admin status in registerPracticeAnalysis:', error);
        }
      }
      
      if (!analysisData.analyses[today]) {
        analysisData.analyses[today] = {};
      }
      
      const analysisId = `${coachId}_${studentId}_${Date.now()}`;
      
      // تعیین نوع تحلیل بر اساس کانفیگ
      let analysisType = "voice_analysis";
      if (message.text) {
        const settingsPath = './data/settings.json';
        if (fs.existsSync(settingsPath)) {
          try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            const analysisKeywords = settings.analysis_keywords || ['تحلیل'];
            if (analysisKeywords.includes(message.text.trim())) {
              analysisType = "text_analysis";
            }
          } catch (error) {
            console.error('❌ [PRACTICE_MANAGER] Error reading analysis keywords for type determination:', error);
          }
        }
      }
      
      analysisData.analyses[today][analysisId] = {
        coach_id: coachId,
        coach_name: coachName,
        coach_role: userRole,
        student_id: studentId,
        student_name: studentName,
        chat_id: chatId,
        analysis_message_id: message.message_id,
        original_practice_message_id: originalMessage.message_id,
        analysis_time: new Date().toISOString(),
        type: analysisType
      };
      
      fs.writeFileSync(analysisDataPath, JSON.stringify(analysisData, null, 2));
      console.log(`✅ [PRACTICE_MANAGER] Practice analysis registered for ${studentName} by ${coachName} (role: ${userRole})`);
      return true;
      
    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error registering practice analysis:', error);
      return false;
    }
  }

  // ارسال لیست تحلیل‌های امروز
  async sendTodayAnalysisList(chatId) {
    try {
      const todayAnalyses = this.getTodayAnalyses();
      const chatAnalyses = todayAnalyses.filter(analysis => analysis.chat_id === chatId);
      
      if (chatAnalyses.length === 0) {
        console.log('❌ [PRACTICE_MANAGER] No analyses found for today in this chat');
        return false;
      }
      
      // ایجاد متن لیست
      const today = moment().format('jYYYY/jMM/jDD');
      const dayName = this.getPersianDayName(moment().day());
      
      let listText = `📋 لیست تحلیل تمرین ${dayName} ${today}\n\n`;
      
      // گروه‌بندی تحلیل‌ها بر اساس مربی/کمک مربی
      const analysesByCoach = {};
      chatAnalyses.forEach(analysis => {
        if (!analysesByCoach[analysis.coach_name]) {
          analysesByCoach[analysis.coach_name] = [];
        }
        analysesByCoach[analysis.coach_name].push(analysis);
      });
      
      // نمایش تحلیل‌ها گروه‌بندی شده
      Object.keys(analysesByCoach).forEach((coachName, coachIndex) => {
        // دریافت نقش کاربر از داده‌های تحلیل
        let userRole = 'ادمین'; // مقدار پیش‌فرض
        
        // پیدا کردن نقش کاربر از اولین تحلیل این مربی
        const firstAnalysis = analysesByCoach[coachName][0];
        if (firstAnalysis && firstAnalysis.coach_role) {
          // تبدیل نام نقش به فارسی
          const roleDisplayNames = {
            'SCHOOL_ADMIN': 'مدیر',
            'GROUP_ADMIN': 'ادمین گروه',
            'GROUP_CREATOR': 'مالک گروه',
            'COACH': 'مربی',
            'ASSISTANT': 'کمک مربی'
          };
          userRole = roleDisplayNames[firstAnalysis.coach_role] || firstAnalysis.coach_role;
        }
        
        listText += `تحلیل با: (${userRole}) ${coachName}\n`;
        analysesByCoach[coachName].forEach((analysis, index) => {
          const analysisTime = moment(analysis.analysis_time).format('HH:mm');
          listText += `${index + 1}- ${analysis.student_name} (${analysisTime})\n`;
        });
        if (coachIndex < Object.keys(analysesByCoach).length - 1) {
          listText += '\n';
        }
      });
      
      listText += `\n⏰ ${getTimeStamp()}`;
      
      const result = await sendMessage(chatId, listText);
      
      if (result) {
        console.log(`✅ [PRACTICE_MANAGER] Analysis list sent successfully to ${chatId}`);
        return true;
      } else {
        console.error(`❌ [PRACTICE_MANAGER] Failed to send analysis list to ${chatId}`);
        return false;
      }
      
    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error sending analysis list:', error);
      return false;
    }
  }

  // دریافت لیست تحلیل‌های امروز
  getTodayAnalyses() {
    try {
      const analysisDataPath = './robot/data/practice_analysis.json';
      if (!fs.existsSync(analysisDataPath)) {
        return [];
      }
      
      const analysisData = JSON.parse(fs.readFileSync(analysisDataPath, 'utf8'));
      const today = moment().format('YYYY-MM-DD');
      
      if (!analysisData.analyses[today]) {
        return [];
      }
      
      const analyses = Object.values(analysisData.analyses[today]);
      console.log(`📊 [PRACTICE_MANAGER] Found ${analyses.length} analyses for today`);
      
      return analyses;
      
    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error getting today analyses:', error);
      return [];
    }
  }

  // ارسال کیبورد نظرسنجی به گروه
  async sendFeedbackKeyboardToStudent(studentId, chatId, studentName, coachName) {
    try {
      const { sendMessageWithInlineKeyboard } = require('./4bale');
      
      const message = `🎯 تحلیل تمرین ${studentName} دریافت شد!

👤 تحلیل‌کننده: ${coachName}
📝 ${studentName} عزیز، لطفاً نظر خود را برای این تحلیل بیان کنید:`;

      const keyboard = [
        [
          { text: "1 ⭐", callback_data: `feedback_1_${chatId}_${studentId}` },
          { text: "2 ⭐⭐", callback_data: `feedback_2_${chatId}_${studentId}` },
          { text: "3 ⭐⭐⭐", callback_data: `feedback_3_${chatId}_${studentId}` },
          { text: "4 ⭐⭐⭐⭐", callback_data: `feedback_4_${chatId}_${studentId}` },
          { text: "5 ⭐⭐⭐⭐⭐", callback_data: `feedback_5_${chatId}_${studentId}` }
        ],
        [
          { text: "📝 توضیح", callback_data: `feedback_explanation_${chatId}_${studentId}` }
        ],
        [
          { text: "❌ لغو توضیح نظر", callback_data: `feedback_cancel_${chatId}_${studentId}` }
        ]
      ];

      // ارسال کیبورد به گروه
      const result = await sendMessageWithInlineKeyboard(chatId, message, keyboard);
      
      if (result) {
        console.log(`✅ [PRACTICE_MANAGER] Feedback keyboard sent to group ${chatId} for student ${studentName} (${studentId})`);
        return true;
      } else {
        console.error(`❌ [PRACTICE_MANAGER] Failed to send feedback keyboard to group ${chatId} for student ${studentName}`);
        return false;
      }
      
    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error sending feedback keyboard to group:', error);
      return false;
    }
  }

  // ارسال لیست تحلیل‌های امروز به گروه گزارش
  async sendTodayAnalysisListToReportGroup(chatId) {
    try {
      const reportGroupId = 5668045453; // گروه گزارش
      const todayAnalyses = this.getTodayAnalyses();
      
      console.log(`🔍 [PRACTICE_MANAGER] sendTodayAnalysisListToReportGroup called with chatId: ${chatId}`);
      console.log(`🔍 [PRACTICE_MANAGER] Total today analyses: ${todayAnalyses.length}`);
      
      // تبدیل chatId به string برای مقایسه دقیق
      const chatIdStr = chatId.toString();
      const chatAnalyses = todayAnalyses.filter(analysis => {
        const analysisChatIdStr = analysis.chat_id.toString();
        const match = analysisChatIdStr === chatIdStr;
        console.log(`🔍 [PRACTICE_MANAGER] Comparing chat_id: ${analysisChatIdStr} vs ${chatIdStr} = ${match}`);
        return match;
      });
      
      console.log(`🔍 [PRACTICE_MANAGER] Filtered analyses for chat ${chatId}: ${chatAnalyses.length}`);
      
      if (chatAnalyses.length === 0) {
        console.log(`❌ [PRACTICE_MANAGER] No analyses found for today in chat ${chatId}`);
        return false;
      }
      
      // ایجاد متن لیست
      const today = moment().format('jYYYY/jMM/jDD');
      const dayName = this.getPersianDayName(moment().day());
      
      let listText = `📋 لیست تحلیل تمرین ${dayName} ${today}\n\n`;
      
      // گروه‌بندی تحلیل‌ها بر اساس مربی/کمک مربی
      const analysesByCoach = {};
      chatAnalyses.forEach(analysis => {
        if (!analysesByCoach[analysis.coach_name]) {
          analysesByCoach[analysis.coach_name] = [];
        }
        analysesByCoach[analysis.coach_name].push(analysis);
      });
      
      // نمایش تحلیل‌ها گروه‌بندی شده
      Object.keys(analysesByCoach).forEach((coachName, coachIndex) => {
        // دریافت نقش کاربر از داده‌های تحلیل
        let userRole = 'ادمین'; // مقدار پیش‌فرض
        
        // پیدا کردن نقش کاربر از اولین تحلیل این مربی
        const firstAnalysis = analysesByCoach[coachName][0];
        if (firstAnalysis && firstAnalysis.coach_role) {
          // تبدیل نام نقش به فارسی
          const roleDisplayNames = {
            'SCHOOL_ADMIN': 'مدیر',
            'GROUP_ADMIN': 'ادمین گروه',
            'GROUP_CREATOR': 'مالک گروه',
            'COACH': 'مربی',
            'ASSISTANT': 'کمک مربی'
          };
          userRole = roleDisplayNames[firstAnalysis.coach_role] || firstAnalysis.coach_role;
        }
        
        listText += `تحلیل با: (${userRole}) ${coachName}\n`;
        analysesByCoach[coachName].forEach((analysis, index) => {
          const analysisTime = moment(analysis.analysis_time).format('HH:mm');
          let feedbackInfo = '';
          
          // نمایش اطلاعات نظرات در گروه گزارش
          if (analysis.feedback) {
            if (analysis.feedback.rating) {
              feedbackInfo += ` ⭐${'⭐'.repeat(analysis.feedback.rating - 1)}`;
            }
            if (analysis.feedback.explanation) {
              feedbackInfo += ` (ثبت نظر قرآن‌آموز)`;
            }
          }
          
          listText += `${index + 1}- ${analysis.student_name} (${analysisTime})${feedbackInfo}\n`;
        });
        if (coachIndex < Object.keys(analysesByCoach).length - 1) {
          listText += '\n';
        }
      });
      
      listText += `\n⏰ ${getTimeStamp()}`;
      
      const { sendMessage } = require('./4bale');
      const result = await sendMessage(reportGroupId, listText);
      
      if (result) {
        console.log(`✅ [PRACTICE_MANAGER] Analysis list sent successfully to report group ${reportGroupId}`);
        return true;
      } else {
        console.error(`❌ [PRACTICE_MANAGER] Failed to send analysis list to report group ${reportGroupId}`);
        return false;
      }
      
    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error sending analysis list to report group:', error);
      return false;
    }
  }

  // ذخیره امتیاز نظرسنجی
  async saveFeedbackRating(chatId, studentId, rating) {
    try {
      const analysisDataPath = './robot/data/practice_analysis.json';
      let analysisData = { analyses: {} };
      
      if (fs.existsSync(analysisDataPath)) {
        analysisData = JSON.parse(fs.readFileSync(analysisDataPath, 'utf8'));
      }
      
      const today = moment().format('YYYY-MM-DD');
      
      // پیدا کردن تحلیل مربوط به این دانش‌آموز در این گروه
      console.log(`🔍 [PRACTICE_MANAGER] Looking for analysis - Chat ID: ${chatId}, Student ID: ${studentId}`);
      console.log(`🔍 [PRACTICE_MANAGER] Today: ${today}`);
      console.log(`🔍 [PRACTICE_MANAGER] Available analyses:`, analysisData.analyses[today]);
      
      if (analysisData.analyses[today]) {
        const analysisEntries = Object.entries(analysisData.analyses[today]);
        console.log(`🔍 [PRACTICE_MANAGER] Analysis entries:`, analysisEntries);
        
        const targetAnalysis = analysisEntries.find(([id, analysis]) => {
          const chatMatch = analysis.chat_id.toString() === chatId.toString();
          const studentMatch = analysis.student_id.toString() === studentId.toString();
          console.log(`🔍 [PRACTICE_MANAGER] Checking analysis ${id}: chat_id=${analysis.chat_id}(${typeof analysis.chat_id}) vs ${chatId}(${typeof chatId}) = ${chatMatch}`);
          console.log(`🔍 [PRACTICE_MANAGER] Checking analysis ${id}: student_id=${analysis.student_id}(${typeof analysis.student_id}) vs ${studentId}(${typeof studentId}) = ${studentMatch}`);
          return chatMatch && studentMatch;
        });
        
        if (targetAnalysis) {
          const [analysisId, analysis] = targetAnalysis;
          
          // اضافه کردن امتیاز به تحلیل
          if (!analysis.feedback) {
            analysis.feedback = {};
          }
          analysis.feedback.rating = rating;
          analysis.feedback.rating_time = new Date().toISOString();
          
          // ذخیره تغییرات
          fs.writeFileSync(analysisDataPath, JSON.stringify(analysisData, null, 2));
          console.log(`✅ [PRACTICE_MANAGER] Feedback rating ${rating} saved for student ${studentId} in chat ${chatId}`);
          
          // ارسال لیست به‌روز شده به گروه گزارش
          try {
            await this.sendTodayAnalysisListToReportGroup(chatId);
            console.log(`✅ [PRACTICE_MANAGER] Updated analysis list sent to report group after rating`);
          } catch (error) {
            console.error(`❌ [PRACTICE_MANAGER] Failed to send updated analysis list to report group:`, error);
          }
          
          return true;
        }
      }
      
      console.log(`❌ [PRACTICE_MANAGER] No analysis found for student ${studentId} in chat ${chatId}`);
      return false;
      
    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error saving feedback rating:', error);
      return false;
    }
  }

  // ذخیره توضیح نظرسنجی
  async saveFeedbackExplanation(chatId, studentId, explanation) {
    try {
      const analysisDataPath = './robot/data/practice_analysis.json';
      let analysisData = { analyses: {} };
      
      if (fs.existsSync(analysisDataPath)) {
        analysisData = JSON.parse(fs.readFileSync(analysisDataPath, 'utf8'));
      }
      
      const today = moment().format('YYYY-MM-DD');
      
      // پیدا کردن تحلیل مربوط به این دانش‌آموز در این گروه
      console.log(`🔍 [PRACTICE_MANAGER] Looking for analysis explanation - Chat ID: ${chatId}, Student ID: ${studentId}`);
      console.log(`🔍 [PRACTICE_MANAGER] Today: ${today}`);
      console.log(`🔍 [PRACTICE_MANAGER] Available analyses:`, analysisData.analyses[today]);
      
      if (analysisData.analyses[today]) {
        const analysisEntries = Object.entries(analysisData.analyses[today]);
        console.log(`🔍 [PRACTICE_MANAGER] Analysis entries for explanation:`, analysisEntries);
        
        const targetAnalysis = analysisEntries.find(([id, analysis]) => {
          const chatMatch = analysis.chat_id.toString() === chatId.toString();
          const studentMatch = analysis.student_id.toString() === studentId.toString();
          console.log(`🔍 [PRACTICE_MANAGER] Checking analysis explanation ${id}: chat_id=${analysis.chat_id}(${typeof analysis.chat_id}) vs ${chatId}(${typeof chatId}) = ${chatMatch}`);
          console.log(`🔍 [PRACTICE_MANAGER] Checking analysis explanation ${id}: student_id=${analysis.student_id}(${typeof analysis.student_id}) vs ${studentId}(${typeof studentId}) = ${studentMatch}`);
          return chatMatch && studentMatch;
        });
        
        if (targetAnalysis) {
          const [analysisId, analysis] = targetAnalysis;
          
          // اضافه کردن توضیح به تحلیل
          if (!analysis.feedback) {
            analysis.feedback = {};
          }
          analysis.feedback.explanation = explanation;
          analysis.feedback.explanation_time = new Date().toISOString();
          
          // ذخیره تغییرات
          fs.writeFileSync(analysisDataPath, JSON.stringify(analysisData, null, 2));
          console.log(`✅ [PRACTICE_MANAGER] Feedback explanation saved for student ${studentId} in chat ${chatId}`);
          
          // ارسال لیست به‌روز شده به گروه گزارش
          try {
            await this.sendTodayAnalysisListToReportGroup(chatId);
            console.log(`✅ [PRACTICE_MANAGER] Updated analysis list sent to report group after explanation`);
          } catch (error) {
            console.error(`❌ [PRACTICE_MANAGER] Failed to send updated analysis list to report group:`, error);
          }
          
          return true;
        }
      }
      
      console.log(`❌ [PRACTICE_MANAGER] No analysis found for student ${studentId} in chat ${chatId}`);
      return false;
      
    } catch (error) {
      console.error('❌ [PRACTICE_MANAGER] Error saving feedback explanation:', error);
      return false;
    }
  }

  // مدیریت وضعیت کاربران منتظر توضیح

  // تنظیم وضعیت کاربر منتظر توضیح
  setUserWaitingForExplanation(userId, chatId, studentId) {
    this.usersWaitingForExplanation.set(userId, { chatId, studentId });
    console.log(`📝 [PRACTICE_MANAGER] User ${userId} is now waiting for explanation for chat ${chatId}, student ${studentId}`);
  }

  // بررسی اینکه آیا کاربر منتظر توضیح است
  isUserWaitingForExplanation(userId) {
    return this.usersWaitingForExplanation.has(userId);
  }

  // دریافت اطلاعات توضیح کاربر
  getUserExplanationInfo(userId) {
    return this.usersWaitingForExplanation.get(userId);
  }

  // پاک کردن وضعیت کاربر بعد از دریافت توضیح
  clearUserExplanationStatus(userId) {
    this.usersWaitingForExplanation.delete(userId);
    console.log(`✅ [PRACTICE_MANAGER] User ${userId} explanation status cleared`);
  }

  // دریافت وضعیت سیستم
  getStatus() {
    return {
      isActive: true,
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }
}

// ایجاد نمونه سراسری
const practiceManager = new PracticeManager();

module.exports = { 
  practiceManager,
  PracticeManager 
};
