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

// همه تغییرات هست . 
// گیت استش میکنه پاک میکنه 



// ===== کنترل نمایش دکمه‌ها در پنل مدیر =====
const BUTTON_VISIBILITY_CONFIG = {


  ROBOT_BUTTON:0,  // 1 = نمایش دکمه ربات، 0 = عدم نمایش

  REGISTRATION_BUTTON: 1,  // 1 = نمایش دکمه ثبت‌نام ماه آینده، 0 = عدم نمایش
  // در آینده می‌توان دکمه‌های بیشتری اضافه کرد
  // SETTINGS_BUTTON: 1,
  ROLES_BUTTON: 0,  // مدیریت نقش‌ها غیرفعال شده
  PRACTICE_EVALUATION_DAYS_BUTTON: 1,  // دکمه روزهای تمرین و ارزیابی: 1 = فعال، 0 = غیرفعال
  //   خاموش کردن نظر سنجی ؟
  //  روشن کردن یاداوری برای بچه ها 
  
  // EXIT_BUTTON: 1
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
const COACHES_FILE = path.join(__dirname, 'data', 'coaches.json');

// تابع بارگذاری مربی‌ها از فایل
const loadCoachesFromFile = () => {
  try {
    if (fs.existsSync(COACHES_FILE)) {
      const data = fs.readFileSync(COACHES_FILE, 'utf8');
      const coaches = JSON.parse(data);
      console.log(`✅ [CONFIG] Loaded ${coaches.length} coaches from file`);
      return coaches;
    }
  } catch (error) {
    console.error('❌ [CONFIG] Error loading coaches from file:', error);
  }
  return [];
};

// تابع ذخیره مربی‌ها در فایل
const saveCoachesToFile = (coaches) => {
  try {
    // اطمینان از وجود پوشه data
    const dataDir = path.dirname(COACHES_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(COACHES_FILE, JSON.stringify(coaches, null, 2), 'utf8');
    console.log(`✅ [CONFIG] Saved ${coaches.length} coaches to file`);
    return true;
  } catch (error) {
    console.error('❌ [CONFIG] Error saving coaches to file:', error);
    return false;
  }
};

// بارگذاری مربی‌ها از فایل در ابتدا
const phoneBasedCoaches = loadCoachesFromFile();

// اضافه کردن مربی‌های مبتنی بر شماره تلفن به USERS_BY_ROLE.COACH
phoneBasedCoaches.forEach(coach => {
  if (coach && coach.phone && coach.name) {
    USERS_BY_ROLE.COACH.push(coach);
    console.log(`🔄 [CONFIG] Loaded coach ${coach.name} with phone ${coach.phone}`);
  }
});

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
      USERS[user.id] = { name: user.name, role: role };
    } else if (typeof user === 'number') {
      // اگر user فقط یک عدد است، از USER_NAMES استفاده کن
      const userName = USER_NAMES[user] || `کاربر ${user}`;
      USERS[user] = { name: userName, role: role };
    }
  });
});

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
  // تبدیل به فرمت کوچک برای سازگاری با USER_ROLES
  return role.toLowerCase();
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

const addUserToRole = (role, userId, userName) => {
  if (!USERS_BY_ROLE[role]) {
    USERS_BY_ROLE[role] = [];
  }
  USERS_BY_ROLE[role].push({ id: userId, name: userName });
  // به‌روزرسانی USERS
  USERS[userId] = { name: userName, role: role };
  
  console.log(`🔄 [CONFIG] User ${userId} added to role ${role}`);
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
  SETTINGS_FILE: 'settings_data.json',
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
  SCHOOL_ADMIN: 'school_admin',    // مدیر مدرسه
  GROUP_ADMIN: 'group_admin',      // ادمین گروه
  COACH: 'coach',                  // مربی
  ASSISTANT: 'assistant',          // کمک مربی
  STUDENT: 'student'               // قرآن آموز
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

// ===== توابع جدید برای مدیریت نقش‌ها بر اساس شماره تلفن =====

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
    
    // ذخیره مربی‌ها در فایل
    const phoneBasedCoaches = USERS_BY_ROLE.COACH.filter(user => 
      typeof user === 'object' && user.phone && user.type === 'phone_based'
    );
    saveCoachesToFile(phoneBasedCoaches);
    
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
    
    // به‌روزرسانی فایل مربی‌ها
    const phoneBasedCoaches = USERS_BY_ROLE.COACH.filter(user => 
      typeof user === 'object' && user.phone && user.type === 'phone_based'
    );
    saveCoachesToFile(phoneBasedCoaches);
    
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
    
    // جستجو در لیست مربی‌ها
    const isCoach = USERS_BY_ROLE.COACH.some(user => {
      if (typeof user === 'object' && user.phone) {
        return normalizePhoneNumber(user.phone) === normalizedPhone;
      }
      return false;
    });
    
    console.log(`🔍 [CONFIG] Phone ${normalizedPhone} isCoach: ${isCoach}`);
    return isCoach;
    
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
    
    // جستجو در لیست مربی‌ها
    const coach = USERS_BY_ROLE.COACH.find(user => {
      if (typeof user === 'object' && user.phone) {
        return normalizePhoneNumber(user.phone) === normalizedPhone;
      }
      return false;
    });
    
    if (coach) {
      console.log(`✅ [CONFIG] Found coach for phone ${normalizedPhone}:`, coach);
      return coach;
    } else {
      console.log(`⚠️ [CONFIG] No coach found for phone ${normalizedPhone}`);
      return null;
    }
    
  } catch (error) {
    console.error('❌ [CONFIG] Error getting coach by phone:', error);
    return null;
  }
};

// دریافت لیست تمام مربی‌ها با شماره تلفن
const getAllCoachesWithPhones = () => {
  try {
    const coachesWithPhones = USERS_BY_ROLE.COACH.filter(user => 
      typeof user === 'object' && user.phone
    );
    
    console.log(`✅ [CONFIG] Retrieved ${coachesWithPhones.length} coaches with phones`);
    return coachesWithPhones;
    
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
  BUTTON_VISIBILITY_CONFIG
};