//⏰ 09:11:00 🗓️ دوشنبه 13 مرداد 1404
// ماژول نقش‌ها و منوی اختصاصی + آیدی گروه گزارش - به‌روزرسانی شده در 1404/05/15 ساعت 23:00 - نسخه 1.6.0

const { 
  USER_ROLES,
  // ===== ساختار مرکزی جدید =====
  USERS,
  USERS_BY_ROLE,
  getUserInfo,
  getUserRoleFromCentral,
  getUserNameFromCentral,
  getUsersByRole: getUsersByRoleFromConfig,
  getCurrentAdminIds,
  getCurrentGroupAdminIds,
  getCurrentCoachId,
  getCurrentAssistantId,
  // ===== توابع جدید برای مدیریت نقش‌ها بر اساس شماره تلفن =====
  isPhoneCoach,
  getCoachByPhone,
  // ===== توابع جدید برای مدیریت نقش‌های چندگانه =====
  hasRole
} = require('./3config');
const { ROLES } = require('./3config');

const REPORT_GROUP_ID = 5537396165; // گروه گزارش جهاد

// ===== توابع بهینه‌سازی شده با ساختار مرکزی =====

// بررسی نقش کاربر (بهینه‌سازی شده)
function getUserRole(userId) {
  console.log(`🔍 [MID] getUserRole called for userId: ${userId}`);
  
  // ابتدا از ساختار مرکزی استفاده کن
  const userInfo = getUserInfo(userId);
  const role = getUserRoleFromCentral(userId);
  
  console.log(`✅ [MID] User ${userId} is ${role} (from central structure)`);
  return role;
}

// بررسی ادمین بودن (بهینه‌سازی شده)
function isAdmin(chatId) {
  console.log(`🔍 [MID] isAdmin called for chatId: ${chatId}`);
  
  // از ساختار مرکزی استفاده کن
  const userInfo = getUserInfo(chatId);
  const result = userInfo.role === 'SCHOOL_ADMIN';
  
  console.log(`✅ [MID] isAdmin result for ${chatId}: ${result}`);
  return result;
}

// بررسی ادمین گروه بودن (بهینه‌سازی شده)
function isGroupAdmin(userId) {
  console.log(`🔍 [MID] isGroupAdmin called for userId: ${userId}`);
  
  // از ساختار مرکزی استفاده کن
  const userInfo = getUserInfo(userId);
  const result = ['SCHOOL_ADMIN', 'COACH', 'ASSISTANT'].includes(userInfo.role);
  
  console.log(`✅ [MID] isGroupAdmin result for ${userId}: ${result}`);
  return result;
}

// بررسی مربی بودن (بهینه‌سازی شده)
function isCoach(userId) {
  console.log(`🔍 [MID] isCoach called for userId: ${userId}`);
  
  // از ساختار مرکزی استفاده کن
  const userInfo = getUserInfo(userId);
  const result = userInfo.role === 'COACH';
  
  console.log(`✅ [MID] isCoach result for ${userId}: ${result}`);
  return result;
}

// بررسی کمک مربی بودن (بهینه‌سازی شده)
function isAssistant(userId) {
  console.log(`🔍 [MID] isAssistant called for userId: ${userId}`);
  
  // از ساختار مرکزی استفاده کن
  const userInfo = getUserInfo(userId);
  const result = hasRole(userId, 'ASSISTANT');
  
  console.log(`✅ [MID] isAssistant result for ${userId}: ${result}`);
  return result;
}

// بررسی قرآن‌آموز بودن (جدید)
function isStudent(userId) {
  console.log(`🔍 [MID] isStudent called for userId: ${userId}`);
  
  // از ساختار مرکزی استفاده کن
  const userInfo = getUserInfo(userId);
  const result = hasRole(userId, 'STUDENT');
  
  console.log(`✅ [MID] isStudent result for ${userId}: ${result}`);
  return result;
}

// بررسی اینکه آیا کاربر هم کمک مربی و هم قرآن‌آموز است (جدید)
function isAssistantAndStudent(userId) {
  console.log(`🔍 [MID] isAssistantAndStudent called for userId: ${userId}`);
  
  const isAssist = hasRole(userId, 'ASSISTANT');
  const isStud = hasRole(userId, 'STUDENT');
  const result = isAssist && isStud;
  
  console.log(`✅ [MID] isAssistantAndStudent result for ${userId}: ${result} (ASSISTANT: ${isAssist}, STUDENT: ${isStud})`);
  return result;
}

// بررسی مربی بودن بر اساس شماره تلفن (جدید)
function isCoachByPhone(phoneNumber) {
  console.log(`🔍 [MID] isCoachByPhone called for phone: ${phoneNumber}`);
  
  try {
    const result = isPhoneCoach(phoneNumber);
    console.log(`✅ [MID] isCoachByPhone result for ${phoneNumber}: ${result}`);
    return result;
  } catch (error) {
    console.error('❌ [MID] Error in isCoachByPhone:', error);
    return false;
  }
}

// دریافت اطلاعات مربی بر اساس شماره تلفن (جدید)
function getCoachInfoByPhone(phoneNumber) {
  console.log(`🔍 [MID] getCoachInfoByPhone called for phone: ${phoneNumber}`);
  
  try {
    const coachInfo = getCoachByPhone(phoneNumber);
    console.log(`✅ [MID] getCoachInfoByPhone result for ${phoneNumber}:`, coachInfo);
    return coachInfo;
  } catch (error) {
    console.error('❌ [MID] Error in getCoachInfoByPhone:', error);
    return null;
  }
}

// دریافت نام کاربر (بهینه‌سازی شده)
function getUserName(userId) {
  return getUserNameFromCentral(userId);
}

// دریافت اطلاعات کامل کاربر (جدید)
function getUserFullInfo(userId) {
  return getUserInfo(userId);
}

// دریافت کیبورد بر اساس نقش (بهینه‌سازی شده)
function getRoleKeyboard(chatId) {
  console.log(`🔍 [MID] getRoleKeyboard called for chatId: ${chatId}`);
  
  // از ساختار مرکزی استفاده کن
  const userInfo = getUserInfo(chatId);
  const role = userInfo.role;
  
  switch (role) {
    case 'SCHOOL_ADMIN':
      console.log(`✅ [MID] Returning admin keyboard for ${chatId}`);
      return [['شروع', 'خروج'], ['پنل مدیریتی']];
    case 'COACH':
      console.log(`✅ [MID] Returning coach keyboard for ${chatId}`);
      return [['شروع', 'خروج'], ['پنل مربی']];
    case 'ASSISTANT':
      console.log(`✅ [MID] Returning assistant keyboard for ${chatId}`);
      return [['شروع', 'خروج'], ['پنل کمک مربی']];
    case 'STUDENT':
    default:
      console.log(`✅ [MID] Returning student keyboard for ${chatId}`);
      return [['شروع', 'خروج'], ['پنل قرآن آموز']];
  }
}

// ===== توابع کمکی جدید و بهینه‌سازی شده =====

// دریافت تمام کاربران با نقش خاص (بهینه‌سازی شده)
function getUsersByRole(role) {
  console.log(`🔍 [MID] getUsersByRole called for role: ${role}`);
  
  // از ساختار مرکزی استفاده کن
  const users = getUsersByRoleFromConfig(role);
  console.log(`✅ [MID] Found ${users.length} users with role ${role}`);
  return users;
}

// دریافت تمام ادمین‌ها (بهینه‌سازی شده)
function getAllAdmins() {
  console.log(`🔍 [MID] getAllAdmins called`);
  const admins = getUsersByRole('SCHOOL_ADMIN');
  console.log(`✅ [MID] Found ${admins.length} admins`);
  return admins;
}

// دریافت تمام مربیان (بهینه‌سازی شده)
function getAllCoaches() {
  console.log(`🔍 [MID] getAllCoaches called`);
  const coaches = getUsersByRole('COACH');
  console.log(`✅ [MID] Found ${coaches.length} coaches`);
  return coaches;
}

// دریافت تمام کمک مربیان (بهینه‌سازی شده)
function getAllAssistants() {
  console.log(`🔍 [MID] getAllAssistants called`);
  const assistants = getUsersByRole('ASSISTANT');
  console.log(`✅ [MID] Found ${assistants.length} assistants`);
  return assistants;
}

// دریافت تمام دانش‌آموزان (بهینه‌سازی شده)
function getAllStudents() {
  console.log(`🔍 [MID] getAllStudents called`);
  const students = getUsersByRole('STUDENT');
  console.log(`✅ [MID] Found ${students.length} students`);
  return students;
}

// بررسی اینکه کاربر در نقش خاصی هست یا نه (جدید)
function isUserInRole(userId, role) {
  console.log(`🔍 [MID] isUserInRole called for userId: ${userId}, role: ${role}`);
  
  const userInfo = getUserInfo(userId);
  const result = userInfo.role === role;
  
  console.log(`✅ [MID] isUserInRole result for ${userId} in ${role}: ${result}`);
  return result;
}

// دریافت لیست تمام کاربران با نقش‌هایشان (جدید)
function getAllUsersWithRoles() {
  console.log(`🔍 [MID] getAllUsersWithRoles called`);
  
  const result = {};
  Object.entries(USERS_BY_ROLE).forEach(([role, users]) => {
    result[role] = users.map(user => ({
      id: user.id,
      name: user.name,
      role: role
    }));
  });
  
  console.log(`✅ [MID] Retrieved all users with roles:`, JSON.stringify(result, null, 2));
  return result;
}

// بررسی دسترسی کاربر (جدید)
function hasPermission(userId, requiredRole) {
  console.log(`🔍 [MID] hasPermission called for userId: ${userId}, requiredRole: ${requiredRole}`);
  
  const userInfo = getUserInfo(userId);
  const userRole = userInfo.role;
  
  // سلسله مراتب دسترسی
  const roleHierarchy = {
    'SCHOOL_ADMIN': 4,
    'COACH': 3,
    'ASSISTANT': 2,
    'STUDENT': 1
  };
  
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  const result = userLevel >= requiredLevel;
  console.log(`✅ [MID] hasPermission result for ${userId}: ${result} (user: ${userRole}, required: ${requiredRole})`);
  return result;
}

// دریافت نقش‌های مجاز برای کاربر (جدید)
function getAvailableRoles(userId) {
  console.log(`🔍 [MID] getAvailableRoles called for userId: ${userId}`);
  
  const userInfo = getUserInfo(userId);
  const userRole = userInfo.role;
  
  const availableRoles = [];
  
  switch (userRole) {
    case 'SCHOOL_ADMIN':
      availableRoles.push('SCHOOL_ADMIN', 'COACH', 'ASSISTANT', 'STUDENT');
      break;
    case 'COACH':
      availableRoles.push('COACH', 'ASSISTANT', 'STUDENT');
      break;
    case 'ASSISTANT':
      availableRoles.push('ASSISTANT', 'STUDENT');
      break;
    case 'STUDENT':
      availableRoles.push('STUDENT');
      break;
    default:
      availableRoles.push('STUDENT');
  }
  
  console.log(`✅ [MID] Available roles for ${userId}:`, availableRoles);
  return availableRoles;
}

console.log('🔧 [MID] Middleware module loaded with central user structure');
console.log('🔧 [MID] Available roles:', Object.keys(ROLES));
console.log('🔧 [MID] Users by role structure:', JSON.stringify(USERS_BY_ROLE, null, 2));

module.exports = {
  REPORT_GROUP_ID,
  getUserRole,
  isAdmin,
  isGroupAdmin,
  isCoach,
  isAssistant,
  isStudent,
  isAssistantAndStudent,
  isCoachByPhone,
  getCoachInfoByPhone,
  getUserName,
  getUserFullInfo,
  getRoleKeyboard,
  getUsersByRole,
  getAllAdmins,
  getAllCoaches,
  getAllAssistants,
  getAllStudents,
  isUserInRole,
  getAllUsersWithRoles,
  hasPermission,
  getAvailableRoles
};