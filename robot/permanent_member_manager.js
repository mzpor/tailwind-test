//🎯 سیستم مدیریت دائمی اعضا - نسخه 1.0.0
// مدیریت لیست دائمی اعضا که هیچ‌وقت پاک نمی‌شود
// و نقش‌ها از این لیست مرکزی تخصیص داده می‌شوند

const fs = require('fs');
const path = require('path');

class PermanentMemberManager {
  constructor() {
    this.membersFile = 'data/permanent_members.json';
    this.rolesFile = 'data/member_roles.json';
    this.coachesFile = 'data/coaches.json';
    
    // ایجاد دایرکتوری data اگر وجود ندارد
    this.ensureDataDirectory();
    
    this.members = this.loadData(this.membersFile);
    this.roles = this.loadData(this.rolesFile);
    this.coaches = this.loadData(this.coachesFile);
    
    console.log('✅ PermanentMemberManager initialized successfully');
    console.log(`📊 Current members: ${Object.keys(this.members).length}`);
    console.log(`🎭 Current roles: ${Object.keys(this.roles).length}`);
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.membersFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${dataDir}`);
    }
  }

  loadData(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error(`❌ Error loading ${filePath}:`, error);
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

  // 📝 ثبت‌نام عضو جدید (یک‌بار و دائمی)
  registerMember(userId, memberData) {
    const userIdStr = userId.toString();
    
    // اگر کاربر قبلاً ثبت‌نام شده، فقط اطلاعات را به‌روزرسانی کن
    if (this.members[userIdStr]) {
      console.log(`🔄 Updating existing member: ${userIdStr}`);
      this.members[userIdStr] = {
        ...this.members[userIdStr],
        ...memberData,
        lastUpdated: Date.now()
      };
    } else {
      // ثبت‌نام جدید
      console.log(`🆕 Registering new member: ${userIdStr}`);
      this.members[userIdStr] = {
        ...memberData,
        registrationDate: Date.now(),
        lastUpdated: Date.now(),
        status: 'active'
      };
    }

    // ذخیره دائمی
    this.saveData(this.membersFile, this.members);
    
    // اگر شماره تلفن دارد، بررسی کن که آیا مربی است
    if (memberData.phone && memberData.phone.trim() !== '') {
      this.checkAndAssignCoachRole(userIdStr, memberData.phone);
    }

    return this.members[userIdStr];
  }

  // 🔍 بررسی و تخصیص نقش مربی
  checkAndAssignCoachRole(userId, phone) {
    const normalizedPhone = this.normalizePhoneNumber(phone);
    
    // بررسی اینکه آیا این شماره در لیست مربیان است
    const isCoach = this.coaches.some(coach => 
      this.normalizePhoneNumber(coach.phone) === normalizedPhone
    );

    if (isCoach) {
      this.assignRole(userId, 'COACH');
      console.log(`✅ Member ${userId} with phone ${phone} assigned COACH role`);
    }
  }

  // 🎭 تخصیص نقش به عضو
  assignRole(userId, role) {
    const userIdStr = userId.toString();
    
    if (!this.members[userIdStr]) {
      console.error(`❌ Cannot assign role: Member ${userIdStr} not found`);
      return false;
    }

    this.roles[userIdStr] = {
      role: role,
      assignedAt: Date.now(),
      assignedBy: 'system'
    };

    this.saveData(this.rolesFile, this.roles);
    console.log(`✅ Role ${role} assigned to member ${userIdStr}`);
    return true;
  }

  // 🎭 حذف نقش از عضو
  removeRole(userId) {
    const userIdStr = userId.toString();
    
    if (this.roles[userIdStr]) {
      delete this.roles[userIdStr];
      this.saveData(this.rolesFile, this.roles);
      console.log(`✅ Role removed from member ${userIdStr}`);
      return true;
    }
    
    return false;
  }

  // 🔍 دریافت نقش عضو
  getMemberRole(userId) {
    const userIdStr = userId.toString();
    
    // اول بررسی کن که آیا نقش خاصی تخصیص داده شده
    if (this.roles[userIdStr]) {
      return this.roles[userIdStr].role;
    }

    // اگر نقش خاصی ندارد، بررسی کن که آیا شماره تلفنش مربی است
    const member = this.members[userIdStr];
    if (member && member.phone && member.phone.trim() !== '') {
      const normalizedPhone = this.normalizePhoneNumber(member.phone);
      const isCoach = this.coaches.some(coach => 
        this.normalizePhoneNumber(coach.phone) === normalizedPhone
      );
      
      if (isCoach) {
        return 'COACH';
      }
    }

    // پیش‌فرض: دانش‌آموز
    return 'STUDENT';
  }

  // 🔍 دریافت اطلاعات کامل عضو
  getMemberInfo(userId) {
    const userIdStr = userId.toString();
    const member = this.members[userIdStr];
    
    if (!member) {
      return null;
    }

    return {
      ...member,
      role: this.getMemberRole(userIdStr),
      roleInfo: this.roles[userIdStr] || null
    };
  }

  // 📱 نرمال‌سازی شماره تلفن
  normalizePhoneNumber(phone) {
    if (!phone) return '';
    
    let normalized = phone.toString().replace(/\D/g, '');
    
    // تبدیل 09 به 989
    if (normalized.startsWith('09')) {
      normalized = '98' + normalized.substring(1);
    }
    
    // اگر با 98 شروع نمی‌شود، اضافه کن
    if (!normalized.startsWith('98')) {
      normalized = '98' + normalized;
    }
    
    return normalized;
  }

  // 🔍 جستجوی اعضا
  searchMembers(query) {
    const results = [];
    const searchTerm = query.toLowerCase();
    
    for (const [userId, member] of Object.entries(this.members)) {
      if (this.matchesSearch(member, searchTerm)) {
        results.push({
          userId,
          ...member,
          role: this.getMemberRole(userId)
        });
      }
    }
    
    return results;
  }

  // 🔍 بررسی تطبیق جستجو
  matchesSearch(member, searchTerm) {
    return (
      (member.fullName && member.fullName.toLowerCase().includes(searchTerm)) ||
      (member.firstName && member.firstName.toLowerCase().includes(searchTerm)) ||
      (member.nationalId && member.nationalId.includes(searchTerm)) ||
      (member.phone && member.phone.includes(searchTerm))
    );
  }

  // 📊 آمار کلی
  getStatistics() {
    const totalMembers = Object.keys(this.members).length;
    const activeMembers = Object.values(this.members).filter(m => m.status === 'active').length;
    const completedRegistrations = Object.values(this.members).filter(m => m.registrationComplete).length;
    
    const roleCounts = {};
    for (const [userId, member] of Object.entries(this.members)) {
      const role = this.getMemberRole(userId);
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }

    return {
      totalMembers,
      activeMembers,
      completedRegistrations,
      roleDistribution: roleCounts,
      lastUpdated: Date.now()
    };
  }

  // 📋 لیست اعضا بر اساس نقش
  getMembersByRole(role) {
    const members = [];
    
    for (const [userId, member] of Object.entries(this.members)) {
      if (this.getMemberRole(userId) === role) {
        members.push({
          userId,
          ...member
        });
      }
    }
    
    return members;
  }

  // 🔄 همگام‌سازی با سیستم موجود
  syncWithExistingSystem() {
    console.log('🔄 Syncing with existing system...');
    
    // همگام‌سازی با registration_data.json
    try {
      const registrationData = this.loadData('registration_data.json');
      for (const [userId, userData] of Object.entries(registrationData)) {
        if (userData.phone && userData.phone.trim() !== '') {
          this.registerMember(userId, {
            fullName: userData.fullName || userData.firstName || '',
            firstName: userData.firstName || '',
            nationalId: userData.nationalId || '',
            phone: userData.phone,
            workshopId: userData.workshopId || '',
            registrationComplete: userData.registrationComplete || false,
            source: userData.source || 'bot'
          });
        }
      }
      console.log('✅ Synced with registration_data.json');
    } catch (error) {
      console.error('❌ Error syncing with registration_data.json:', error);
    }

    // همگام‌سازی با coaches.json
    try {
      const coaches = this.loadData('data/coaches.json');
      this.coaches = coaches;
      this.saveData(this.coachesFile, this.coaches);
      console.log('✅ Synced with coaches.json');
    } catch (error) {
      console.error('❌ Error syncing with coaches.json:', error);
    }
  }

  // 🗑️ حذف عضو (فقط برای موارد خاص)
  removeMember(userId) {
    const userIdStr = userId.toString();
    
    if (this.members[userIdStr]) {
      // فقط وضعیت را غیرفعال کن، اطلاعات را پاک نکن
      this.members[userIdStr].status = 'inactive';
      this.members[userIdStr].deactivatedAt = Date.now();
      
      this.saveData(this.membersFile, this.members);
      console.log(`⚠️ Member ${userIdStr} deactivated (not deleted)`);
      return true;
    }
    
    return false;
  }

  // 🔄 بازگردانی عضو غیرفعال
  reactivateMember(userId) {
    const userIdStr = userId.toString();
    
    if (this.members[userIdStr] && this.members[userIdStr].status === 'inactive') {
      this.members[userIdStr].status = 'active';
      this.members[userIdStr].reactivatedAt = Date.now();
      delete this.members[userIdStr].deactivatedAt;
      
      this.saveData(this.membersFile, this.members);
      console.log(`✅ Member ${userIdStr} reactivated`);
      return true;
    }
    
    return false;
  }

  // 📤 صادرات داده‌ها
  exportData() {
    return {
      members: this.members,
      roles: this.roles,
      coaches: this.coaches,
      statistics: this.getStatistics(),
      exportDate: Date.now()
    };
  }
}

module.exports = PermanentMemberManager;
