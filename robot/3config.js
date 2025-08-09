// گویا کردن اسم گروه
//⏰ 09:00:00 🗓️ دوشنبه 13 مرداد 1404
// ماژول تنظیمات اصلی ربات - به‌روزرسانی شده در 1404/05/15 ساعت 23:45

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
 //  { id: 1638058362,   name: "لشگری"     }       ,
  // { id: 1775811194,       name: "محرابی"       }
   // { id: 1114227010, name: "محمد ۱" } - حذف شده توسط مدیر نقش‌ها
  ],
  COACH: [
    2045777722,
    574330749
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
const getUserInfo = (userId) => {
  // اگر کاربر در USERS موجود است، آن را برگردان
  if (USERS[userId]) {
    return USERS[userId];
  }
  
  // اگر کاربر در USERS نیست، نام را از USER_NAMES بگیر و نقش STUDENT بده
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
  ENABLE_BOT_REPORTS: true, // گزارش‌گیری
  
  // فایل ذخیره تنظیمات
  SETTINGS_FILE: 'settings_data.json',
  
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
  getGroupAdminNames
};