//⏰ 09:00:00 🗓️ دوشنبه 13 مرداد 1404
// ماژول زمان شمسی

const moment = require('moment-jalaali');
moment.loadPersian({ usePersianDigits: false });

function getTimeStamp() {
  console.log('⏰ [TIME] getTimeStamp called');
  const now = moment();
  const t = now.format('HH:mm:ss');
  const d = now.format('dddd jD jMMMM jYYYY');
  const timestamp = `⏰ ${t} 🗓️ ${d}`;
  console.log('⏰ [TIME] Generated timestamp:', timestamp);
  return timestamp;
}

// تابع دریافت نام ماه فارسی فعلی
function getPersianMonthName() {
  const now = moment();
  return now.format('jMMMM');
}

// تابع دریافت نام ماه فارسی بعدی
function getNextPersianMonthName() {
  const now = moment();
  const nextMonth = now.add(1, 'jMonth');
  return nextMonth.format('jMMMM');
}

// تابع تولید متن ثبت‌نام بر اساس وضعیت
function getRegistrationMonthText(isEnabled = false) {
  if (isEnabled) {
    const currentMonth = getPersianMonthName();
    
    // در ماه مرداد، امکان ثبت‌نام برای شهریور
    if (currentMonth === 'مرداد') {
      return `📝 ثبت نام شهریور`;
    } else {
      // در سایر ماه‌ها، نمایش ماه آینده
      const nextMonth = getNextPersianMonthName();
      return `📝 ثبت نام ${nextMonth}`;
    }
  } else {
    return `📝 ثبت نام به زودی...`;
  }
}

module.exports = { 
  getTimeStamp, 
  getPersianMonthName, 
  getNextPersianMonthName, 
  getRegistrationMonthText 
};