//⏰ 09:13:00 🗓️ دوشنبه 13 مرداد 1404
// ماژول لاگ‌های سیستم مثل خاموش شدن ربات - به‌روزرسانی شده در 1404/05/13 ساعت 11:00

const { sendMessage } = require('./4bale');
const moment = require('moment-jalaali');
const { REPORT_GROUP_ID } = require('./6mid');
const { getGroupsSummary } = require('./7group');
const SettingsModule = require('./11settings');

let lastShutdownMessage = 0;
let lastStartupMessage = 0;
let lastShutdownDate = '';
let lastStartupDate = '';

// تولید فرمت زمان و تاریخ مورد نظر
function getFormattedDateTime(includeYear = false) {
  console.log('⏰ [LOGS] getFormattedDateTime called, includeYear:', includeYear);
  const now = moment();
  const time = now.format('HH:mm:ss');
  const day = now.format('jD');
  const month = now.format('jMMMM').replace(/^ا/, ''); // حذف "ام" از ابتدای نام ماه
  const year = now.format('jYYYY');
  
  let result;
  if (includeYear) {
    result = `${time}\n${day} ${month} ${year}`;
  } else {
    result = `${time}\n${day} ${month}`;
  }
  
  console.log('⏰ [LOGS] Generated formatted datetime:', result);
  return result;
}

async function logShutdown() {
  console.log('🛑 [LOGS] logShutdown called');
  
  console.log('📊 [LOGS] پیام جداگانه خاموشی ارسال نمی‌شود - داشبورد وضعیت کافی است');
  // پیام خاموشی جداگانه غیرفعال شده - داشبورد وضعیت اطلاع‌رسانی می‌کند
}

async function logStartup() {
  console.log('🚀 [LOGS] logStartup called');
  
  // بررسی وضعیت گزارش
  const settings = new SettingsModule();
  await settings.loadSettings();
  if (!settings.settings.enable_bot_reports) {
    console.log('📋 [LOGS] Reports disabled, skipping startup message');
    return;
  }
  
  const now = Date.now();
  // حذف شرط زمانی برای تست - بعداً برمی‌گردانیم
  // if (now - lastStartupMessage > 60000) {
    console.log('✅ [LOGS] Startup message allowed');
    const today = moment().format('YYYY-MM-DD');
    const includeYear = today !== lastStartupDate;
    
    try {
      // دریافت خلاصه گروه‌ها
      console.log('📊 [LOGS] Getting groups summary...');
      const groupsInfo = await getGroupsSummary();
      console.log('📊 [LOGS] Groups summary:', groupsInfo);
      
      console.log('📊 [LOGS] پیام راه‌اندازی ربات حذف شد - داشبورد وضعیت کافی است');
      // پیام راه‌اندازی حذف شده - داشبورد وضعیت اطلاع‌رسانی می‌کند
      return;
      
      console.log('📤 [LOGS] Sending startup message:', text);
      await sendMessage(REPORT_GROUP_ID, text);
      console.log('✅ [LOGS] Startup message sent successfully');
      lastStartupMessage = now;
      if (includeYear) {
        lastStartupDate = today;
      }
    } catch (error) {
      console.error('❌ [LOGS] Error sending startup message:', error.message);
      console.error('❌ [LOGS] Error stack:', error.stack);
    }
  // }
}

// گزارش خطاهای مهم
async function logError(errorType, details = '') {
  console.log('⚠️ [LOGS] logError called');
  console.log(`⚠️ [LOGS] Error type: ${errorType}, Details: ${details}`);
  
  // بررسی وضعیت گزارش
  const settings = new SettingsModule();
  await settings.loadSettings();
  if (!settings.settings.enable_bot_reports) {
    console.log('📋 [LOGS] Reports disabled, skipping error message');
    return;
  }
  
  const text = `⚠️ خطا: ${errorType}
${details ? `📝 ${details}\n` : ''}⏰ ${getFormattedDateTime()}`;
  
  console.log('📤 [LOGS] Sending error message:', text);
  try {
    await sendMessage(REPORT_GROUP_ID, text);
    console.log('✅ [LOGS] Error message sent successfully');
  } catch (error) {
    console.error('❌ [LOGS] Error sending error report:', error.message);
  }
}

// گزارش وضعیت اتصال
async function logConnectionStatus(status) {
  console.log('🌐 [LOGS] logConnectionStatus called');
  console.log(`🌐 [LOGS] Status: ${status}`);
  
  // بررسی وضعیت گزارش
  const settings = new SettingsModule();
  await settings.loadSettings();
  if (!settings.settings.enable_bot_reports) {
    console.log('📋 [LOGS] Reports disabled, skipping connection status message');
    return;
  }
  
  const text = `🌐 ${status}
⏰ ${getFormattedDateTime()}`;
  
  console.log('📤 [LOGS] Sending connection status message:', text);
  try {
    await sendMessage(REPORT_GROUP_ID, text);
    console.log('✅ [LOGS] Connection status message sent successfully');
  } catch (error) {
    console.error('❌ [LOGS] Error sending connection report:', error.message);
  }
}

module.exports = { logShutdown, logStartup, logError, logConnectionStatus };