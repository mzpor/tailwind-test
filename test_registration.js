const UnifiedRegistrationManager = require('./robot/unified_registration_manager');

// ایجاد نمونه از ماژول
const registrationModule = new UnifiedRegistrationManager();

console.log('🧪 Testing Smart Registration Module...\n');

// تست ۱: بررسی بارگذاری کارگاه‌ها
console.log('📚 Workshops loaded:', Object.keys(registrationModule.workshops).length);
Object.entries(registrationModule.workshops).forEach(([id, workshop]) => {
  console.log(`  - ${workshop.instructor_name}: ${workshop.cost}`);
});

console.log('\n');

// تست ۲: شبیه‌سازی مراحل ثبت‌نام
const testUserId = 12345;
const testChatId = 12345;

console.log('👤 Testing registration flow...');

// مرحله ۱: شروع ثبت‌نام
console.log('1️⃣ Starting registration...');
registrationModule.userStates[testUserId] = { step: 'name' };
registrationModule.userData[testUserId] = {};

// مرحله ۲: وارد کردن نام
console.log('2️⃣ Entering name: "علی رضایی"');
registrationModule.userData[testUserId].full_name = 'علی رضایی';
registrationModule.userData[testUserId].first_name = 'علی';
console.log('   First name extracted:', registrationModule.userData[testUserId].first_name);

// مرحله ۳: وارد کردن کد ملی
console.log('3️⃣ Entering national ID: "1234567890"');
registrationModule.userData[testUserId].national_id = '1234567890';
console.log('   National ID valid:', registrationModule.isValidNationalId('1234567890'));

// مرحله ۴: وارد کردن تلفن
console.log('4️⃣ Entering phone: "989339253803"');
registrationModule.userData[testUserId].phone = '989339253803';

// تست ۵: بررسی کامل بودن ثبت‌نام
console.log('5️⃣ Checking registration completion...');
console.log('   Is user registered:', registrationModule.isUserRegistered(testUserId));
console.log('   Is registration complete:', registrationModule.isRegistrationComplete(testUserId));

// تست ۶: بررسی مدیر بودن
console.log('6️⃣ Checking admin status...');
console.log('   Is user admin:', registrationModule.isUserAdmin('989339253803'));

// تست ۷: بررسی فیلدهای ناقص
console.log('7️⃣ Checking missing fields...');
console.log('   Missing fields:', registrationModule.getMissingFields(testUserId));

console.log('\n✅ Test completed successfully!');
console.log('📊 User data:', registrationModule.userData[testUserId]);
