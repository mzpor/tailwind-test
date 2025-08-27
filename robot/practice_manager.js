// 🎯 مدیریت تمرین‌ها - نسخه 1.1.0
// تشکر از ارسال تمرین صوتی و مدیریت ریپلای به صوتی

const { sendMessage } = require('./4bale');
const { getTimeStamp } = require('./1time');
const fs = require('fs');
const moment = require('moment-jalaali');
moment.loadPersian({ usePersianDigits: false });

class PracticeManager {
  constructor() {
    console.log('✅ [PRACTICE_MANAGER] Practice Manager initialized successfully');
  }

  // بررسی اینکه آیا زمان فعلی زمان تمرین است
  isPracticeTime() {
    try {
      const now = moment();
      const currentDay = now.day(); // 0 = یکشنبه, 1 = دوشنبه, ..., 6 = شنبه
      const currentHour = now.hour();

      // خواندن تنظیمات تمرین
      const settingsPath = '../data/settings.json';
      if (!fs.existsSync(settingsPath)) {
        console.error('❌ [PRACTICE_MANAGER] Settings file not found');
        return false;
      }

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const practiceDays = settings.practice_days || [];
      const practiceHours = settings.practice_hours || [];

      console.log(`⏰ [PRACTICE_MANAGER] Checking practice time - Day: ${currentDay}, Hour: ${currentHour}`);
      console.log(`📅 [PRACTICE_MANAGER] Practice days: ${practiceDays.join(', ')}`);
      console.log(`🕐 [PRACTICE_MANAGER] Practice hours: ${practiceHours.join(', ')}`);

      const isValidDay = practiceDays.includes(currentDay);
      const isValidHour = practiceHours.includes(currentHour);

      const result = isValidDay && isValidHour;
      console.log(`✅ [PRACTICE_MANAGER] Practice time check result: ${result}`);

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
      const settings = JSON.parse(fs.readFileSync('../data/settings.json', 'utf8'));
      const practiceDays = settings.practice_days || [];
      const practiceHours = settings.practice_hours || [];

      const dayNames = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

      let nextPracticeTime = null;
      let minDiff = Infinity;

      for (const day of practiceDays) {
        for (const hour of practiceHours) {
          const practiceTime = moment().day(day).hour(hour).minute(0).second(0);

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

      // بررسی اینکه آیا کپشن شامل کلمه "تمرین" است
      const caption = message.caption.toLowerCase();
      const practiceKeywords = ['تمرین', 'tamrin', 'practice', 'تمرینات', 'tamrinat'];
      
      return practiceKeywords.some(keyword => caption.includes(keyword));
      
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

      const message = `⚠️ زمان تمرین هنوز فرا نرسیده!

📝 برای ثبت تمرین باید در زمان تعیین شده اقدام کنید.

🎯 زمان‌های تمرین از تنظیمات:
• روزهای تمرین: بررسی تنظیمات ربات
• ساعت‌های تمرین: بررسی تنظیمات ربات${nextTimeMessage}

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

module.exports = { practiceManager };
