// ===== ماژول مدیریت استادها و کارگاه‌ها =====
// ⏰ 1404/05/15 ساعت 23:45
// مدیریت لیست مربی‌ها و ثبت‌نام شده‌ها در کارگاه‌ها

const path = require('path');
const fs = require('fs');

// فایل‌های مورد نیاز
const COACHES_FILE = path.join(__dirname, 'data', 'coaches.json');
const REGISTRATION_FILE = path.join(__dirname, 'data', 'smart_registration.json');
const ATTENDANCE_FILE = path.join(__dirname, 'data', 'attendance_data.json');

// ===== ساختار داده‌ها =====

// تابع بارگذاری مربی‌ها
const loadCoaches = () => {
  try {
    if (fs.existsSync(COACHES_FILE)) {
      const data = fs.readFileSync(COACHES_FILE, 'utf8');
      const coaches = JSON.parse(data);
      console.log(`✅ [OSATD] Loaded ${coaches.length} coaches from file`);
      return coaches;
    }
  } catch (error) {
    console.error('❌ [OSATD] Error loading coaches:', error);
  }
  return [];
};

// تابع بارگذاری ثبت‌نام‌ها
const loadRegistrations = () => {
  try {
    if (fs.existsSync(REGISTRATION_FILE)) {
      const data = fs.readFileSync(REGISTRATION_FILE, 'utf8');
      const registrations = JSON.parse(data);
      console.log(`✅ [OSATD] Loaded registrations from file`);
      return registrations;
    }
  } catch (error) {
    console.error('❌ [OSATD] Error loading registrations:', error);
  }
  return { userStates: {} };
};

// تابع بارگذاری حضور و غیاب
const loadAttendance = () => {
  try {
    if (fs.existsSync(ATTENDANCE_FILE)) {
      const data = fs.readFileSync(ATTENDANCE_FILE, 'utf8');
      const attendance = JSON.parse(data);
      console.log(`✅ [OSATD] Loaded attendance data from file`);
      return attendance;
    }
  } catch (error) {
    console.error('❌ [OSATD] Error loading attendance:', error);
  }
  return {};
};

// تابع ذخیره حضور و غیاب
const saveAttendance = (attendanceData) => {
  try {
    const dataDir = path.dirname(ATTENDANCE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(attendanceData, null, 2), 'utf8');
    console.log('✅ [OSATD] Attendance data saved successfully');
    return true;
  } catch (error) {
    console.error('❌ [OSATD] Error saving attendance data:', error);
    return false;
  }
};

// ===== توابع اصلی =====

// تابع دریافت لیست مربی‌ها با تعداد ثبت‌نام شده‌ها
const getCoachesList = () => {
  try {
    const coaches = loadCoaches();
    const registrations = loadRegistrations();
    
    const coachesList = coaches.map(coach => {
      // شمارش تعداد ثبت‌نام شده‌ها برای این مربی
      let studentCount = 0;
      
      Object.values(registrations.userStates).forEach(userState => {
        if (userState.data && userState.data.userRole === 'quran_student') {
          // اگر کاربر قرآن‌آموز است، به عنوان دانشجوی این مربی در نظر بگیر
          studentCount++;
        }
      });
      
      return {
        id: coach.id,
        name: coach.name,
        phone: coach.phone,
        studentCount: studentCount
      };
    });
    
    console.log(`✅ [OSATD] Generated coaches list with ${coachesList.length} coaches`);
    return coachesList;
    
  } catch (error) {
    console.error('❌ [OSATD] Error getting coaches list:', error);
    return [];
  }
};

// تابع دریافت لیست دانشجویان یک مربی
const getCoachStudents = (coachId) => {
  try {
    const registrations = loadRegistrations();
    const attendance = loadAttendance();
    
    const students = [];
    
    Object.entries(registrations.userStates).forEach(([userId, userState]) => {
      if (userState.data && userState.data.userRole === 'quran_student') {
        // دریافت وضعیت حضور و غیاب
        const attendanceStatus = attendance[userId] || 'حاضر';
        
        students.push({
          id: userId,
          name: userState.data.fullName || userState.data.firstName || `دانشجو ${userId}`,
          phone: userState.data.phone || '',
          attendance: attendanceStatus,
          registrationDate: userState.timestamp
        });
      }
    });
    
    console.log(`✅ [OSATD] Found ${students.length} students for coach ${coachId}`);
    return students;
    
  } catch (error) {
    console.error('❌ [OSATD] Error getting coach students:', error);
    return [];
  }
};

// تابع تغییر وضعیت حضور و غیاب
const updateAttendanceStatus = (studentId, status) => {
  try {
    const attendance = loadAttendance();
    
    attendance[studentId] = status;
    
    if (saveAttendance(attendance)) {
      console.log(`✅ [OSATD] Updated attendance status for student ${studentId}: ${status}`);
      return { success: true, message: 'وضعیت حضور و غیاب با موفقیت به‌روزرسانی شد' };
    } else {
      return { success: false, message: 'خطا در ذخیره وضعیت حضور و غیاب' };
    }
    
  } catch (error) {
    console.error('❌ [OSATD] Error updating attendance status:', error);
    return { success: false, message: 'خطا در به‌روزرسانی وضعیت حضور و غیاب' };
  }
};

// تابع دریافت گزارش حضور و غیاب
const getAttendanceReport = (coachId) => {
  try {
    const students = getCoachStudents(coachId);
    
    const report = {
      total: students.length,
      present: students.filter(s => s.attendance === 'حاضر').length,
      absent: students.filter(s => s.attendance === 'غایب').length,
      excused: students.filter(s => s.attendance === 'غایب(موجه)').length,
      late: students.filter(s => s.attendance === 'حاضر(با تاخیر)').length,
      students: students
    };
    
    console.log(`✅ [OSATD] Generated attendance report for coach ${coachId}`);
    return report;
    
  } catch (error) {
    console.error('❌ [OSATD] Error getting attendance report:', error);
    return { total: 0, present: 0, absent: 0, excused: 0, late: 0, students: [] };
  }
};

// ===== تولید کیبردها =====

// تابع تولید کیبرد لیست مربی‌ها
const generateCoachesKeyboard = () => {
  try {
    const coaches = getCoachesList();
    
    if (coaches.length === 0) {
      return [[{ text: '⚠️ هیچ مربی‌ای یافت نشد', callback_data: 'no_coaches' }]];
    }
    
    const keyboard = coaches.map((coach, index) => {
      const text = `${index + 1}. ${coach.name} (${coach.studentCount} قرآن آموز)`;
      return [{ text: text, callback_data: `coach_${coach.id}` }];
    });
    
    // دکمه بازگشت
    keyboard.push([{ text: '🔙 بازگشت', callback_data: 'back_to_workshops' }]);
    
    console.log(`✅ [OSATD] Generated coaches keyboard with ${coaches.length} coaches`);
    return keyboard;
    
  } catch (error) {
    console.error('❌ [OSATD] Error generating coaches keyboard:', error);
    return [[{ text: '❌ خطا در بارگذاری مربی‌ها', callback_data: 'error_coaches' }]];
  }
};

// تابع تولید کیبرد دانشجویان یک مربی
const generateStudentsKeyboard = (coachId) => {
  try {
    const students = getCoachStudents(coachId);
    
    if (students.length === 0) {
      return [
        [{ text: '⚠️ هیچ دانشجویی برای این مربی یافت نشد', callback_data: 'no_students' }],
        [{ text: '🔙 بازگشت به لیست مربی‌ها', callback_data: 'back_to_coaches' }]
      ];
    }
    
    const keyboard = students.map((student, index) => {
      const statusEmoji = {
        'حاضر': '✅',
        'غایب': '❌',
        'غایب(موجه)': '⚠️',
        'حاضر(با تاخیر)': '⏰'
      }[student.attendance] || '❓';
      
      const text = `${index + 1}. ${student.name} ${statusEmoji}`;
      return [{ text: text, callback_data: `student_${student.id}` }];
    });
    
    // دکمه‌های عملیات
    keyboard.push([
      { text: '📊 گزارش حضور و غیاب', callback_data: `report_${coachId}` },
      { text: '🔙 بازگشت به لیست مربی‌ها', callback_data: 'back_to_coaches' }
    ]);
    
    console.log(`✅ [OSATD] Generated students keyboard for coach ${coachId} with ${students.length} students`);
    return keyboard;
    
  } catch (error) {
    console.error('❌ [OSATD] Error generating students keyboard:', error);
    return [[{ text: '❌ خطا در بارگذاری دانشجویان', callback_data: 'error_students' }]];
  }
};

// تابع تولید کیبرد وضعیت حضور و غیاب
const generateAttendanceKeyboard = (studentId) => {
  try {
    const attendance = loadAttendance();
    const currentStatus = attendance[studentId] || 'حاضر';
    
    const keyboard = [
      [{ text: '✅ حاضر', callback_data: `attendance_${studentId}_حاضر` }],
      [{ text: '❌ غایب', callback_data: `attendance_${studentId}_غایب` }],
      [{ text: '⚠️ غایب(موجه)', callback_data: `attendance_${studentId}_غایب(موجه)` }],
      [{ text: '⏰ حاضر(با تاخیر)', callback_data: `attendance_${studentId}_حاضر(با تاخیر)` }],
      [{ text: '🔙 بازگشت', callback_data: `back_to_students_${studentId}` }]
    ];
    
    console.log(`✅ [OSATD] Generated attendance keyboard for student ${studentId}`);
    return keyboard;
    
  } catch (error) {
    console.error('❌ [OSATD] Error generating attendance keyboard:', error);
    return [[{ text: '❌ خطا در بارگذاری کیبرد حضور و غیاب', callback_data: 'error_attendance' }]];
  }
};

// ===== مدیریت callback ها =====

// تابع مدیریت callback های استادها
const handleCoachesCallback = async (callbackQuery) => {
  try {
    const { data } = callbackQuery;
    
    if (data === 'coaches_list') {
      // نمایش لیست مربی‌ها
      const keyboard = generateCoachesKeyboard();
      const text = '👨‍🏫 *لیست مربی‌ها و کارگاه‌ها*\n\nمربی مورد نظر خود را انتخاب کنید:';
      
      return { text, keyboard, parse_mode: 'Markdown' };
      
    } else if (data.startsWith('coach_')) {
      // نمایش دانشجویان یک مربی
      const coachId = data.replace('coach_', '');
      const keyboard = generateStudentsKeyboard(coachId);
      const text = '📚 *دانشجویان این مربی*\n\nدانشجوی مورد نظر خود را انتخاب کنید:';
      
      return { text, keyboard, parse_mode: 'Markdown' };
      
    } else if (data.startsWith('student_')) {
      // نمایش کیبرد حضور و غیاب برای دانشجو
      const studentId = data.replace('student_', '');
      const keyboard = generateAttendanceKeyboard(studentId);
      const text = '📝 *تغییر وضعیت حضور و غیاب*\n\nوضعیت جدید را انتخاب کنید:';
      
      return { text, keyboard, parse_mode: 'Markdown' };
      
    } else if (data.startsWith('attendance_')) {
      // تغییر وضعیت حضور و غیاب
      const parts = data.split('_');
      const studentId = parts[1];
      const status = parts[2];
      
      const result = updateAttendanceStatus(studentId, status);
      
      if (result.success) {
        const text = `✅ *وضعیت حضور و غیاب به‌روزرسانی شد*\n\nدانشجو: ${studentId}\nوضعیت جدید: ${status}`;
        return { text, parse_mode: 'Markdown' };
      } else {
        const text = `❌ *خطا در به‌روزرسانی*\n\n${result.message}`;
        return { text, parse_mode: 'Markdown' };
      }
      
    } else if (data.startsWith('report_')) {
      // نمایش گزارش حضور و غیاب
      const coachId = data.replace('report_', '');
      const report = getAttendanceReport(coachId);
      
      const text = `📊 *گزارش حضور و غیاب*\n\n` +
        `👥 کل دانشجویان: ${report.total}\n` +
        `✅ حاضر: ${report.present}\n` +
        `❌ غایب: ${report.absent}\n` +
        `⚠️ غایب(موجه): ${report.excused}\n` +
        `⏰ حاضر(با تاخیر): ${report.late}`;
      
      return { text, parse_mode: 'Markdown' };
      
    } else if (data === 'back_to_coaches') {
      // بازگشت به لیست مربی‌ها
      const keyboard = generateCoachesKeyboard();
      const text = '👨‍🏫 *لیست مربی‌ها و کارگاه‌ها*\n\nمربی مورد نظر خود را انتخاب کنید:';
      
      return { text, keyboard, parse_mode: 'Markdown' };
      
    } else if (data === 'back_to_workshops') {
      // بازگشت به منوی کارگاه‌ها
      return { text: '🔙 بازگشت به منوی کارگاه‌ها', callback_data: 'back_to_workshops' };
      
    } else if (data.startsWith('back_to_students_')) {
      // بازگشت به لیست دانشجویان
      const studentId = data.replace('back_to_students_', '');
      // اینجا باید coachId را از context دریافت کنیم
      // فعلاً به لیست مربی‌ها برمی‌گردانیم
      const keyboard = generateCoachesKeyboard();
      const text = '👨‍🏫 *لیست مربی‌ها و کارگاه‌ها*\n\nمربی مورد نظر خود را انتخاب کنید:';
      
      return { text, keyboard, parse_mode: 'Markdown' };
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ [OSATD] Error handling coaches callback:', error);
    return { text: '❌ خطا در پردازش درخواست', parse_mode: 'Markdown' };
  }
};

// ===== export توابع =====

module.exports = {
  // توابع اصلی
  getCoachesList,
  getCoachStudents,
  updateAttendanceStatus,
  getAttendanceReport,
  
  // توابع تولید کیبرد
  generateCoachesKeyboard,
  generateStudentsKeyboard,
  generateAttendanceKeyboard,
  
  // تابع مدیریت callback
  handleCoachesCallback,
  
  // توابع کمکی
  loadCoaches,
  loadRegistrations,
  loadAttendance,
  saveAttendance
};
