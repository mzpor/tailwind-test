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
  isRobotOnline
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
const REPORTS_FILE = './data/reports.json';
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
    
    // بررسی اینکه آیا سایت مجاز است تغییر دهد
    if (!config.siteSettings?.allowSiteControl) {
      return res.status(403).json({ error: 'سایت مجاز به تغییر تنظیمات نیست' });
    }
    
    // اگر ربات آفلاین است، بررسی کن که آیا سایت مجاز است تغییر دهد
    if (!config.robotOnline && !config.siteSettings?.siteCanToggleWhenRobotOffline) {
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

// اطلاع‌رسانی تغییر وضعیت گزارش‌ها
async function notifyReportsStatusChanged(enabled) {
  const status = enabled ? '✅ فعال' : '❌ غیرفعال';
  const groupMessage = `📊 *گزارش‌ها ${status} شدند*
  
⏰ ${new Date().toLocaleString('fa-IR')}
🔗 تغییر از: پنل مدیر سایت`;

  try {
    console.log(`📊 [GATEWAY] Notifying report status change: ${enabled}`);
    
    // فقط به گروه گزارش ارسال کن (نه به مدیر در ربات)
    await sendBaleMessage(REPORT_GROUP_ID, groupMessage);
    console.log(`✅ [GATEWAY] Report message sent to group: ${REPORT_GROUP_ID}`);
    
  } catch (error) {
    console.error('❌ [GATEWAY] خطا در ارسال پیام:', error);
  }
}

// Export reportEvents برای استفاده در سایر ماژول‌ها
module.exports = { reportEvents };

// اعلام روشن شدن ربات
function announceRobotOnline() {
  updateRobotHeartbeat();
  console.log('🟢 [ROBOT] Robot is now ONLINE');
}

// اطلاع‌رسانی آنلاین شدن سایت
async function announceSiteOnline(port) {
  try {
    const message = `🌐 *پنل مدیریت آنلاین شد*

🔗 آدرس: http://localhost:${port}
⏰ ${new Date().toLocaleString('fa-IR')}
🎯 آماده دریافت درخواست‌ها`;

    await sendBaleMessage(REPORT_GROUP_ID, message);
    console.log(`✅ [SITE] Site online notification sent to group: ${REPORT_GROUP_ID}`);
  } catch (error) {
    console.error('❌ [SITE] Error sending site online notification:', error);
  }
}

// اعلام خاموش شدن ربات
function announceRobotOffline() {
  try {
    const config = loadReportsConfig();
    config.robotOnline = false;
    config.lastRobotPing = new Date().toISOString();
    saveReportsConfig(config);
    console.log('🔴 [ROBOT] Robot is now OFFLINE');
  } catch (error) {
    console.error('❌ [ROBOT] Error announcing offline:', error);
  }
}

// بستن graceful سرور
function gracefulShutdown() {
  console.log('🔴 [SHUTDOWN] شروع خاموشی graceful...');
  
  if (server) {
    server.close(() => {
      console.log(`🔌 [SHUTDOWN] سرور پورت ${currentPort} بسته شد`);
      announceRobotOffline();
      process.exit(0);
    });
    
    // اگر بعد از 10 ثانیه بسته نشد، force exit
    setTimeout(() => {
      console.log('⚠️ [SHUTDOWN] Force shutdown بعد از timeout');
      announceRobotOffline();
      process.exit(1);
    }, 10000);
  } else {
    announceRobotOffline();
    process.exit(0);
  }
}

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
      
      // اطلاع‌رسانی آنلاین شدن سایت به گروه گزارش
      announceSiteOnline(currentPort);
    });
    
    // اعلام آنلاین شدن ربات
    announceRobotOnline();
    
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
