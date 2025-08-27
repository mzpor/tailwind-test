//🎯 ماژول مدیریت یکپارچه ثبت‌نام - نسخه 1.0.0
// مدیریت هماهنگ ثبت‌نام بین ربات و سایت

const fs = require('fs');
const path = require('path');

class UnifiedRegistrationManager {
  constructor() {
    this.registrationsFile = '../data/registrations.json';
    this.registrationDataFile = '../registration_data.json';
    this.workshopsFile = '../data/workshops.json';
    
    this.registrations = this.loadData(this.registrationsFile);
    this.registrationData = this.loadData(this.registrationDataFile);
    this.workshops = this.loadData(this.workshopsFile);
    
    console.log('✅ UnifiedRegistrationManager initialized successfully');
  }

  loadData(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error(`Error loading ${filePath}:`, error);
      return {};
    }
  }

  saveData(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`✅ Data saved to ${filePath} successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving to ${filePath}:`, error);
      return false;
    }
  }

  // 🔍 یافتن کاربر بر اساس کد ملی
  findUserByNationalId(nationalId) {
    // جستجو در registrations.json
    for (const [userId, userData] of Object.entries(this.registrations)) {
      if (userData.nationalId === nationalId) {
        return { source: 'bot', userId, userData };
      }
    }
    
    // جستجو در registration_data.json
    for (const [userId, userData] of Object.entries(this.registrationData)) {
      if (userData.nationalId === nationalId) {
        return { source: 'website', userId, userData };
      }
    }
    
    return null;
  }

  // 🔍 یافتن کاربر بر اساس شماره تلفن
  findUserByPhone(phone) {
    // جستجو در registrations.json
    for (const [userId, userData] of Object.entries(this.registrations)) {
      if (userData.phone === phone) {
        return { source: 'bot', userId, userData };
      }
    }
    
    // جستجو در registration_data.json
    for (const [userId, userData] of Object.entries(this.registrationData)) {
      if (userData.phone === phone) {
        return { source: 'website', userId, userData };
      }
    }
    
    return null;
  }

  // 🔍 یافتن کاربر بر اساس userId
  findUserById(userId) {
    if (this.registrations[userId]) {
      return { source: 'bot', userId, userData: this.registrations[userId] };
    }
    
    if (this.registrationData[userId]) {
      return { source: 'website', userId, userData: this.registrationData[userId] };
    }
    
    return null;
  }

  // 📝 ثبت‌نام جدید از ربات
  registerFromBot(userId, userData) {
    const registrationId = `r_${Date.now()}`;
    
    const newRegistration = {
      fullName: userData.fullName || '',
      firstName: userData.firstName || userData.fullName?.split(' ')[0] || '',
      nationalId: userData.nationalId || null,
      phone: userData.phone || '',
      workshopId: userData.workshopId || null,
      status: this.getRegistrationStatus(userData),
      source: 'bot',
      registrationComplete: this.isRegistrationComplete(userData),
      ts: Date.now(),
      lastUpdated: Date.now()
    };

    this.registrations[registrationId] = newRegistration;
    
    // هماهنگ‌سازی با registration_data.json
    this.syncWithRegistrationData(registrationId, newRegistration);
    
    // ذخیره در هر دو فایل
    this.saveData(this.registrationsFile, this.registrations);
    this.saveData(this.registrationDataFile, this.registrationData);
    
    console.log(`✅ New bot registration created: ${registrationId}`);
    return registrationId;
  }

  // 🌐 ثبت‌نام جدید از سایت
  registerFromWebsite(nationalId, userData) {
    const websiteUserId = nationalId; // استفاده از کد ملی به عنوان userId
    
    const newRegistration = {
      fullName: userData.fullName || '',
      firstName: userData.firstName || userData.fullName?.split(' ')[0] || '',
      nationalId: nationalId,
      phone: userData.phone || '',
      workshopId: userData.workshopId || null,
      status: this.getRegistrationStatus(userData),
      source: 'website',
      registrationComplete: this.isRegistrationComplete(userData),
      ts: Date.now(),
      lastUpdated: Date.now()
    };

    this.registrationData[websiteUserId] = newRegistration;
    
    // هماهنگ‌سازی با registrations.json
    this.syncWithRegistrations(websiteUserId, newRegistration);
    
    // ذخیره در هر دو فایل
    this.saveData(this.registrationsFile, this.registrations);
    this.saveData(this.registrationDataFile, this.registrationData);
    
    console.log(`✅ New website registration created: ${websiteUserId}`);
    return websiteUserId;
  }

  // 🔄 به‌روزرسانی اطلاعات کاربر
  updateUser(userId, updates, source = 'bot') {
    let userRecord = null;
    
    if (source === 'bot') {
      if (this.registrations[userId]) {
        userRecord = this.registrations[userId];
        Object.assign(userRecord, updates, { lastUpdated: Date.now() });
        this.registrations[userId] = userRecord;
      }
    } else {
      if (this.registrationData[userId]) {
        userRecord = this.registrationData[userId];
        Object.assign(userRecord, updates, { lastUpdated: Date.now() });
        this.registrationData[userId] = userRecord;
      }
    }
    
    if (userRecord) {
      // هماهنگ‌سازی بین فایل‌ها
      this.syncBetweenFiles(userId, userRecord);
      
      // ذخیره تغییرات
      this.saveData(this.registrationsFile, this.registrations);
      this.saveData(this.registrationDataFile, this.registrationData);
      
      console.log(`✅ User ${userId} updated successfully`);
      return true;
    }
    
    return false;
  }

  // 🔗 هماهنگ‌سازی بین فایل‌ها
  syncBetweenFiles(userId, userData) {
    // هماهنگ‌سازی در registrations.json
    if (this.registrations[userId]) {
      this.registrations[userId] = { ...userData };
    }
    
    // هماهنگ‌سازی در registration_data.json
    if (this.registrationData[userId]) {
      this.registrationData[userId] = { ...userData };
    }
  }

  // 🔄 هماهنگ‌سازی با registration_data.json
  syncWithRegistrationData(registrationId, userData) {
    // اگر کد ملی وجود دارد، در registration_data.json نیز ذخیره کن
    if (userData.nationalId) {
      this.registrationData[userData.nationalId] = { ...userData };
    }
  }

  // 🔄 هماهنگ‌سازی با registrations.json
  syncWithRegistrations(websiteUserId, userData) {
    // ایجاد رکورد در registrations.json
    const registrationId = `w_${Date.now()}`;
    this.registrations[registrationId] = { ...userData };
  }

  // 📊 بررسی وضعیت ثبت‌نام
  getRegistrationStatus(userData) {
    if (this.isRegistrationComplete(userData)) {
      return 'completed';
    } else if (userData.fullName && userData.nationalId && userData.phone) {
      return 'pending';
    } else if (userData.fullName || userData.nationalId || userData.phone) {
      return 'incomplete';
    } else {
      return 'new';
    }
  }

  // ✅ بررسی تکمیل بودن ثبت‌نام
  isRegistrationComplete(userData) {
    return userData.fullName && 
           userData.nationalId && 
           userData.phone &&
           userData.fullName.trim() !== '' &&
           userData.nationalId.trim() !== '' &&
           userData.phone.trim() !== '';
  }

  // 📋 دریافت لیست کاربران ناقص
  getIncompleteUsers() {
    const incomplete = [];
    
    // بررسی registrations.json
    for (const [userId, userData] of Object.entries(this.registrations)) {
      if (!this.isRegistrationComplete(userData)) {
        incomplete.push({ userId, source: 'bot', ...userData });
      }
    }
    
    // بررسی registration_data.json
    for (const [userId, userData] of Object.entries(this.registrationData)) {
      if (!this.isRegistrationComplete(userData)) {
        incomplete.push({ userId, source: 'website', ...userData });
      }
    }
    
    return incomplete;
  }

  // 📋 دریافت لیست کاربران تکمیل شده
  getCompletedUsers() {
    const completed = [];
    
    // بررسی registrations.json
    for (const [userId, userData] of Object.entries(this.registrations)) {
      if (this.isRegistrationComplete(userData)) {
        completed.push({ userId, source: 'bot', ...userData });
      }
    }
    
    // بررسی registration_data.json
    for (const [userId, userData] of Object.entries(this.registrationData)) {
      if (this.isRegistrationComplete(userData)) {
        completed.push({ userId, source: 'website', ...userData });
      }
    }
    
    return completed;
  }

  // 🔍 جستجوی کاربران
  searchUsers(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    // جستجو در registrations.json
    for (const [userId, userData] of Object.entries(this.registrations)) {
      if (this.matchesSearch(userData, queryLower)) {
        results.push({ userId, source: 'bot', ...userData });
      }
    }
    
    // جستجو در registration_data.json
    for (const [userId, userData] of Object.entries(this.registrationData)) {
      if (this.matchesSearch(userData, queryLower)) {
        results.push({ userId, source: 'website', ...userData });
      }
    }
    
    return results;
  }

  // 🔍 بررسی تطبیق جستجو
  matchesSearch(userData, query) {
    return (userData.fullName && userData.fullName.toLowerCase().includes(query)) ||
           (userData.nationalId && userData.nationalId.includes(query)) ||
           (userData.phone && userData.phone.includes(query));
  }

  // 📊 آمار کلی
  getStatistics() {
    const incomplete = this.getIncompleteUsers();
    const completed = this.getCompletedUsers();
    
    return {
      total: incomplete.length + completed.length,
      incomplete: incomplete.length,
      completed: completed.length,
      botUsers: incomplete.filter(u => u.source === 'bot').length + 
                completed.filter(u => u.source === 'bot').length,
      websiteUsers: incomplete.filter(u => u.source === 'website').length + 
                    completed.filter(u => u.source === 'website').length
    };
  }

  // 🧹 پاک‌سازی رکوردهای تکراری
  cleanupDuplicates() {
    const nationalIdMap = new Map();
    let cleanedCount = 0;
    
    // بررسی registrations.json
    for (const [userId, userData] of Object.entries(this.registrations)) {
      if (userData.nationalId) {
        if (nationalIdMap.has(userData.nationalId)) {
          // ادغام اطلاعات
          const existing = nationalIdMap.get(userData.nationalId);
          const merged = this.mergeUserData(existing, userData);
          nationalIdMap.set(userData.nationalId, merged);
          delete this.registrations[userId];
          cleanedCount++;
        } else {
          nationalIdMap.set(userData.nationalId, userData);
        }
      }
    }
    
    // بررسی registration_data.json
    for (const [userId, userData] of Object.entries(this.registrationData)) {
      if (userData.nationalId) {
        if (nationalIdMap.has(userData.nationalId)) {
          // ادغام اطلاعات
          const existing = nationalIdMap.get(userData.nationalId);
          const merged = this.mergeUserData(existing, userData);
          nationalIdMap.set(userData.nationalId, merged);
          delete this.registrationData[userId];
          cleanedCount++;
        } else {
          nationalIdMap.set(userData.nationalId, userData);
        }
      }
    }
    
    // بازسازی فایل‌ها
    this.registrations = {};
    this.registrationData = {};
    
    for (const [nationalId, userData] of nationalIdMap) {
      if (userData.source === 'bot') {
        const registrationId = `r_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.registrations[registrationId] = userData;
      }
      
      this.registrationData[nationalId] = userData;
    }
    
    // ذخیره فایل‌های پاک‌سازی شده
    this.saveData(this.registrationsFile, this.registrations);
    this.saveData(this.registrationDataFile, this.registrationData);
    
    console.log(`🧹 Cleaned up ${cleanedCount} duplicate records`);
    return cleanedCount;
  }

  // 🔗 ادغام اطلاعات کاربر
  mergeUserData(existing, newData) {
    return {
      ...existing,
      ...newData,
      fullName: newData.fullName || existing.fullName,
      firstName: newData.firstName || existing.firstName,
      nationalId: newData.nationalId || existing.nationalId,
      phone: newData.phone || existing.phone,
      workshopId: newData.workshopId || existing.workshopId,
      source: existing.source === 'bot' || newData.source === 'bot' ? 'both' : 
              existing.source === 'website' ? 'website' : 'bot',
      registrationComplete: this.isRegistrationComplete(newData) || this.isRegistrationComplete(existing),
      lastUpdated: Date.now()
    };
  }
}

module.exports = UnifiedRegistrationManager;
