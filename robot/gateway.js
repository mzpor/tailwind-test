const express = require('express');
const { Telegraf } = require('telegraf');
const fs = require('fs').promises;
const path = require('path');

// تنظیمات
const BOT_TOKEN = "1778171143:vD6rjJXAYidLL7hQyQkBeu5TJ9KpRd4zAKegqUt3";
const ADMIN_ID = 1638058362; // مدیر مدرسه
const REPORT_GROUP_ID = 5668045453; // گروه گزارش

// راه‌اندازی Express
const app = express();
app.use(express.json());
app.use(express.static('public'));

// راه‌اندازی ربات
const bot = new Telegraf(BOT_TOKEN);

// فایل تنظیمات
const SETTINGS_FILE = './data/settings.json';

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

// اطلاع‌رسانی به ربات
async function notifyBotSettingsChanged(settings) {
  const message = `⚙️ **تنظیمات تغییر کرد!**

🏫 نام مدرسه: ${settings.schoolName}
📝 ثبت‌نام ماه آینده: ${settings.registrationOpen ? 'باز' : 'بسته'}
👥 حداکثر دانش‌آموز: ${settings.maxStudents}
💬 پیام مدیر: ${settings.adminMessage}

⏰ زمان: ${new Date().toLocaleString('fa-IR')}`;

  try {
    // ارسال به گروه گزارش
    await bot.telegram.sendMessage(REPORT_GROUP_ID, message, { parse_mode: 'Markdown' });
    
    // ارسال به مدیر
    await bot.telegram.sendMessage(ADMIN_ID, 
      `✅ تنظیمات با موفقیت تغییر کرد!\n\n${message}`, 
      { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطا در ارسال پیام:', error);
  }
}

// دستورات ربات
bot.command('start', async (ctx) => {
  const settings = await loadSettings();
  const message = `🌟 **${settings.schoolName}**

${settings.adminMessage}

📊 **وضعیت فعلی:**
• ثبت‌نام ماه آینده: ${settings.registrationOpen ? '✅ باز' : '❌ بسته'}
• حداکثر دانش‌آموز: ${settings.maxStudents}

🔗 برای مدیریت: https://your-domain.com`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.command('settings', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply('❌ فقط مدیر مدرسه می‌تواند تنظیمات را ببیند');
  }
  
  const settings = await loadSettings();
  const message = `⚙️ **تنظیمات فعلی:**

🏫 نام مدرسه: ${settings.schoolName}
📝 ثبت‌نام ماه آینده: ${settings.registrationOpen ? 'باز' : 'بسته'}
👥 حداکثر دانش‌آموز: ${settings.maxStudents}
💬 پیام مدیر: ${settings.adminMessage}

🔗 برای تغییر: https://your-domain.com`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.command('status', async (ctx) => {
  const settings = await loadSettings();
  const message = `📊 **وضعیت سیستم:**

🏫 ${settings.schoolName}
📝 ثبت‌نام ماه آینده: ${settings.registrationOpen ? '✅ باز' : '❌ بسته'}
👥 حداکثر دانش‌آموز: ${settings.maxStudents}
⏰ آخرین بروزرسانی: ${new Date().toLocaleString('fa-IR')}`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

// راه‌اندازی
async function start() {
  try {
    // راه‌اندازی ربات
    await bot.launch();
    console.log('🤖 ربات بله راه‌اندازی شد');
    
    // راه‌اندازی سرور وب
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🌐 سرور وب روی پورت ${PORT} راه‌اندازی شد`);
      console.log(`🔗 پنل مدیر: http://localhost:${PORT}`);
    });
    
    // پیام شروع
    await bot.telegram.sendMessage(REPORT_GROUP_ID, 
      '🚀 سیستم پنل مدیر راه‌اندازی شد!\n\n🔗 پنل مدیر: http://localhost:3000');
    
  } catch (error) {
    console.error('خطا در راه‌اندازی:', error);
  }
}

// مدیریت خاموشی
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

start();
