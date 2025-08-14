// 🎯 سیستم ارزیابی و مدیریت گروه - نسخه 1.0.0
// مدیریت ارزیابی‌ها، بستن/باز کردن گروه و تنظیمات زمان‌بندی

const fs = require('fs');
const path = require('path');

class GroupEvaluationConfig {
  constructor() {
    this.configFile = path.join(__dirname, 'data', 'group_evaluation_config.json');
    this.defaultConfig = {
      // تنظیمات کلی سیستم
      systemEnabled: true,
      lastUpdate: new Date().toISOString(),
      updatedBy: 'system',
      
      // تنظیمات ارزیابی
      evaluation: {
        enabled: true,
        autoEvaluation: true,
        evaluationDays: [0, 1, 2, 3, 4, 5, 6], // همه روزها
        evaluationTime: "20:00", // ساعت 8 شب
        evaluationDuration: 60, // مدت زمان ارزیابی به دقیقه
        questionsPerEvaluation: 5, // تعداد سوالات هر ارزیابی
        passingScore: 70, // نمره قبولی
        retryLimit: 3 // تعداد تلاش مجدد
      },
      
      // تنظیمات مدیریت گروه
      groupManagement: {
        enabled: true,
        autoClose: true,
        autoOpen: true,
        closeTime: "23:00", // ساعت بستن گروه
        openTime: "06:00",  // ساعت باز کردن گروه
        weekendMode: true,  // حالت آخر هفته
        weekendCloseTime: "22:00", // ساعت بستن آخر هفته
        weekendOpenTime: "08:00"   // ساعت باز کردن آخر هفته
      },
      
      // تنظیمات اعلان‌ها
      notifications: {
        enabled: true,
        evaluationReminder: true,
        groupStatusChange: true,
        adminNotifications: true,
        reminderTime: "19:30" // 30 دقیقه قبل از ارزیابی
      },
      
      // تنظیمات دسترسی
      permissions: {
        adminOnly: true, // فقط ادمین‌ها می‌توانند تنظیمات را تغییر دهند
        evaluationAccess: ['SCHOOL_ADMIN', 'COACH', 'ASSISTANT'],
        groupControlAccess: ['SCHOOL_ADMIN', 'COACH'],
        configAccess: ['SCHOOL_ADMIN']
      },
      
      // تنظیمات زمان‌بندی
      scheduling: {
        timezone: 'Asia/Tehran',
        daylightSaving: true,
        customSchedules: [] // برنامه‌های زمان‌بندی سفارشی
      }
    };
    
    this.config = this.loadConfig();
    console.log('✅ [GROUP_EVAL_CONFIG] Configuration loaded successfully');
  }

  // بارگذاری کانفیگ از فایل
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8');
        const config = JSON.parse(data);
        console.log('✅ [GROUP_EVAL_CONFIG] Config loaded from file');
        return { ...this.defaultConfig, ...config };
      } else {
        // ایجاد فایل پیش‌فرض
        this.saveConfig(this.defaultConfig);
        console.log('✅ [GROUP_EVAL_CONFIG] Default config created');
        return this.defaultConfig;
      }
    } catch (error) {
      console.error('❌ [GROUP_EVAL_CONFIG] Error loading config:', error);
      return this.defaultConfig;
    }
  }

  // ذخیره کانفیگ در فایل
  saveConfig(config = null) {
    try {
      const configToSave = config || this.config;
      const dataDir = path.dirname(this.configFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(this.configFile, JSON.stringify(configToSave, null, 2), 'utf8');
      console.log('✅ [GROUP_EVAL_CONFIG] Config saved successfully');
      return true;
    } catch (error) {
      console.error('❌ [GROUP_EVAL_CONFIG] Error saving config:', error);
      return false;
    }
  }

  // دریافت کل کانفیگ
  getConfig() {
    return { ...this.config };
  }

  // فعال/غیرفعال کردن سیستم
  setSystemEnabled(enabled, updatedBy = 'unknown') {
    this.config.systemEnabled = enabled;
    this.config.lastUpdate = new Date().toISOString();
    this.config.updatedBy = updatedBy;
    return this.saveConfig();
  }

  // فعال/غیرفعال کردن ارزیابی
  setEvaluationEnabled(enabled, updatedBy = 'unknown') {
    this.config.evaluation.enabled = enabled;
    this.config.lastUpdate = new Date().toISOString();
    this.config.updatedBy = updatedBy;
    return this.saveConfig();
  }

  // فعال/غیرفعال کردن مدیریت گروه
  setGroupManagementEnabled(enabled, updatedBy = 'unknown') {
    this.config.groupManagement.enabled = enabled;
    this.config.lastUpdate = new Date().toISOString();
    this.config.updatedBy = updatedBy;
    return this.saveConfig();
  }

  // تنظیم زمان ارزیابی
  setEvaluationTime(time, updatedBy = 'unknown') {
    if (this.isValidTimeFormat(time)) {
      this.config.evaluation.evaluationTime = time;
      this.config.lastUpdate = new Date().toISOString();
      this.config.updatedBy = updatedBy;
      return this.saveConfig();
    }
    return false;
  }

  // تنظیم زمان بستن گروه
  setGroupCloseTime(time, updatedBy = 'unknown') {
    if (this.isValidTimeFormat(time)) {
      this.config.groupManagement.closeTime = time;
      this.config.lastUpdate = new Date().toISOString();
      this.config.updatedBy = updatedBy;
      return this.saveConfig();
    }
    return false;
  }

  // تنظیم زمان باز کردن گروه
  setGroupOpenTime(time, updatedBy = 'unknown') {
    if (this.isValidTimeFormat(time)) {
      this.config.groupManagement.openTime = time;
      this.config.lastUpdate = new Date().toISOString();
      this.config.updatedBy = updatedBy;
      return this.saveConfig();
    }
    return false;
  }

  // تنظیم روزهای ارزیابی
  setEvaluationDays(days, updatedBy = 'unknown') {
    if (Array.isArray(days) && days.every(day => day >= 0 && day <= 6)) {
      this.config.evaluation.evaluationDays = days;
      this.config.lastUpdate = new Date().toISOString();
      this.config.updatedBy = updatedBy;
      return this.saveConfig();
    }
    return false;
  }

  // بررسی دسترسی کاربر
  hasPermission(userId, permission, userRoles) {
    try {
      const { getUserInfo } = require('./3config');
      const userInfo = getUserInfo(userId);
      
      if (!userInfo) return false;
      
      const userRole = userInfo.role;
      
      switch (permission) {
        case 'evaluationAccess':
          return this.config.permissions.evaluationAccess.includes(userRole);
        case 'groupControlAccess':
          return this.config.permissions.groupControlAccess.includes(userRole);
        case 'configAccess':
          return this.config.permissions.configAccess.includes(userRole);
        default:
          return false;
      }
    } catch (error) {
      console.error('❌ [GROUP_EVAL_CONFIG] Error checking permissions:', error);
      return false;
    }
  }

  // بررسی فرمت زمان
  isValidTimeFormat(time) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  // دریافت وضعیت فعلی سیستم
  getSystemStatus() {
    return {
      systemEnabled: this.config.systemEnabled,
      evaluationEnabled: this.config.evaluation.enabled,
      groupManagementEnabled: this.config.groupManagement.enabled,
      lastUpdate: this.config.lastUpdate,
      updatedBy: this.config.updatedBy
    };
  }

  // بررسی اینکه آیا زمان ارزیابی رسیده
  isEvaluationTime() {
    if (!this.config.evaluation.enabled) return false;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now.getDay();
    
    return this.config.evaluation.evaluationDays.includes(currentDay) && 
           currentTime === this.config.evaluation.evaluationTime;
  }

  // بررسی اینکه آیا زمان بستن گروه رسیده
  isGroupCloseTime() {
    if (!this.config.groupManagement.enabled || !this.config.groupManagement.autoClose) return false;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now.getDay();
    
    // آخر هفته (جمعه = 6)
    if (this.config.groupManagement.weekendMode && currentDay === 6) {
      return currentTime === this.config.groupManagement.weekendCloseTime;
    }
    
    return currentTime === this.config.groupManagement.closeTime;
  }

  // بررسی اینکه آیا زمان باز کردن گروه رسیده
  isGroupOpenTime() {
    if (!this.config.groupManagement.enabled || !this.config.groupManagement.autoOpen) return false;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now.getDay();
    
    // آخر هفته (شنبه = 0)
    if (this.config.groupManagement.weekendMode && currentDay === 0) {
      return currentTime === this.config.groupManagement.weekendOpenTime;
    }
    
    return currentTime === this.config.groupManagement.openTime;
  }

  // اضافه کردن برنامه زمان‌بندی سفارشی
  addCustomSchedule(schedule, updatedBy = 'unknown') {
    if (schedule && schedule.name && schedule.action && schedule.time) {
      this.config.scheduling.customSchedules.push({
        ...schedule,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedBy: updatedBy
      });
      
      this.config.lastUpdate = new Date().toISOString();
      this.config.updatedBy = updatedBy;
      return this.saveConfig();
    }
    return false;
  }

  // حذف برنامه زمان‌بندی سفارشی
  removeCustomSchedule(scheduleId, updatedBy = 'unknown') {
    const index = this.config.scheduling.customSchedules.findIndex(s => s.id === scheduleId);
    if (index !== -1) {
      this.config.scheduling.customSchedules.splice(index, 1);
      this.config.lastUpdate = new Date().toISOString();
      this.config.updatedBy = updatedBy;
      return this.saveConfig();
    }
    return false;
  }

  // دریافت برنامه‌های زمان‌بندی سفارشی
  getCustomSchedules() {
    return [...this.config.scheduling.customSchedules];
  }

  // ریست کردن کانفیگ به حالت پیش‌فرض
  resetToDefault(updatedBy = 'unknown') {
    this.config = { ...this.defaultConfig };
    this.config.lastUpdate = new Date().toISOString();
    this.config.updatedBy = updatedBy;
    return this.saveConfig();
  }

  // به‌روزرسانی تنظیمات دسترسی
  updatePermissions(permissions, updatedBy = 'unknown') {
    if (permissions && typeof permissions === 'object') {
      this.config.permissions = { ...this.config.permissions, ...permissions };
      this.config.lastUpdate = new Date().toISOString();
      this.config.updatedBy = updatedBy;
      return this.saveConfig();
    }
    return false;
  }
}

// ایجاد نمونه از کلاس
const groupEvaluationConfig = new GroupEvaluationConfig();

module.exports = {
  GroupEvaluationConfig,
  groupEvaluationConfig
};
