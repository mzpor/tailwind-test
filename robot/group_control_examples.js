/**
 * 📚 مثال‌های استفاده از سیستم کنترل گروه‌ها
 *
 * این فایل مثال‌هایی از نحوه استفاده برنامه‌نویسی از سیستم کنترل گروه‌ها را نشان می‌دهد
 */

const { controlGroup, getGroupsStatus, createGroupControlPanel } = require('./group_control_manager');

// ===== مثال ۱: کنترل دستی گروه‌ها =====

async function exampleManualControl() {
  console.log('📝 مثال: کنترل دستی گروه‌ها');

  // باز کردن گروه
  const result1 = await controlGroup(
    '5668045453', // ID گروه
    'open', // action: 'open' یا 'close'
    '✅ گروه توسط سیستم باز شد!', // پیام دلخواه
    'admin' // تغییر دهنده
  );

  if (result1) {
    console.log('✅ گروه با موفقیت باز شد');
  }

  // بستن گروه
  const result2 = await controlGroup(
    '5417069312',
    'close',
    '🚫 گروه توسط سیستم بسته شد!',
    'admin'
  );

  if (result2) {
    console.log('✅ گروه با موفقیت بسته شد');
  }
}

// ===== مثال ۲: دریافت وضعیت گروه‌ها =====

async function exampleGetStatus() {
  console.log('📊 مثال: دریافت وضعیت گروه‌ها');

  const groupsStatus = getGroupsStatus();

  console.log('وضعیت گروه‌ها:');
  Object.entries(groupsStatus).forEach(([groupId, group]) => {
    console.log(`🏷️ ${group.name} (${groupId}):`);
    console.log(`   📍 وضعیت: ${group.enabled ? '🟢 باز' : '🔴 بسته'}`);
    console.log(`   ⏰ زمان‌بندی: ${group.hasSchedule ? (group.scheduleEnabled ? 'فعال' : 'غیرفعال') : 'ندارد'}`);
    console.log(`   📅 آخرین تغییر: ${group.lastUpdate}`);
    console.log(`   👤 تغییر توسط: ${group.updatedBy}`);
    console.log('');
  });
}

// ===== مثال ۳: ایجاد پنل مدیریت =====

async function exampleCreatePanel(userId) {
  console.log('🎛️ مثال: ایجاد پنل مدیریت');

  const panel = createGroupControlPanel(userId);

  console.log('پنل مدیریت:');
  console.log('📝 متن:', panel.text);
  console.log('🔘 کیبورد:', JSON.stringify(panel.keyboard, null, 2));
}

// ===== مثال ۴: زمان‌بندی پیشرفته =====

async function exampleAdvancedScheduling() {
  console.log('⏰ مثال: زمان‌بندی پیشرفته');

  // این مثال نشان می‌دهد چگونه می‌توانید زمان‌بندی پیچیده ایجاد کنید
  const schedules = [
    {
      groupId: '5668045453',
      name: 'زمان‌بندی گروه گزارش',
      enabled: true,
      rules: [
        // باز کردن در روزهای کاری صبح
        {
          name: 'باز کردن صبح',
          enabled: true,
          action: 'open',
          days: [0, 1, 2, 3, 4], // شنبه تا چهارشنبه
          startTime: '08:00',
          endTime: '12:00',
          message: '✅ گروه گزارش آماده دریافت گزارش‌ها است.'
        },
        // بستن در روزهای کاری ظهر
        {
          name: 'بستن ظهر',
          enabled: true,
          action: 'close',
          days: [0, 1, 2, 3, 4],
          startTime: '12:00',
          endTime: '08:00',
          message: '🚫 گروه گزارش تا فردا بسته است.'
        },
        // باز کردن جمعه‌ها
        {
          name: 'باز کردن جمعه',
          enabled: true,
          action: 'open',
          days: [6], // جمعه
          startTime: '09:00',
          endTime: '11:00',
          message: '✅ گروه گزارش برای گزارش هفتگی باز است.'
        }
      ]
    },
    {
      groupId: '5417069312',
      name: 'زمان‌بندی کلاس‌ها',
      enabled: true,
      rules: [
        // زمان کلاس‌های روزانه
        {
          name: 'کلاس صبح',
          enabled: true,
          action: 'open',
          days: [0, 1, 2, 3, 4], // شنبه تا چهارشنبه
          startTime: '08:00',
          endTime: '10:00',
          message: '📚 زمان کلاس صبح فرا رسیده است.'
        },
        {
          name: 'کلاس عصر',
          enabled: true,
          action: 'open',
          days: [0, 1, 2, 3, 4],
          startTime: '14:00',
          endTime: '16:00',
          message: '📚 زمان کلاس عصر فرا رسیده است.'
        },
        // بستن در سایر ساعات
        {
          name: 'بستن خارج ساعات کلاس',
          enabled: true,
          action: 'close',
          days: [0, 1, 2, 3, 4],
          startTime: '10:00',
          endTime: '14:00',
          message: '🚫 گروه تا ساعت کلاس بعدی بسته است.'
        }
      ]
    }
  ];

  console.log('زمان‌بندی‌های پیشنهادی:');
  schedules.forEach(schedule => {
    console.log(`🏷️ ${schedule.name} (${schedule.groupId}):`);
    schedule.rules.forEach(rule => {
      console.log(`   📋 ${rule.name}:`);
      console.log(`      🔄 عمل: ${rule.action === 'open' ? 'باز کردن' : 'بستن'}`);
      console.log(`      📅 روزهای: ${rule.days.join(', ')}`);
      console.log(`      ⏰ ساعت: ${rule.startTime} - ${rule.endTime}`);
      console.log(`      💬 پیام: ${rule.message}`);
      console.log('');
    });
  });
}

// ===== مثال ۵: سیستم اعلام وضعیت =====

async function exampleStatusAnnouncement() {
  console.log('📢 مثال: سیستم اعلام وضعیت');

  // این مثال نشان می‌دهد چگونه می‌توانید سیستم اعلام وضعیت پیاده‌سازی کنید

  const statusMessages = {
    groupOpened: [
      '✅ گروه هم اکنون باز است و آماده فعالیت!',
      '🟢 دسترسی به گروه فعال شد.',
      '🚪 گروه برای همه باز است.'
    ],
    groupClosed: [
      '🚫 گروه موقتاً بسته است.',
      '🔴 دسترسی به گروه محدود شد.',
      '🚪 گروه تا اطلاع ثانوی بسته است.'
    ],
    scheduleStarted: [
      '⏰ زمان‌بندی گروه فعال شد.',
      '📅 سیستم زمان‌بندی راه‌اندازی شد.',
      '🕐 زمان‌بندی خودکار شروع شد.'
    ],
    scheduleStopped: [
      '⏸️ زمان‌بندی گروه متوقف شد.',
      '📅 سیستم زمان‌بندی غیرفعال شد.',
      '🕐 زمان‌بندی خودکار متوقف شد.'
    ]
  };

  // انتخاب پیام تصادفی
  function getRandomMessage(messageArray) {
    return messageArray[Math.floor(Math.random() * messageArray.length)];
  }

  console.log('مثال پیام‌های اعلام وضعیت:');
  Object.entries(statusMessages).forEach(([type, messages]) => {
    console.log(`${type}:`);
    messages.forEach((msg, index) => {
      console.log(`   ${index + 1}. ${msg}`);
    });
    console.log('');
  });

  // نحوه استفاده
  console.log('نحوه استفاده:');
  console.log(`برای اعلام باز شدن گروه: ${getRandomMessage(statusMessages.groupOpened)}`);
  console.log(`برای اعلام بسته شدن گروه: ${getRandomMessage(statusMessages.groupClosed)}`);
}

// ===== اجرای مثال‌ها =====

// اگر این فایل مستقیماً اجرا شود، مثال‌ها را نمایش بده
if (require.main === module) {
  console.log('🚀 اجرای مثال‌های سیستم کنترل گروه‌ها\n');

  // اجرای مثال‌ها به ترتیب
  exampleGetStatus().then(() => {
    console.log('\n' + '='.repeat(50) + '\n');
    return exampleAdvancedScheduling();
  }).then(() => {
    console.log('\n' + '='.repeat(50) + '\n');
    return exampleStatusAnnouncement();
  }).then(() => {
    console.log('\n✅ تمام مثال‌ها نمایش داده شد.');
  }).catch(error => {
    console.error('❌ خطا در اجرای مثال‌ها:', error);
  });
}

module.exports = {
  exampleManualControl,
  exampleGetStatus,
  exampleCreatePanel,
  exampleAdvancedScheduling,
  exampleStatusAnnouncement
};

