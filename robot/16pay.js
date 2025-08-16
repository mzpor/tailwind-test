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
      
      // بهبود عنوان و توضیحات فاکتور
      const workshopTitle = `کارگاه شماره ${workshopId} - ${workshopData.name || 'کارگاه'}`;
      const workshopDescription = `📚 **ثبت‌نام در کارگاه:** ${workshopData.name || 'کارگاه'}
💰 **مبلغ:** ${costInToman} تومان (بدون تخفیف)
📖 **توضیحات:** ${workshopData.description || 'توضیحات موجود نیست'}
⏱️ **مدت:** ${workshopData.duration || 'نامشخص'}
📊 **سطح:** ${workshopData.level || 'نامشخص'}
👥 **ظرفیت:** ${workshopData.capacity || 'نامشخص'} نفر`;
      
      // استفاده از Bale API sendInvoice برای پرداخت درون پلتفرم (دقیقاً مثل پایتون)
      const payload = {
        chat_id: chatId,
        title: workshopTitle,
        description: workshopDescription,
        payload: `workshop_${workshopId}_${Date.now()}`,
        provider_token: this.paymentToken,
        currency: "IRR",
        prices: [{
          label: `کارگاه شماره ${workshopId} - ${workshopData.name || 'کارگاه'}`,
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
      
      const response = await this.makeRequest(fullUrl, payload);
      
      if (response && response.ok) {
        const result = await response.json();
        console.log(`✅ [PAYMENT] Invoice sent successfully:`, result);
        return {
          success: true,
          invoiceId: result.result?.invoice_id || 'unknown',
          result: result
        };
      } else {
        console.error(`❌ [PAYMENT] Failed to send invoice. Status: ${response?.status}`);
        if (response) {
          const errorText = await response.text();
          console.error(`❌ [PAYMENT] Error response:`, errorText);
        }
        return {
          success: false,
          error: `Failed to send invoice. Status: ${response?.status}`
        };
      }
    } catch (error) {
      console.error(`❌ [PAYMENT] Error in sendInvoice:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 💰 ارسال فاکتور پرداخت با تخفیف
  async sendDiscountedInvoice(chatId, workshopId, workshopData, discountCode, discountAmount, originalPrice) {
    try {
      console.log(`🎫 [PAYMENT] Sending discounted payment invoice for workshop ${workshopId} to chat ${chatId}`);
      console.log(`🎫 [PAYMENT] Discount code: ${discountCode}, Amount: ${discountAmount}, Original: ${originalPrice}`);
      
      // تبدیل هزینه به عدد
      const costText = workshopData.cost || '0 تومان';
      const costAmount = this.extractAmountFromCost(costText);
      const costInToman = Math.floor(costAmount / 10);
      
      // محاسبه قیمت نهایی با تخفیف
      const finalPrice = Math.max(0, costAmount - (discountAmount * 10)); // تبدیل تومان به ریال
      const finalPriceInToman = Math.floor(finalPrice / 10);
      
      // بهبود عنوان و توضیحات فاکتور با تخفیف
      const workshopTitle = `کارگاه شماره ${workshopId} - ${workshopData.name || 'کارگاه'} (با تخفیف)`;
      const workshopDescription = `📚 **ثبت‌نام در کارگاه:** ${workshopData.name || 'کارگاه'}
💰 **مبلغ اصلی:** ${costInToman} تومان
🎫 **کد تخفیف:** ${discountCode}
💸 **مبلغ تخفیف:** ${discountAmount} تومان
💳 **مبلغ نهایی:** ${finalPriceInToman} تومان
📖 **توضیحات:** ${workshopData.description || 'توضیحات موجود نیست'}
⏱️ **مدت:** ${workshopData.duration || 'نامشخص'}
📊 **سطح:** ${workshopData.level || 'نامشخص'}
👥 **ظرفیت:** ${workshopData.capacity || 'نامشخص'} نفر`;
      
      // استفاده از Bale API sendInvoice برای پرداخت درون پلتفرم با تخفیف
      const payload = {
        chat_id: chatId,
        title: workshopTitle,
        description: workshopDescription,
        payload: `workshop_${workshopId}_discount_${discountCode}_${Date.now()}`,
        provider_token: this.paymentToken,
        currency: "IRR",
        prices: [{
          label: `کارگاه شماره ${workshopId} - ${workshopData.name || 'کارگاه'} (با تخفیف ${discountAmount} تومان)`,
          amount: finalPrice
        }],
        need_phone_number: true
      };
      
      // ساخت URL کامل با توکن بات
      const fullUrl = `https://tapi.bale.ai/bot/${this.botToken}/sendInvoice`;
      console.log(`🔗 [PAYMENT] Using full URL: ${fullUrl}`);
      console.log(`🔑 [PAYMENT] Bot token: ${this.botToken}`);
      console.log(`💳 [PAYMENT] Payment token: ${this.paymentToken}`);
      console.log(`💰 [PAYMENT] Original cost: ${costAmount}, Final cost: ${finalPrice}`);
      
      const response = await this.makeRequest(fullUrl, payload);
      
      if (response && response.ok) {
        const result = await response.json();
        console.log(`✅ [PAYMENT] Discounted invoice sent successfully:`, result);
        return {
          success: true,
          invoiceId: result.result?.invoice_id || 'unknown',
          result: result,
          originalPrice: costAmount,
          discountAmount: discountAmount * 10, // تبدیل به ریال
          finalPrice: finalPrice
        };
      } else {
        console.error(`❌ [PAYMENT] Failed to send discounted invoice. Status: ${response?.status}`);
        if (response) {
          const errorText = await response.text();
          console.error(`❌ [PAYMENT] Error response:`, errorText);
        }
        return {
          success: false,
          error: `Failed to send discounted invoice. Status: ${response?.status}`
        };
      }
    } catch (error) {
      console.error(`❌ [PAYMENT] Error in sendDiscountedInvoice:`, error);
      return {
        success: false,
        error: error.message
      };
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
      
      // دریافت اطلاعات کارگاه از invoice_payload
      const invoicePayload = successfulPayment.invoice_payload;
      console.log(`🔍 [PAYMENT] Invoice payload: ${invoicePayload}`);
      
      // استخراج workshopId از payload (workshop_7_1755206650115)
      const workshopId = invoicePayload.split('_')[1];
      console.log(`🔍 [PAYMENT] Extracted workshop ID: ${workshopId}`);
      
      let workshopData = null;
      
      if (workshopId) {
        // خواندن اطلاعات کارگاه از فایل
        try {
          const workshopsPath = path.join(__dirname, 'data', 'workshops.json');
          const workshopsContent = fs.readFileSync(workshopsPath, 'utf8');
          const workshops = JSON.parse(workshopsContent);
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
      if (!groupLink || groupLink.length < 1) {
        groupLink = "ble.ir/join/Gah9cS9LzQ"; // لینک پیش‌فرض
        console.log(`⚠️ [PAYMENT] Invalid workshop link, using default: ${groupLink}`);
      } else {
        console.log(`✅ [PAYMENT] Using workshop link: ${groupLink}`);
      }
      
      // 🔥 ذخیره اطلاعات کارگاه در smart_registration.json
      try {
        const { readJson, writeJson } = require('./server/utils/jsonStore');
        const smartRegPath = 'data/smart_registration.json';
        const smartReg = await readJson(smartRegPath, { userStates: {} });
        
        // بررسی وجود کاربر
        if (!smartReg.userStates[userId]) {
          smartReg.userStates[userId] = {
            step: "completed",
            data: {},
            timestamp: Date.now()
          };
        }
        
        // ذخیره اطلاعات کارگاه
        const userData = smartReg.userStates[userId].data;
        userData.workshopId = `w-${workshopId}`;
        userData.coachId = workshopId;
        userData.workshopName = workshopData?.name || 'نامشخص';
        userData.workshopCost = workshopData?.cost || 'نامشخص';
        userData.workshopDuration = workshopData?.duration || 'نامشخص';
        userData.workshopLevel = workshopData?.level || 'نامشخص';
        userData.workshopCapacity = workshopData?.capacity || 'نامشخص';
        userData.workshopDescription = workshopData?.description || 'توضیحات موجود نیست';
        userData.paymentStatus = "paid";
        userData.registrationDate = new Date().toISOString().split('T')[0];
        userData.discountApplied = false; // بدون تخفیف
        userData.originalCost = workshopData?.cost || 'نامشخص';
        
        // ذخیره فایل
        await writeJson(smartRegPath, smartReg);
        console.log(`✅ [PAYMENT] Workshop data saved to smart_registration.json for user ${userId}`);
        
      } catch (saveError) {
        console.error(`❌ [PAYMENT] Error saving workshop data:`, saveError);
      }
      
      // ارسال پیام‌های موفقیت
      const successMessage = `💸 **پرداخت موفق!** 

📚 **کارگاه:** شماره ${workshopId} - ${instructorName}
💰 **مبلغ:** ${workshopData?.cost || 'نامشخص'} (بدون تخفیف)
✅ **وضعیت:** پرداخت تأیید شد
📅 **تاریخ ثبت‌نام:** ${new Date().toLocaleDateString('fa-IR')}`;

      console.log(`✅ [PAYMENT] Sending success message: ${successMessage}`);
      
      const { sendMessage } = require('./4bale');
      await sendMessage(chatId, successMessage, {
        keyboard: [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']],
        resize_keyboard: true
      });
      
      // ارسال لینک گروه
      const groupMessage = `📎 **لینک ورود به گروه کارگاه:**
${groupLink}

📱 **مراحل بعدی:**
• از طریق لینک بالا وارد گروه کارگاه شوید
• منتظر تماس از سوی استاد باشید
• شروع کلاس طبق برنامه اعلام شده`;
      
      console.log(`🔗 [PAYMENT] Sending group link: ${groupMessage}`);
      
      await sendMessage(chatId, groupMessage, {
        keyboard: [['شروع', 'قرآن‌آموز', 'ربات', 'خروج']],
        resize_keyboard: true
      });
      
      // ارسال پیام تشکر
      const thankMessage = `🎉 **از اینکه همراه شدید، بی‌نهایت سپاسگزاریم!**

💡 **نکات مهم:**
• ثبت‌نام شما در سیستم ذخیره شده است
• اطلاعات کارگاه در پروفایل شما قابل مشاهده است
• در صورت نیاز به پشتیبانی، با ادمین تماس بگیرید`;
      
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
