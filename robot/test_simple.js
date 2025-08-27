console.log('🧪 شروع تست ساده...');

// تست خواندن settings.json
try {
  console.log('📖 خواندن settings.json...');
  const settings = require('./data/settings.json');
  console.log('✅ settings.json خوانده شد');
  console.log('📋 auto_save_groups:', JSON.stringify(settings.auto_save_groups, null, 2));
} catch (error) {
  console.error('❌ خطا در خواندن settings.json:', error.message);
}

// تست خواندن 3config
try {
  console.log('🔧 خواندن ماژول 3config...');
  const { setGroupStatus, loadGroupsConfig, saveGroupsConfig } = require('./3config');
  console.log('✅ ماژول 3config خوانده شد');
  
  // تست loadGroupsConfig
  console.log('📂 تست loadGroupsConfig...');
  const groupsConfig = loadGroupsConfig();
  console.log('✅ groups_config.json خوانده شد');
  console.log('📊 تعداد گروه‌ها:', Object.keys(groupsConfig.groups).length);
  
} catch (error) {
  console.error('❌ خطا در خواندن 3config:', error.message);
}

// تست خواندن 7group
try {
  console.log('🤖 خواندن ماژول 7group...');
  const { handleGroupJoin } = require('./7group');
  console.log('✅ ماژول 7group خوانده شد');
  
  // تست فراخوانی handleGroupJoin با داده ساختگی
  console.log('🧪 تست فراخوانی handleGroupJoin...');
  const fakeChat = {
    id: 999999999,
    title: 'گروه تست',
    type: 'group',
    member_count: 5
  };
  
  console.log('📝 داده تست:', JSON.stringify(fakeChat, null, 2));
  
  // اجرای async function
  (async () => {
    try {
      await handleGroupJoin(fakeChat);
      console.log('✅ handleGroupJoin اجرا شد');
    } catch (error) {
      console.error('❌ خطا در اجرای handleGroupJoin:', error.message);
    }
  })();
  
} catch (error) {
  console.error('❌ خطا در خواندن 7group:', error.message);
}

console.log('🏁 تست تمام شد');
