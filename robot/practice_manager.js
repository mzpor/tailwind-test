// 🎯 مدیریت تمرین‌ها - نسخه 1.0.0
// تشکر از ارسال تمرین صوتی

const { sendMessage } = require('./4bale');
const { getTimeStamp } = require('./1time');

class PracticeManager {
  constructor() {
    console.log('✅ [PRACTICE_MANAGER] Practice Manager initialized successfully');
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
