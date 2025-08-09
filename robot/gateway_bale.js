require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const cors = require('cors');

// تنظیمات
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);
const REPORT_GROUP_ID = Number(process.env.REPORT_GROUP_ID);
const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = `https://tapi.bale.ai/bot${BOT_TOKEN}`;

// راه‌اندازی Express
const app = express();
app.use(cors({ origin: 'http://localhost:5173', methods: ['GET','POST'] }));
app.use(express.json());
app.use(express.static('public'));

// فایل تنظیمات
const SETTINGS_FILE = './data/settings.json';
const REPORTS_FILE = './data/reports.json';

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

⏰ زمان: ${new Date().toLocaleString('fa-IR')}`;

  try {
    // ارسال به گروه گزارش
    await sendBaleMessage(REPORT_GROUP_ID, message);
    
    // ارسال به مدیر
    await sendBaleMessage(ADMIN_ID, `📊 وضعیت گزارش‌ها ${status} شد!\n\n⏰ زمان: ${new Date().toLocaleString('fa-IR')}`);
  } catch (error) {
    console.error('خطا در ارسال پیام:', error);
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
