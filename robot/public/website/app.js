// سرور Express.js کامل برای سایت مدرسه تلاوت
// بر اساس scholSite پایتون ساخته شده

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: 'mtelbot-school-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // true for HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Template engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// JSON فایل‌های دیتا (در روت پروژه)
const DATA_DIR = path.join(__dirname, '../../');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CLASSES_FILE = path.join(DATA_DIR, 'classes.json');
const REGISTRATION_FILE = path.join(DATA_DIR, 'registration_data.json');
const WORKSHOPS_FILE = path.join(DATA_DIR, 'workshops.json');
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Helper Functions
function loadJsonData(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`خطا در خواندن ${filePath}:`, error);
            return {};
        }
    }
    return {};
}

function saveJsonData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`خطا در ذخیره ${filePath}:`, error);
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

function requireAuth(req, res, next) {
    if (!req.session.user_id) {
        return res.redirect('/login');
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user_id || !isAdmin(req.session.user_id)) {
        return res.status(403).send('دسترسی مجاز نیست');
    }
    next();
}

// Routes

// صفحه اصلی
app.get('/', (req, res) => {
    res.render('index', {
        user: req.session.user_id ? {
            id: req.session.user_id,
            name: req.session.user_name,
            role: req.session.user_role
        } : null
    });
});

// صفحه ورود
app.get('/login', (req, res) => {
    if (req.session.user_id) {
        return res.redirect('/dashboard');
    }
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { national_id, password } = req.body;
    const users = loadJsonData(USERS_FILE);
    
    // جستجو بر اساس کد ملی
    let userId = null;
    let userData = null;
    
    for (const [uid, user] of Object.entries(users)) {
        if (user.national_id === national_id) {
            userId = uid;
            userData = user;
            break;
        }
    }
    
    if (userId && userData.password === hashPassword(password)) {
        req.session.user_id = userId;
        req.session.user_name = userData.full_name;
        req.session.user_role = userData.role || 'student';
        
        res.json({
            success: true,
            redirect: '/dashboard'
        });
    } else {
        res.json({
            success: false,
            message: 'کد ملی یا رمز عبور اشتباه است!'
        });
    }
});

// صفحه ثبت‌نام
app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

app.post('/register', (req, res) => {
    const { national_id, full_name, phone, password, user_type } = req.body;
    const users = loadJsonData(USERS_FILE);
    const registration = loadJsonData(REGISTRATION_FILE);
    
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
    const hashedPassword = hashPassword(password);
    
    const newUser = {
        national_id,
        full_name,
        first_name: full_name.split(' ')[0],
        phone,
        password: hashedPassword,
        role: user_type || 'quran_student',
        user_type: user_type || 'quran_student',
        registration_date: new Date().toISOString()
    };
    
    users[userId] = newUser;
    registration[userId] = newUser; // همگام‌سازی با ربات
    
    if (saveJsonData(USERS_FILE, users) && saveJsonData(REGISTRATION_FILE, registration)) {
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

// داشبورد
app.get('/dashboard', requireAuth, (req, res) => {
    const users = loadJsonData(USERS_FILE);
    const classes = loadJsonData(CLASSES_FILE);
    const workshops = loadJsonData(WORKSHOPS_FILE);
    
    const totalStudents = Object.values(users).filter(u => u.role === 'quran_student').length;
    const totalTeachers = Object.values(users).filter(u => ['teacher', 'admin'].includes(u.role)).length;
    const totalClasses = Object.keys(classes).length;
    const totalWorkshops = Object.keys(workshops).length;
    
    res.render('dashboard', {
        user: {
            id: req.session.user_id,
            name: req.session.user_name,
            role: req.session.user_role
        },
        stats: {
            total_students: totalStudents,
            total_teachers: totalTeachers,
            total_classes: totalClasses,
            total_workshops: totalWorkshops
        }
    });
});

// کلاس‌ها
app.get('/classes', requireAuth, (req, res) => {
    const classes = loadJsonData(CLASSES_FILE);
    res.render('classes', {
        user: {
            id: req.session.user_id,
            name: req.session.user_name,
            role: req.session.user_role
        },
        classes: Object.values(classes)
    });
});

// کارنامه
app.get('/report-card', requireAuth, (req, res) => {
    const users = loadJsonData(USERS_FILE);
    const user = users[req.session.user_id];
    
    res.render('report-card', {
        user: {
            id: req.session.user_id,
            name: req.session.user_name,
            role: req.session.user_role
        },
        report_data: user || {}
    });
});

// پنل مدیریت
app.get('/admin', requireAdmin, (req, res) => {
    const users = loadJsonData(USERS_FILE);
    const classes = loadJsonData(CLASSES_FILE);
    const workshops = loadJsonData(WORKSHOPS_FILE);
    
    res.render('admin', {
        user: {
            id: req.session.user_id,
            name: req.session.user_name,
            role: req.session.user_role
        },
        users: Object.values(users),
        classes: Object.values(classes),
        workshops: Object.values(workshops)
    });
});

// API Routes
app.get('/api/users', requireAdmin, (req, res) => {
    const users = loadJsonData(USERS_FILE);
    res.json(users);
});

app.get('/api/stats', requireAuth, (req, res) => {
    const users = loadJsonData(USERS_FILE);
    const classes = loadJsonData(CLASSES_FILE);
    const workshops = loadJsonData(WORKSHOPS_FILE);
    
    const stats = {
        total_users: Object.keys(users).length,
        total_students: Object.values(users).filter(u => u.role === 'quran_student').length,
        total_teachers: Object.values(users).filter(u => ['teacher', 'admin'].includes(u.role)).length,
        total_classes: Object.keys(classes).length,
        total_workshops: Object.keys(workshops).length
    };
    
    res.json(stats);
});

// خروج
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('خطا در خروج:', err);
        }
        res.redirect('/');
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('خطای سرور!');
});

app.use((req, res) => {
    res.status(404).render('404', {
        user: req.session.user_id ? {
            id: req.session.user_id,
            name: req.session.user_name,
            role: req.session.user_role
        } : null
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🌐 سرور سایت مدرسه تلاوت روی پورت ${PORT} راه‌اندازی شد`);
    console.log(`🔗 آدرس سایت: http://localhost:${PORT}`);
    console.log('📊 فایل‌های JSON در روت پروژه قرار دارند');
    console.log('🤖 دیتا با ربات همگام‌سازی شده است');
});

module.exports = app;
