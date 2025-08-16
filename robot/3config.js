// گویا کردن اسم گروه
//⏰ 09:00:00 🗓️ دوشنبه 13 مرداد 1404
// ماژول تنظیمات اصلی ربات - به‌روزرسانی شده در 1404/05/15 ساعت 23:45
// مدیریت نقش‌ها غیرفعال شده - ROLES_BUTTON: 0

// ماژول‌های مورد نیاز
const path = require('path');
const fs = require('fs');

// تنظیمات API تلگرام
//const BOT_TOKEN = '1714651531:y2xOK6EBg5nzVV6fEWGqtOdc3nVqVgOuf4PZVQ7S';
//BOT_TOKEN = '1714651531:y2xOK6EBg5nzVV6fEWGqtOdc3nVqVgOuf4PZVQ7S'//#یار مدیر  modyar
BOT_TOKEN = "1778171143:vD6rjJXAYidLL7hQyQkBeu5TJ9KpRd4zAKegqUt3" // #محرابی  mtelbot
const BASE_URL = `https://tapi.bale.ai/bot${BOT_TOKEN}`;
const API_URL = () => BASE_URL;

// نگاشت نام گروه‌ها
const GROUP_NAMES = {
  5668045453: "گروه گزارش",
 // 4594690153: "گروه ربات ۱",
  5417069312: "گروه ربات ۲"
};

 // 1638058362: "لشگری",
//  1775811194: "محرابی",
 // 1114227010: "محمد ۱",
//  574330749: "محمد زارع ۲",
//"1790308237": {}  ایرانسل
// ===== کانفیگ نام‌های ظاهری نقش‌ها =====
const ROLE_DISPLAY_NAMES = {
  SCHOOL_ADMIN: 'مدیر',COACH:'مربی',ASSISTANT:'کمک‌‌‌مربی',STUDENT: 'قرآن‌آموز'  
  
   //SCHOOL_ADMIN:'مدیر', COACH: 'راهبر', ASSISTANT:'دبیر',  STUDENT:'فعال'
};

// ===== کانفیگ کارگاه‌ها =====
const WORKSHOP_CONFIG = {
  // فیلدهای اجباری/اختیاری (0 = اختیاری، 1 = اجباری)
  REQUIRED_FIELDS: {
    INSTRUCTOR_NAME: 1,    // نام مربی - اجباری
    PHONE: 0,              // تلفن - اختیاری  
    COST: 1,               // هزینه - اجباری
    LINK: 1                 // لینک - اجباری
    
    // INSTRUCTOR_NAME: 1,    // نام راهبر - اجباری
    // PHONE: 0,              // تلفن راهبر - اختیاری  
    // COST: 1,               // استان - اجباری
    // LINK: 1                 // لینک گروه - اجباری
  },
  
  // نام‌های ظاهری فیلدها
  FIELD_DISPLAY_NAMES: {
    INSTRUCTOR_NAME: 'نام مربی',     // نام مربی
    PHONE: 'تلفن مربی',             // تلفن مربی
    COST: 'هزینه',                   // هزینه
    LINK: 'لینک گروه'                // لینک گروه
    
    // INSTRUCTOR_NAME: 'نام راهبر',     // نام راهبر
    // PHONE: 'تلفن راهبر',             // تلفن راهبر
    // COST: 'استان',                   // استان
    // LINK: 'لینک گروه'                // لینک گروه
  },
  
  // نام ظاهری کارگاه
  WORKSHOP_DISPLAY_NAME: 'کارگاه',     // کارگاه
    
  // WORKSHOP_DISPLAY_NAME: 'کلاس',     // کلاس
  
  // مقادیر پیش‌فرض
  DEFAULTS: {
    CAPACITY: 20,                     // ظرفیت: 20 نفر
    DURATION: '1 ماه',                // مدت: 3 ماه
    LEVEL: 'همه سطوح',
    DESCRIPTION: 'توضیحات موجود نیست'
    
    // CAPACITY: 30,                     // ظرفیت: 30 نفر
    // DURATION: '1 ماه',                // مدت: 1 ماه
    // LEVEL: 'همه سطوح',
    // DESCRIPTION: 'توضیحات موجود نیست'
  }
};

// ===== کنترل نمایش دکمه‌ها در پنل مدیر =====
const BUTTON_VISIBILITY_CONFIG = {
  ROBOT_BUTTON: 0,  // 1 = نمایش دکمه ربات، 0 = عدم نمایش
  REGISTRATION_BUTTON: 1,  // 1 = نمایش دکمه ثبت‌نام ماه آینده، 0 = عدم نمایش
  // در آینده می‌توان دکمه‌های بیشتری اضافه کرد
  //SETTINGS_BUTTON: 1,
  ROLES_BUTTON: 0,  // مدیریت نقش‌ها غیرفعال شده
  PRACTICE_EVALUATION_DAYS_BUTTON: 0,  // دکمه روزهای تمرین و ارزیابی: 1 = فعال، 0 = غیرفعال
};

// ===== کنترل نمایش دکمه‌های اصلی برای هر نقش =====
const MAIN_BUTTONS_CONFIG = {
  // تنظیمات کلی دکمه‌ها
  REGISTER_INFO: 0,    // دکمه ثبت اطلاعات (0 = مخفی، 1 = نمایان)
       // دکمه تنظیمات (0 = مخفی، 1 = نمایان)
    // کنترل نمایش دکمه ثبت اطلاعات برای هر نقش
  REGISTER_INFO_BY_ROLE: {
    SCHOOL_ADMIN: 0,    // مدیر مدرسه: 1 = نمایش، 0 = مخفی
    COACH: 0,           // مربی: 1 = نمایش، 0 = مخفی
    ASSISTANT: 0,       // کمک مربی: 1 = نمایش، 0 = مخفی
    STUDENT: 0          // قرآن‌آموز: 1 = نمایش، 0 = مخفی
  },
  SETTINGS: 1,  
  // کنترل نمایش دکمه تنظیمات برای هر نقش
  SETTINGS_BY_ROLE: {
    SCHOOL_ADMIN: 1,    // مدیر مدرسه: 1 = نمایش، 0 = مخفی
    COACH: 0,           // مربی: 1 = نمایش، 0 = مخفی
    ASSISTANT: 0,       // کمک مربی: 1 = نمایش، 0 = مخفی
    STUDENT: 0          // قرآن‌آموز: 1 = نمایش، 0 = مخفی
  }
};

// ===== توابع کنترل نمایش دکمه‌های اصلی برای هر نقش =====

// بررسی نمایش دکمه ثبت اطلاعات برای نقش خاص
const isRegisterInfoVisibleForRole = (role) => {
  return MAIN_BUTTONS_CONFIG.REGISTER_INFO_BY_ROLE[role] === 1;
};

// بررسی نمایش دکمه تنظیمات برای نقش خاص
const isSettingsVisibleForRole = (role) => {
  return MAIN_BUTTONS_CONFIG.SETTINGS_BY_ROLE[role] === 1;
};

// تغییر وضعیت نمایش دکمه ثبت اطلاعات برای نقش خاص
const setRegisterInfoVisibilityForRole = (role, visible) => {
  if (MAIN_BUTTONS_CONFIG.REGISTER_INFO_BY_ROLE.hasOwnProperty(role)) {
    MAIN_BUTTONS_CONFIG.REGISTER_INFO_BY_ROLE[role] = visible ? 1 : 0;
    console.log(`🔄 [MAIN_BUTTONS] Register info visibility for role ${role} set to: ${visible ? 'visible' : 'hidden'}`);
    return true;
  }
  console.warn(`⚠️ [MAIN_BUTTONS] Role ${role} not found in register info config`);
  return false;
};

// تغییر وضعیت نمایش دکمه تنظیمات برای نقش خاص
const setSettingsVisibilityForRole = (role, visible) => {
  if (MAIN_BUTTONS_CONFIG.SETTINGS_BY_ROLE.hasOwnProperty(role)) {
    MAIN_BUTTONS_CONFIG.SETTINGS_BY_ROLE[role] = visible ? 1 : 0;
    console.log(`🔄 [MAIN_BUTTONS] Settings visibility for role ${role} set to: ${visible ? 'visible' : 'hidden'}`);
    return true;
  }
  console.warn(`⚠️ [MAIN_BUTTONS] Role ${role} not found in settings config`);
  return false;
};

// دریافت تمام تنظیمات نمایش دکمه‌های اصلی
const getMainButtonsConfig = () => {
  return { ...MAIN_BUTTONS_CONFIG };
};

// دریافت تنظیمات نمایش دکمه‌ها برای نقش خاص
const getButtonVisibilityForRole = (role) => {
  return {
    registerInfo: isRegisterInfoVisibleForRole(role),
    settings: isSettingsVisibleForRole(role)
  };
};

// ===== کنترل نمایش گروه‌ها برای نقش‌های مختلف =====
const GROUP_VISIBILITY_CONFIG = {
  COACH_SEE_ALL_GROUPS: 0,      // 0 = فقط گروه‌های خودش، 1 = همه گروه‌ها
  ASSISTANT_SEE_ALL_GROUPS: 0   // 0 = فقط گروه‌های خودش، 1 = همه گروه‌ها
};

// ===== کانفیگ مدیریت گروه‌ها =====
const GROUP_MANAGEMENT_CONFIG = {
  enabled: 0,  // 0 = غیرفعال (مدیریت گروه‌ها دیده نمی‌شود)، 1 = فعال (در پنل مدیر، مربی و کمک مربی دیده می‌شود)
  visibility: {
    admin: 1,        // مدیر مدرسه
    instructor: 1,   // مربی
    assistant: 1,    // کمک مربی
    regular: 0       // کاربران عادی - همه دسترسی دارند
  },
  permissions: {
    createGroup: ["admin", "instructor", "assistant", "regular"],
    editGroup: ["admin", "instructor", "assistant", "regular"],
    deleteGroup: ["admin", "instructor", "assistant", "regular"],
    viewGroups: ["admin", "instructor", "assistant", "regular"]
  }
};

// ===== کانفیگ مدیریت استادها =====
const OSATD_MANAGEMENT_CONFIG = {
  enabled: 1,  // 0 = غیرفعال (دکمه استادها دیده نمی‌شود)، 1 = فعال (در پنل مدیر، مربی و کمک مربی دیده می‌شود)
  visibility: {
    admin: 1,        // مدیر مدرسه
    instructor: 1,   // مربی
    assistant: 1,    // کمک مربی
    regular: 0       // کاربران عادی
  }
};

// ===== کانفیگ سیستم ارزیابی و تمرین =====
const EVALUATION_CONFIG_FILE = path.join(__dirname, 'data', 'evaluation_config.json');

// بارگذاری کانفیگ از فایل
function loadEvaluationConfig() {
  try {
    if (fs.existsSync(EVALUATION_CONFIG_FILE)) {
      const configData = fs.readFileSync(EVALUATION_CONFIG_FILE, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('❌ [CONFIG] خطا در بارگذاری کانفیگ ارزیابی:', error.message);
  }
  
  // کانفیگ پیش‌فرض در صورت خطا
  return {
    evaluation_system: {
      enabled: 1,
      practice_detection: { voice_with_caption: 1, voice_with_reply_task: 1, voice_with_reply_student: 1, text_only: 0 },
      practice_schedule: { enabled: 1, hours: [14, 15, 16], days: [0, 1, 2, 3, 4] },
      evaluation: { enabled: 1, min_evaluators: 2, auto_complete: 1 },
      satisfaction_survey: { enabled: 1, show_after_evaluation: 1, send_to_admin_group: 1 },
      reporting: { daily_reports: 1, weekly_reports: 1, monthly_reports: 1, send_to_admin_group: 1 },
      access: { admin: 1, instructor: 1, assistant: 1, regular: 0 }
    }
  };
}

const EVALUATION_SYSTEM_CONFIG = loadEvaluationConfig();

// ===== کنترل دسترسی کاربران =====
const USER_ACCESS_CONFIG = {
  allowUserReset: 1,  // 0 = کاربر نمی‌تواند ریست کند، 1 = کاربر می‌تواند ریست کند
};

// ===== کنترل گزارش ورود ربات به گروه‌ها =====
const BOT_JOIN_REPORT_CONFIG = {
  enabled: 1,  // 0: غیرفعال، 1: فعال
  report_to_group: "5668045453",  // گروه گزارش
  details_level: "full"  // basic/full
};

// ===== کنترل گزارش دوره‌ای وضعیت ربات =====
const BOT_STATUS_REPORT_CONFIG = {
  enabled: 0,  // 0: غیرفعال، 1: فعال
  interval_seconds: 10,  // هر چند ثانیه چک کند (پیش‌فرض: 10)
  report_level: "basic"  // basic: فقط admin status, full: همه اطلاعات
};

// ===== کنترل جمع‌آوری خودکار اطلاعات کاربران =====
const AUTO_COLLECT_USER_CONFIG = {
  enabled: 1,  // 0: غیرفعال، 1: فعال
  collect_from_all_messages: 1,  // 0: فقط پیام‌های متنی، 1: همه پیام‌ها
  update_existing_users: 1,  // 0: فقط کاربران جدید، 1: به‌روزرسانی همه کاربران
  report_to_admin: 1  // 0: عدم ارسال گزارش، 1: ارسال گزارش به گروه گزارش
};

// ===== سیستم کانفیگ گروه‌ها =====
const GROUPS_CONFIG_FILE = path.join(__dirname, 'data', 'groups_config.json');

// تابع بارگذاری کانفیگ گروه‌ها
const loadGroupsConfig = () => {
  try {
    if (fs.existsSync(GROUPS_CONFIG_FILE)) {
      const data = fs.readFileSync(GROUPS_CONFIG_FILE, 'utf8');
      const config = JSON.parse(data);
      console.log('✅ [CONFIG] Groups config loaded successfully');
      return config;
    } else {
      // ایجاد فایل پیش‌فرض
      const defaultConfig = {
        groups: {},
        config: {
          defaultEnabled: 1,
          lastUpdate: new Date().toISOString(),
          updatedBy: 'system'
        }
      };
      saveGroupsConfig(defaultConfig);
      return defaultConfig;
    }
  } catch (error) {
    console.error('❌ [CONFIG] Error loading groups config:', error);
    return {
      groups: {},
      config: {
        defaultEnabled: 1,
        lastUpdate: new Date().toISOString(),
        updatedBy: 'system'
      }
    };
  }
};

// تابع ذخیره کانفیگ گروه‌ها
const saveGroupsConfig = (config) => {
  try {
    // اطمینان از وجود پوشه data
    const dataDir = path.dirname(GROUPS_CONFIG_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(GROUPS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    console.log('✅ [CONFIG] Groups config saved successfully');
    return true;
  } catch (error) {
    console.error('❌ [CONFIG] Error saving groups config:', error);
    return false;
  }
};

// تابع بررسی فعال بودن گروه
const isGroupEnabled = (groupId) => {
  try {
    const config = loadGroupsConfig();
    const group = config.groups[groupId];
    
    if (group) {
      return group.enabled === 1;
    }
    
    // اگر گروه در کانفیگ نباشد، از تنظیمات پیش‌فرض استفاده کن
    return config.config.defaultEnabled === 1;
  } catch (error) {
    console.error(`❌ [CONFIG] Error checking group ${groupId} status:`, error);
    return true; // در صورت خطا، گروه را فعال در نظر بگیر
  }
};

// تابع تغییر وضعیت گروه
const setGroupStatus = (groupId, enabled, updatedBy = 'unknown') => {
  try {
    const config = loadGroupsConfig();
    
    if (!config.groups[groupId]) {
      config.groups[groupId] = {
        name: `گروه ${groupId}`,
        enabled: enabled ? 1 : 0,
        lastUpdate: new Date().toISOString(),
        updatedBy: updatedBy
      };
    } else {
      config.groups[groupId].enabled = enabled ? 1 : 0;
      config.groups[groupId].lastUpdate = new Date().toISOString();
      config.groups[groupId].updatedBy = updatedBy;
    }
    
    config.config.lastUpdate = new Date().toISOString();
    config.config.updatedBy = updatedBy;
    
    const result = saveGroupsConfig(config);
    if (result) {
      console.log(`✅ [CONFIG] Group ${groupId} status set to: ${enabled ? 'enabled' : 'disabled'} by ${updatedBy}`);
    }
    return result;
  } catch (error) {
    console.error(`❌ [CONFIG] Error setting group ${groupId} status:`, error);
    return false;
  }
};

// تابع دریافت لیست تمام گروه‌ها با وضعیت
const getAllGroupsStatus = () => {
  try {
    const config = loadGroupsConfig();
    return config.groups;
  } catch (error) {
    console.error('❌ [CONFIG] Error getting all groups status:', error);
    return {};
  }
};

// تابع تنظیم وضعیت پیش‌فرض برای گروه‌های جدید
const setDefaultGroupStatus = (enabled, updatedBy = 'unknown') => {
  try {
    const config = loadGroupsConfig();
    config.config.defaultEnabled = enabled ? 1 : 0;
    config.config.lastUpdate = new Date().toISOString();
    config.config.updatedBy = updatedBy;
    
    const result = saveGroupsConfig(config);
    if (result) {
      console.log(`✅ [CONFIG] Default group status set to: ${enabled ? 'enabled' : 'disabled'} by ${updatedBy}`);
    }
    return result;
  } catch (error) {
    console.error('❌ [CONFIG] Error setting default group status:', error);
    return false;
  }
};

// نگاشت نام کاربران
const USER_NAMES = {
 
  2045777722: "محمد رایتل"
};

// ===== ساختار مرکزی کاربران بر اساس نقش =====
const USERS_BY_ROLE = {
  SCHOOL_ADMIN: [
  //  1638058362,
    1775811194,
    1114227010
  //574330749
 //  { id: 1638058362,   name: "لشگری"     }       ,
  // { id: 1775811194,       name: "محرابی"       }
   // { id: 1114227010, name: "محمد ۱" } - حذف شده توسط مدیر نقش‌ها
  ],
  COACH: [
  //  2045777722,
   // 574330749
 //   { id: 574330749, name: "محمد زارع ۲" }
  ],
  ASSISTANT: [
    
   // 574330749
   // 2045777722
  //  574330749
   // 574330749,
   // { id: 2045777722, name: "محمد رایتل" }
  ]
};

// ===== سیستم مدیریت دائمی اعضا =====
let permanentMemberManager = null;

// تلاش برای بارگذاری سیستم مدیریت دائمی اعضا
try {
  const PermanentMemberManager = require('./permanent_member_manager');
  permanentMemberManager = new PermanentMemberManager();
  console.log('✅ [CONFIG] Permanent Member Manager loaded and instantiated successfully');
} catch (error) {
  console.warn('⚠️ [CONFIG] Permanent Member Manager not available, using legacy system');
}

// ===== فایل ذخیره‌سازی مربی‌ها =====
// 🔥 مربی‌ها و کمک مربی‌ها از workshops.json بارگذاری می‌شوند
// این بخش در 15reg.js مدیریت می‌شود

// ===== تولید خودکار آرایه‌ها از نقش‌ها =====
const ADMIN_IDS = USERS_BY_ROLE.SCHOOL_ADMIN.map(user => 
  typeof user === 'object' ? user.id : user
);

const COACH_ID = USERS_BY_ROLE.COACH.length > 0 ? 
  (typeof USERS_BY_ROLE.COACH[0] === 'object' ? USERS_BY_ROLE.COACH[0].id : USERS_BY_ROLE.COACH[0]) : 0;

const ASSISTANT_ID = USERS_BY_ROLE.ASSISTANT.length > 0 ? 
  (typeof USERS_BY_ROLE.ASSISTANT[0] === 'object' ? USERS_BY_ROLE.ASSISTANT[0].id : USERS_BY_ROLE.ASSISTANT[0]) : 0;

const GROUP_ADMIN_IDS = [
  ...USERS_BY_ROLE.SCHOOL_ADMIN.map(user => typeof user === 'object' ? user.id : user),
  ...USERS_BY_ROLE.COACH.map(user => typeof user === 'object' ? user.id : user),
  ...USERS_BY_ROLE.ASSISTANT.map(user => typeof user === 'object' ? user.id : user)
];

const AUTHORIZED_USER_IDS = GROUP_ADMIN_IDS;

const HELPER_COACH_USER_IDS = USERS_BY_ROLE.ASSISTANT.map(user => 
  typeof user === 'object' ? user.id : user
);

// ===== تولید USERS برای سازگاری =====
const USERS = {};
Object.entries(USERS_BY_ROLE).forEach(([role, users]) => {
  users.forEach(user => {
    if (typeof user === 'object' && user && user.id && user.name) {
      // اگر کاربر قبلاً وجود دارد، نقش‌های جدید را اضافه کن
      if (USERS[user.id]) {
        if (!USERS[user.id].roles) {
          USERS[user.id].roles = [USERS[user.id].role];
        }
        if (!USERS[user.id].roles.includes(role)) {
          USERS[user.id].roles.push(role);
        }
        USERS[user.id].role = USERS[user.id].roles[0]; // نقش اول به عنوان نقش اصلی
      } else {
        USERS[user.id] = { name: user.name, role: role, roles: [role] };
      }
    } else if (typeof user === 'number') {
      // اگر user فقط یک عدد است، از USER_NAMES استفاده کن
      const userName = USER_NAMES[user] || `کاربر ${user}`;
      if (USERS[user]) {
        if (!USERS[user].roles) {
          USERS[user].roles = [USERS[user].role];
        }
        if (!USERS[user].roles.includes(role)) {
          USERS[user].roles.push(role);
        }
        USERS[user].role = USERS[user].roles[0];
      } else {
        USERS[user] = { name: userName, role: role, roles: [role] };
      }
    }
  });
});

// ===== توابع جدید برای مدیریت نقش‌های چندگانه =====

// بررسی اینکه آیا کاربر نقش خاصی دارد
const hasRole = (userId, role) => {
  const userInfo = USERS[userId];
  if (!userInfo) return false;
  
  if (userInfo.roles) {
    return userInfo.roles.includes(role);
  }
  
  return userInfo.role === role;
};

// بررسی اینکه آیا کاربر کمک مربی است
const isPhoneAssistant = (phoneNumber) => {
  try {
    // نرمال‌سازی شماره تلفن
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // جستجو در لیست کمک مربی‌ها
    const isAssistant = USERS_BY_ROLE.ASSISTANT.some(user => {
      if (typeof user === 'object' && user.phone) {
        return normalizePhoneNumber(user.phone) === normalizedPhone;
      }
      return false;
    });
    
    console.log(`🔍 [CONFIG] Phone ${normalizedPhone} isAssistant: ${isAssistant}`);
    return isAssistant;
    
  } catch (error) {
    console.error('❌ [CONFIG] Error checking if phone is assistant:', error);
    return false;
  }
};

// دریافت اطلاعات کمک مربی بر اساس شماره تلفن
const getAssistantByPhone = (phoneNumber) => {
  try {
    // نرمال‌سازی شماره تلفن
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // جستجو در لیست کمک مربی‌ها
    const assistant = USERS_BY_ROLE.ASSISTANT.find(user => {
      if (typeof user === 'object' && user.phone) {
        return normalizePhoneNumber(user.phone) === normalizedPhone;
      }
      return false;
    });
    
    if (assistant) {
      console.log(`✅ [CONFIG] Found assistant for phone ${normalizedPhone}:`, assistant);
      return assistant;
    } else {
      console.log(`⚠️ [CONFIG] No assistant found for phone ${normalizedPhone}`);
      return null;
    }
    
  } catch (error) {
    console.error('❌ [CONFIG] Error getting assistant by phone:', error);
    return null;
  }
};

// ===== توابع کمکی جدید =====

// تابع ثبت‌نام عضو در سیستم دائمی
const registerMemberInPermanentSystem = (userId, memberData) => {
  if (permanentMemberManager) {
    try {
      const result = permanentMemberManager.registerMember(userId, memberData);
      console.log(`✅ [CONFIG] Member ${userId} registered in permanent system`);
      return result;
    } catch (error) {
      console.error(`❌ [CONFIG] Error registering member ${userId} in permanent system:`, error);
      return null;
    }
  }
  return null;
};

// تابع تخصیص نقش در سیستم دائمی
const assignRoleInPermanentSystem = (userId, role) => {
  if (permanentMemberManager) {
    try {
      const result = permanentMemberManager.assignRole(userId, role);
      console.log(`✅ [CONFIG] Role ${role} assigned to member ${userId} in permanent system`);
      return result;
    } catch (error) {
      console.error(`❌ [CONFIG] Error assigning role ${role} to member ${userId}:`, error);
      return false;
    }
  }
  return false;
};

const getUserInfo = (userId) => {
  // اول بررسی کن که آیا سیستم مدیریت دائمی اعضا در دسترس است
  if (permanentMemberManager) {
    try {
      const memberInfo = permanentMemberManager.getMemberInfo(userId);
      if (memberInfo) {
        console.log(`✅ [CONFIG] User ${userId} found in permanent member system with role: ${memberInfo.role}`);
        return {
          name: memberInfo.fullName || memberInfo.firstName || `کاربر ${userId}`,
          role: memberInfo.role,
          phone: memberInfo.phone || null
        };
      }
    } catch (error) {
      console.error(`❌ [CONFIG] Error getting member info for user ${userId}:`, error);
    }
  }

  // اگر کاربر در USERS موجود است، آن را برگردان
  if (USERS[userId]) {
    return USERS[userId];
  }
  
  // بررسی اینکه آیا کاربر در registration_data.json ثبت‌نام شده و شماره تلفنش مربی است
  try {
    const fs = require('fs');
    const path = require('path');
    const registrationFile = path.join(__dirname, 'registration_data.json');
    
    if (fs.existsSync(registrationFile)) {
      const registrationData = JSON.parse(fs.readFileSync(registrationFile, 'utf8'));
      const userData = registrationData[userId];
      
      if (userData && userData.phone && userData.phone.trim() !== '') {
        // بررسی اینکه آیا شماره تلفن مربی است یا نه
        const isCoach = isPhoneCoach(userData.phone);
        if (isCoach) {
          console.log(`✅ [CONFIG] User ${userId} with phone ${userData.phone} is identified as COACH`);
          return { 
            name: userData.fullName || userData.firstName || `کاربر ${userId}`, 
            role: "COACH",
            phone: userData.phone
          };
        }
      }
    }
  } catch (error) {
    console.error(`❌ [CONFIG] Error checking registration data for user ${userId}:`, error);
  }
  
  // اگر کاربر در USERS نیست و مربی هم نیست، نام را از USER_NAMES بگیر و نقش STUDENT بده
  const userName = USER_NAMES[userId] || `کاربر ${userId}`;
  return { name: userName, role: "STUDENT" };
};

const getUserRoleFromCentral = (userId) => {
  const role = getUserInfo(userId).role;
  // برگرداندن نقش به همان فرمت اصلی (بزرگ)
  return role;
};

const getUserNameFromCentral = (userId) => {
  return getUserInfo(userId).name;
};

// ===== توابع جدید برای کار با USERS_BY_ROLE =====
const getUsersByRole = (role) => {
  return USERS_BY_ROLE[role] || [];
};

const getAllUsersByRole = () => {
  return USERS_BY_ROLE;
};

const addUserToRole = (role, userId, userName, phone = null) => {
  if (!USERS_BY_ROLE[role]) {
    USERS_BY_ROLE[role] = [];
  }
  
  // بررسی اینکه آیا کاربر قبلاً در این نقش وجود دارد
  const existingUserIndex = USERS_BY_ROLE[role].findIndex(user => 
    (typeof user === 'object' ? user.id : user) === userId
  );
  
  if (existingUserIndex === -1) {
    // اضافه کردن کاربر جدید به نقش
    USERS_BY_ROLE[role].push({ id: userId, name: userName, phone: phone });
    console.log(`🔄 [CONFIG] User ${userId} added to role ${role}`);
  } else {
    // به‌روزرسانی کاربر موجود
    if (typeof USERS_BY_ROLE[role][existingUserIndex] === 'object') {
      USERS_BY_ROLE[role][existingUserIndex].name = userName;
      if (phone) USERS_BY_ROLE[role][existingUserIndex].phone = phone;
    } else {
      USERS_BY_ROLE[role][existingUserIndex] = { id: userId, name: userName, phone: phone };
    }
    console.log(`🔄 [CONFIG] User ${userId} updated in role ${role}`);
  }
  
  // به‌روزرسانی USERS
  if (!USERS[userId]) {
    USERS[userId] = { name: userName, role: role, roles: [role] };
  } else {
    // اگر کاربر قبلاً وجود دارد، نقش جدید را اضافه کن
    if (!USERS[userId].roles) {
      USERS[userId].roles = [USERS[userId].role];
    }
    if (!USERS[userId].roles.includes(role)) {
      USERS[userId].roles.push(role);
    }
    // نقش اول به عنوان نقش اصلی باقی بماند
    if (USERS[userId].role !== role && USERS[userId].roles.length === 1) {
      USERS[userId].role = role;
    }
  }
  
  // به‌روزرسانی آرایه‌های مشتق شده
  updateDerivedArrays();
  
  console.log(`✅ [CONFIG] User ${userId} successfully added/updated in role ${role}`);
  console.log(`📊 [CONFIG] User ${userId} now has roles: ${USERS[userId].roles.join(', ')}`);
};

// تابع جدید برای به‌روزرسانی آرایه‌های مشتق شده
const updateDerivedArrays = () => {
  // به‌روزرسانی ADMIN_IDS
  ADMIN_IDS.length = 0;
  ADMIN_IDS.push(...USERS_BY_ROLE.SCHOOL_ADMIN.map(user => 
    typeof user === 'object' ? user.id : user
  ));
  
  // به‌روزرسانی GROUP_ADMIN_IDS
  GROUP_ADMIN_IDS.length = 0;
  GROUP_ADMIN_IDS.push(
    ...USERS_BY_ROLE.SCHOOL_ADMIN.map(user => typeof user === 'object' ? user.id : user),
    ...USERS_BY_ROLE.COACH.map(user => typeof user === 'object' ? user.id : user),
    ...USERS_BY_ROLE.ASSISTANT.map(user => typeof user === 'object' ? user.id : user)
  );
  
  // به‌روزرسانی AUTHORIZED_USER_IDS
  AUTHORIZED_USER_IDS.length = 0;
  AUTHORIZED_USER_IDS.push(...GROUP_ADMIN_IDS);
  
  // به‌روزرسانی HELPER_COACH_USER_IDS
  HELPER_COACH_USER_IDS.length = 0;
  HELPER_COACH_USER_IDS.push(...USERS_BY_ROLE.ASSISTANT.map(user => 
    typeof user === 'object' ? user.id : user
  ));
  
  console.log(`🔄 [CONFIG] Derived arrays updated successfully`);
};

// توابع برای دریافت آرایه‌های به‌روزرسانی شده
const getCurrentAdminIds = () => {
  return USERS_BY_ROLE.SCHOOL_ADMIN.map(user => 
    typeof user === 'object' ? user.id : user
  );
};

const getCurrentCoachId = () => {
  return USERS_BY_ROLE.COACH.length > 0 ? 
    (typeof USERS_BY_ROLE.COACH[0] === 'object' ? USERS_BY_ROLE.COACH[0].id : USERS_BY_ROLE.COACH[0]) : 0;
};

const getCurrentAssistantId = () => {
  return USERS_BY_ROLE.ASSISTANT.length > 0 ? 
    (typeof USERS_BY_ROLE.ASSISTANT[0] === 'object' ? USERS_BY_ROLE.ASSISTANT[0].id : USERS_BY_ROLE.ASSISTANT[0]) : 0;
};

const getCurrentGroupAdminIds = () => {
  return [
    ...USERS_BY_ROLE.SCHOOL_ADMIN.map(user => typeof user === 'object' ? user.id : user),
    ...USERS_BY_ROLE.COACH.map(user => typeof user === 'object' ? user.id : user),
    ...USERS_BY_ROLE.ASSISTANT.map(user => typeof user === 'object' ? user.id : user)
  ];
};

const getCurrentHelperCoachUserIds = () => {
  return USERS_BY_ROLE.ASSISTANT.map(user => 
    typeof user === 'object' ? user.id : user
  );
};

const removeUserFromRole = (role, userId) => {
  if (USERS_BY_ROLE[role]) {
    USERS_BY_ROLE[role] = USERS_BY_ROLE[role].filter(user => 
      (typeof user === 'object' ? user.id : user) !== userId
    );
  }
  // حذف از USERS اما حفظ نام کاربر
  const userName = USER_NAMES[userId] || `کاربر ${userId}`;
  USERS[userId] = { name: userName, role: "STUDENT" };
  
  console.log(`🔄 [CONFIG] User ${userId} removed from role ${role} and set to STUDENT`);
};

// تنظیمات گروه‌ها و دسترسی
const REPORT_GROUP_ID = 5668045453;// گزارش گروه

// تنظیمات مدیر خصوصی برای گزارش‌ها (با شماره تلفن)
const PRIVATE_ADMIN_PHONE = "09101234567"; // شماره تلفن مدیر برای گزارش‌های خصوصی

// تابع تبدیل شماره تلفن به user ID (اگر در دیتابیس باشد)
function getAdminIdByPhone(phone) {
  // نرمال‌سازی شماره تلفن
  const normalizedPhone = normalizePhoneNumber(phone);
  
  // جستجو در کاربران ثبت شده
  // این بخش باید با دیتابیس کاربران ربط داده شود
  const phoneToIdMap = {
    "989101234567": 1114227010, // مثال
    // سایر شماره‌ها...
  };
  
  return phoneToIdMap[normalizedPhone] || null;
}

// تابع نرمال‌سازی شماره تلفن
function normalizePhoneNumber(phone) {
  // حذف فاصله‌ها و کاراکترهای اضافی
  let normalized = phone.replace(/[\s\-\(\)]/g, '');
  
  // تبدیل 09xxxxxxxx به 989xxxxxxxx
  if (normalized.startsWith('09')) {
    normalized = '98' + normalized.substring(1);
  }
  
  // اگر با +98 شروع می‌شود، + را حذف کن
  if (normalized.startsWith('+98')) {
    normalized = normalized.substring(1);
  }
  
  return normalized;
}

// تابع دریافت نام ظاهری نقش
const getRoleDisplayName = (role) => {
  return ROLE_DISPLAY_NAMES[role] || role;
};
//4594690153    گروه ربات 1
//5417069312    گروه ربات 2

// تابع برای دریافت نام گروه
const getGroupName = async (groupId) => {
  // ابتدا از نگاشت استاتیک استفاده کن
  if (GROUP_NAMES[groupId]) {
    return GROUP_NAMES[groupId];
  }
  
  // اگر در نگاشت استاتیک نبود، از API دریافت کن
  try {
    const { getChat } = require('./4bale');
    const chatInfo = await getChat(groupId);
    if (chatInfo && chatInfo.title) {
      return chatInfo.title;
    }
  } catch (error) {
    console.error(`❌ [CONFIG] Error fetching group name for ${groupId}:`, error.message);
  }
  
  // در صورت خطا، نام پیش‌فرض برگردان
  return `گروه ${groupId}`;
};

// تابع برای دریافت نام کاربر
const getUserName = (userId) => {
  return USER_NAMES[userId] || `کاربر ${userId}`;
};

// تابع برای نمایش لیست ادمین‌ها با نام
const getAdminNames = () => {
  return ADMIN_IDS.map(id => getUserName(id));
};

// تابع برای نمایش لیست ادمین‌های گروه با نام
const getGroupAdminNames = () => {
  return GROUP_ADMIN_IDS.map(id => getUserName(id));
};

// تنظیمات ماژول تنظیمات (Settings Module)
const SETTINGS_CONFIG = {
  // روزهای هفته (0=شنبه، 1=یکشنبه، 2=دوشنبه، 3=سه‌شنبه، 4=چهارشنبه، 5=پنج‌شنبه، 6=جمعه)
  PRACTICE_DAYS: [0, 1, 2, 3, 4, 5, 6], // همه روزها فعال
  EVALUATION_DAYS: [0, 1, 2, 3, 4, 5, 6], // همه روزها فعال
  
  // تنظیمات عمومی
  ENABLE_SATISFACTION_SURVEY: true, // نظرسنجی رضایت
  
  // فایل ذخیره تنظیمات
  SETTINGS_FILE: 'data/settings.json',
  REPORTS_CONFIG_FILE: 'data/reports_config.json',
  
  // نام‌های روزهای هفته
  DAYS_OF_WEEK: [
    { name: 'شنبه', value: 0 },
    { name: 'یکشنبه', value: 1 },
    { name: 'دوشنبه', value: 2 },
    { name: 'سه‌شنبه', value: 3 },
    { name: 'چهارشنبه', value: 4 },
    { name: 'پنج‌شنبه', value: 5 },
    { name: 'جمعه', value: 6 }
  ]
};

// ===== توابع مدیریت تنظیمات گزارش مشترک =====

// خواندن وضعیت گزارش از فایل مشترک
function loadReportsConfig() {
  try {
    const configPath = path.join(__dirname, SETTINGS_CONFIG.REPORTS_CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(data);
      console.log('✅ [CONFIG] Reports config loaded:', config);
      return config;
    } else {
      // ایجاد فایل پیش‌فرض
      const defaultConfig = {
        enabled: true,
        lastUpdate: new Date().toISOString(),
        updatedBy: 'system',
        updatedFrom: 'default',
        robotOnline: false,
        lastRobotPing: null
      };
      saveReportsConfig(defaultConfig);
      return defaultConfig;
    }
  } catch (error) {
    console.error('❌ [CONFIG] Error loading reports config:', error);
    return { enabled: true, lastUpdate: new Date().toISOString(), updatedBy: 'error', updatedFrom: 'fallback' };
  }
}

// ذخیره وضعیت گزارش در فایل مشترک
function saveReportsConfig(config) {
  try {
    const configPath = path.join(__dirname, SETTINGS_CONFIG.REPORTS_CONFIG_FILE);
    // اطمینان از وجود دایرکتوری
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('✅ [CONFIG] Reports config saved:', config);
    return true;
  } catch (error) {
    console.error('❌ [CONFIG] Error saving reports config:', error);
    return false;
  }
}

// آپدیت وضعیت سیستم‌ها
function updateSystemStatus(system, status) {
  try {
    const config = loadReportsConfig();
    
    if (!config.systemStatus) {
      config.systemStatus = {
        robot: false,
        gateway: false,
        website: false,
        lastUpdate: new Date().toISOString(),
        lastChange: null
      };
    }
    
    // بررسی اینکه آیا واقعاً تغییر کرده
    const previousStatus = config.systemStatus[system];
    if (previousStatus !== status) {
      config.systemStatus[system] = status;
      config.systemStatus.lastUpdate = new Date().toISOString();
      config.systemStatus.lastChange = {
        system: system,
        status: status,
        timestamp: new Date().toISOString(),
        action: status ? 'آنلاین شد' : 'آفلاین شد'
      };
      
      console.log(`🔄 [STATUS] ${system} ${status ? 'آنلاین' : 'آفلاین'} شد`);
      
      // ارسال event برای SSE clients
      try {
        const { reportEvents } = require('./gateway_bale');
        if (reportEvents) {
          reportEvents.emit('systemStatusChanged', {
            system: system,
            status: status,
            timestamp: new Date().toISOString(),
            action: status ? 'آنلاین شد' : 'آفلاین شد'
          });
          console.log(`📡 [STATUS] System status change event emitted for ${system}`);
        }
      } catch (error) {
        console.log('⚠️ [STATUS] Could not emit system status change event:', error.message);
      }
      
      return saveReportsConfig(config);
    } else {
      console.log(`⚠️ [STATUS] ${system} وضعیت تغییری نکرده: ${status}`);
      return true; // تغییری نبوده
    }
  } catch (error) {
    console.error('❌ [CONFIG] Error updating system status:', error);
    return false;
  }
}

// دریافت وضعیت سیستم‌ها
function getSystemStatus() {
  try {
    const config = loadReportsConfig();
    return config.systemStatus || {
      robot: false,
      gateway: false,
      website: false,
      lastUpdate: new Date().toISOString(),
      lastChange: null
    };
  } catch (error) {
    console.error('❌ [CONFIG] Error getting system status:', error);
    return {
      robot: false,
      gateway: false,
      website: false,
      lastUpdate: new Date().toISOString(),
      lastChange: null
    };
  }
}

// ریست کردن وضعیت سیستم‌ها (برای تست)
function resetSystemStatus() {
  try {
    const config = loadReportsConfig();
    config.systemStatus = {
      robot: false,
      gateway: false,
      website: false,
      lastUpdate: new Date().toISOString(),
      lastChange: {
        system: 'system',
        status: false,
        timestamp: new Date().toISOString(),
        action: 'ریست شد'
      }
    };
    
    console.log('🔄 [STATUS] وضعیت سیستم‌ها ریست شد');
    return saveReportsConfig(config);
  } catch (error) {
    console.error('❌ [CONFIG] Error resetting system status:', error);
    return false;
  }
}

// دریافت وضعیت فعلی گزارش‌گیری
function getReportsEnabled() {
  const config = loadReportsConfig();
  return config.enabled;
}

// تغییر وضعیت گزارش‌گیری
function setReportsEnabled(enabled, updatedBy = 'unknown', updatedFrom = 'unknown') {
  const config = loadReportsConfig(); // حفظ سایر فیلدها
  config.enabled = enabled;
  config.lastUpdate = new Date().toISOString();
  config.updatedBy = updatedBy;
  config.updatedFrom = updatedFrom;
  
  // ارسال event برای SSE clients
  try {
    const { reportEvents } = require('./gateway_bale');
    if (reportEvents) {
      reportEvents.emit('reportChanged', {
        enabled: enabled,
        lastUpdate: config.lastUpdate,
        updatedBy: updatedBy,
        updatedFrom: updatedFrom,
        timestamp: Date.now()
      });
      console.log(`📡 [REPORTS] Report status change event emitted: ${enabled ? 'فعال' : 'غیرفعال'}`);
    }
  } catch (error) {
    console.log('⚠️ [REPORTS] Could not emit report status change event:', error.message);
  }
  
  return saveReportsConfig(config);
}

// آپدیت heartbeat ربات
function updateRobotHeartbeat() {
  try {
    const config = loadReportsConfig();
    config.robotOnline = true;
    config.lastRobotPing = new Date().toISOString();
    
    // ارسال event برای SSE clients
    try {
      const { reportEvents } = require('./gateway_bale');
      if (reportEvents) {
        reportEvents.emit('robotHeartbeat', {
          robotOnline: true,
          lastRobotPing: config.lastRobotPing,
          timestamp: Date.now()
        });
        console.log(`📡 [ROBOT] Robot heartbeat event emitted`);
      }
    } catch (error) {
      console.log('⚠️ [ROBOT] Could not emit robot heartbeat event:', error.message);
    }
    
    return saveReportsConfig(config);
  } catch (error) {
    console.error('❌ [CONFIG] Error updating robot heartbeat:', error);
    return false;
  }
}

// بررسی آنلاین بودن ربات (10 دقیقه timeout)
function isRobotOnline() {
  try {
    const config = loadReportsConfig();
    if (!config.lastRobotPing) return false;
    
    const lastPing = new Date(config.lastRobotPing);
    const now = new Date();
    const diffMinutes = (now - lastPing) / (1000 * 60);
    
    return diffMinutes <= 10; // ربات تا 10 دقیقه پیش آنلاین بوده
  } catch (error) {
    console.error('❌ [CONFIG] Error checking robot online status:', error);
    return false;
  }
}

// نقش‌های کاربران
const ROLES = {
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',    // مدیر مدرسه
  GROUP_ADMIN: 'GROUP_ADMIN',      // ادمین گروه
  COACH: 'COACH',                  // مربی
  ASSISTANT: 'ASSISTANT',          // کمک مربی
  STUDENT: 'STUDENT'               // قرآن آموز
};

// نگاشت نقش‌های کاربران (تولید خودکار از USERS)
const USER_ROLES = Object.entries(USERS).reduce((acc, [id, user]) => {
  acc[id] = ROLES[user.role];
  return acc;
}, {});

console.log('🔧 [CONFIG] ROLES loaded:', JSON.stringify(ROLES, null, 2));
console.log('🔧 [CONFIG] ADMIN_IDS (auto-generated):', JSON.stringify(ADMIN_IDS, null, 2));
console.log('🔧 [CONFIG] ADMIN_NAMES:', JSON.stringify(getAdminNames(), null, 2));
console.log('🔧 [CONFIG] GROUP_ADMIN_IDS (auto-generated):', JSON.stringify(GROUP_ADMIN_IDS, null, 2));
console.log('🔧 [CONFIG] GROUP_ADMIN_NAMES:', JSON.stringify(getGroupAdminNames(), null, 2));
console.log('🔧 [CONFIG] COACH_ID (auto-generated):', COACH_ID);
console.log('🔧 [CONFIG] COACH_NAME:', getUserName(COACH_ID));
console.log('🔧 [CONFIG] ASSISTANT_ID (auto-generated):', ASSISTANT_ID);
console.log('🔧 [CONFIG] ASSISTANT_NAME:', getUserName(ASSISTANT_ID));
console.log('🔧 [CONFIG] USERS_BY_ROLE structure:', JSON.stringify(USERS_BY_ROLE, null, 2));
// نمایش نام گروه گزارش به صورت async
getGroupName(REPORT_GROUP_ID).then(name => {
  console.log('🔧 [CONFIG] REPORT_GROUP_NAME:', name);
}).catch(error => {
  console.log('🔧 [CONFIG] REPORT_GROUP_NAME: Error fetching name');
});



// تابع بررسی نمایش دکمه
const isButtonVisible = (buttonName) => {
  return BUTTON_VISIBILITY_CONFIG[buttonName] === 1;
};

// تابع تغییر وضعیت نمایش دکمه
const setButtonVisibility = (buttonName, visible) => {
  if (BUTTON_VISIBILITY_CONFIG.hasOwnProperty(buttonName)) {
    BUTTON_VISIBILITY_CONFIG[buttonName] = visible ? 1 : 0;
    console.log(`🔄 [BUTTON] Button ${buttonName} visibility set to: ${visible ? 'visible' : 'hidden'}`);
    return true;
  }
  console.warn(`⚠️ [BUTTON] Button ${buttonName} not found in config`);
  return false;
};

// تابع دریافت تمام تنظیمات نمایش دکمه‌ها
const getButtonVisibilityConfig = () => {
  return { ...BUTTON_VISIBILITY_CONFIG };
};

// تابع بررسی فعال بودن مدیریت گروه‌ها
const isGroupManagementEnabled = () => {
  return GROUP_MANAGEMENT_CONFIG.enabled === 1;
};

// تابع بررسی دسترسی کاربر به مدیریت گروه‌ها
const hasGroupManagementAccess = (userRole) => {
  if (!isGroupManagementEnabled()) {
    return false;
  }
  
  // همه نقش‌ها دسترسی دارند
  return true;
};

// تابع بررسی فعال بودن مدیریت استادها
const isOsatdManagementEnabled = () => {
  return OSATD_MANAGEMENT_CONFIG.enabled === 1;
};

// تابع بررسی دسترسی کاربر به مدیریت استادها
const hasOsatdManagementAccess = (userRole) => {
  if (!isOsatdManagementEnabled()) {
    return false;
  }
  
  // همه نقش‌ها دسترسی دارند
  return true;
};

// ===== توابع مدیریت کانفیگ سیستم ارزیابی =====

// بررسی فعال بودن کل سیستم ارزیابی
const isEvaluationSystemEnabled = () => {
  return EVALUATION_SYSTEM_CONFIG.evaluation_system?.enabled === 1;
};

// بررسی فعال بودن قابلیت تشخیص تمرین - حذف شده، از توابع جدید استفاده می‌شود

// بررسی فعال بودن زمان تمرین
const isPracticeScheduleEnabled = () => {
  if (!isEvaluationSystemEnabled()) {
    return false;
  }
  
  return EVALUATION_SYSTEM_CONFIG.evaluation_system?.practice_schedule?.enabled === 1;
};

// دریافت تنظیمات زمان تمرین
const getPracticeSchedule = () => {
  if (!isPracticeScheduleEnabled()) {
    return null;
  }
  
  return EVALUATION_SYSTEM_CONFIG.evaluation_system?.practice_schedule;
};

// بررسی فعال بودن سیستم ارزیابی
const isEvaluationEnabled = () => {
  if (!isEvaluationSystemEnabled()) {
    return false;
  }
  
  return EVALUATION_SYSTEM_CONFIG.evaluation_system?.evaluation?.enabled === 1;
};

// دریافت حداقل تعداد ارزیابی‌کنندگان
const getMinEvaluators = () => {
  if (!isEvaluationEnabled()) {
    return 1;
  }
  
  return EVALUATION_SYSTEM_CONFIG.evaluation_system?.evaluation?.min_evaluators || 2;
};

// بررسی فعال بودن نظرسنجی رضایت
const isSatisfactionSurveyEnabled = () => {
  if (!isEvaluationSystemEnabled()) {
    return false;
  }
  
  return EVALUATION_SYSTEM_CONFIG.evaluation_system?.satisfaction_survey?.enabled === 1;
};

// بررسی نمایش نظرسنجی بعد از ارزیابی
const shouldShowSatisfactionAfterEvaluation = () => {
  if (!isSatisfactionSurveyEnabled()) {
    return false;
  }
  
  return EVALUATION_SYSTEM_CONFIG.evaluation_system?.satisfaction_survey?.show_after_evaluation === 1;
};

// بررسی ارسال نظرسنجی به گروه ادمین
const shouldSendSatisfactionToAdmin = () => {
  if (!isSatisfactionSurveyEnabled()) {
    return false;
  }
  
  return EVALUATION_SYSTEM_CONFIG.evaluation_system?.satisfaction_survey?.send_to_admin_group === 1;
};

// بررسی فعال بودن گزارش‌گیری
const isReportingEnabled = (reportType) => {
  if (!isEvaluationSystemEnabled()) {
    return false;
  }
  
  return EVALUATION_SYSTEM_CONFIG.evaluation_system?.reporting?.[reportType] === 1;
};

// بررسی دسترسی کاربر به سیستم ارزیابی
const hasEvaluationAccess = (userRole) => {
  if (!isEvaluationSystemEnabled()) {
    return false;
  }
  
  return EVALUATION_SYSTEM_CONFIG.evaluation_system?.access?.[userRole] === 1;
};

// تغییر وضعیت قابلیت تشخیص تمرین
const setPracticeDetectionStatus = (detectionType, enabled) => {
  if (EVALUATION_SYSTEM_CONFIG.evaluation_system?.practice_detection?.hasOwnProperty(detectionType)) {
    EVALUATION_SYSTEM_CONFIG.evaluation_system.practice_detection[detectionType] = enabled ? 1 : 0;
    console.log(`🔄 [EVALUATION] Practice detection ${detectionType} set to: ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }
  console.warn(`⚠️ [EVALUATION] Practice detection type ${detectionType} not found in config`);
  return false;
};

// تغییر وضعیت سیستم ارزیابی
const setEvaluationSystemStatus = (enabled) => {
  EVALUATION_SYSTEM_CONFIG.evaluation_system.enabled = enabled ? 1 : 0;
  console.log(`🔄 [EVALUATION] Evaluation system set to: ${enabled ? 'enabled' : 'disabled'}`);
  return true;
};

// تغییر تنظیمات زمان تمرین
const updatePracticeSchedule = (enabled, hours, days) => {
  EVALUATION_SYSTEM_CONFIG.evaluation_system.practice_schedule.enabled = enabled ? 1 : 0;
  if (hours) EVALUATION_SYSTEM_CONFIG.evaluation_system.practice_schedule.hours = hours;
  if (days) EVALUATION_SYSTEM_CONFIG.evaluation_system.practice_schedule.days = days;
  
  console.log(`🔄 [EVALUATION] Practice schedule updated: enabled=${enabled}, hours=${hours}, days=${days}`);
  return true;
};

// ===== توابع جدید برای تنظیمات تمرین و ارزیابی =====
const loadSettings = () => {
  try {
    const settingsPath = path.join(__dirname, SETTINGS_CONFIG.SETTINGS_FILE);
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    } else {
      console.log('⚠️ [CONFIG] Settings file not found, using defaults');
      return {
        practice_days: [0, 1, 2, 3, 4, 5, 6],
        evaluation_days: [0, 1, 2, 3, 4, 5, 6]
      };
    }
  } catch (error) {
    console.error('❌ [CONFIG] Error loading settings:', error.message);
    return {
      practice_days: [0, 1, 2, 3, 4, 5, 6],
      evaluation_days: [0, 1, 2, 3, 4, 5, 6]
    };
  }
};

const getPracticeDays = () => {
  try {
    const settings = loadSettings();
    return settings.practice_days || [0, 1, 2, 3, 4, 5, 6];
  } catch (error) {
    console.error('❌ [CONFIG] Error getting practice days:', error.message);
    return [0, 1, 2, 3, 4, 5, 6]; // پیش‌فرض: همه روزها
  }
};

const getEvaluationDays = () => {
  try {
    const settings = loadSettings();
    return settings.evaluation_days || [0, 1, 2, 3, 4, 5, 6];
  } catch (error) {
    console.error('❌ [CONFIG] Error getting evaluation days:', error.message);
    return [0, 1, 2, 3, 4, 5, 6]; // پیش‌فرض: همه روزها
  }
};

const getPracticeHours = () => {
  try {
    const settings = loadSettings();
    return settings.practice_hours || [14, 15, 16, 17]; // ساعت 2 تا 6 عصر
  } catch (error) {
    console.error('❌ [CONFIG] Error getting practice hours:', error.message);
    return [14, 15, 16, 17];
  }
};

const isPracticeTime = () => {
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = یکشنبه، 1 = دوشنبه، ...
    const currentHour = now.getHours();

    // تبدیل صحیح به روزهای هفته فارسی
    // JavaScript: 0=یکشنبه, 1=دوشنبه, 2=سه‌شنبه, 3=چهارشنبه, 4=پنج‌شنبه, 5=جمعه, 6=شنبه
    // تنظیمات: 0=شنبه, 1=یکشنبه, 2=دوشنبه, 3=سه‌شنبه, 4=چهارشنبه, 5=پنج‌شنبه, 6=جمعه
    let persianDay;
    if (currentDay === 0) persianDay = 1;      // یکشنبه -> 1
    else if (currentDay === 1) persianDay = 2; // دوشنبه -> 2
    else if (currentDay === 2) persianDay = 3; // سه‌شنبه -> 3
    else if (currentDay === 3) persianDay = 4; // چهارشنبه -> 4
    else if (currentDay === 4) persianDay = 5; // پنج‌شنبه -> 5
    else if (currentDay === 5) persianDay = 6; // جمعه -> 6
    else if (currentDay === 6) persianDay = 0; // شنبه -> 0
    
    const practiceDays = getPracticeDays();
    const practiceHours = getPracticeHours();
    
    const isActiveDay = practiceDays.includes(persianDay);
    const isActiveHour = practiceHours.includes(currentHour);
    
    console.log(`🔍 [CONFIG] Practice time check: Day=${currentDay}(${persianDay}), Hour=${currentHour}, ActiveDay=${isActiveDay}, ActiveHour=${isActiveHour}`);
    
    return isActiveDay && isActiveHour;
  } catch (error) {
    console.error('❌ [CONFIG] Error in isPracticeTime:', error.message);
    return false;
  }
};

// ===== توابع جدید برای تشخیص تمرین =====
const isPracticeDetectionEnabled = () => {
  try {
    const settings = loadSettings();
    return settings.evaluation_system?.enabled === true;
  } catch (error) {
    console.error('❌ [CONFIG] Error checking practice detection enabled:', error.message);
    return false;
  }
};

const isVoiceWithCaptionEnabled = () => {
  try {
    const settings = loadSettings();
    return settings.evaluation_system?.practice_detection?.voice_with_caption === true;
  } catch (error) {
    console.error('❌ [CONFIG] Error checking voice with caption enabled:', error.message);
    return false;
  }
};

const isVoiceWithReplyTaskEnabled = () => {
  try {
    const settings = loadSettings();
    return settings.evaluation_system?.practice_detection?.voice_with_reply_task === true;
  } catch (error) {
    console.error('❌ [CONFIG] Error checking voice with reply task enabled:', error.message);
    return false;
  }
};

const isVoiceWithReplyStudentEnabled = () => {
  try {
    const settings = loadSettings();
    return settings.evaluation_system?.practice_detection?.voice_with_reply_student === true;
  } catch (error) {
    console.error('❌ [CONFIG] Error checking voice with reply student enabled:', error.message);
    return false;
  }
};

const isTextOnlyEnabled = () => {
  try {
    const settings = loadSettings();
    return settings.evaluation_system?.practice_detection?.text_only === true;
  } catch (error) {
    console.error('❌ [CONFIG] Error checking text only enabled:', error.message);
    return false;
  }
};

const isTextReplyToVoiceEnabled = () => {
  try {
    const settings = loadSettings();
    return settings.evaluation_system?.practice_detection?.text_reply_to_voice === true;
  } catch (error) {
    console.error('❌ [CONFIG] Error checking text reply to voice enabled:', error.message);
    return false;
  }
};

// ===== توابع مدیریت نقش‌ها بر اساس شماره تلفن =====

// اضافه کردن مربی بر اساس شماره تلفن
const addCoachByPhone = (phoneNumber, instructorName) => {
  try {
    // نرمال‌سازی شماره تلفن
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // بررسی اینکه آیا شماره تلفن قبلاً مربی است
    const existingCoach = USERS_BY_ROLE.COACH.find(user => {
      if (typeof user === 'object' && user.phone) {
        return normalizePhoneNumber(user.phone) === normalizedPhone;
      }
      return false;
    });
    
    if (existingCoach) {
      console.log(`⚠️ [CONFIG] Phone ${normalizedPhone} is already a coach`);
      return { success: false, message: 'این شماره تلفن قبلاً مربی است' };
    }
    
    // ایجاد شناسه منحصر به فرد برای مربی
    const coachId = `phone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // اضافه کردن به لیست مربی‌ها
    const newCoach = {
      id: coachId,
      name: instructorName || `مربی ${normalizedPhone}`,
      phone: normalizedPhone,
      type: 'phone_based'
    };
    
    USERS_BY_ROLE.COACH.push(newCoach);
    
    // به‌روزرسانی USERS
    USERS[coachId] = { 
      name: newCoach.name, 
      role: 'COACH',
      phone: normalizedPhone 
    };
    
    // 🔥 مربی‌ها در workshops.json مدیریت می‌شوند
    // ذخیره در USERS_BY_ROLE.COACH (موقت)
    console.log(`✅ [CONFIG] Coach added to USERS_BY_ROLE.COACH (temporary)`);
    
    console.log(`✅ [CONFIG] Coach ${instructorName} with phone ${normalizedPhone} added to COACH role and saved to file`);
    return { success: true, message: 'مربی با موفقیت اضافه شد', coachId };
    
  } catch (error) {
    console.error('❌ [CONFIG] Error adding coach by phone:', error);
    return { success: false, message: 'خطا در اضافه کردن مربی' };
  }
};

// حذف مربی بر اساس شماره تلفن
const removeCoachByPhone = (phoneNumber) => {
  try {
    // نرمال‌سازی شماره تلفن
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // پیدا کردن مربی در لیست
    const coachIndex = USERS_BY_ROLE.COACH.findIndex(user => {
      if (typeof user === 'object' && user.phone) {
        return normalizePhoneNumber(user.phone) === normalizedPhone;
      }
      return false;
    });
    
    if (coachIndex === -1) {
      console.log(`⚠️ [CONFIG] Phone ${normalizedPhone} is not a coach`);
      return { success: false, message: 'این شماره تلفن مربی نیست' };
    }
    
    const removedCoach = USERS_BY_ROLE.COACH[coachIndex];
    
    // حذف از لیست مربی‌ها
    USERS_BY_ROLE.COACH.splice(coachIndex, 1);
    
    // حذف از USERS
    if (removedCoach.id && USERS[removedCoach.id]) {
      delete USERS[removedCoach.id];
    }
    
    // 🔥 مربی‌ها در workshops.json مدیریت می‌شوند
    // حذف از USERS_BY_ROLE.COACH (قبلاً انجام شده)
    console.log(`✅ [CONFIG] Coach removed from USERS_BY_ROLE.COACH`);
    
    console.log(`✅ [CONFIG] Coach with phone ${normalizedPhone} removed from COACH role and file updated`);
    return { success: true, message: 'مربی با موفقیت حذف شد' };
    
  } catch (error) {
    console.error('❌ [CONFIG] Error removing coach by phone:', error);
    return { success: false, message: 'خطا در حذف مربی' };
  }
};

// بررسی اینکه آیا شماره تلفن مربی است یا نه
const isPhoneCoach = (phoneNumber) => {
  try {
    // نرمال‌سازی شماره تلفن
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // 🔥 جستجو در workshops.json برای مربی‌ها
    const workshopsFile = path.join(__dirname, 'data', 'workshops.json');
    if (fs.existsSync(workshopsFile)) {
      const workshopsData = JSON.parse(fs.readFileSync(workshopsFile, 'utf8'));
      
      if (workshopsData.coach) {
        for (const [coachId, coach] of Object.entries(workshopsData.coach)) {
          if (coach.phone && coach.phone !== "0" && coach.phone.trim() !== "") {
            const normalizedCoachPhone = normalizePhoneNumber(coach.phone);
            if (normalizedPhone === normalizedCoachPhone) {
              console.log(`✅ [CONFIG] Phone ${normalizedPhone} isCoach: true (${coach.name})`);
              return true;
            }
          }
        }
      }
    }
    
    console.log(`🔍 [CONFIG] Phone ${normalizedPhone} isCoach: false`);
    return false;
    
  } catch (error) {
    console.error('❌ [CONFIG] Error checking if phone is coach:', error);
    return false;
  }
};

// دریافت اطلاعات مربی بر اساس شماره تلفن
const getCoachByPhone = (phoneNumber) => {
  try {
    // نرمال‌سازی شماره تلفن
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // 🔥 جستجو در workshops.json برای مربی‌ها
    const workshopsFile = path.join(__dirname, 'data', 'workshops.json');
    if (fs.existsSync(workshopsFile)) {
      const workshopsData = JSON.parse(fs.readFileSync(workshopsFile, 'utf8'));
      
      if (workshopsData.coach) {
        for (const [coachId, coach] of Object.entries(workshopsData.coach)) {
          if (coach.phone && coach.phone !== "0" && coach.phone.trim() !== "") {
            const normalizedCoachPhone = normalizePhoneNumber(coach.phone);
            if (normalizedPhone === normalizedCoachPhone) {
              const coachInfo = {
                id: coachId,
                name: coach.name,
                phone: coach.phone,
                type: 'workshop_based'
              };
              console.log(`✅ [CONFIG] Found coach for phone ${normalizedPhone}:`, coachInfo);
              return coachInfo;
            }
          }
        }
      }
    }
    
    console.log(`⚠️ [CONFIG] No coach found for phone ${normalizedPhone}`);
    return null;
    
  } catch (error) {
    console.error('❌ [CONFIG] Error getting coach by phone:', error);
    return null;
  }
};

// دریافت لیست تمام مربی‌ها با شماره تلفن
const getAllCoachesWithPhones = () => {
  try {
    // 🔥 جستجو در workshops.json برای مربی‌ها
    const workshopsFile = path.join(__dirname, 'data', 'workshops.json');
    if (fs.existsSync(workshopsFile)) {
      const workshopsData = JSON.parse(fs.readFileSync(workshopsFile, 'utf8'));
      const coachesWithPhones = [];
      
      if (workshopsData.coach) {
        for (const [coachId, coach] of Object.entries(workshopsData.coach)) {
          if (coach.phone && coach.phone !== "0" && coach.phone.trim() !== "") {
            coachesWithPhones.push({
              id: coachId,
              name: coach.name,
              phone: coach.phone,
              type: 'workshop_based'
            });
          }
        }
      }
      
      console.log(`✅ [CONFIG] Retrieved ${coachesWithPhones.length} coaches with phones from workshops.json`);
      return coachesWithPhones;
    }
    
    console.log(`⚠️ [CONFIG] workshops.json not found, returning empty coaches list`);
    return [];
    
  } catch (error) {
    console.error('❌ [CONFIG] Error getting coaches with phones:', error);
    return [];
  }
};

module.exports = {
  BOT_TOKEN,
  BASE_URL,
  API_URL,
  REPORT_GROUP_ID,
  ADMIN_IDS,
  AUTHORIZED_USER_IDS,
  HELPER_COACH_USER_IDS,
  GROUP_ADMIN_IDS,
  COACH_ID,
  ASSISTANT_ID,
  SETTINGS_CONFIG,
  ROLES,
  USER_ROLES,
  GROUP_NAMES,
  USER_NAMES,
  // ===== کانفیگ نام‌های ظاهری =====
  ROLE_DISPLAY_NAMES,
  getRoleDisplayName,
  // ===== ساختار مرکزی جدید =====
  USERS_BY_ROLE,
  USERS,
  getUserInfo,
  getUserRoleFromCentral,
  getUserNameFromCentral,
  // ===== توابع جدید برای مدیریت نقش‌ها =====
  getUsersByRole,
  getAllUsersByRole,
  addUserToRole,
  removeUserFromRole,
  // ===== توابع جدید برای مدیریت نقش‌های چندگانه =====
  hasRole,
  isPhoneAssistant,
  getAssistantByPhone,
  updateDerivedArrays,
  // ===== توابع جدید برای مدیریت نقش‌ها بر اساس شماره تلفن =====
  addCoachByPhone,
  removeCoachByPhone,
  isPhoneCoach,
  getCoachByPhone,
  getAllCoachesWithPhones,
  // ===== توابع جدید برای آرایه‌های به‌روزرسانی شده =====
  getCurrentAdminIds,
  getCurrentCoachId,
  getCurrentAssistantId,
  getCurrentGroupAdminIds,
  getCurrentHelperCoachUserIds,
  // ===== توابع موجود =====
  getGroupName,
  getUserName,
  getAdminNames,
  getGroupAdminNames,
  // ===== توابع مدیریت گزارش مشترک =====
  loadReportsConfig,
  saveReportsConfig,
  getReportsEnabled,
  setReportsEnabled,
  updateRobotHeartbeat,
  isRobotOnline,
  // ===== توابع مدیریت شماره تلفن =====
  PRIVATE_ADMIN_PHONE,
  getAdminIdByPhone,
  normalizePhoneNumber,
  // ===== توابع مدیریت وضعیت سیستم =====
  updateSystemStatus,
  getSystemStatus,
  resetSystemStatus,
  // ===== توابع سیستم مدیریت دائمی اعضا =====
  registerMemberInPermanentSystem,
  assignRoleInPermanentSystem,
  // ===== توابع کنترل نمایش دکمه‌ها =====
  isButtonVisible,
  setButtonVisibility,
  getButtonVisibilityConfig,
  BUTTON_VISIBILITY_CONFIG,
  GROUP_VISIBILITY_CONFIG,
  // ===== توابع کنترل دسترسی کاربران =====
  USER_ACCESS_CONFIG,
  // ===== توابع کنترل گزارش ورود ربات =====
  BOT_JOIN_REPORT_CONFIG,
  // ===== توابع کنترل گزارش دوره‌ای وضعیت ربات =====
  BOT_STATUS_REPORT_CONFIG,
  // ===== توابع کنترل جمع‌آوری خودکار اطلاعات کاربران =====
  AUTO_COLLECT_USER_CONFIG,
  // ===== توابع مدیریت کانفیگ گروه‌ها =====
  loadGroupsConfig,
  saveGroupsConfig,
  isGroupEnabled,
  setGroupStatus,
  getAllGroupsStatus,
  setDefaultGroupStatus,
  // ===== کانفیگ مدیریت گروه‌ها =====
  GROUP_MANAGEMENT_CONFIG,
  isGroupManagementEnabled,
  hasGroupManagementAccess,
  // ===== کانفیگ مدیریت استادها =====
  OSATD_MANAGEMENT_CONFIG,
  isOsatdManagementEnabled,
  hasOsatdManagementAccess,
  // ===== کانفیگ کارگاه‌ها =====
  WORKSHOP_CONFIG,
  // ===== کانفیگ دکمه‌های اصلی =====
  MAIN_BUTTONS_CONFIG,
  // ===== توابع کنترل نمایش دکمه‌های اصلی برای هر نقش =====
  isRegisterInfoVisibleForRole,
  isSettingsVisibleForRole,
  setRegisterInfoVisibilityForRole,
  setSettingsVisibilityForRole,
  getMainButtonsConfig,
  getButtonVisibilityForRole,
  // ===== کانفیگ سیستم ارزیابی =====
  EVALUATION_SYSTEM_CONFIG,
  isEvaluationSystemEnabled,
  isPracticeDetectionEnabled,
  isVoiceWithCaptionEnabled,
  isVoiceWithReplyTaskEnabled,
  isVoiceWithReplyStudentEnabled,
  isTextOnlyEnabled,
  isTextReplyToVoiceEnabled,
  isPracticeScheduleEnabled,
  getPracticeSchedule,
  isEvaluationEnabled,
  getMinEvaluators,
  isSatisfactionSurveyEnabled,
  shouldShowSatisfactionAfterEvaluation,
  shouldSendSatisfactionToAdmin,
  isReportingEnabled,
  hasEvaluationAccess,
  setPracticeDetectionStatus,
  setEvaluationSystemStatus,
  updatePracticeSchedule,
  // ===== توابع جدید برای تنظیمات تمرین و ارزیابی =====
  getPracticeDays,
  getEvaluationDays,
  isPracticeTime,
  getPracticeHours
};