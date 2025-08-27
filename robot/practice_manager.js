// 🎯 مدیریت تمرین‌ها - نسخه 1.2.0
// تشکر از ارسال تمرین صوتی و مدیریت ریپلای به صوتی
// اضافه شده: مدیریت "تلاوتم" و لیست تمرین‌ها

const { sendMessage } = require('./4bale');
const { getTimeStamp } = require('./1time');
const fs = require('fs');
const moment = require('moment-jalaali');
moment.loadPersian({ usePersianDigits: false });

class PracticeManager {
  constructor() {
    console.log('✅ [PRACTICE_MANAGER] Practice Manager initialized successfully');
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
      const membersDataPath = './robot/data/members.json';
      if (!fs.existsSync(membersDataPath)) {
        console.log('❌ [PRACTICE_MANAGER] Members file not found');
        return [];
      }

      const membersData = JSON.parse(fs.readFileSync(membersDataPath, 'utf8'));
      const allGroupMembers = membersData.groups[chatId] || [];
      
      console.log(`📊 [PRACTICE_MANAGER] Found ${allGroupMembers.length} total members in group ${chatId}`);
      return allGroupMembers; // برگرداندن همه اعضا - فیلتر کردن در sendTodayPracticeList انجام می‌شود

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
