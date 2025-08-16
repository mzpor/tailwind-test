//🎯 ماژول مدیریت تخفیف - نسخه 2.0.0 (ساده شده)
// مدیریت کدهای تخفیف برای کارگاه‌ها - فقط مبلغ ثابت
// قوانین: مدت 10 روزه، یکبار مصرف، یک کاربر

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class DiscountModule {
  constructor() {
    this.dataFile = path.join(__dirname, 'data', 'discount_codes.json');
    this.workshopsFile = path.join(__dirname, 'data', 'workshops.json');
    this.discountCodes = {};
    this.loadData();
    console.log('✅ DiscountModule initialized successfully (Fixed Amount Only)');
  }

  // بارگذاری داده‌های کدهای تخفیف
  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        this.discountCodes = data.discountCodes || {};
        console.log(`📊 [DISCOUNT] Loaded ${Object.keys(this.discountCodes).length} discount codes`);
      }
    } catch (error) {
      console.error('❌ [DISCOUNT] Error loading discount data:', error);
      this.discountCodes = {};
    }
  }

  // ذخیره داده‌های کدهای تخفیف
  saveData() {
    try {
      const data = {
        discountCodes: this.discountCodes,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      console.log('💾 [DISCOUNT] Discount data saved successfully');
    } catch (error) {
      console.error('❌ [DISCOUNT] Error saving discount data:', error);
    }
  }

  // تولید کد تخفیف جدید - فقط مبلغ ثابت
  generateDiscountCode(adminId, discountAmount, description = '') {
    try {
      // تولید کد 4 رقمی رندوم (اعداد و حروف) - طبق درخواست کاربر
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // تاریخ انقضا: 10 روز از امروز
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 10);
      
      const discountCode = {
        code: code,
        type: 'fixed', // فقط مبلغ ثابت
        value: discountAmount, // مبلغ تومان
        description: description,
        maxUsage: 1, // فقط یکبار استفاده
        usedBy: [], // لیست کاربرانی که استفاده کرده‌اند
        createdBy: adminId,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        isActive: true
      };

      this.discountCodes[code] = discountCode;
      this.saveData();
      
      console.log(`🎫 [DISCOUNT] New fixed discount code generated: ${code} - ${discountAmount.toLocaleString()} تومان`);
      return {
        success: true,
        code: code,
        discountCode: discountCode
      };
    } catch (error) {
      console.error('❌ [DISCOUNT] Error generating discount code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // اعتبارسنجی کد تخفیف
  validateDiscountCode(code, userId, originalPrice) {
    try {
      const discountCode = this.discountCodes[code];
      
      if (!discountCode) {
        return {
          valid: false,
          message: '❌ کد تخفیف یافت نشد'
        };
      }

      if (!discountCode.isActive) {
        return {
          valid: false,
          message: '❌ این کد تخفیف غیرفعال شده است'
        };
      }

      // بررسی انقضا
      const now = new Date();
      const expiresAt = new Date(discountCode.expiresAt);
      if (now > expiresAt) {
        return {
          valid: false,
          message: '❌ کد تخفیف منقضی شده است'
        };
      }

      // بررسی تعداد استفاده
      if (discountCode.usedBy.length >= discountCode.maxUsage) {
        return {
          valid: false,
          message: '❌ این کد تخفیف قبلاً استفاده شده است'
        };
      }

      // بررسی اینکه آیا کاربر قبلاً از این کد استفاده کرده
      if (discountCode.usedBy.includes(userId)) {
        return {
          valid: false,
          message: '❌ شما قبلاً از این کد تخفیف استفاده کرده‌اید'
        };
      }

      // محاسبه قیمت جدید - فقط تخفیف مبلغ ثابت
      const discountAmount = Math.min(discountCode.value, originalPrice);
      const newPrice = Math.max(0, originalPrice - discountAmount);

      return {
        valid: true,
        originalPrice: originalPrice,
        newPrice: newPrice,
        discountAmount: discountAmount,
        discountType: 'fixed',
        discountValue: discountCode.value,
        message: `✅ کد تخفیف معتبر است! قیمت جدید: ${newPrice.toLocaleString()} تومان`
      };
    } catch (error) {
      console.error('❌ [DISCOUNT] Error validating discount code:', error);
      return {
        valid: false,
        message: '❌ خطا در بررسی کد تخفیف'
      };
    }
  }

  // استفاده از کد تخفیف
  useDiscountCode(code, userId) {
    try {
      const discountCode = this.discountCodes[code];
      
      if (!discountCode) {
        return {
          success: false,
          message: '❌ کد تخفیف یافت نشد'
        };
      }

      // اضافه کردن کاربر به لیست استفاده‌کنندگان
      if (!discountCode.usedBy.includes(userId)) {
        discountCode.usedBy.push(userId);
        
        // اگر تعداد استفاده به حداکثر رسید، غیرفعال کردن کد
        if (discountCode.usedBy.length >= discountCode.maxUsage) {
          discountCode.isActive = false;
        }
        
        this.saveData();
        
        console.log(`🎯 [DISCOUNT] Discount code ${code} used by user ${userId}`);
        return {
          success: true,
          message: '✅ کد تخفیف با موفقیت استفاده شد'
        };
      } else {
        return {
          success: false,
          message: '❌ شما قبلاً از این کد تخفیف استفاده کرده‌اید'
        };
      }
    } catch (error) {
      console.error('❌ [DISCOUNT] Error using discount code:', error);
      return {
        success: false,
        message: '❌ خطا در استفاده از کد تخفیف'
      };
    }
  }

  // دریافت کدهای تخفیف 3 روز گذشته
  getRecentDiscountCodes() {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const recentCodes = Object.values(this.discountCodes).filter(code => {
        const createdAt = new Date(code.createdAt);
        return createdAt >= threeDaysAgo;
      });

      return {
        success: true,
        codes: recentCodes,
        count: recentCodes.length
      };
    } catch (error) {
      console.error('❌ [DISCOUNT] Error getting recent discount codes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // دریافت کدهای تخفیف قدیمی‌تر از 3 روز
  getOldDiscountCodes() {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const oldCodes = Object.values(this.discountCodes).filter(code => {
        const createdAt = new Date(code.createdAt);
        return createdAt < threeDaysAgo;
      });

      return {
        success: true,
        codes: oldCodes,
        count: oldCodes.length
      };
    } catch (error) {
      console.error('❌ [DISCOUNT] Error getting old discount codes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ذخیره کدهای قدیمی در workshops.json
  async saveOldCodesToWorkshops() {
    try {
      const oldCodes = this.getOldDiscountCodes();
      if (!oldCodes.success || oldCodes.count === 0) {
        return { success: true, message: 'هیچ کد قدیمی‌ای برای ذخیره وجود ندارد' };
      }

      // خواندن فایل workshops.json
      let workshopsData = {};
      if (fs.existsSync(this.workshopsFile)) {
        const workshopsContent = fs.readFileSync(this.workshopsFile, 'utf8');
        workshopsData = JSON.parse(workshopsContent);
      }

      // اضافه کردن کدهای قدیمی
      if (!workshopsData.oldDiscountCodes) {
        workshopsData.oldDiscountCodes = [];
      }

      oldCodes.codes.forEach(code => {
        workshopsData.oldDiscountCodes.push({
          ...code,
          movedToWorkshopsAt: new Date().toISOString()
        });
      });

      // ذخیره در workshops.json
      fs.writeFileSync(this.workshopsFile, JSON.stringify(workshopsData, null, 2));

      // حذف کدهای قدیمی از فایل اصلی
      oldCodes.codes.forEach(code => {
        delete this.discountCodes[code.code];
      });
      this.saveData();

      console.log(`💾 [DISCOUNT] Moved ${oldCodes.count} old discount codes to workshops.json`);
      return {
        success: true,
        message: `${oldCodes.count} کد قدیمی به workshops.json منتقل شد`
      };
    } catch (error) {
      console.error('❌ [DISCOUNT] Error saving old codes to workshops:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // دریافت لیست کدهای تخفیف فعال (برای backward compatibility)
  getActiveDiscountCodes() {
    return this.getRecentDiscountCodes();
  }

  // غیرفعال کردن کد تخفیف
  deactivateDiscountCode(code, adminId) {
    try {
      const discountCode = this.discountCodes[code];
      
      if (!discountCode) {
        return {
          success: false,
          message: '❌ کد تخفیف یافت نشد'
        };
      }

      discountCode.isActive = false;
      discountCode.deactivatedBy = adminId;
      discountCode.deactivatedAt = new Date().toISOString();
      
      this.saveData();
      
      console.log(`🚫 [DISCOUNT] Discount code ${code} deactivated by admin ${adminId}`);
      return {
        success: true,
        message: '✅ کد تخفیف غیرفعال شد'
      };
    } catch (error) {
      console.error('❌ [DISCOUNT] Error deactivating discount code:', error);
      return {
        success: false,
        message: '❌ خطا در غیرفعال کردن کد تخفیف'
      };
    }
  }

  // پاک کردن کدهای منقضی شده
  cleanupExpiredCodes() {
    try {
      const now = new Date();
      let cleanedCount = 0;
      
      Object.keys(this.discountCodes).forEach(code => {
        const discountCode = this.discountCodes[code];
        const expiresAt = new Date(discountCode.expiresAt);
        
        if (now > expiresAt) {
          delete this.discountCodes[code];
          cleanedCount++;
        }
      });
      
      if (cleanedCount > 0) {
        this.saveData();
        console.log(`🧹 [DISCOUNT] Cleaned up ${cleanedCount} expired discount codes`);
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('❌ [DISCOUNT] Error cleaning up expired codes:', error);
      return 0;
    }
  }

  // دریافت آمار کدهای تخفیف
  getDiscountStats() {
    try {
      const totalCodes = Object.keys(this.discountCodes).length;
      const activeCodes = Object.values(this.discountCodes).filter(code => code.isActive).length;
      const usedCodes = Object.values(this.discountCodes).filter(code => code.usedBy.length > 0).length;
      const expiredCodes = Object.values(this.discountCodes).filter(code => {
        const now = new Date();
        const expiresAt = new Date(code.expiresAt);
        return now > expiresAt;
      }).length;

      return {
        success: true,
        stats: {
          total: totalCodes,
          active: activeCodes,
          used: usedCodes,
          expired: expiredCodes
        }
      };
    } catch (error) {
      console.error('❌ [DISCOUNT] Error getting discount stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// ایجاد نمونه از کلاس
const discountModule = new DiscountModule();

// پاک کردن کدهای منقضی شده و انتقال کدهای قدیمی هر 24 ساعت
setInterval(async () => {
  discountModule.cleanupExpiredCodes();
  await discountModule.saveOldCodesToWorkshops();
}, 24 * 60 * 60 * 1000);

module.exports = discountModule;
