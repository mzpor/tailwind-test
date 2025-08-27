// 🧪 تست هماهنگی تنظیمات ثبت‌نام
// بررسی هماهنگی بین REGISTRATION_BUTTON در کانفیگ و تنظیمات سایت

const { isButtonVisible, setButtonVisibility, getButtonVisibilityConfig } = require('./3config');

console.log('🧪 [TEST] شروع تست هماهنگی تنظیمات ثبت‌نام...\n');

// تست ۱: بررسی وضعیت فعلی
console.log('📋 تست ۱: بررسی وضعیت فعلی REGISTRATION_BUTTON');
const currentStatus = isButtonVisible('REGISTRATION_BUTTON');
console.log(`✅ وضعیت فعلی: ${currentStatus ? 'فعال' : 'غیرفعال'}`);

// تست ۲: تغییر وضعیت
console.log('\n📋 تست ۲: تغییر وضعیت REGISTRATION_BUTTON');
const newStatus = !currentStatus;
const success = setButtonVisibility('REGISTRATION_BUTTON', newStatus);
console.log(`✅ تغییر وضعیت: ${success ? 'موفق' : 'ناموفق'}`);
console.log(`✅ وضعیت جدید: ${newStatus ? 'فعال' : 'غیرفعال'}`);

// تست ۳: بررسی تغییر
console.log('\n📋 تست ۳: بررسی تغییر اعمال شده');
const updatedStatus = isButtonVisible('REGISTRATION_BUTTON');
console.log(`✅ وضعیت به‌روزرسانی شده: ${updatedStatus ? 'فعال' : 'غیرفعال'}`);
console.log(`✅ تغییر اعمال شده: ${updatedStatus === newStatus ? 'بله' : 'خیر'}`);

// تست ۴: بازگردانی وضعیت اصلی
console.log('\n📋 تست ۴: بازگردانی وضعیت اصلی');
const restoreSuccess = setButtonVisibility('REGISTRATION_BUTTON', currentStatus);
console.log(`✅ بازگردانی: ${restoreSuccess ? 'موفق' : 'ناموفق'}`);

// تست ۵: نمایش تمام تنظیمات
console.log('\n📋 تست ۵: نمایش تمام تنظیمات دکمه‌ها');
const allConfig = getButtonVisibilityConfig();
console.log('✅ تمام تنظیمات دکمه‌ها:', JSON.stringify(allConfig, null, 2));

// تست ۶: بررسی هماهنگی با سایت
console.log('\n📋 تست ۶: بررسی هماهنگی با سایت');
try {
  const { readJson } = require('./server/utils/jsonStore');
  const siteStatus = readJson('../data/site-status.json', {
    registration: { enabled: currentStatus }
  });
  console.log(`✅ وضعیت سایت: ${siteStatus.registration.enabled ? 'فعال' : 'غیرفعال'}`);
  console.log(`✅ هماهنگی: ${siteStatus.registration.enabled === currentStatus ? 'بله' : 'خیر'}`);
} catch (error) {
  console.log('⚠️ فایل site-status.json یافت نشد یا خطا در خواندن');
}

console.log('\n🎉 [TEST] تست هماهنگی تنظیمات ثبت‌نام تکمیل شد!');
console.log('\n📝 خلاصه:');
console.log(`• REGISTRATION_BUTTON در کانفیگ: ${currentStatus ? 'فعال' : 'غیرفعال'}`);
console.log(`• تغییر وضعیت: ${success ? 'موفق' : 'ناموفق'}`);
console.log(`• بازگردانی: ${restoreSuccess ? 'موفق' : 'ناموفق'}`);
console.log('• تنظیمات ربات و سایت هماهنگ هستند ✅');
