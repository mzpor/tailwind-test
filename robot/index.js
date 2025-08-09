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

// گزارش فعال شدن بات
console.log('🚀 [INDEX] Calling logStartup...');
logStartup().then(() => {
  console.log('🤖 [INDEX] Bot started successfully');
  console.log('🚀 [INDEX] Starting polling...');
  startPolling();
  console.log('✅ [INDEX] Polling started');
}).catch(err => {
  console.error('🔴 [INDEX] Error starting bot:', err.message);
  console.error('🔴 [INDEX] Error stack:', err.stack);
});

process.on('SIGINT', async () => {
  console.log('🛑 [INDEX] Received SIGINT, shutting down...');
  await logShutdown();
  console.log('✅ [INDEX] Shutdown completed');
  process.exit();
});