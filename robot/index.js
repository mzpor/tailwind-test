/**
 * 🤖 Bale Bot - نسخه 1.3.0
 * 🎯 گزارش ورود به گروه، خاموشی سیستم، نقش‌محور
 * 
 * شروع 
 */

console.log('🚀 [INDEX] Starting Bale Bot...');
console.log('🚀 [INDEX] Loading modules...');

const { startPolling } = require('./5polling');
console.log('✅ [INDEX] 5polling module loaded');

const { logShutdown, logStartup } = require('./8logs');
console.log('✅ [INDEX] 8logs module loaded');

const { updateRobotHeartbeat } = require('./3config');
console.log('✅ [INDEX] 3config module loaded');

// گزارش فعال شدن بات
console.log('🚀 [INDEX] Calling logStartup...');
logStartup().then(() => {
  console.log('🤖 [INDEX] Bot started successfully');
  
  // اعلام آنلاین شدن ربات
  updateRobotHeartbeat();
  console.log('🟢 [INDEX] Robot status: ONLINE');
  
  console.log('🚀 [INDEX] Starting polling...');
  startPolling();
  console.log('✅ [INDEX] Polling started');
}).catch(err => {
  console.error('🔴 [INDEX] Error starting bot:', err.message);
  console.error('🔴 [INDEX] Error stack:', err.stack);
});

process.on('SIGINT', async () => {
  console.log('🛑 [INDEX] Received SIGINT, shutting down...');
  
  // اعلام آفلاین شدن ربات
  try {
    const config = require('./3config').loadReportsConfig();
    config.robotOnline = false;
    config.lastRobotPing = new Date().toISOString();
    require('./3config').saveReportsConfig(config);
    console.log('🔴 [INDEX] Robot status: OFFLINE');
  } catch (error) {
    console.error('❌ [INDEX] Error setting offline status:', error);
  }
  
  await logShutdown();
  console.log('✅ [INDEX] Shutdown completed');
  process.exit();
});