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

module.exports = { getTimeStamp };