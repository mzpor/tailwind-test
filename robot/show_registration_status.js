//📊 نمایش وضعیت فعلی سیستم ثبت‌نام

const UnifiedRegistrationManager = require('./unified_registration_manager');

class RegistrationStatusDisplay {
  constructor() {
    this.manager = new UnifiedRegistrationManager();
    console.log('📊 نمایش وضعیت سیستم ثبت‌نام\n');
  }

  async showStatus() {
    try {
      // آمار کلی
      this.showStatistics();
      
      // کاربران ناقص
      this.showIncompleteUsers();
      
      // کاربران تکمیل شده
      this.showCompletedUsers();
      
      // کاربران تکراری
      this.showDuplicateUsers();
      
      // خلاصه
      this.showSummary();
      
    } catch (error) {
      console.error('❌ خطا در نمایش وضعیت:', error);
    }
  }

  showStatistics() {
    const stats = this.manager.getStatistics();
    
    console.log('📊 آمار کلی سیستم:');
    console.log('==================');
    console.log(`🔢 کل کاربران: ${stats.total}`);
    console.log(`✅ تکمیل شده: ${stats.completed}`);
    console.log(`❌ ناقص: ${stats.incomplete}`);
    console.log(`🤖 از ربات: ${stats.botUsers}`);
    console.log(`🌐 از سایت: ${stats.websiteUsers}`);
    console.log('');
  }

  showIncompleteUsers() {
    const incompleteUsers = this.manager.getIncompleteUsers();
    
    if (incompleteUsers.length === 0) {
      console.log('✅ هیچ کاربر ناقصی وجود ندارد!\n');
      return;
    }
    
    console.log(`📋 کاربران ناقص (${incompleteUsers.length}):`);
    console.log('=======================');
    
    incompleteUsers.forEach((user, index) => {
      const status = this.getStatusEmoji(user.status);
      const source = this.getSourceEmoji(user.source);
      const missingFields = this.getMissingFields(user);
      
      console.log(`${index + 1}. ${status} ${user.fullName || 'نامشخص'} ${source}`);
      console.log(`   🆔 کد ملی: ${user.nationalId || 'نامشخص'}`);
      console.log(`   📱 تلفن: ${user.phone || 'نامشخص'}`);
      console.log(`   📊 وضعیت: ${user.status}`);
      console.log(`   🔗 منبع: ${user.source}`);
      if (missingFields.length > 0) {
        console.log(`   ❌ فیلدهای ناقص: ${missingFields.join(', ')}`);
      }
      console.log('');
    });
  }

  showCompletedUsers() {
    const completedUsers = this.manager.getCompletedUsers();
    
    if (completedUsers.length === 0) {
      console.log('❌ هیچ کاربر تکمیل شده‌ای وجود ندارد!\n');
      return;
    }
    
    console.log(`✅ کاربران تکمیل شده (${completedUsers.length}):`);
    console.log('==========================');
    
    completedUsers.forEach((user, index) => {
      const source = this.getSourceEmoji(user.source);
      const workshop = user.workshopId ? `🏭 ${user.workshopId}` : '🏭 نامشخص';
      
      console.log(`${index + 1}. ${user.fullName} ${source}`);
      console.log(`   🆔 کد ملی: ${user.nationalId}`);
      console.log(`   📱 تلفن: ${user.phone}`);
      console.log(`   ${workshop}`);
      console.log(`   📊 وضعیت: ${user.status}`);
      console.log(`   🔗 منبع: ${user.source}`);
      console.log(`   📅 تاریخ: ${new Date(user.ts).toLocaleString('fa-IR')}`);
      console.log('');
    });
  }

  showDuplicateUsers() {
    console.log('🔍 بررسی کاربران تکراری:');
    console.log('========================');
    
    const nationalIdMap = new Map();
    let duplicateCount = 0;
    
    // بررسی registrations.json
    for (const [userId, userData] of Object.entries(this.manager.registrations)) {
      if (userData.nationalId) {
        if (nationalIdMap.has(userData.nationalId)) {
          duplicateCount++;
          const existing = nationalIdMap.get(userData.nationalId);
          console.log(`⚠️ تکراری یافت شد:`);
          console.log(`   • ${existing.fullName || 'نامشخص'} (${existing.source})`);
          console.log(`   • ${userData.fullName || 'نامشخص'} (${userData.source})`);
          console.log(`   🆔 کد ملی مشترک: ${userData.nationalId}`);
          console.log('');
        } else {
          nationalIdMap.set(userData.nationalId, userData);
        }
      }
    }
    
    // بررسی registration_data.json
    for (const [userId, userData] of Object.entries(this.manager.registrationData)) {
      if (userData.nationalId) {
        if (nationalIdMap.has(userData.nationalId)) {
          const existing = nationalIdMap.get(userData.nationalId);
          if (existing.source !== userData.source) {
            duplicateCount++;
            console.log(`⚠️ تکراری یافت شد:`);
            console.log(`   • ${existing.fullName || 'نامشخص'} (${existing.source})`);
            console.log(`   • ${userData.fullName || 'نامشخص'} (${userData.source})`);
            console.log(`   🆔 کد ملی مشترک: ${userData.nationalId}`);
            console.log('');
          }
        } else {
          nationalIdMap.set(userData.nationalId, userData);
        }
      }
    }
    
    if (duplicateCount === 0) {
      console.log('✅ هیچ کاربر تکراری یافت نشد!\n');
    } else {
      console.log(`⚠️ تعداد کل تکراری‌ها: ${duplicateCount}\n`);
    }
  }

  showSummary() {
    console.log('📋 خلاصه وضعیت:');
    console.log('================');
    
    const stats = this.manager.getStatistics();
    const incompleteUsers = this.manager.getIncompleteUsers();
    const completedUsers = this.manager.getCompletedUsers();
    
    // محاسبه درصدها
    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const botRate = stats.total > 0 ? Math.round((stats.botUsers / stats.total) * 100) : 0;
    const websiteRate = stats.total > 0 ? Math.round((stats.websiteUsers / stats.total) * 100) : 0;
    
    console.log(`📊 نرخ تکمیل: ${completionRate}%`);
    console.log(`🤖 نرخ ربات: ${botRate}%`);
    console.log(`🌐 نرخ سایت: ${websiteRate}%`);
    
    // توصیه‌ها
    console.log('\n💡 توصیه‌ها:');
    if (incompleteUsers.length > 0) {
      console.log(`   • ${incompleteUsers.length} کاربر نیاز به تکمیل اطلاعات دارند`);
    }
    if (completionRate < 50) {
      console.log('   • نرخ تکمیل پایین است، نیاز به پیگیری بیشتر');
    }
    if (stats.botUsers === 0) {
      console.log('   • هیچ کاربری از ربات ثبت‌نام نکرده است');
    }
    if (stats.websiteUsers === 0) {
      console.log('   • هیچ کاربری از سایت ثبت‌نام نکرده است');
    }
    
    console.log('\n🎯 برای بهبود سیستم:');
    console.log('   • اجرای cleanupDuplicates() برای پاک‌سازی تکراری‌ها');
    console.log('   • پیگیری کاربران ناقص');
    console.log('   • بررسی هماهنگ‌سازی بین ربات و سایت');
    
    console.log('');
  }

  getStatusEmoji(status) {
    const statusEmojis = {
      'new': '🆕',
      'incomplete': '🟡',
      'pending': '🟠',
      'completed': '🟢'
    };
    return statusEmojis[status] || '❓';
  }

  getSourceEmoji(source) {
    const sourceEmojis = {
      'bot': '🤖',
      'website': '🌐',
      'both': '🔗'
    };
    return sourceEmojis[source] || '❓';
  }

  getMissingFields(user) {
    const missing = [];
    if (!user.fullName || !user.fullName.trim()) missing.push('نام');
    if (!user.nationalId || !user.nationalId.trim()) missing.push('کد ملی');
    if (!user.phone || !user.phone.trim()) missing.push('تلفن');
    return missing;
  }
}

// اجرای نمایش وضعیت
if (require.main === module) {
  const display = new RegistrationStatusDisplay();
  display.showStatus();
}

module.exports = RegistrationStatusDisplay;
