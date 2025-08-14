//🎯 ماژول پرداخت - نسخه 1.0.0
// مدیریت پرداخت‌ها و فاکتورها برای کارگاه‌ها
// بر اساس payment_module.py ساخته شده

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class PaymentModule {
  constructor() {
    this.userStates = {};
    this.paymentToken = "WALLET-LIiCzxGZnCd58Obr"; // توکن تولید
    this.groupLink = "ble.ir/join/Gah9cS9LzQ";
    this.baseUrl = "https://tapi.bale.ai/bot"; // استفاده از Bale API
    
    console.log('✅ PaymentModule initialized successfully');
  }

  // 🔧 تنظیم توکن بات
  setBotToken(botToken) {
    this.botToken = botToken;
    this.baseUrl = `https://tapi.bale.ai/bot${botToken}`; // استفاده از Bale API
    console.log('🔑 Bot token set for payment module');
  }

  // 📤 ارسال درخواست HTTP
  async makeRequest(url, payload) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 10000
      });
      
      console.log(`📡 [PAYMENT] Request to ${url}: ${response.status}`);
      return response;
    } catch (error) {
      console.error(`❌ [PAYMENT] Error in request to ${url}:`, error);
      return null;
    }
  }

  // 💰 ارسال فاکتور پرداخت واقعی با Bale API (درون پلتفرم)
  async sendInvoice(chatId, workshopId, workshopData) {
    try {
      console.log(`💰 [PAYMENT] Sending real payment invoice for workshop ${workshopId} to chat ${chatId}`);
      
      // تبدیل هزینه به عدد
      const costText = workshopData.cost || '0 تومان';
      const costAmount = this.extractAmountFromCost(costText);
      const costInToman = Math.floor(costAmount / 10);
      
      // استفاده از Bale API sendInvoice برای پرداخت درون پلتفرم (دقیقاً مثل پایتون)
      const payload = {
        chat_id: chatId,
        title: `پرداخت برای ${workshopData.name || 'کارگاه'}`,
        description: `پرداخت برای ثبت‌نام در کارگاه ${workshopData.name || 'کارگاه'} با مبلغ ${costInToman} تومان`,
        payload: `workshop_${workshopId}_${Date.now()}`,
        provider_token: this.paymentToken,
        currency: "IRR",
        prices: [{
          label: `کارگاه ${workshopData.name || 'کارگاه'}`,
          amount: costAmount
        }],
        need_phone_number: true
      };
      
      const response = await this.makeRequest(`${this.baseUrl}/sendInvoice`, payload);
      if (response && response.ok) {
        const result = await response.json();
        if (result.ok) {
          console.log(`✅ [PAYMENT] Real invoice sent successfully for workshop ${workshopId}`);
          return true;
        } else {
          console.error(`❌ [PAYMENT] API error in sendInvoice:`, result);
          return false;
        }
      } else {
        console.error(`❌ [PAYMENT] HTTP error in sendInvoice: ${response?.status || 'No response'}`);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ [PAYMENT] Error in sendInvoice:`, error);
      return false;
    }
  }

  // 🔢 استخراج مبلغ از متن هزینه
  extractAmountFromCost(costText) {
    try {
      // حذف "تومان" و فاصله‌ها
      let cleanText = costText.replace("تومان", "").replace(/\s/g, "").replace(/,/g, "");
      
      // تبدیل اعداد فارسی به انگلیسی
      const persianToEnglish = {
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
        '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
      };
      
      for (const [persian, english] of Object.entries(persianToEnglish)) {
        cleanText = cleanText.replace(new RegExp(persian, 'g'), english);
      }
      
      // تبدیل به عدد و ضرب در 10 (برای ریال)
      const amount = parseInt(cleanText) * 10;
      return amount;
    } catch (error) {
      console.error(`❌ [PAYMENT] Error extracting amount from cost:`, error);
      return 10000; // مقدار پیش‌فرض
    }
  }

  // ✅ پاسخ به PreCheckoutQuery
  async answerPreCheckoutQuery(preCheckoutQueryId, ok = true, errorMessage = null) {
    try {
      const payload = {
        pre_checkout_query_id: preCheckoutQueryId,
        ok: ok
      };
      
      if (errorMessage) {
        payload.error_message = errorMessage;
      }
      
      const response = await this.makeRequest(`${this.baseUrl}/answerPreCheckoutQuery`, payload);
      if (response && response.ok) {
        const result = await response.json();
        if (result.ok) {
          console.log(`✅ [PAYMENT] PreCheckoutQuery answered successfully`);
          return true;
        } else {
          console.error(`❌ [PAYMENT] API error in answerPreCheckoutQuery:`, result);
        }
      }
      
      console.error(`❌ [PAYMENT] Failed to answer PreCheckoutQuery`);
      return false;
    } catch (error) {
      console.error(`❌ [PAYMENT] Error in answerPreCheckoutQuery:`, error);
      return false;
    }
  }

  // 🎯 پردازش PreCheckoutQuery
  async handlePreCheckoutQuery(preCheckoutQuery) {
    try {
      const preCheckoutQueryId = preCheckoutQuery.id;
      const userId = preCheckoutQuery.from.id;
      
      console.log(`📋 [PAYMENT] Received PreCheckoutQuery from user ${userId}`);
      
      // پاسخ مثبت به درخواست پیش از پرداخت
      const success = await this.answerPreCheckoutQuery(preCheckoutQueryId, true);
      if (success) {
        this.userStates[userId] = "PAYMENT_CONFIRMED";
        console.log(`✅ [PAYMENT] PreCheckoutQuery confirmed for user ${userId}`);
      }
      
      return success;
    } catch (error) {
      console.error(`❌ [PAYMENT] Error handling PreCheckoutQuery:`, error);
      return false;
    }
  }

  // 💸 پردازش پرداخت موفق
  async handleSuccessfulPayment(message) {
    try {
      const chatId = message.chat.id;
      const userId = message.from.id;
      const successfulPayment = message.successful_payment;
      
      console.log(`💸 [PAYMENT] Processing successful payment for user ${userId}:`, successfulPayment);
      
      // دریافت اطلاعات کارگاه از وضعیت کاربر
      const workshopId = this.userStates[`workshop_${userId}`];
      let workshopData = null;
      
      if (workshopId) {
        // خواندن اطلاعات کارگاه از فایل
        try {
          const { readJson } = require('./3config');
          const workshops = await readJson('data/workshops.json', {});
          workshopData = workshops.coach[workshopId];
          console.log(`📚 [PAYMENT] Found workshop data:`, workshopData);
        } catch (error) {
          console.error(`❌ [PAYMENT] Error reading workshop data:`, error);
        }
      }
      
      const instructorName = workshopData?.name || 'کارگاه';
      const groupLink = workshopData?.link || this.groupLink;
      
      // ارسال پیام‌های موفقیت
      const successMessage = `💸 پرداخت برای '${instructorName}' با موفقیت انجام شد!`;
      console.log(`✅ [PAYMENT] Sending success message: ${successMessage}`);
      
      const { sendMessage } = require('./4bale');
      await sendMessage(chatId, successMessage, {
        keyboard: [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']],
        resize_keyboard: true
      });
      
      // ارسال لینک گروه
      const groupMessage = `📎 لینک ورود به گروه: ${groupLink}`;
      console.log(`🔗 [PAYMENT] Sending group link: ${groupMessage}`);
      
      await sendMessage(chatId, groupMessage, {
        keyboard: [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']],
        resize_keyboard: true
      });
      
      // ارسال پیام تشکر
      const thankMessage = "🎉 از اینکه همراه شدید، بی‌نهایت سپاسگزاریم!";
      console.log(`🙏 [PAYMENT] Sending thank you message: ${thankMessage}`);
      
      await sendMessage(chatId, thankMessage, {
        keyboard: [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']],
        resize_keyboard: true
      });
      
      // پاک کردن وضعیت
      this.userStates[userId] = "DONE";
      if (`workshop_${userId}` in this.userStates) {
        delete this.userStates[`workshop_${userId}`];
      }
      
      console.log(`✅ [PAYMENT] Payment processing completed for user ${userId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ [PAYMENT] Error in handle_successful_payment:`, error);
      
      // ارسال پیام خطا به کاربر
      try {
        const chatId = message.chat.id;
        const { sendMessage } = require('./4bale');
        await sendMessage(chatId, "❌ خطا در پردازش پرداخت. لطفاً با پشتیبانی تماس بگیرید.", {
          keyboard: [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']],
          resize_keyboard: true
        });
      } catch (sendError) {
        console.error(`❌ [PAYMENT] Error sending error message:`, sendError);
      }
      
      return false;
    }
  }

  // 🎯 پردازش پرداخت کارگاه (برای قرآن‌آموز)
  async handleQuranStudentPayment(chatId, userId, workshopId) {
    try {
      console.log(`💰 [PAYMENT] Handling payment for Quran student ${userId}, workshop ${workshopId}`);
      
      // خواندن اطلاعات کارگاه
      const { readJson } = require('./server/utils/jsonStore');
      const workshops = await readJson('data/workshops.json', {});
      const workshopData = workshops.coach[workshopId];
      
      if (!workshopData) {
        console.error(`❌ [PAYMENT] Workshop ${workshopId} not found`);
        return false;
      }
      
      // تنظیم وضعیت کاربر
      this.userStates[userId] = "PAY";
      this.userStates[`workshop_${userId}`] = workshopId;
      
      // ارسال فاکتور
      const invoiceSent = await this.sendInvoice(chatId, workshopId, workshopData);
      if (invoiceSent) {
        this.userStates[userId] = "AWAITING_PAYMENT";
        console.log(`✅ [PAYMENT] Invoice sent successfully for user ${userId}`);
        return true;
      } else {
        // ارسال پیام خطا
        const { sendMessage } = require('./4bale');
        await sendMessage(chatId, "❌ خطا در ارسال صورتحساب. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.", {
          keyboard: [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']],
          resize_keyboard: true
        });
        return false;
      }
      
    } catch (error) {
      console.error(`❌ [PAYMENT] Error in handleQuranStudentPayment:`, error);
      return false;
    }
  }

  // 🔍 دریافت وضعیت کاربر
  getUserState(userId) {
    return this.userStates[userId] || "START";
  }

  // 🔧 تنظیم وضعیت کاربر
  setUserState(userId, state) {
    this.userStates[userId] = state;
    console.log(`🔄 [PAYMENT] User ${userId} state changed to: ${state}`);
  }

  // 📊 دریافت آمار وضعیت‌ها
  getStatistics() {
    const stats = {};
    for (const [userId, state] of Object.entries(this.userStates)) {
      stats[state] = (stats[state] || 0) + 1;
    }
    
    return {
      totalUsers: Object.keys(this.userStates).length,
      stateDistribution: stats,
      lastUpdated: Date.now()
    };
  }

  // 🧹 پاک کردن وضعیت‌های قدیمی
  cleanupOldStates(maxAge = 24 * 60 * 60 * 1000) { // 24 ساعت
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [userId, state] of Object.entries(this.userStates)) {
      if (state === "DONE" || state === "START") {
        // وضعیت‌های نهایی را پاک کن
        delete this.userStates[userId];
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 [PAYMENT] Cleaned up ${cleanedCount} old user states`);
    }
    
    return cleanedCount;
  }
}

module.exports = PaymentModule;
