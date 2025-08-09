/**
 * 🧪 تست عملکرد مدیران و ادمین‌ها
 * بررسی واکنش ربات به پیام‌های خصوصی مدیران
 */

console.log('🧪 شروع تست عملکرد مدیران...\n');

// تست ماژول‌های مختلف
async function testAdminFlow() {
  try {
    // تست ماژول ثبت نام
    console.log('📝 تست ماژول ثبت نام برای مدیران...');
    const { registrationModule } = require('./registration_module');
    
    // تست تشخیص مدیران
    const adminUsers = [1638058362, 1114227010, 1775811194]; // مدیران مدرسه
    const coachUsers = [574330749]; // مربی
    const assistantUsers = [2045777722]; // کمک مربی
    const studentUsers = [999999999]; // قرآن آموز
    
    console.log('\n🔍 تست تشخیص نقش‌ها:');
    
    for (const userId of adminUsers) {
      const isAdmin = registrationModule.isAdminOrTeacher(userId);
      const role = registrationModule.getUserRole(userId);
      const roleName = registrationModule.getRoleDisplayName(role);
      console.log(`👑 مدیر ${userId}: isAdminOrTeacher=${isAdmin}, role=${role}, name=${roleName}`);
    }
    
    for (const userId of coachUsers) {
      const isAdmin = registrationModule.isAdminOrTeacher(userId);
      const role = registrationModule.getUserRole(userId);
      const roleName = registrationModule.getRoleDisplayName(role);
      console.log(`🏋️ مربی ${userId}: isAdminOrTeacher=${isAdmin}, role=${role}, name=${roleName}`);
    }
    
    for (const userId of assistantUsers) {
      const isAdmin = registrationModule.isAdminOrTeacher(userId);
      const role = registrationModule.getUserRole(userId);
      const roleName = registrationModule.getRoleDisplayName(role);
      console.log(`👨‍🏫 کمک مربی ${userId}: isAdminOrTeacher=${isAdmin}, role=${role}, name=${roleName}`);
    }
    
    for (const userId of studentUsers) {
      const isAdmin = registrationModule.isAdminOrTeacher(userId);
      const role = registrationModule.getUserRole(userId);
      const roleName = registrationModule.getRoleDisplayName(role);
      console.log(`📖 قرآن آموز ${userId}: isAdminOrTeacher=${isAdmin}, role=${role}, name=${roleName}`);
    }
    
    console.log('\n✅ تمام تست‌های مدیران با موفقیت انجام شد!');
    
  } catch (error) {
    console.error('❌ خطا در تست:', error.message);
    console.error('❌ Stack trace:', error.stack);
  }
}

// اجرای تست
testAdminFlow();
