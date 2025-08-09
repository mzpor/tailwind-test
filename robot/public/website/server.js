// سرور Node.js برای سایت مدرسه تلاوت
// شبیه‌سازی سایت پایتون با Express.js

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('static'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);
app.set('views', path.join(__dirname, 'templates'));

// JSON فایل‌های دیتا (در روت پروژه)
const USERS_FILE = '../../users.json';
const CLASSES_FILE = '../../classes.json';
const REPORT_CARDS_FILE = '../../report_cards.json';
const SETTINGS_FILE = '../../settings.json';

// Helper Functions
function loadJsonData(filename) {
    const fullPath = path.join(__dirname, filename);
    if (fs.existsSync(fullPath)) {
        try {
            const data = fs.readFileSync(fullPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            return {};
        }
    }
    return {};
}

function saveJsonData(filename, data) {
    const fullPath = path.join(__dirname, filename);
    try {
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error saving ${filename}:`, error);
        return false;
    }
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function isAdmin(userId) {
    const users = loadJsonData(USERS_FILE);
    const user = users[userId];
    return user && user.role === 'admin';
}

function isTeacher(userId) {
    const users = loadJsonData(USERS_FILE);
    const user = users[userId];
    return user && ['teacher', 'admin'].includes(user.role);
}

// Routes
app.get('/', (req, res) => {
    res.render('1index.html');
});

app.get('/login', (req, res) => {
    res.render('2login.html');
});

app.post('/login', (req, res) => {
    const { national_id, password } = req.body;
    const users = loadJsonData(USERS_FILE);
    
    // جستجو بر اساس کد ملی
    let userId = null;
    for (const [uid, userData] of Object.entries(users)) {
        if (userData.national_id === national_id) {
            userId = uid;
            break;
        }
    }
    
    if (userId && users[userId].password === hashPassword(password)) {
        // ذخیره session (در production باید از express-session استفاده کرد)
        res.json({
            success: true,
            user: {
                id: userId,
                name: users[userId].full_name,
                role: users[userId].role || 'student'
            }
        });
    } else {
        res.json({
            success: false,
            message: 'کد ملی یا رمز عبور اشتباه است!'
        });
    }
});

app.get('/register', (req, res) => {
    res.render('3register.html');
});

app.post('/register', (req, res) => {
    const { national_id, full_name, phone, password, user_type } = req.body;
    const users = loadJsonData(USERS_FILE);
    
    // بررسی تکراری نبودن کد ملی
    for (const userData of Object.values(users)) {
        if (userData.national_id === national_id) {
            return res.json({
                success: false,
                message: 'این کد ملی قبلاً ثبت شده است!'
            });
        }
    }
    
    // ایجاد کاربر جدید
    const userId = Date.now().toString();
    users[userId] = {
        national_id,
        full_name,
        phone,
        password: hashPassword(password),
        role: user_type || 'quran_student',
        registration_date: new Date().toISOString(),
        first_name: full_name.split(' ')[0]
    };
    
    if (saveJsonData(USERS_FILE, users)) {
        res.json({
            success: true,
            message: 'ثبت‌نام با موفقیت انجام شد!'
        });
    } else {
        res.json({
            success: false,
            message: 'خطا در ذخیره اطلاعات!'
        });
    }
});

app.get('/dashboard', (req, res) => {
    const users = loadJsonData(USERS_FILE);
    const totalStudents = Object.values(users).filter(u => u.role === 'quran_student').length;
    const totalTeachers = Object.values(users).filter(u => ['teacher', 'admin'].includes(u.role)).length;
    
    res.render('4dashboard.html', {
        total_students: totalStudents,
        total_teachers: totalTeachers,
        session: {
            user_name: 'کاربر مهمان',
            user_role: 'guest'
        }
    });
});

app.get('/report-card', (req, res) => {
    const reportCards = loadJsonData(REPORT_CARDS_FILE);
    res.render('5report-card.html', { report_cards: reportCards });
});

app.get('/classes', (req, res) => {
    const classes = loadJsonData(CLASSES_FILE);
    res.render('6classes.html', { classes });
});

app.get('/admin', (req, res) => {
    res.render('admin_panel.html');
});

// API Routes
app.get('/api/users', (req, res) => {
    const users = loadJsonData(USERS_FILE);
    res.json(users);
});

app.get('/api/stats', (req, res) => {
    const users = loadJsonData(USERS_FILE);
    const classes = loadJsonData(CLASSES_FILE);
    
    const stats = {
        total_users: Object.keys(users).length,
        total_students: Object.values(users).filter(u => u.role === 'quran_student').length,
        total_teachers: Object.values(users).filter(u => ['teacher', 'admin'].includes(u.role)).length,
        total_classes: Object.keys(classes).length
    };
    
    res.json(stats);
});

// API برای هماهنگی با ربات
app.post('/api/bot-register', (req, res) => {
    const { user_id, full_name, national_id, phone } = req.body;
    
    if (!user_id || !full_name || !national_id || !phone) {
        return res.status(400).json({
            success: false,
            message: 'اطلاعات ناقص ارسال شده'
        });
    }
    
    const users = loadJsonData(USERS_FILE);
    
    // بررسی تکراری نبودن کد ملی
    for (const userData of Object.values(users)) {
        if (userData.national_id === national_id) {
            return res.json({
                success: false,
                message: 'این کد ملی قبلاً در سایت ثبت شده است'
            });
        }
    }
    
    // ایجاد کاربر جدید با user_id از ربات
    users[user_id] = {
        national_id,
        full_name,
        phone,
        password: null, // رمز عبور از طریق ربات تنظیم نمی‌شود
        role: 'quran_student',
        registration_date: new Date().toISOString(),
        first_name: full_name.split(' ')[0],
        registered_via: 'bot',
        is_bot_user: true
    };
    
    if (saveJsonData(USERS_FILE, users)) {
        res.json({
            success: true,
            message: 'کاربر با موفقیت در سایت ثبت شد',
            user_id: user_id
        });
    } else {
        res.status(500).json({
            success: false,
            message: 'خطا در ذخیره اطلاعات'
        });
    }
});

// API برای بررسی وضعیت کاربر
app.get('/api/bot-user/:user_id', (req, res) => {
    const { user_id } = req.params;
    const users = loadJsonData(USERS_FILE);
    
    if (users[user_id]) {
        res.json({
            success: true,
            user: {
                id: user_id,
                full_name: users[user_id].full_name,
                national_id: users[user_id].national_id,
                phone: users[user_id].phone,
                role: users[user_id].role,
                is_registered: true,
                has_password: !!users[user_id].password
            }
        });
    } else {
        res.json({
            success: false,
            message: 'کاربر یافت نشد',
            is_registered: false
        });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('خطای سرور!');
});

app.use((req, res) => {
    res.status(404).send('صفحه یافت نشد!');
});

// Start server
app.listen(PORT, () => {
    console.log(`🌐 سرور سایت مدرسه تلاوت روی پورت ${PORT} راه‌اندازی شد`);
    console.log(`🔗 آدرس سایت: http://localhost:${PORT}`);
    console.log('📊 فایل‌های JSON در روت پروژه قرار دارند');
});

module.exports = app;
