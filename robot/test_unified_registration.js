//🧪 تست ماژول مدیریت یکپارچه ثبت‌نام

const UnifiedRegistrationManager = require('./unified_registration_manager');

class UnifiedRegistrationTester {
  constructor() {
    this.manager = new UnifiedRegistrationManager();
    console.log('🧪 UnifiedRegistrationTester initialized');
  }

  async runAllTests() {
    console.log('\n🚀 شروع تست‌های مدیریت یکپارچه ثبت‌نام\n');
    
    try {
      // تست ۱: ثبت‌نام از ربات
      await this.testBotRegistration();
      
      // تست ۲: ثبت‌نام از سایت
      await this.testWebsiteRegistration();
      
      // تست ۳: جستجو و یافتن کاربران
      await this.testUserSearch();
      
      // تست ۴: به‌روزرسانی اطلاعات
      await this.testUserUpdate();
      
      // تست ۵: آمار و گزارش‌گیری
      await this.testStatistics();
      
      // تست ۶: پاک‌سازی رکوردهای تکراری
      await this.testCleanup();
      
      console.log('\n✅ تمام تست‌ها با موفقیت انجام شد!\n');
      
    } catch (error) {
      console.error('\n❌ خطا در اجرای تست‌ها:', error);
    }
  }

  async testBotRegistration() {
    console.log('🤖 تست ۱: ثبت‌نام از ربات');
    console.log('========================');
    
    const testUserData = {
      fullName: 'علی رضایی',
      firstName: 'علی',
      nationalId: '1234567890',
      phone: '09123456789',
      workshopId: 'w-1404-01'
    };
    
    const registrationId = this.manager.registerFromBot('bot_user_123', testUserData);
    console.log(`✅ ثبت‌نام ربات ایجاد شد: ${registrationId}`);
    
    // بررسی وجود در هر دو فایل
    const botUser = this.manager.findUserById(registrationId);
    const nationalIdUser = this.manager.findUserByNationalId('1234567890');
    
    if (botUser && nationalIdUser) {
      console.log('✅ کاربر در هر دو فایل یافت شد');
      console.log(`📱 منبع: ${botUser.source}`);
      console.log(`🆔 کد ملی: ${nationalIdUser.userData.nationalId}`);
    } else {
      console.log('❌ کاربر در فایل‌ها یافت نشد');
    }
    
    console.log('');
  }

  async testWebsiteRegistration() {
    console.log('🌐 تست ۲: ثبت‌نام از سایت');
    console.log('========================');
    
    const testUserData = {
      fullName: 'سارا احمدی',
      firstName: 'سارا',
      phone: '09987654321',
      workshopId: 'w-1404-02'
    };
    
    const websiteUserId = this.manager.registerFromWebsite('0987654321', testUserData);
    console.log(`✅ ثبت‌نام سایت ایجاد شد: ${websiteUserId}`);
    
    // بررسی وجود در هر دو فایل
    const websiteUser = this.manager.findUserById(websiteUserId);
    const phoneUser = this.manager.findUserByPhone('09987654321');
    
    if (websiteUser && phoneUser) {
      console.log('✅ کاربر در هر دو فایل یافت شد');
      console.log(`📱 منبع: ${websiteUser.source}`);
      console.log(`📞 تلفن: ${phoneUser.userData.phone}`);
    } else {
      console.log('❌ کاربر در فایل‌ها یافت نشد');
    }
    
    console.log('');
  }

  async testUserSearch() {
    console.log('🔍 تست ۳: جستجو و یافتن کاربران');
    console.log('================================');
    
    // جستجو بر اساس نام
    const nameResults = this.manager.searchUsers('علی');
    console.log(`🔍 جستجوی "علی": ${nameResults.length} نتیجه`);
    
    // جستجو بر اساس کد ملی
    const nationalIdResults = this.manager.searchUsers('1234567890');
    console.log(`🔍 جستجوی کد ملی "1234567890": ${nationalIdResults.length} نتیجه`);
    
    // جستجو بر اساس تلفن
    const phoneResults = this.manager.searchUsers('09123456789');
    console.log(`🔍 جستجوی تلفن "09123456789": ${phoneResults.length} نتیجه`);
    
    // یافتن کاربر بر اساس کد ملی
    const userByNationalId = this.manager.findUserByNationalId('1234567890');
    if (userByNationalId) {
      console.log(`✅ کاربر با کد ملی یافت شد: ${userByNationalId.userData.fullName}`);
    }
    
    console.log('');
  }

  async testUserUpdate() {
    console.log('🔄 تست ۴: به‌روزرسانی اطلاعات');
    console.log('============================');
    
    // به‌روزرسانی کاربر ربات
    const updates = {
      phone: '09111111111',
      workshopId: 'w-1404-03'
    };
    
    const updateResult = this.manager.updateUser('bot_user_123', updates, 'bot');
    if (updateResult) {
      console.log('✅ اطلاعات کاربر ربات به‌روزرسانی شد');
      
      // بررسی تغییرات
      const updatedUser = this.manager.findUserById('bot_user_123');
      if (updatedUser) {
        console.log(`📱 تلفن جدید: ${updatedUser.userData.phone}`);
        console.log(`🏭 کارگاه جدید: ${updatedUser.userData.workshopId}`);
      }
    }
    
    console.log('');
  }

  async testStatistics() {
    console.log('📊 تست ۵: آمار و گزارش‌گیری');
    console.log('============================');
    
    const stats = this.manager.getStatistics();
    console.log('📊 آمار کلی:');
    console.log(`   • کل کاربران: ${stats.total}`);
    console.log(`   • تکمیل شده: ${stats.completed}`);
    console.log(`   • ناقص: ${stats.incomplete}`);
    console.log(`   • از ربات: ${stats.botUsers}`);
    console.log(`   • از سایت: ${stats.websiteUsers}`);
    
    // لیست کاربران ناقص
    const incompleteUsers = this.manager.getIncompleteUsers();
    console.log(`\n📋 کاربران ناقص (${incompleteUsers.length}):`);
    incompleteUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.fullName || 'نامشخص'} - ${user.source} - ${user.status}`);
    });
    
    // لیست کاربران تکمیل شده
    const completedUsers = this.manager.getCompletedUsers();
    console.log(`\n✅ کاربران تکمیل شده (${completedUsers.length}):`);
    completedUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.fullName} - ${user.source} - ${user.status}`);
    });
    
    console.log('');
  }

  async testCleanup() {
    console.log('🧹 تست ۶: پاک‌سازی رکوردهای تکراری');
    console.log('====================================');
    
    // ایجاد رکورد تکراری برای تست
    const duplicateData = {
      fullName: 'علی رضایی',
      firstName: 'علی',
      nationalId: '1234567890',
      phone: '09123456789',
      workshopId: 'w-1404-01',
      source: 'bot',
      registrationComplete: true,
      ts: Date.now()
    };
    
    // اضافه کردن رکورد تکراری
    this.manager.registrations['duplicate_test'] = duplicateData;
    this.manager.saveData(this.manager.registrationsFile, this.manager.registrations);
    
    console.log('📝 رکورد تکراری اضافه شد');
    
    // اجرای پاک‌سازی
    const cleanedCount = this.manager.cleanupDuplicates();
    console.log(`🧹 تعداد رکوردهای پاک‌سازی شده: ${cleanedCount}`);
    
    // بررسی نتیجه
    const finalStats = this.manager.getStatistics();
    console.log(`📊 آمار نهایی: ${finalStats.total} کاربر`);
    
    console.log('');
  }
}

// اجرای تست‌ها
if (require.main === module) {
  const tester = new UnifiedRegistrationTester();
  tester.runAllTests();
}

module.exports = UnifiedRegistrationTester;
