//🧪 تست سیستم مدیریت دائمی اعضا
// نمایش نحوه کارکرد سیستم جدید

const PermanentMemberManager = require('./permanent_member_manager');

async function testPermanentSystem() {
  console.log('🚀 Testing Permanent Member Management System\n');
  
  const manager = new PermanentMemberManager();
  
  // 🔄 همگام‌سازی با سیستم موجود
  console.log('📋 Step 1: Syncing with existing system...');
  manager.syncWithExistingSystem();
  
  // 📊 نمایش آمار
  console.log('\n📊 Step 2: Current Statistics');
  const stats = manager.getStatistics();
  console.log(JSON.stringify(stats, null, 2));
  
  // 🔍 تست جستجو
  console.log('\n🔍 Step 3: Testing member search...');
  const searchResults = manager.searchMembers('علی');
  console.log('Search results for "علی":', searchResults.length);
  searchResults.forEach(member => {
    console.log(`- ${member.fullName} (${member.phone}) - Role: ${member.role}`);
  });
  
  // 🎭 تست تخصیص نقش
  console.log('\n🎭 Step 4: Testing role assignment...');
  const testUserId = '999999999';
  
  // ثبت‌نام عضو جدید
  console.log(`\n📝 Registering new test member: ${testUserId}`);
  manager.registerMember(testUserId, {
    fullName: 'مربی تست جدید',
    firstName: 'مربی',
    nationalId: '999999999',
    phone: '09123456789',
    registrationComplete: true,
    source: 'test'
  });
  
  // بررسی نقش
  const role = manager.getMemberRole(testUserId);
  console.log(`Role for ${testUserId}: ${role}`);
  
  // تخصیص نقش دستی
  console.log('\n🎯 Manually assigning ADMIN role...');
  manager.assignRole(testUserId, 'ADMIN');
  
  const newRole = manager.getMemberRole(testUserId);
  console.log(`New role for ${testUserId}: ${newRole}`);
  
  // 🔍 تست دریافت اطلاعات کامل
  console.log('\n🔍 Step 5: Testing complete member info...');
  const memberInfo = manager.getMemberInfo(testUserId);
  console.log('Complete member info:', JSON.stringify(memberInfo, null, 2));
  
  // 📋 لیست اعضا بر اساس نقش
  console.log('\n📋 Step 6: Members by role...');
  const coaches = manager.getMembersByRole('COACH');
  const students = manager.getMembersByRole('STUDENT');
  
  console.log(`Coaches: ${coaches.length}`);
  coaches.forEach(coach => {
    console.log(`- ${coach.fullName || coach.firstName} (${coach.phone})`);
  });
  
  console.log(`Students: ${students.length}`);
  students.forEach(student => {
    console.log(`- ${student.fullName || student.firstName} (${student.phone || 'No phone'})`);
  });
  
  // 🧹 تست حذف نقش
  console.log('\n🧹 Step 7: Testing role removal...');
  manager.removeRole(testUserId);
  const finalRole = manager.getMemberRole(testUserId);
  console.log(`Final role for ${testUserId}: ${finalRole}`);
  
  // 📤 صادرات داده‌ها
  console.log('\n📤 Step 8: Exporting data...');
  const exportedData = manager.exportData();
  console.log('Data exported successfully');
  console.log(`Total members: ${Object.keys(exportedData.members).length}`);
  console.log(`Total roles: ${Object.keys(exportedData.roles).length}`);
  
  console.log('\n✅ Permanent Member Management System test completed!');
}

// اجرای تست
testPermanentSystem().catch(console.error);
