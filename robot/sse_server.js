// 🚀 سرور SSE برای هماهنگی داده‌ها بین ربات و سایت
// Server-Sent Events بدون polling - فقط با درخواست کاربر

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

class SSEServer {
  constructor(port = 3001) {
    this.app = express();
    this.port = port;
    this.clients = new Set();
    this.dataFiles = {
      registrations: 'data/registrations.json',
      registrationData: 'data/registration_data.json',
      workshops: 'data/workshops.json'
    };
    
    this.setupMiddleware();
    this.setupRoutes();
    this.startServer();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }

  setupRoutes() {
    // 🔗 SSE endpoint برای دریافت تغییرات
    this.app.get('/api/sse', (req, res) => {
      this.handleSSEConnection(req, res);
    });

    // 📊 دریافت آمار کلی
    this.app.get('/api/stats', (req, res) => {
      try {
        const stats = this.getStatistics();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: 'خطا در دریافت آمار' });
      }
    });

    // 🔍 جستجوی کاربران
    this.app.get('/api/search', (req, res) => {
      try {
        const { query } = req.query;
        if (!query) {
          return res.status(400).json({ error: 'پارامتر query الزامی است' });
        }
        
        const results = this.searchUsers(query);
        res.json(results);
      } catch (error) {
        res.status(500).json({ error: 'خطا در جستجو' });
      }
    });

    // 📝 دریافت لیست کاربران
    this.app.get('/api/users', (req, res) => {
      try {
        const { status, source } = req.query;
        let users = this.getAllUsers();
        
        if (status) {
          users = users.filter(u => u.status === status);
        }
        
        if (source) {
          users = users.filter(u => u.source === source);
        }
        
        res.json(users);
      } catch (error) {
        res.status(500).json({ error: 'خطا در دریافت کاربران' });
      }
    });

    // 🔄 به‌روزرسانی کاربر
    this.app.post('/api/users/:userId', (req, res) => {
      try {
        const { userId } = req.params;
        const updates = req.body;
        
        const success = this.updateUser(userId, updates);
        if (success) {
          // اطلاع‌رسانی به همه کلاینت‌های SSE
          this.notifyClients('user_updated', { userId, updates });
          res.json({ success: true, message: 'کاربر با موفقیت به‌روزرسانی شد' });
        } else {
          res.status(404).json({ error: 'کاربر یافت نشد' });
        }
      } catch (error) {
        res.status(500).json({ error: 'خطا در به‌روزرسانی کاربر' });
      }
    });

    // 🆕 ایجاد کاربر جدید
    this.app.post('/api/users', (req, res) => {
      try {
        const userData = req.body;
        const userId = this.createUser(userData);
        
        if (userId) {
          // اطلاع‌رسانی به همه کلاینت‌های SSE
          this.notifyClients('user_created', { userId, userData });
          res.json({ success: true, userId, message: 'کاربر با موفقیت ایجاد شد' });
        } else {
          res.status(400).json({ error: 'خطا در ایجاد کاربر' });
        }
      } catch (error) {
        res.status(500).json({ error: 'خطا در ایجاد کاربر' });
      }
    });

    // 🧹 پاک‌سازی رکوردهای تکراری
    this.app.post('/api/cleanup', (req, res) => {
      try {
        const cleanedCount = this.cleanupDuplicates();
        res.json({ success: true, cleanedCount, message: `${cleanedCount} رکورد تکراری پاک‌سازی شد` });
      } catch (error) {
        res.status(500).json({ error: 'خطا در پاک‌سازی' });
      }
    });
  }

  // 🔗 مدیریت اتصال SSE
  handleSSEConnection(req, res) {
    console.log('🔗 [SSE] New client connected');
    
    // تنظیم headers برای SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // ارسال پیام اولیه
    res.write('data: {"type": "connected", "message": "اتصال SSE برقرار شد"}\n\n');

    // اضافه کردن کلاینت به لیست
    const client = { id: Date.now(), res };
    this.clients.add(client);

    // حذف کلاینت در صورت قطع اتصال
    req.on('close', () => {
      console.log('🔌 [SSE] Client disconnected');
      this.clients.delete(client);
    });
  }

  // 📢 اطلاع‌رسانی به همه کلاینت‌ها
  notifyClients(type, data) {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    
    this.clients.forEach(client => {
      try {
        client.res.write(`data: ${message}\n\n`);
      } catch (error) {
        console.error('❌ [SSE] Error sending to client:', error);
        this.clients.delete(client);
      }
    });
  }

  // 📊 دریافت آمار
  getStatistics() {
    const users = this.getAllUsers();
    const incomplete = users.filter(u => !this.isRegistrationComplete(u));
    const completed = users.filter(u => this.isRegistrationComplete(u));
    
    return {
      total: users.length,
      incomplete: incomplete.length,
      completed: completed.length,
      botUsers: users.filter(u => u.source === 'bot').length,
      websiteUsers: users.filter(u => u.source === 'website').length,
      lastUpdated: Date.now()
    };
  }

  // 🔍 جستجوی کاربران
  searchUsers(query) {
    const users = this.getAllUsers();
    const queryLower = query.toLowerCase();
    
    return users.filter(user => 
      (user.fullName && user.fullName.toLowerCase().includes(queryLower)) ||
      (user.nationalId && user.nationalId.includes(query)) ||
      (user.phone && user.phone.includes(query))
    );
  }

  // 📋 دریافت همه کاربران
  getAllUsers() {
    const users = [];
    
    // خواندن از registrations.json
    try {
      if (fs.existsSync(this.dataFiles.registrations)) {
        const data = JSON.parse(fs.readFileSync(this.dataFiles.registrations, 'utf8'));
        Object.entries(data).forEach(([userId, userData]) => {
          users.push({ userId, source: 'bot', ...userData });
        });
      }
    } catch (error) {
      console.error('❌ [SSE] Error reading registrations:', error);
    }
    
    // خواندن از registration_data.json
    try {
      if (fs.existsSync(this.dataFiles.registrationData)) {
        const data = JSON.parse(fs.readFileSync(this.dataFiles.registrationData, 'utf8'));
        Object.entries(data).forEach(([userId, userData]) => {
          users.push({ userId, source: 'website', ...userData });
        });
      }
    } catch (error) {
      console.error('❌ [SSE] Error reading registration_data:', error);
    }
    
    return users;
  }

  // 🔄 به‌روزرسانی کاربر
  updateUser(userId, updates) {
    try {
      // جستجو در registrations.json
      if (fs.existsSync(this.dataFiles.registrations)) {
        const data = JSON.parse(fs.readFileSync(this.dataFiles.registrations, 'utf8'));
        if (data[userId]) {
          data[userId] = { ...data[userId], ...updates, lastUpdated: Date.now() };
          fs.writeFileSync(this.dataFiles.registrations, JSON.stringify(data, null, 2));
          return true;
        }
      }
      
      // جستجو در registration_data.json
      if (fs.existsSync(this.dataFiles.registrationData)) {
        const data = JSON.parse(fs.readFileSync(this.dataFiles.registrationData, 'utf8'));
        if (data[userId]) {
          data[userId] = { ...data[userId], ...updates, lastUpdated: Date.now() };
          fs.writeFileSync(this.dataFiles.registrationData, JSON.stringify(data, null, 2));
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ [SSE] Error updating user:', error);
      return false;
    }
  }

  // 🆕 ایجاد کاربر جدید
  createUser(userData) {
    try {
      const userId = `w_${Date.now()}`;
      const newUser = {
        ...userData,
        status: 'new',
        source: 'website',
        ts: Date.now(),
        lastUpdated: Date.now()
      };
      
      if (fs.existsSync(this.dataFiles.registrationData)) {
        const data = JSON.parse(fs.readFileSync(this.dataFiles.registrationData, 'utf8'));
        data[userId] = newUser;
        fs.writeFileSync(this.dataFiles.registrationData, JSON.stringify(data, null, 2));
        return userId;
      }
      
      return null;
    } catch (error) {
      console.error('❌ [SSE] Error creating user:', error);
      return null;
    }
  }

  // 🧹 پاک‌سازی رکوردهای تکراری
  cleanupDuplicates() {
    // پیاده‌سازی پاک‌سازی رکوردهای تکراری
    // این بخش می‌تواند پیچیده باشد و نیاز به بررسی دقیق‌تر دارد
    return 0;
  }

  // ✅ بررسی تکمیل بودن ثبت‌نام
  isRegistrationComplete(userData) {
    return userData.fullName && 
           userData.nationalId && 
           userData.phone &&
           userData.fullName.trim() !== '' &&
           userData.nationalId.trim() !== '' &&
           userData.phone.trim() !== '';
  }

  // 🚀 شروع سرور
  startServer() {
    this.app.listen(this.port, () => {
      console.log(`🚀 [SSE] Server running on port ${this.port}`);
      console.log(`🔗 [SSE] SSE endpoint: http://localhost:${this.port}/api/sse`);
      console.log(`📊 [SSE] Stats endpoint: http://localhost:${this.port}/api/stats`);
    });
  }

  // 📢 اطلاع‌رسانی تغییرات به کلاینت‌ها
  broadcastChange(changeType, data) {
    this.notifyClients(changeType, data);
  }
}

module.exports = SSEServer;

// اگر فایل مستقیماً اجرا شود
if (require.main === module) {
  const sseServer = new SSEServer();
}
