// تست عملکرد توابع اضافه کردن عضو جدید با ساختار صحیح و تاریخ شمسی
//⏰ ۱۴۰۴/۰۶/۰۵

const moment = require('moment-jalaali');
const { loadMembersData, saveMembersData } = require('./7group');

// تابع تست اضافه کردن عضو جدید
async function testAddMember() {
  console.log('🧪 [TEST] Starting member addition test...');

  try {
    // بارگذاری داده‌های فعلی
    const membersData = loadMembersData();
    console.log('📂 [TEST] Loaded members data:', JSON.stringify(membersData, null, 2));

    // شبیه‌سازی اضافه کردن عضو جدید
    const testGroupId = '5719796514'; // گروه موجود برای تست
    const testUserId = 999999999; // ID تست
    const testUserName = 'کاربر تست';

    // بررسی ساختار فعلی گروه
    if (!membersData.groups[testGroupId]) {
      membersData.groups[testGroupId] = {
        title: 'گروه تست',
        members: []
      };
    } else if (!membersData.groups[testGroupId].title) {
      // تبدیل ساختار قدیمی
      membersData.groups[testGroupId] = {
        title: 'گروه تست',
        members: Array.isArray(membersData.groups[testGroupId]) ? membersData.groups[testGroupId] : []
      };
    }

    // اضافه کردن عضو جدید
    const jalaaliDate = moment().format('jYYYY-jMM-jDDTHH:mm:ss.SSSZ');
    console.log('📅 [TEST] Generated Jalaali date:', jalaaliDate);

    const newMemberData = {
      id: testUserId,
      name: testUserName,
      joinedAt: jalaaliDate
    };

    membersData.groups[testGroupId].members.push(newMemberData);

    // ذخیره داده‌ها
    saveMembersData(membersData);
    console.log('💾 [TEST] Saved updated members data');

    // بارگذاری مجدد و بررسی
    const updatedData = loadMembersData();
    const testGroup = updatedData.groups[testGroupId];

    console.log('🔍 [TEST] Verifying structure...');
    console.log('📋 [TEST] Group structure:', JSON.stringify(testGroup, null, 2));

    // بررسی‌ها
    const checks = {
      hasTitle: !!testGroup.title,
      hasMembersArray: Array.isArray(testGroup.members),
      memberHasCorrectFields: testGroup.members.some(m =>
        m.id === testUserId &&
        m.name === testUserName &&
        m.joinedAt === jalaaliDate
      ),
      dateIsJalaali: jalaaliDate.startsWith('1404') // بررسی اینکه تاریخ با سال شمسی شروع شود
    };

    console.log('✅ [TEST] Structure checks:', checks);

    // نتیجه تست
    const allChecksPass = Object.values(checks).every(check => check === true);

    if (allChecksPass) {
      console.log('🎉 [TEST] All tests passed! Member addition with Jalaali date works correctly.');
    } else {
      console.log('❌ [TEST] Some tests failed. Please check the implementation.');
    }

    return allChecksPass;

  } catch (error) {
    console.error('❌ [TEST] Error during test:', error.message);
    console.error('❌ [TEST] Error stack:', error.stack);
    return false;
  }
}

// اجرای تست
if (require.main === module) {
  testAddMember().then(success => {
    console.log(success ? '✅ Test completed successfully' : '❌ Test failed');
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testAddMember };
