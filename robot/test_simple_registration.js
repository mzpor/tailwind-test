#!/usr/bin/env node

/**
 * تست ساده مکانیزم ثبت‌نام
 * بررسی عملکرد اصلی سیستم
 */

const fs = require('fs');
const path = require('path');

class SimpleRegistrationTester {
  constructor() {
    console.log('🧪 تست ساده مکانیزم ثبت‌نام شروع شد...\n');
    this.testResults = [];
  }

  // تست ۱: بررسی فایل‌های داده
  testDataFiles() {
    console.log('📁 تست ۱: بررسی فایل‌های داده');
    console.log('==============================');
    
    const files = [
      '../data/workshops.json',
      'registration_data.json',
      '../data/registrations.json'
    ];
    
    files.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          const data = fs.readFileSync(file, 'utf8');
          const jsonData = JSON.parse(data);
          const size = Object.keys(jsonData).length;
          console.log(`✅ ${file}: ${size} رکورد`);
          this.testResults.push({ test: 'Data Files', file, status: 'PASS', details: `${size} records` });
        } else {
          console.log(`❌ ${file}: فایل وجود ندارد`);
          this.testResults.push({ test: 'Data Files', file, status: 'FAIL', details: 'File not found' });
        }
      } catch (error) {
        console.log(`❌ ${file}: خطا در خواندن - ${error.message}`);
        this.testResults.push({ test: 'Data Files', file, status: 'ERROR', details: error.message });
      }
    });
    
    console.log('');
  }

  // تست ۲: بررسی ساختار داده‌ها
  testDataStructure() {
    console.log('🏗️ تست ۲: بررسی ساختار داده‌ها');
    console.log('==============================');
    
    try {
      // بررسی workshops.json
      if (fs.existsSync('../data/workshops.json')) {
        const workshops = JSON.parse(fs.readFileSync('../data/workshops.json', 'utf8'));
        const firstWorkshop = Object.values(workshops)[0];
        
        if (firstWorkshop) {
          const requiredFields = ['instructor_name', 'cost', 'description', 'capacity'];
          const missingFields = requiredFields.filter(field => !firstWorkshop[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ ساختار workshops.json صحیح است');
            this.testResults.push({ test: 'Data Structure', component: 'workshops', status: 'PASS' });
          } else {
            console.log(`❌ فیلدهای ناقص در workshops: ${missingFields.join(', ')}`);
            this.testResults.push({ test: 'Data Structure', component: 'workshops', status: 'FAIL', details: `Missing: ${missingFields.join(', ')}` });
          }
        }
      }
      
      // بررسی registration_data.json
      if (fs.existsSync('registration_data.json')) {
        const registrations = JSON.parse(fs.readFileSync('registration_data.json', 'utf8'));
        const firstUser = Object.values(registrations)[0];
        
        if (firstUser) {
          const requiredFields = ['fullName', 'nationalId', 'phone', 'status', 'source'];
          const missingFields = requiredFields.filter(field => !(field in firstUser));
          
          if (missingFields.length === 0) {
            console.log('✅ ساختار registration_data.json صحیح است');
            this.testResults.push({ test: 'Data Structure', component: 'registration_data', status: 'PASS' });
          } else {
            console.log(`❌ فیلدهای ناقص در registration_data: ${missingFields.join(', ')}`);
            this.testResults.push({ test: 'Data Structure', component: 'registration_data', status: 'FAIL', details: `Missing: ${missingFields.join(', ')}` });
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ خطا در بررسی ساختار داده: ${error.message}`);
      this.testResults.push({ test: 'Data Structure', status: 'ERROR', details: error.message });
    }
    
    console.log('');
  }

  // تست ۳: بررسی اعتبارسنجی داده‌ها
  testDataValidation() {
    console.log('🔍 تست ۳: بررسی اعتبارسنجی داده‌ها');
    console.log('==================================');
    
    try {
      if (fs.existsSync('registration_data.json')) {
        const registrations = JSON.parse(fs.readFileSync('registration_data.json', 'utf8'));
        let validCount = 0;
        let invalidCount = 0;
        
        Object.values(registrations).forEach(user => {
          // بررسی کد ملی (۱۰ رقم)
          const validNationalId = user.nationalId && /^\d{10}$/.test(user.nationalId);
          
          // بررسی شماره تلفن (۱۱ رقم شروع با ۰)
          const validPhone = user.phone && /^09\d{9}$/.test(user.phone);
          
          // بررسی نام (غیر خالی)
          const validName = user.fullName && user.fullName.trim().length > 0;
          
          if (validNationalId && validPhone && validName) {
            validCount++;
          } else {
            invalidCount++;
            console.log(`⚠️ کاربر نامعتبر: ${user.fullName || 'نامشخص'} - کد ملی: ${user.nationalId}, تلفن: ${user.phone}`);
          }
        });
        
        console.log(`✅ کاربران معتبر: ${validCount}`);
        console.log(`❌ کاربران نامعتبر: ${invalidCount}`);
        
        this.testResults.push({ 
          test: 'Data Validation', 
          status: 'PASS', 
          details: `${validCount} valid, ${invalidCount} invalid` 
        });
      }
      
    } catch (error) {
      console.log(`❌ خطا در اعتبارسنجی: ${error.message}`);
      this.testResults.push({ test: 'Data Validation', status: 'ERROR', details: error.message });
    }
    
    console.log('');
  }

  // تست ۴: بررسی عملکرد ماژول‌ها
  testModules() {
    console.log('🔧 تست ۴: بررسی عملکرد ماژول‌ها');
    console.log('================================');
    
    const modules = [
      'unified_registration_manager',
      'registration_module',
      'show_registration_status'
    ];
    
    modules.forEach(moduleName => {
      try {
        const module = require(`./${moduleName}`);
        if (module) {
          console.log(`✅ ${moduleName}: بارگذاری موفق`);
          this.testResults.push({ test: 'Modules', module: moduleName, status: 'PASS' });
        }
      } catch (error) {
        console.log(`❌ ${moduleName}: خطا در بارگذاری - ${error.message}`);
        this.testResults.push({ test: 'Modules', module: moduleName, status: 'FAIL', details: error.message });
      }
    });
    
    console.log('');
  }

  // تست ۵: شبیه‌سازی ثبت‌نام
  testRegistrationFlow() {
    console.log('📝 تست ۵: شبیه‌سازی فرآیند ثبت‌نام');
    console.log('==================================');
    
    try {
      // ایجاد کاربر تست
      const testUser = {
        fullName: 'کاربر تست',
        firstName: 'کاربر',
        nationalId: '1234567890',
        phone: '09123456789',
        status: 'new',
        source: 'test',
        registrationComplete: false,
        ts: Date.now()
      };
      
      // ذخیره در فایل
      const testData = { ...testUser };
      const testId = 'test_user_' + Date.now();
      
      if (fs.existsSync('registration_data.json')) {
        const currentData = JSON.parse(fs.readFileSync('registration_data.json', 'utf8'));
        currentData[testId] = testData;
        fs.writeFileSync('registration_data.json', JSON.stringify(currentData, null, 2));
        console.log('✅ کاربر تست ایجاد شد');
        
        // بررسی ذخیره
        const savedData = JSON.parse(fs.readFileSync('registration_data.json', 'utf8'));
        if (savedData[testId]) {
          console.log('✅ کاربر تست ذخیره شد');
          
          // پاک‌سازی
          delete savedData[testId];
          fs.writeFileSync('registration_data.json', JSON.stringify(savedData, null, 2));
          console.log('✅ کاربر تست پاک شد');
          
          this.testResults.push({ test: 'Registration Flow', status: 'PASS' });
        } else {
          console.log('❌ کاربر تست ذخیره نشد');
          this.testResults.push({ test: 'Registration Flow', status: 'FAIL', details: 'User not saved' });
        }
      } else {
        console.log('❌ فایل registration_data.json وجود ندارد');
        this.testResults.push({ test: 'Registration Flow', status: 'FAIL', details: 'File not found' });
      }
      
    } catch (error) {
      console.log(`❌ خطا در تست ثبت‌نام: ${error.message}`);
      this.testResults.push({ test: 'Registration Flow', status: 'ERROR', details: error.message });
    }
    
    console.log('');
  }

  // نمایش نتایج
  showResults() {
    console.log('📊 نتایج تست‌ها:');
    console.log('==================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;
    
    console.log(`✅ موفق: ${passed}`);
    console.log(`❌ ناموفق: ${failed}`);
    console.log(`⚠️ خطا: ${errors}`);
    
    if (failed > 0 || errors > 0) {
      console.log('\n🔍 جزئیات مشکلات:');
      this.testResults
        .filter(r => r.status !== 'PASS')
        .forEach(result => {
          console.log(`   • ${result.test}: ${result.status} - ${result.details || 'No details'}`);
        });
    }
    
    console.log('\n💡 توصیه‌ها:');
    if (passed === this.testResults.length) {
      console.log('   • سیستم ثبت‌نام آماده است');
      console.log('   • می‌توانید از آن استفاده کنید');
    } else {
      console.log('   • مشکلات شناسایی شده نیاز به رفع دارند');
      console.log('   • فایل‌های داده را بررسی کنید');
      console.log('   • وابستگی‌ها را نصب کنید');
    }
  }

  // اجرای تمام تست‌ها
  async runAllTests() {
    console.log('🚀 شروع تست‌های مکانیزم ثبت‌نام\n');
    
    this.testDataFiles();
    this.testDataStructure();
    this.testDataValidation();
    this.testModules();
    this.testRegistrationFlow();
    
    console.log('🏁 تست‌ها تمام شد\n');
    this.showResults();
  }
}

// اجرای تست‌ها
if (require.main === module) {
  const tester = new SimpleRegistrationTester();
  tester.runAllTests();
}

module.exports = SimpleRegistrationTester;
