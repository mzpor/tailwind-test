console.log('Testing SettingsModule import...');

try {
  const SettingsModule = require('./11settings.js');
  console.log('✅ SettingsModule imported successfully');
  console.log('Type:', typeof SettingsModule);
} catch (error) {
  console.error('❌ Error importing SettingsModule:', error.message);
  console.error('Stack:', error.stack);
}
