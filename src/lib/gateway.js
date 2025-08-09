const BASE = import.meta.env.VITE_GATEWAY_BASE || "http://localhost:3000";
const SHARED = import.meta.env.VITE_SHARED_KEY || "";

async function get(url){
  const r = await fetch(BASE+url,{ headers:{ 'X-Shared-Key': SHARED }});
  if(!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}
async function post(url, body){
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
};
