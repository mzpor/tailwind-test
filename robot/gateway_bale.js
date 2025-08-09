require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const cors = require('cors');

// Import config from 3config.js
const { BOT_TOKEN, REPORT_GROUP_ID, ADMIN_IDS } = require('./3config');

// تنظیمات  
const ADMIN_ID = 1114227010; // مدیر مشخص شده توسط کاربر
const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = `https://tapi.bale.ai/bot${BOT_TOKEN}`;

// راه‌اندازی Express
const app = express();
app.use(cors({ 
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], 
  methods: ['GET','POST'],
  credentials: true 
}));
app.use(express.json());
app.use(express.static('public'));

// Middleware لاگ کردن درخواست‌ها (برای تست)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`📡 [API] ${req.method} ${req.path}`);
  }
  next();
});

// Import JSON Store utility
const { readJson, writeJson } = require('./server/utils/jsonStore');

// فایل تنظیمات
const SETTINGS_FILE = './data/settings.json';
const REPORTS_FILE = './data/reports.json';
const WS_FILE = './data/workshops.json';
const RG_FILE = './data/registrations.json';

// لود کردن تنظیمات
async function loadSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // تنظیمات پیش‌فرض
    const defaultSettings = {
      schoolName: "مدرسه تلاوت",
      registrationOpen: true,
      maxStudents: 100,
      adminMessage: "سلام مدیر عزیز! 👋"
    };
    await saveSettings(defaultSettings);
    return defaultSettings;
  }
}

// ذخیره تنظیمات
async function saveSettings(settings) {
  await fs.mkdir('./data', { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// لود کردن وضعیت گزارش‌ها
async function loadReportsStatus() {
  try {
    const data = await fs.readFile(REPORTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // وضعیت پیش‌فرض
    const defaultStatus = {
      enabled: true,
      lastUpdate: new Date().toISOString()
    };
    await saveReportsStatus(defaultStatus);
    return defaultStatus;
  }
}

// ذخیره وضعیت گزارش‌ها
async function saveReportsStatus(status) {
  await fs.mkdir('./data', { recursive: true });
  await fs.writeFile(REPORTS_FILE, JSON.stringify(status, null, 2));
}

// ارسال پیام به بله
async function sendBaleMessage(chatId, text) {
  try {
    const response = await axios.post(`${BASE_URL}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });
    console.log('✅ پیام ارسال شد:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ خطا در ارسال پیام:', error.response?.data || error.message);
    return null;
  }
}

// API برای دریافت تنظیمات
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await loadSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'خطا در لود کردن تنظیمات' });
  }
});

// API برای تغییر تنظیمات
app.post('/api/settings', async (req, res) => {
  try {
    const newSettings = req.body;
    await saveSettings(newSettings);
    
    // اطلاع‌رسانی به ربات
    await notifyBotSettingsChanged(newSettings);
    
    res.json({ success: true, message: 'تنظیمات با موفقیت تغییر کرد' });
  } catch (error) {
    res.status(500).json({ error: 'خطا در ذخیره تنظیمات' });
  }
});

// API برای دریافت وضعیت گزارش‌ها
app.get('/api/report-status', async (req, res) => {
  try {
    const status = await loadReportsStatus();
    res.json({ enabled: status.enabled });
  } catch (error) {
    res.status(500).json({ error: 'خطا در لود کردن وضعیت گزارش‌ها' });
  }
});

// API برای تغییر وضعیت گزارش‌ها
app.post('/api/toggle-reports', async (req, res) => {
  try {
    const { enabled } = req.body;
    const status = {
      enabled: enabled,
      lastUpdate: new Date().toISOString()
    };
    
    await saveReportsStatus(status);
    
    // اطلاع‌رسانی به ربات
    await notifyReportsStatusChanged(enabled);
    
    res.json({ success: true, message: `گزارش‌ها ${enabled ? 'فعال' : 'غیرفعال'} شدند` });
  } catch (error) {
    res.status(500).json({ error: 'خطا در تغییر وضعیت گزارش‌ها' });
  }
});

// اندپوینت وضعیت برای تست سریع
app.get('/api/health', (req,res)=> res.json({ ok:true, ts: Date.now() }));

// API برای کارگاه‌ها
app.get('/api/workshops', async (req, res) => {
  try {
    const list = await readJson(WS_FILE, []);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'خطا در لود کردن کارگاه‌ها' });
  }
});

app.post('/api/workshops', async (req, res) => {
  try {
    const body = req.body;
    let list = await readJson(WS_FILE, []);
    
    if (Array.isArray(body)) {
      // Bulk replace
      list = body;
      await writeJson(WS_FILE, list);
      return res.json({ ok: true, count: list.length });
    }
    
    // Create/Update single workshop
    if (!body.id) body.id = 'w_' + Date.now();
    const i = list.findIndex(w => w.id === body.id);
    if (i >= 0) {
      list[i] = { ...list[i], ...body };
    } else {
      list.push(body);
    }
    
    await writeJson(WS_FILE, list);
    return res.json({ ok: true, item: body });
  } catch (error) {
    res.status(500).json({ error: 'خطا در ذخیره کارگاه‌ها' });
  }
});

// API برای ثبت‌نام
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, nationalId, phone, workshopId } = req.body || {};
    
    // Validation
    if (!firstName || !/^09\d{9}$/.test(phone) || !workshopId) {
      return res.status(400).json({ ok: false, error: 'bad input' });
    }
    
    // دریافت کارگاه
    const workshops = await readJson(WS_FILE, []);
    const ws = workshops.find(w => w.id === workshopId);
    
    if (!ws) {
      return res.status(404).json({ ok: false, error: 'workshop not found' });
    }
    
    // ایجاد ثبت‌نام جدید
    const reg = {
      id: 'r_' + Date.now(),
      firstName,
      nationalId: nationalId || null,
      phone,
      workshopId,
      status: 'pending',
      ts: Date.now()
    };
    
    // ذخیره در فایل
    const regs = await readJson(RG_FILE, []);
    regs.push(reg);
    await writeJson(RG_FILE, regs);
    
    // ارسال پیام به مدیر و گروه گزارش
    const msg = `📝 ثبت‌نام جدید:
👤 نام: ${firstName}
📞 موبایل: ${phone}
🏷️ کارگاه: ${ws.title}
⏰ زمان: ${new Date().toLocaleString('fa-IR')}`;

    try {
      await sendBaleMessage(REPORT_GROUP_ID, msg);
      await sendBaleMessage(ADMIN_ID, msg);
    } catch (e) {
      console.error('خطا در ارسال پیام:', e);
    }
    
    res.json({ 
      ok: true, 
      id: reg.id,
      groupLink: ws.baleLink || null
    });
    
  } catch (error) {
    console.error('خطا در ثبت‌نام:', error);
    res.status(500).json({ ok: false, error: 'خطا در ثبت‌نام' });
  }
});

// اطلاع‌رسانی به ربات
async function notifyBotSettingsChanged(settings) {
  const message = `⚙️ **تنظیمات تغییر کرد!**

🏫 نام مدرسه: ${settings.schoolName}
📝 ثبت‌نام: ${settings.registrationOpen ? 'باز' : 'بسته'}
👥 حداکثر دانش‌آموز: ${settings.maxStudents}
💬 پیام مدیر: ${settings.adminMessage}

⏰ زمان: ${new Date().toLocaleString('fa-IR')}`;

  try {
    // ارسال به گروه گزارش
    await sendBaleMessage(REPORT_GROUP_ID, message);
    
    // ارسال به مدیر
    await sendBaleMessage(ADMIN_ID, `✅ تنظیمات با موفقیت تغییر کرد!\n\n${message}`);
  } catch (error) {
    console.error('خطا در ارسال پیام:', error);
  }
}

// اطلاع‌رسانی تغییر وضعیت گزارش‌ها
async function notifyReportsStatusChanged(enabled) {
  const status = enabled ? '✅ فعال' : '❌ غیرفعال';
  const message = `📊 **وضعیت گزارش‌ها تغییر کرد!**

${status} شدند

⏰ زمان: ${new Date().toLocaleString('fa-IR')}
🔗 تغییر از: React Admin Panel`;

  try {
    console.log(`📊 [GATEWAY] Notifying report status change: ${enabled}`);
    
    // ارسال به گروه گزارش
    await sendBaleMessage(REPORT_GROUP_ID, message);
    console.log(`✅ [GATEWAY] Report message sent to group: ${REPORT_GROUP_ID}`);
    
    // ارسال به مدیر
    await sendBaleMessage(ADMIN_ID, `📊 وضعیت گزارش‌ها ${status} شد!\n\n⏰ زمان: ${new Date().toLocaleString('fa-IR')}\n🔗 تغییر از: React Admin Panel`);
    console.log(`✅ [GATEWAY] Report message sent to admin: ${ADMIN_ID}`);
  } catch (error) {
    console.error('❌ [GATEWAY] خطا در ارسال پیام:', error);
  }
}

// راه‌اندازی
async function start() {
  try {
    // راه‌اندازی سرور وب
    app.listen(PORT, () => {
      console.log(`🌐 Server on :${PORT}`);
    });
    
    // تست اتصال به بله
    console.log('🔍 تست اتصال به بله...');
    const testResult = await sendBaleMessage(ADMIN_ID, '🚀 سیستم پنل مدیر راه‌اندازی شد!');
    
    if (testResult) {
      console.log('✅ اتصال به بله موفق');
      await sendBaleMessage(REPORT_GROUP_ID, '🚀 سیستم پنل مدیر راه‌اندازی شد!\n\n🔗 پنل مدیر: http://localhost:3000');
    } else {
      console.log('⚠️ اتصال به بله ناموفق - فقط سرور وب فعال است');
    }
    
  } catch (error) {
    console.error('خطا در راه‌اندازی:', error);
  }
}

start();
