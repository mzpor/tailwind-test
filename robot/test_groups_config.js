// تست تنظیمات جدید گروه‌ها
console.log('🧪 Testing new group configuration system...');

// تست خواندن تنظیمات
try {
  const settings = require('./data/settings.json');
  console.log('✅ Settings loaded successfully');
  console.log('Auto-save groups enabled:', settings.auto_save_groups?.enabled);
  console.log('Default language:', settings.auto_save_groups?.default_language);
  console.log('Default status:', settings.auto_save_groups?.default_status);
} catch (error) {
  console.error('❌ Error loading settings:', error.message);
}

// تست خواندن groups_config.json
try {
  const { loadGroupsConfig } = require('./3config');
  const groupsConfig = loadGroupsConfig();
  console.log('✅ Groups config loaded successfully');
  console.log('Number of groups:', Object.keys(groupsConfig.groups || {}).length);
  
  // نمایش اطلاعات گروه‌ها
  for (const [groupId, groupData] of Object.entries(groupsConfig.groups || {})) {
    console.log(`\n📋 Group ${groupId}:`);
    console.log(`  Title: ${groupData.name || groupData.group_title || 'N/A'}`);
    console.log(`  Language: ${groupData.language || 'N/A'}`);
    console.log(`  Status: ${groupData.status || 'N/A'}`);
    console.log(`  Join Date: ${groupData.join_date || 'N/A'}`);
    console.log(`  Member Count: ${groupData.member_count || 'N/A'}`);
  }
} catch (error) {
  console.error('❌ Error loading groups config:', error.message);
}

// تست تابع showGroupsInfo
try {
  const { showGroupsInfo } = require('./7group');
  console.log('\n🧪 Testing showGroupsInfo function...');
  
  showGroupsInfo().then(info => {
    console.log('✅ showGroupsInfo result:');
    console.log(info);
  }).catch(error => {
    console.error('❌ Error in showGroupsInfo:', error.message);
  });
} catch (error) {
  console.error('❌ Error importing showGroupsInfo:', error.message);
}

console.log('\n🧪 Test completed!');
