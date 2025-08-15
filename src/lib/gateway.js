const SHARED = import.meta.env.VITE_SHARED_KEY || "dev-123";

// تابع دریافت BASE URL با پشتیبانی از پورت پویا
async function getBaseUrl() {
  // تلاش برای خواندن از مسیرهای مختلف
  const configPaths = [
    '/src/lib/gateway-config.json',
    '/gateway-config.json'
  ];
  
  for (const configPath of configPaths) {
    try {
      const response = await fetch(configPath);
      if (response.ok) {
        const config = await response.json();
        if (config.gatewayUrl) {
          console.log('✅ [GATEWAY] کانفیگ پورت پویا یافت شد:', config.gatewayUrl);
          return config.gatewayUrl;
        }
      }
    } catch (error) {
      console.warn(`⚠️ [GATEWAY] فایل کانفیگ در ${configPath} یافت نشد`);
    }
  }
  
  const defaultUrl = import.meta.env.VITE_GATEWAY_BASE || "http://localhost:3002";
  console.log('ℹ️ [GATEWAY] استفاده از URL پیش‌فرض:', defaultUrl);
  return defaultUrl;
}

async function get(url){
  const BASE = await getBaseUrl();
  const r = await fetch(BASE+url,{ headers:{ 'X-Shared-Key': SHARED }});
  if(!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}

async function post(url, body){
  const BASE = await getBaseUrl();
  const r = await fetch(BASE+url,{
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'X-Shared-Key': SHARED },
    body: JSON.stringify(body)
  });
  if(!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}

export const gw = {
  health: () => get('/api/health'),
  getReportStatus: () => get('/api/report-status'),
  toggleReports: (enabled) => post('/api/toggle-reports', { enabled }),
  getSettings: () => get('/api/settings'),
  setSettings: (settings) => post('/api/settings', settings),
  workshops: () => get('/api/workshops'),
  saveWorkshop: (payload) => post('/api/workshops', payload),
  register: (payload) => post('/api/register', payload),
  sendVerification: (payload) => post('/api/send-verification', payload),
  verifyAndRegister: (payload) => post('/api/verify-and-register', payload),
  announceSiteOnline: () => post('/api/announce-site-online', {}),
  announceSiteOffline: () => post('/api/announce-site-offline', {}),
  // API های جدید برای ثبت‌نام و نظرسنجی
  getRegistrationStatus: () => get('/api/registration-status'),
  toggleRegistration: (enabled) => post('/api/toggle-registration', { enabled }),
  getSurveyStatus: () => get('/api/survey-status'),
  toggleSurvey: (enabled) => post('/api/toggle-survey', { enabled }),
};
