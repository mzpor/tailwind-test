//🌐 لایه انتزاع API - نسخه 1.0.0
// کاهش وابستگی مستقیم ماژول‌ها به API بله

const { sendMessage, sendMessageWithInlineKeyboard, deleteMessage, getChat, getChatMember, getChatAdministrators, answerCallbackQuery, editMessage, getUpdates } = require('./4bale');
const { eventSystem, EVENTS } = require('./event_system');

class APIAbstraction {
  constructor() {
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 ثانیه
    console.log('✅ APIAbstraction initialized successfully');
  }

  // تنظیم تعداد تلاش‌های مجدد
  setRetryConfig(attempts, delay) {
    this.retryAttempts = attempts;
    this.retryDelay = delay;
  }

  // تابع کمکی برای تاخیر
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ارسال پیام با مدیریت خطا و رویداد
  async sendMessage(chatId, text, replyMarkup = null) {
    const requestData = { chatId, text, replyMarkup };
    
    try {
      // انتشار رویداد درخواست
      await eventSystem.emit(EVENTS.API_REQUEST, requestData, 'api_abstraction');
      
      let lastError;
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const result = await sendMessage(chatId, text, replyMarkup);
          
          // انتشار رویداد پاسخ موفق
          await eventSystem.emit(EVENTS.API_RESPONSE, {
            success: true,
            method: 'sendMessage',
            chatId,
            result
          }, 'api_abstraction');
          
          return result;
        } catch (error) {
          lastError = error;
          
          // انتشار رویداد خطا
          await eventSystem.emit(EVENTS.API_ERROR, {
            method: 'sendMessage',
            chatId,
            error: error.message,
            attempt
          }, 'api_abstraction');
          
          if (attempt < this.retryAttempts) {
            await this.delay(this.retryDelay * attempt);
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error(`❌ [API] Failed to send message to ${chatId}:`, error.message);
      throw error;
    }
  }

  // ارسال پیام با کلیدهای درون‌خطی
  async sendMessageWithInlineKeyboard(chatId, text, keyboard) {
    const requestData = { chatId, text, keyboard };
    
    try {
      await eventSystem.emit(EVENTS.API_REQUEST, requestData, 'api_abstraction');
      
      let lastError;
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const result = await sendMessageWithInlineKeyboard(chatId, text, keyboard);
          
          await eventSystem.emit(EVENTS.API_RESPONSE, {
            success: true,
            method: 'sendMessageWithInlineKeyboard',
            chatId,
            result
          }, 'api_abstraction');
          
          return result;
        } catch (error) {
          lastError = error;
          
          await eventSystem.emit(EVENTS.API_ERROR, {
            method: 'sendMessageWithInlineKeyboard',
            chatId,
            error: error.message,
            attempt
          }, 'api_abstraction');
          
          if (attempt < this.retryAttempts) {
            await this.delay(this.retryDelay * attempt);
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error(`❌ [API] Failed to send message with keyboard to ${chatId}:`, error.message);
      throw error;
    }
  }

  // حذف پیام
  async deleteMessage(chatId, messageId) {
    const requestData = { chatId, messageId };
    
    try {
      await eventSystem.emit(EVENTS.API_REQUEST, requestData, 'api_abstraction');
      
      let lastError;
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const result = await deleteMessage(chatId, messageId);
          
          await eventSystem.emit(EVENTS.API_RESPONSE, {
            success: true,
            method: 'deleteMessage',
            chatId,
            messageId,
            result
          }, 'api_abstraction');
          
          return result;
        } catch (error) {
          lastError = error;
          
          await eventSystem.emit(EVENTS.API_ERROR, {
            method: 'deleteMessage',
            chatId,
            messageId,
            error: error.message,
            attempt
          }, 'api_abstraction');
          
          if (attempt < this.retryAttempts) {
            await this.delay(this.retryDelay * attempt);
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error(`❌ [API] Failed to delete message ${messageId} from ${chatId}:`, error.message);
      throw error;
    }
  }

  // ویرایش پیام
  async editMessage(chatId, messageId, text, replyMarkup = null) {
    const requestData = { chatId, messageId, text, replyMarkup };
    
    try {
      await eventSystem.emit(EVENTS.API_REQUEST, requestData, 'api_abstraction');
      
      let lastError;
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const result = await editMessage(chatId, messageId, text, replyMarkup);
          
          await eventSystem.emit(EVENTS.API_RESPONSE, {
            success: true,
            method: 'editMessage',
            chatId,
            messageId,
            result
          }, 'api_abstraction');
          
          return result;
        } catch (error) {
          lastError = error;
          
          await eventSystem.emit(EVENTS.API_ERROR, {
            method: 'editMessage',
            chatId,
            messageId,
            error: error.message,
            attempt
          }, 'api_abstraction');
          
          if (attempt < this.retryAttempts) {
            await this.delay(this.retryDelay * attempt);
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error(`❌ [API] Failed to edit message ${messageId} in ${chatId}:`, error.message);
      throw error;
    }
  }

  // پاسخ به callback query
  async answerCallbackQuery(callbackQueryId, text = null) {
    const requestData = { callbackQueryId, text };
    
    try {
      await eventSystem.emit(EVENTS.API_REQUEST, requestData, 'api_abstraction');
      
      let lastError;
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const result = await answerCallbackQuery(callbackQueryId, text);
          
          await eventSystem.emit(EVENTS.API_RESPONSE, {
            success: true,
            method: 'answerCallbackQuery',
            callbackQueryId,
            result
          }, 'api_abstraction');
          
          return result;
        } catch (error) {
          lastError = error;
          
          await eventSystem.emit(EVENTS.API_ERROR, {
            method: 'answerCallbackQuery',
            callbackQueryId,
            error: error.message,
            attempt
          }, 'api_abstraction');
          
          if (attempt < this.retryAttempts) {
            await this.delay(this.retryDelay * attempt);
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error(`❌ [API] Failed to answer callback query ${callbackQueryId}:`, error.message);
      throw error;
    }
  }

  // دریافت اطلاعات چت
  async getChat(chatId) {
    const requestData = { chatId };
    
    try {
      await eventSystem.emit(EVENTS.API_REQUEST, requestData, 'api_abstraction');
      
      let lastError;
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const result = await getChat(chatId);
          
          await eventSystem.emit(EVENTS.API_RESPONSE, {
            success: true,
            method: 'getChat',
            chatId,
            result
          }, 'api_abstraction');
          
          return result;
        } catch (error) {
          lastError = error;
          
          await eventSystem.emit(EVENTS.API_ERROR, {
            method: 'getChat',
            chatId,
            error: error.message,
            attempt
          }, 'api_abstraction');
          
          if (attempt < this.retryAttempts) {
            await this.delay(this.retryDelay * attempt);
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error(`❌ [API] Failed to get chat ${chatId}:`, error.message);
      throw error;
    }
  }

  // دریافت اطلاعات عضو چت
  async getChatMember(chatId, userId) {
    const requestData = { chatId, userId };
    
    try {
      await eventSystem.emit(EVENTS.API_REQUEST, requestData, 'api_abstraction');
      
      let lastError;
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const result = await getChatMember(chatId, userId);
          
          await eventSystem.emit(EVENTS.API_RESPONSE, {
            success: true,
            method: 'getChatMember',
            chatId,
            userId,
            result
          }, 'api_abstraction');
          
          return result;
        } catch (error) {
          lastError = error;
          
          await eventSystem.emit(EVENTS.API_ERROR, {
            method: 'getChatMember',
            chatId,
            userId,
            error: error.message,
            attempt
          }, 'api_abstraction');
          
          if (attempt < this.retryAttempts) {
            await this.delay(this.retryDelay * attempt);
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error(`❌ [API] Failed to get chat member ${userId} from ${chatId}:`, error.message);
      throw error;
    }
  }

  // دریافت ادمین‌های چت
  async getChatAdministrators(chatId) {
    const requestData = { chatId };
    
    try {
      await eventSystem.emit(EVENTS.API_REQUEST, requestData, 'api_abstraction');
      
      let lastError;
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const result = await getChatAdministrators(chatId);
          
          await eventSystem.emit(EVENTS.API_RESPONSE, {
            success: true,
            method: 'getChatAdministrators',
            chatId,
            result
          }, 'api_abstraction');
          
          return result;
        } catch (error) {
          lastError = error;
          
          await eventSystem.emit(EVENTS.API_ERROR, {
            method: 'getChatAdministrators',
            chatId,
            error: error.message,
            attempt
          }, 'api_abstraction');
          
          if (attempt < this.retryAttempts) {
            await this.delay(this.retryDelay * attempt);
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error(`❌ [API] Failed to get chat administrators for ${chatId}:`, error.message);
      throw error;
    }
  }

  // دریافت به‌روزرسانی‌ها
  async getUpdates(offset = 0, limit = 100) {
    const requestData = { offset, limit };
    
    try {
      await eventSystem.emit(EVENTS.API_REQUEST, requestData, 'api_abstraction');
      
      let lastError;
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const result = await getUpdates(offset, limit);
          
          await eventSystem.emit(EVENTS.API_RESPONSE, {
            success: true,
            method: 'getUpdates',
            offset,
            limit,
            result
          }, 'api_abstraction');
          
          return result;
        } catch (error) {
          lastError = error;
          
          await eventSystem.emit(EVENTS.API_ERROR, {
            method: 'getUpdates',
            offset,
            limit,
            error: error.message,
            attempt
          }, 'api_abstraction');
          
          if (attempt < this.retryAttempts) {
            await this.delay(this.retryDelay * attempt);
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error(`❌ [API] Failed to get updates:`, error.message);
      throw error;
    }
  }

  // دریافت آمار API
  getStats() {
    return {
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay,
      eventSystemStats: eventSystem.getStats()
    };
  }
}

// ایجاد نمونه سراسری
const apiAbstraction = new APIAbstraction();

module.exports = {
  APIAbstraction,
  apiAbstraction,
  // توابع سازگاری برای ماژول‌های موجود
  sendMessage: (chatId, text, replyMarkup) => apiAbstraction.sendMessage(chatId, text, replyMarkup),
  sendMessageWithInlineKeyboard: (chatId, text, keyboard) => apiAbstraction.sendMessageWithInlineKeyboard(chatId, text, keyboard),
  deleteMessage: (chatId, messageId) => apiAbstraction.deleteMessage(chatId, messageId),
  editMessage: (chatId, messageId, text, replyMarkup) => apiAbstraction.editMessage(chatId, messageId, text, replyMarkup),
  answerCallbackQuery: (callbackQueryId, text) => apiAbstraction.answerCallbackQuery(callbackQueryId, text),
  getChat: (chatId) => apiAbstraction.getChat(chatId),
  getChatMember: (chatId, userId) => apiAbstraction.getChatMember(chatId, userId),
  getChatAdministrators: (chatId) => apiAbstraction.getChatAdministrators(chatId),
  getUpdates: (offset, limit) => apiAbstraction.getUpdates(offset, limit)
};
