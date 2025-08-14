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
    //this.groupLink = "ble.ir/join/Gah9cS9LzQ";
    this.baseUrl = "https://tapi.bale.ai/bot"; // استفاده از Bale API
    
    // خواندن توکن بات مستقیماً از کانفیگ
    try {
      const { BOT_TOKEN } = require('./3config');
      this.botToken = BOT_TOKEN;
      console.log(`🔑 [PAYMENT] Bot token loaded directly: ${this.botToken}`);
    } catch (error) {
      console.error(`❌ [PAYMENT] Error loading bot token:`, error);
      this.botToken = null;
    }
    
    console.log('✅ PaymentModule initialized successfully');
  }

  // 🔧 تنظیم توکن بات
  setBotToken(botToken) {
    this.botToken = botToken;
    this.baseUrl = `https://tapi.bale.ai/bot/${botToken}`; // استفاده از Bale API
    console.log(`🔑 Bot token set for payment module: ${botToken}`);
    console.log(`🔗 Base URL set to: ${this.baseUrl}`);
  }

  // 📤 ارسال درخواست HTTP
  async makeRequest(url, payload) {
    try {
      console.log(`📤 [PAYMENT] Sending request to: ${url}`);
      console.log(`📦 [PAYMENT] Payload:`, JSON.stringify(payload, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      console.log(`📡 [PAYMENT] Response status: ${response.status}`);
      console.log(`📡 [PAYMENT] Response headers:`, response.headers);
      
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
      
      // ساخت URL کامل با توکن بات
      const fullUrl = `https://tapi.bale.ai/bot/${this.botToken}/sendInvoice`;
      console.log(`🔗 [PAYMENT] Using full URL: ${fullUrl}`);
      console.log(`🔑 [PAYMENT] Bot token: ${this.botToken}`);
      console.log(`💳 [PAYMENT] Payment token: ${this.paymentToken}`);
      console.log(`💰 [PAYMENT] Cost amount: ${costAmount}`);
      console.log(`📊 [PAYMENT] Workshop data:`, JSON.stringify(workshopData, null, 2));
      
      // استفاده از 4bale.js که قبلاً کار می‌کرده
      try {
        const { sendInvoice } = require('./4bale');
        const invoiceData = {
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
        
        console.log(`📤 [PAYMENT] Using 4bale.js sendInvoice with data:`, JSON.stringify(invoiceData, null, 2));
        const result = await sendInvoice(chatId, invoiceData);
        
        if (result) {
          console.log(`✅ [PAYMENT] Invoice sent successfully via 4bale.js for workshop ${workshopId}`);
          return true;
        } else {
          console.error(`❌ [PAYMENT] Failed to send invoice via 4bale.js`);
          return false;
        }
      } catch (error) {
        console.error(`❌ [PAYMENT] Error using 4bale.js sendInvoice:`, error);
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
      console.log(`📋 [PAYMENT] Answering PreCheckoutQuery: ${preCheckoutQueryId}, ok: ${ok}`);
      
      // استفاده از 4bale.js برای answerPreCheckoutQuery
      try {
        const { answerPreCheckoutQuery } = require('./4bale');
        const result = await answerPreCheckoutQuery(preCheckoutQueryId, ok, errorMessage);
        
        if (result) {
          console.log(`✅ [PAYMENT] PreCheckoutQuery answered successfully via 4bale.js`);
          return true;
        } else {
          console.error(`❌ [PAYMENT] Failed to answer PreCheckoutQuery via 4bale.js`);
          return false;
        }
      } catch (error) {
        console.error(`❌ [PAYMENT] Error using 4bale.js answerPreCheckoutQuery:`, error);
        return false;
      }
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
       
       // بررسی لینک کارگاه - اگر لینک معتبر نیست، از لینک پیش‌فرض استفاده کن
       let groupLink = workshopData?.link || this.groupLink;
       console.log(`🔍 [PAYMENT] Workshop link check: "${groupLink}"`);
       
       // بررسی معتبر بودن لینک
       if (!groupLink || groupLink.length < 5 || (!groupLink.startsWith('http') && !groupLink.startsWith('t.me') && !groupLink.startsWith('ble.ir'))) {
         groupLink = "ble.ir/join/Gah9cS9LzQ"; // لینک پیش‌فرض
         console.log(`⚠️ [PAYMENT] Invalid workshop link, using default: ${groupLink}`);
       } else {
         console.log(`✅ [PAYMENT] Using workshop link: ${groupLink}`);
       }
      
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
