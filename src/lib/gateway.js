const SHARED = import.meta.env.VITE_SHARED_KEY || "dev-123";

// تابع دریافت BASE URL با پشتیبانی از پورت پویا
async function getBaseUrl() {
  try {
    // ابتدا سعی کن از فایل کانفیگ پورت پویا بخوانی
    const response = await fetch('/src/lib/gateway-config.json');
    if (response.ok) {
      const config = await response.json();
      return config.gatewayUrl;
    }
  } catch (error) {
    // اگر فایل کانفیگ نبود، از env variable یا پیش‌فرض استفاده کن
  }
  
  return import.meta.env.VITE_GATEWAY_BASE || "http://localhost:3002";
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
};
