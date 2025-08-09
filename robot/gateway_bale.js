require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const cors = require('cors');
const EventEmitter = require('events');

// Import config from 3config.js
const { 
  BOT_TOKEN, 
  REPORT_GROUP_ID, 
  ADMIN_IDS,
  loadReportsConfig,
  saveReportsConfig,
  getReportsEnabled,
  setReportsEnabled,
  updateRobotHeartbeat,
  isRobotOnline,
  updateSystemStatus,
  getSystemStatus,
  resetSystemStatus
} = require('./3config');

// تنظیمات  
const ADMIN_ID = 1114227010; // مدیر مشخص شده توسط کاربر
const START_PORT = Number(process.env.PORT) || 3002; // پورت شروع
const BASE_URL = `https://tapi.bale.ai/bot${BOT_TOKEN}`;

// متغیر برای نگهداری پورت فعلی و سرور
let currentPort = START_PORT;
let server = null;

// راه‌اندازی Express
const app = express();
app.use(cors({ 
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'file://', 'null'], 
  methods: ['GET','POST'],
  credentials: true 
}));
app.use(express.json());
app.use(express.static('public'));

// Event Emitter برای SSE
const reportEvents = new EventEmitter();

// ذخیره پورت برای frontend
function savePortConfig(port) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const config = {
      gatewayPort: port,
      gatewayUrl: `http://localhost:${port}`,
      lastUpdate: new Date().toISOString()
    };
    
    const configPath = path.join(__dirname, '..', 'src', 'lib', 'gateway-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ [CONFIG] پورت ${port} برای frontend ذخیره شد`);
  } catch (error) {
    console.error('❌ [CONFIG] خطا در ذخیره کانفیگ پورت:', error);
  }
}

// تابع پیدا کردن پورت آزاد
function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const net = require('net');
    
    function checkPort(port) {
      const server = net.createServer();
      
      server.listen(port, (err) => {
        if (err) {
          console.log(`❌ [PORT] پورت ${port} اشغال است، تلاش برای ${port + 1}...`);
          server.close();
          checkPort(port + 1);
        } else {
          console.log(`✅ [PORT] پورت ${port} آزاد است!`);
          server.close();
          resolve(port);
        }
      });
      
      server.on('error', () => {
        server.close();
        checkPort(port + 1);
      });
    }
    
    checkPort(startPort);
  });
}

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
const WS_FILE = './data/workshops.json';
const RG_FILE = './data/registrations.json';
const VERIFICATION_FILE = './data/verification_codes.json';

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

// توابع قدیمی حذف شده - حالا از 3config.js استفاده می‌کنیم

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

// تولید کد تأیید 4 رقمی
function generateVerificationCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// ذخیره کد تأیید
async function saveVerificationCode(phone, code, userData) {
  try {
    const codes = await readJson(VERIFICATION_FILE, {});
    codes[phone] = {
      code: code,
      userData: userData,
      timestamp: Date.now(),
      attempts: 0,
      verified: false
    };
    await writeJson(VERIFICATION_FILE, codes);
    console.log(`✅ کد تأیید ${code} برای شماره ${phone} ذخیره شد`);
    return true;
  } catch (error) {
    console.error('❌ خطا در ذخیره کد تأیید:', error);
    return false;
  }
}

// یافتن user_id بر اساس شماره تلفن
async function findUserIdByPhone(phone) {
  try {
    // جستجو در فایل registration_data.json
    const registrationData = await readJson('./registration_data.json', {});
    
    for (const [userId, userData] of Object.entries(registrationData)) {
      if (userData.phone === phone) {
        console.log(`✅ user_id ${userId} برای شماره ${phone} یافت شد`);
        return userId;
      }
    }
    
    console.log(`⚠️ user_id برای شماره ${phone} یافت نشد`);
    return null;
  } catch (error) {
    console.error('❌ خطا در جستجوی user_id:', error);
    return null;
  }
}

// بررسی کد تأیید
async function verifyCode(phone, inputCode) {
  try {
    const codes = await readJson(VERIFICATION_FILE, {});
    const record = codes[phone];
    
    if (!record) {
      return { success: false, message: 'کد تأیید یافت نشد' };
    }
    
    // بررسی انقضای کد (10 دقیقه)
    const now = Date.now();
    const codeAge = now - record.timestamp;
    if (codeAge > 10 * 60 * 1000) { // 10 دقیقه
      delete codes[phone];
      await writeJson(VERIFICATION_FILE, codes);
      return { success: false, message: 'کد تأیید منقضی شده است' };
    }
    
    // بررسی تعداد تلاش‌ها
    if (record.attempts >= 3) {
      return { success: false, message: 'تعداد تلاش‌های مجاز تمام شده است' };
    }
    
    // بررسی کد
    if (record.code === inputCode) {
      record.verified = true;
      codes[phone] = record;
      await writeJson(VERIFICATION_FILE, codes);
      return { success: true, userData: record.userData };
    } else {
      record.attempts += 1;
      codes[phone] = record;
      await writeJson(VERIFICATION_FILE, codes);
      return { success: false, message: `کد نادرست است. ${3 - record.attempts} تلاش باقی مانده` };
    }
  } catch (error) {
    console.error('❌ خطا در بررسی کد تأیید:', error);
    return { success: false, message: 'خطا در بررسی کد' };
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
    const config = loadReportsConfig();
    res.json({ 
      enabled: config.enabled,
      lastUpdate: config.lastUpdate,
      updatedBy: config.updatedBy,
      updatedFrom: config.updatedFrom,
      timestamp: Date.now() // برای تشخیص تغییرات
    });
  } catch (error) {
    res.status(500).json({ error: 'خطا در لود کردن وضعیت گزارش‌ها' });
  }
});

// API برای تغییر وضعیت گزارش‌ها
app.post('/api/toggle-reports', async (req, res) => {
  try {
    const { enabled } = req.body;
    const config = loadReportsConfig();
    
    // بررسی اینکه آیا سایت مجاز است تغییر دهد (پیش‌فرض: مجاز)
    if (config.siteSettings?.allowSiteControl === false) {
      return res.status(403).json({ error: 'سایت مجاز به تغییر تنظیمات نیست' });
    }
    
    // اگر ربات آفلاین است، بررسی کن که آیا سایت مجاز است تغییر دهد (پیش‌فرض: مجاز)
    if (!config.robotOnline && config.siteSettings?.siteCanToggleWhenRobotOffline === false) {
      return res.status(403).json({ error: 'در حالت آفلاین ربات، سایت نمی‌تواند تنظیمات را تغییر دهد' });
    }
    
    // ذخیره در فایل مشترک
    const success = setReportsEnabled(enabled, 'admin', 'website');
    
    if (success) {
      // اطلاع‌رسانی به ربات (فقط اگر آنلاین باشد)
      if (config.robotOnline) {
        await notifyReportsStatusChanged(enabled);
      } else {
        console.log('⚠️ [TOGGLE] ربات آفلاین است - فقط تنظیمات سایت آپدیت شد');
      }
      
      // ارسال event برای SSE clients
      const updatedConfig = loadReportsConfig();
      reportEvents.emit('reportChanged', {
        enabled: updatedConfig.enabled,
        lastUpdate: updatedConfig.lastUpdate,
        updatedBy: updatedConfig.updatedBy,
        updatedFrom: updatedConfig.updatedFrom,
        robotOnline: updatedConfig.robotOnline,
        timestamp: Date.now()
      });
      
      res.json({ 
        success: true, 
        message: `گزارش‌ها ${enabled ? 'فعال' : 'غیرفعال'} شدند`,
        robotOnline: updatedConfig.robotOnline,
        note: updatedConfig.robotOnline ? 'تغییرات به ربات اطلاع داده شد' : 'ربات آفلاین - فقط تنظیمات سایت آپدیت شد'
      });
    } else {
      res.status(500).json({ error: 'خطا در ذخیره تنظیمات' });
    }
  } catch (error) {
    console.error('❌ [TOGGLE] خطا در تغییر وضعیت گزارش‌ها:', error);
    res.status(500).json({ error: 'خطا در تغییر وضعیت گزارش‌ها' });
  }
});

// اندپوینت وضعیت برای تست سریع
app.get('/api/health', (req,res)=> res.json({ ok:true, ts: Date.now() }));

// اندپوینت ریست وضعیت سیستم‌ها (برای تست)
app.post('/api/reset-system-status', async (req, res) => {
  try {
    const success = resetSystemStatus();
    
    if (success) {
      // ارسال داشبورد آپدیت شده
      await sendSystemStatusDashboard();
      
      res.json({ success: true, message: 'وضعیت سیستم‌ها ریست شد' });
    } else {
      res.status(500).json({ error: 'خطا در ریست وضعیت' });
    }
  } catch (error) {
    console.error('❌ [RESET] Error resetting system status:', error);
    res.status(500).json({ error: 'خطا در ریست وضعیت' });
  }
});

// اندپوینت اطلاع‌رسانی آنلاین شدن سایت
app.post('/api/announce-site-online', async (req, res) => {
  try {
    // آپدیت وضعیت سایت
    updateSystemStatus('website', true);
    
    // لاگ در JSON
    const config = loadReportsConfig();
    config.websiteLog = config.websiteLog || [];
    config.websiteLog.push({
      action: 'فعال شدم',
      timestamp: new Date().toISOString()
    });
    // نگه‌داری فقط 10 لاگ آخر
    if (config.websiteLog.length > 10) {
      config.websiteLog = config.websiteLog.slice(-10);
    }
    saveReportsConfig(config);
    
    console.log('📝 [SITE] سایت در JSON نوشت: فعال شدم');
    
    // ارسال داشبورد به‌روزرسانی شده
    await sendSystemStatusDashboard();
    
    console.log(`✅ [SITE] Website online - status updated`);
    res.json({ success: true, message: 'Website online status updated' });
  } catch (error) {
    console.error('❌ [SITE] Error updating website status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// اندپوینت اطلاع‌رسانی خاموشی سایت
app.post('/api/announce-site-offline', async (req, res) => {
  try {
    // آپدیت وضعیت سایت
    updateSystemStatus('website', false);
    
    // لاگ در JSON
    const config = loadReportsConfig();
    config.websiteLog = config.websiteLog || [];
    config.websiteLog.push({
      action: 'غیرفعال شدم',
      timestamp: new Date().toISOString()
    });
    // نگه‌داری فقط 10 لاگ آخر
    if (config.websiteLog.length > 10) {
      config.websiteLog = config.websiteLog.slice(-10);
    }
    saveReportsConfig(config);
    
    console.log('📝 [SITE] سایت در JSON نوشت: غیرفعال شدم');
    
    // ارسال داشبورد به‌روزرسانی شده
    await sendSystemStatusDashboard();
    
    console.log(`✅ [SITE] Website offline - status updated`);
    res.json({ success: true, message: 'Website offline status updated' });
  } catch (error) {
    console.error('❌ [SITE] Error updating website offline status:', error);
    res.status(500).json({ error: 'Failed to update offline status' });
  }
});

// SSE endpoint برای همگام‌سازی real-time
app.get('/api/report-events', (req, res) => {
  console.log('🔄 [SSE] New client connected for report events');
  
  // تنظیمات SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // ارسال وضعیت فعلی به کلاینت جدید
  const sendCurrentStatus = () => {
    try {
      const config = loadReportsConfig();
      const data = {
        enabled: config.enabled,
        lastUpdate: config.lastUpdate,
        updatedBy: config.updatedBy,
        updatedFrom: config.updatedFrom,
        timestamp: Date.now()
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('❌ [SSE] Error sending current status:', error);
    }
  };

  // ارسال وضعیت فعلی
  sendCurrentStatus();

  // listener برای تغییرات جدید
  const onReportChange = (data) => {
    console.log('📡 [SSE] Broadcasting report change:', data);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  reportEvents.on('reportChanged', onReportChange);

  // cleanup وقتی کلاینت قطع می‌شود
  req.on('close', () => {
    console.log('❌ [SSE] Client disconnected');
    reportEvents.removeListener('reportChanged', onReportChange);
  });

  // heartbeat هر 30 ثانیه
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// API برای کارگاه‌ها
app.get('/api/workshops', async (req, res) => {
  try {
    const workshops = await readJson(WS_FILE, {});
    // تبدیل فرمت object به array برای سایت
    const list = Object.entries(workshops).map(([id, workshop]) => ({
      id,
      title: workshop.description || `کارگاه ${workshop.instructor_name}`,
      coach: workshop.instructor_name,
      phone: workshop.instructor_phone,
      price: workshop.cost,
      baleLink: workshop.link,
      ...workshop
    }));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'خطا در لود کردن کارگاه‌ها' });
  }
});

app.post('/api/workshops', async (req, res) => {
  try {
    const body = req.body;
    let workshops = await readJson(WS_FILE, {});
    
    let workshopId = body.id;
    
    if (!workshopId) {
      // ایجاد ID جدید
      const existingIds = Object.keys(workshops).map(id => parseInt(id)).filter(id => !isNaN(id));
      const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      workshopId = String(nextId).padStart(2, '0');
    }
    
    // تبدیل فرمت سایت به فرمت ربات
    const workshopData = {
      instructor_name: body.coach || body.instructor_name,
      instructor_phone: body.phone || body.instructor_phone,
      cost: body.price || body.cost,
      link: body.baleLink || body.link,
      description: body.title || body.description,
      capacity: body.capacity || 20,
      duration: body.duration || '3 ماه',
      level: body.level || 'همه سطوح'
    };
    
    workshops[workshopId] = workshopData;
    await writeJson(WS_FILE, workshops);
    
    // بازگرداندن داده در فرمت سایت
    const responseData = {
      id: workshopId,
      title: workshopData.description,
      coach: workshopData.instructor_name,
      phone: workshopData.instructor_phone,
      price: workshopData.cost,
      baleLink: workshopData.link,
      ...workshopData
    };
    
    res.json({ ok: true, item: responseData });
  } catch (error) {
    console.error('Error saving workshop:', error);
    res.status(500).json({ error: 'خطا در ذخیره کارگاه‌ها' });
  }
});

// API برای ارسال کد تأیید
app.post('/api/send-verification', async (req, res) => {
  try {
    const { firstName, nationalId, phone, workshopId } = req.body || {};
    
    // Validation
    if (!firstName || !/^09\d{9}$/.test(phone) || !workshopId) {
      return res.status(400).json({ ok: false, error: 'اطلاعات نامعتبر است' });
    }
    
    // بررسی وجود کارگاه
    const workshops = await readJson(WS_FILE, []);
    const ws = workshops.find(w => w.id === workshopId);
    
    if (!ws) {
      return res.status(404).json({ ok: false, error: 'کارگاه یافت نشد' });
    }
    
    // تولید کد تأیید
    const verificationCode = generateVerificationCode();
    
    // ذخیره اطلاعات کاربر و کد
    const userData = { firstName, nationalId, phone, workshopId };
    await saveVerificationCode(phone, verificationCode, userData);
    
    // ارسال کد به کاربر از طریق ربات
    const message = `🔐 کد تأیید شما: *${verificationCode}*

👤 نام: ${firstName}
📱 شماره: ${phone}
🏷️ کارگاه: ${ws.title}

⏰ این کد تا 10 دقیقه معتبر است.
🔄 لطفاً این کد را در سایت وارد کنید.`;

    try {
      // ابتدا سعی می‌کنیم user_id کاربر را پیدا کنیم
      const userId = await findUserIdByPhone(phone);
      
      if (userId) {
        // ارسال کد به خود کاربر
        try {
          await sendBaleMessage(userId, message);
          console.log(`✅ کد تأیید ${verificationCode} مستقیماً به کاربر ${userId} ارسال شد`);
        } catch (directError) {
          console.log(`⚠️ ارسال مستقیم به کاربر ${userId} ناموفق، ارسال به مدیر...`);
          // اگر ارسال مستقیم ناموفق بود، به مدیر ارسال کن
          await sendBaleMessage(ADMIN_ID, `📱 کد تأیید برای ${phone} (کاربر: ${userId}):\n${message}`);
        }
      } else {
        // اگر user_id پیدا نشد، به مدیر ارسال کن
        console.log(`⚠️ user_id برای ${phone} پیدا نشد، ارسال به مدیر...`);
        await sendBaleMessage(ADMIN_ID, `📱 کد تأیید برای ${phone} (کاربر جدید):\n${message}`);
      }
      
      console.log(`✅ کد تأیید ${verificationCode} برای ${phone} ارسال شد`);
    } catch (e) {
      console.error('خطا در ارسال کد تأیید:', e);
    }
    
    res.json({ 
      ok: true, 
      message: 'کد تأیید ارسال شد',
      phone: phone.substring(0, 4) + '***' + phone.substring(7) // نمایش بخشی از شماره
    });
    
  } catch (error) {
    console.error('خطا در ارسال کد تأیید:', error);
    res.status(500).json({ ok: false, error: 'خطا در ارسال کد تأیید' });
  }
});

// API برای تأیید کد و ثبت‌نام نهایی
app.post('/api/verify-and-register', async (req, res) => {
  try {
    const { phone, verificationCode } = req.body || {};
    
    if (!phone || !verificationCode) {
      return res.status(400).json({ ok: false, error: 'شماره تلفن و کد تأیید الزامی است' });
    }
    
    // بررسی کد تأیید
    const verifyResult = await verifyCode(phone, verificationCode);
    
    if (!verifyResult.success) {
      return res.status(400).json({ ok: false, error: verifyResult.message });
    }
    
    // دریافت اطلاعات کاربر از کد تأیید
    const { firstName, nationalId, workshopId } = verifyResult.userData;
    
    // دریافت کارگاه
    const workshops = await readJson(WS_FILE, []);
    const ws = workshops.find(w => w.id === workshopId);
    
    if (!ws) {
      return res.status(404).json({ ok: false, error: 'کارگاه یافت نشد' });
    }
    
    // ایجاد ثبت‌نام جدید با ID یکتا
    const registrationId = 'r_' + Date.now();
    const reg = {
      id: registrationId,
      firstName,
      nationalId: nationalId || null,
      phone,
      workshopId,
      status: 'verified',
      ts: Date.now(),
      verifiedAt: Date.now()
    };
    
    // ذخیره در فایل ثبت‌نام‌ها
    const regs = await readJson(RG_FILE, []);
    regs.push(reg);
    await writeJson(RG_FILE, regs);
    
    // پاک کردن کد تأیید پس از استفاده
    const codes = await readJson(VERIFICATION_FILE, {});
    delete codes[phone];
    await writeJson(VERIFICATION_FILE, codes);
    
    // ارسال پیام به مدیر و گروه گزارش
    const msg = `✅ ثبت‌نام تأیید شده:
👤 نام: ${firstName}
📞 موبایل: ${phone}
🏷️ کارگاه: ${ws.title}
🆔 شناسه: ${registrationId}
⏰ زمان: ${new Date().toLocaleString('fa-IR')}`;

    try {
      await sendBaleMessage(REPORT_GROUP_ID, msg);
      await sendBaleMessage(ADMIN_ID, msg);
    } catch (e) {
      console.error('خطا در ارسال پیام:', e);
    }
    
    res.json({ 
      ok: true, 
      id: registrationId,
      message: 'ثبت‌نام با موفقیت تأیید شد',
      groupLink: ws.baleLink || null
    });
    
  } catch (error) {
    console.error('خطا در تأیید و ثبت‌نام:', error);
    res.status(500).json({ ok: false, error: 'خطا در تأیید و ثبت‌نام' });
  }
});

// API برای ثبت‌نام (روش قدیمی - برای سازگاری)
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

// اطلاع‌رسانی تغییر وضعیت گزارش‌ها (فقط لاگ)
async function notifyReportsStatusChanged(enabled) {
  const status = enabled ? '✅ فعال' : '❌ غیرفعال';
  
  // فقط لاگ کنیم - گزارش در داشبورد وضعیت سیستم نمایش داده می‌شود
  console.log(`📊 [GATEWAY] Report status changed to: ${status} from website`);
}

// Export reportEvents و sendSystemStatusDashboard برای استفاده در سایر ماژول‌ها
module.exports = { reportEvents, sendSystemStatusDashboard, sendSettingsDashboard };

// تابع announceRobotOnline حذف شد - ربات خودش وضعیتش را مدیریت می‌کند

// کش برای اطلاعات گروه‌ها (5 دقیقه)
let groupsCache = null;
let groupsCacheTime = 0;
const GROUPS_CACHE_DURATION = 5 * 60 * 1000; // 5 دقیقه

// محاسبه زمان گذشته
function getTimeAgo(timestamp) {
  try {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
      return 'همین الان';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} دقیقه پیش`;
    } else if (diffHours < 24) {
      return `${diffHours} ساعت پیش`;
    } else {
      return `${diffDays} روز پیش`;
    }
  } catch (error) {
    return 'نامشخص';
  }
}

// دریافت لیست گروه‌ها با تعداد اعضا
async function getGroupsList() {
  try {
    // بررسی کش
    const now = Date.now();
    if (groupsCache && (now - groupsCacheTime) < GROUPS_CACHE_DURATION) {
      return groupsCache;
    }
    
    const { GROUP_NAMES } = require('./3config');
    let groupsText = '📋 **گروه‌های ربات:**\n';
    
    let groupIndex = 1;
    for (const [groupId, groupName] of Object.entries(GROUP_NAMES)) {
      try {
        // دریافت اطلاعات گروه از API بله
        const response = await axios.post(`${BASE_URL}/getChat`, {
          chat_id: groupId
        });
        
        if (response.data && response.data.ok) {
          const chat = response.data.result;
          let memberCount = 'نامشخص';
          let adminCount = 'نامشخص';
          
          // تلاش برای دریافت تعداد اعضا
          if (chat.members_count) {
            memberCount = chat.members_count;
          }
          
          // تلاش برای دریافت لیست ادمین‌ها
          try {
            const adminResponse = await axios.post(`${BASE_URL}/getChatAdministrators`, {
              chat_id: groupId
            });
            
            if (adminResponse.data && adminResponse.data.ok) {
              adminCount = adminResponse.data.result.length;
            }
          } catch (adminError) {
            console.log(`⚠️ [GROUPS] Could not get admin count for group ${groupId}`);
          }
          
          // تشخیص نوع عضویت ربات
          let roleIcon = '👤'; // عضو معمولی
          try {
            const memberResponse = await axios.post(`${BASE_URL}/getChatMember`, {
              chat_id: groupId,
              user_id: 'me' // خود ربات
            });
            
            if (memberResponse.data && memberResponse.data.ok) {
              const member = memberResponse.data.result;
              if (member.status === 'administrator' || member.status === 'creator') {
                roleIcon = '👑'; // ادمین
              } else if (member.status === 'member') {
                roleIcon = '👤'; // عضو معمولی
              }
            }
          } catch (roleError) {
            console.log(`⚠️ [GROUPS] Could not get role for group ${groupId}`);
          }
          
          groupsText += `${groupIndex}. **${groupName}** - ${adminCount}👑 | ${memberCount} عضو\n`;
        } else {
          groupsText += `${groupIndex}. ❓ **${groupName}** - دسترسی نداریم\n`;
        }
      } catch (error) {
        groupsText += `${groupIndex}. ❌ **${groupName}** - خطا در اتصال\n`;
      }
      groupIndex++;
    }
    
    // ذخیره در کش
    groupsCache = groupsText;
    groupsCacheTime = now;
    
    return groupsText;
  } catch (error) {
    console.error('❌ [GROUPS] Error getting groups list:', error);
    return '📋 **گروه‌ها:** خطا در دریافت اطلاعات';
  }
}

// ارسال داشبورد تنظیمات سیستم
async function sendSettingsDashboard() {
  try {
    const config = loadReportsConfig();
    
    // دریافت وضعیت ثبت‌نام و نظرسنجی
    let registrationEnabled = true;
    let surveyEnabled = true;
    let registrationUpdatedFrom = 'سیستم';
    let surveyUpdatedFrom = 'سیستم';
    
    try {
      const siteStatus = await readJson('data/site-status.json', {});
      if (siteStatus.registration) {
        registrationEnabled = siteStatus.registration.enabled;
        registrationUpdatedFrom = siteStatus.registration.updatedFrom || 'سیستم';
      }
      if (siteStatus.survey) {
        surveyEnabled = siteStatus.survey.enabled;
        surveyUpdatedFrom = siteStatus.survey.updatedFrom || 'سیستم';
      }
    } catch (error) {
      console.log('⚠️ [DASHBOARD] Could not read site status, using defaults');
    }
    
    // آیکون‌های تنظیمات
    const reportsIcon = config.enabled ? '🟢' : '🔴';
    const registrationIcon = registrationEnabled ? '🟢' : '🔴';
    const surveyIcon = surveyEnabled ? '🟢' : '🔴';
    
    // فرمت زمان فارسی بهتر
    const moment = require('moment-jalaali');
    const now = moment();
    const currentTime = now.format('HH:mm:ss - jD jMMMM jYYYY').replace(/^ا/, '');
    
    let lastChangeTime = 'نامشخص';
    if (config.lastUpdate) {
      const lastChange = moment(config.lastUpdate);
      lastChangeTime = lastChange.format('HH:mm:ss - jD jMMMM jYYYY').replace(/^ا/, '');
    }
    
    const settingsMessage = `⚙️ *داشبورد تنظیمات سیستم*

${reportsIcon} گزارش‌ها (از طرف: ${config.updatedFrom || 'سیستم'})
${registrationIcon} ثبت‌نام (از طرف: ${registrationUpdatedFrom})
${surveyIcon} نظرسنجی (از طرف: ${surveyUpdatedFrom})

📊 آخرین تغییر: ${lastChangeTime}
⏰ زمان فعلی: ${currentTime}`;

    await sendBaleMessage(REPORT_GROUP_ID, settingsMessage);
    console.log('✅ [SETTINGS] Settings dashboard sent');
  } catch (error) {
    console.error('❌ [SETTINGS] Error sending settings dashboard:', error);
  }
}

// ارسال داشبورد وضعیت سیستم‌ها
async function sendSystemStatusDashboard() {
  try {
    const status = getSystemStatus();
    
    const robotIcon = status.robot ? '🟢' : '🔴';
    const gatewayIcon = status.gateway ? '🟢' : '🔴';
    const websiteIcon = status.website ? '🟢' : '🔴';
    
    // نمایش آخرین تغییر
    let lastChangeText = '';
    if (status.lastChange) {
      const systemNames = {
        robot: '🤖 ربات',
        gateway: '🔗 اتصال', 
        website: '🌐 سایت'
      };
      
      const systemName = systemNames[status.lastChange.system] || status.lastChange.system;
      const action = status.lastChange.action;
      
      lastChangeText = `${systemName} ${action}`;
    } else {
      lastChangeText = 'تغییری ثبت نشده';
    }
    
    // دریافت لیست گروه‌ها
    const groupsList = await getGroupsList();
    
    const message = `📊 *داشبورد وضعیت سیستم*

**آخرین تغییر:** ${lastChangeText}

${robotIcon} **ربات**
${gatewayIcon} **اتصال**
${websiteIcon} **سایت**

**📈 گزارش فعال از:**
${status.lastChange ? (status.lastChange.system === 'robot' ? '🤖 ربات' : status.lastChange.system === 'website' ? '🌐 سایت' : status.lastChange.system === 'gateway' ? '🔗 اتصال' : 'سیستم نامشخص') : 'تغییری ثبت نشده'}

${groupsList}

⏰ آخرین بروزرسانی: ${new Date(status.lastUpdate).toLocaleString('fa-IR')}`;

    await sendBaleMessage(REPORT_GROUP_ID, message);
    console.log('✅ [STATUS] System status dashboard sent');
  } catch (error) {
    console.error('❌ [STATUS] Error sending system status dashboard:', error);
  }
}

// اطلاع‌رسانی آنلاین شدن Gateway (اتصال ربات-سایت)
async function announceGatewayOnline(port) {
  try {
    // آپدیت وضعیت Gateway
    updateSystemStatus('gateway', true);
    
    // ارسال داشبورد به‌روزرسانی شده
    await sendSystemStatusDashboard();
    
    console.log(`✅ [GATEWAY] Gateway online - status updated`);
  } catch (error) {
    console.error('❌ [GATEWAY] Error announcing gateway online:', error);
  }
}

// تابع announceRobotOffline حذف شد - ربات خودش وضعیتش را مدیریت می‌کند

// بستن graceful سرور
function gracefulShutdown() {
  console.log('🔴 [SHUTDOWN] شروع خاموشی graceful...');
  
  // آپدیت وضعیت Gateway به آفلاین
  updateSystemStatus('gateway', false);
  
  if (server) {
    server.close(async () => {
      console.log(`🔌 [SHUTDOWN] سرور پورت ${currentPort} بسته شد`);
      
      // فقط ارسال داشبورد آپدیت شده
      await sendSystemStatusDashboard();
      process.exit(0);
    });
    
    // اگر بعد از 10 ثانیه بسته نشد، force exit
    setTimeout(async () => {
      console.log('⚠️ [SHUTDOWN] Force shutdown بعد از timeout');
      await sendSystemStatusDashboard();
      process.exit(1);
    }, 10000);
  } else {
    (async () => {
      await sendSystemStatusDashboard();
      process.exit(0);
    })();
  }
}

// API برای دریافت وضعیت ثبت‌نام
app.get('/api/registration-status', async (req, res) => {
  try {
    const siteStatus = await readJson('data/site-status.json', {
      registration: { enabled: true, lastUpdate: Date.now(), updatedFrom: 'سیستم' }
    });
    res.json(siteStatus.registration);
  } catch (error) {
    console.error('خطا در دریافت وضعیت ثبت‌نام:', error);
    res.status(500).json({ error: 'خطا در دریافت وضعیت ثبت‌نام' });
  }
});

// API برای تغییر وضعیت ثبت‌نام
app.post('/api/toggle-registration', async (req, res) => {
  try {
    const { enabled } = req.body;
    const siteStatus = await readJson('data/site-status.json', {
      registration: { enabled: true, lastUpdate: Date.now(), updatedFrom: 'سیستم' },
      survey: { enabled: true, lastUpdate: Date.now(), updatedFrom: 'سیستم' }
    });
    
    siteStatus.registration.enabled = enabled;
    siteStatus.registration.lastUpdate = Date.now();
    siteStatus.registration.updatedFrom = 'سایت';
    
    await writeJson('data/site-status.json', siteStatus);
    
    // ارسال رویداد SSE
    reportEvents.emit('registration-change', siteStatus.registration);
    
    // فقط لاگ کنیم - گزارش در داشبورد وضعیت سیستم نمایش داده می‌شود
    console.log(`🔄 Registration status changed to: ${enabled ? 'فعال' : 'غیرفعال'} from website`);
    
    res.json({ success: true, enabled });
  } catch (error) {
    console.error('خطا در تغییر وضعیت ثبت‌نام:', error);
    res.status(500).json({ error: 'خطا در تغییر وضعیت ثبت‌نام' });
  }
});

// API برای دریافت وضعیت نظرسنجی
app.get('/api/survey-status', async (req, res) => {
  try {
    const siteStatus = await readJson('data/site-status.json', {
      survey: { enabled: true, lastUpdate: Date.now(), updatedFrom: 'سیستم' }
    });
    res.json(siteStatus.survey);
  } catch (error) {
    console.error('خطا در دریافت وضعیت نظرسنجی:', error);
    res.status(500).json({ error: 'خطا در دریافت وضعیت نظرسنجی' });
  }
});

// API برای تغییر وضعیت نظرسنجی
app.post('/api/toggle-survey', async (req, res) => {
  try {
    const { enabled } = req.body;
    const siteStatus = await readJson('data/site-status.json', {
      registration: { enabled: true, lastUpdate: Date.now(), updatedFrom: 'سیستم' },
      survey: { enabled: true, lastUpdate: Date.now(), updatedFrom: 'سیستم' }
    });
    
    siteStatus.survey.enabled = enabled;
    siteStatus.survey.lastUpdate = Date.now();
    siteStatus.survey.updatedFrom = 'سایت';
    
    await writeJson('data/site-status.json', siteStatus);
    
    // ارسال رویداد SSE
    reportEvents.emit('survey-change', siteStatus.survey);
    
    // فقط لاگ کنیم - گزارش در داشبورد وضعیت سیستم نمایش داده می‌شود
    console.log(`🔄 Survey status changed to: ${enabled ? 'فعال' : 'غیرفعال'} from website`);
    
    res.json({ success: true, enabled });
  } catch (error) {
    console.error('خطا در تغییر وضعیت نظرسنجی:', error);
    res.status(500).json({ error: 'خطا در تغییر وضعیت نظرسنجی' });
  }
});

// SSE endpoint برای رویدادهای ثبت‌نام و نظرسنجی
app.get('/api/site-events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // ارسال heartbeat
  const heartbeat = setInterval(() => {
    res.write('data: {"type":"heartbeat"}\n\n');
  }, 30000);

  // گوش دادن به رویدادهای ثبت‌نام
  const onRegistrationChange = (data) => {
    res.write(`data: ${JSON.stringify({type: 'registration', ...data})}\n\n`);
  };

  // گوش دادن به رویدادهای نظرسنجی
  const onSurveyChange = (data) => {
    res.write(`data: ${JSON.stringify({type: 'survey', ...data})}\n\n`);
  };

  reportEvents.on('registration-change', onRegistrationChange);
  reportEvents.on('survey-change', onSurveyChange);

  // پاکسازی در هنگام قطع اتصال
  req.on('close', () => {
    clearInterval(heartbeat);
    reportEvents.removeListener('registration-change', onRegistrationChange);
    reportEvents.removeListener('survey-change', onSurveyChange);
  });
});

// راه‌اندازی
async function start() {
  try {
    // پیدا کردن پورت آزاد
    console.log(`🔍 [PORT] جستجوی پورت آزاد از ${START_PORT}...`);
    currentPort = await findAvailablePort(START_PORT);
    
    // راه‌اندازی سرور وب با پورت پویا
    server = app.listen(currentPort, () => {
      console.log(`🌐 [SERVER] سرور روی پورت ${currentPort} راه‌اندازی شد`);
      console.log(`🔗 [SERVER] آدرس: http://localhost:${currentPort}`);
      
      // ذخیره پورت در فایل برای frontend
      savePortConfig(currentPort);
      
      // اطلاع‌رسانی آنلاین شدن Gateway به گروه گزارش
      announceGatewayOnline(currentPort);
    });
    
    // فقط اعلام آنلاین شدن Gateway (نه ربات)
    // ربات باید خودش وضعیتش را اعلام کند
    
    // تست اتصال به بله (بدون ارسال پیام)
    console.log('🔍 تست اتصال به بله...');
    try {
      // تست ساده بدون ارسال پیام
      const response = await axios.get(`${BASE_URL}/getMe`);
      if (response.data && response.data.ok) {
        console.log('✅ اتصال به بله موفق - ربات آماده کار است');
      } else {
        console.log('⚠️ اتصال به بله ناموفق - فقط سرور وب فعال است');
      }
    } catch (error) {
      console.log('⚠️ اتصال به بله ناموفق - فقط سرور وب فعال است');
    }
    
  } catch (error) {
    console.error('خطا در راه‌اندازی:', error);
  }
}

// مدیریت خاموشی
process.on('SIGINT', () => {
  console.log('\n🔴 [SHUTDOWN] Received SIGINT (Ctrl+C)...');
  gracefulShutdown();
});

process.on('SIGTERM', () => {
  console.log('\n🔴 [SHUTDOWN] Received SIGTERM...');
  gracefulShutdown();
});

// مدیریت خطاهای غیرمنتظره
process.on('uncaughtException', (error) => {
  console.error('❌ [ERROR] Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

start();
