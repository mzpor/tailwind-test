// ===== ماژول مدیریت استادها و کارگاه‌ها =====
// ⏰ 1404/05/15 ساعت 23:45
// مدیریت لیست مربی‌ها و ثبت‌نام شده‌ها در کارگاه‌ها

const path = require('path');
const fs = require('fs');

// فایل‌های مورد نیاز
const WORKSHOPS_FILE = path.join(__dirname, 'data', 'workshops.json');
const REGISTRATION_FILE = path.join(__dirname, 'data', 'smart_registration.json');
const ATTENDANCE_FILE = path.join(__dirname, 'data', 'attendance_data.json');

// ===== ساختار داده‌ها =====

// تابع بارگذاری مربی‌ها از workshops.json
const loadCoaches = () => {
  try {
    if (fs.existsSync(WORKSHOPS_FILE)) {
      const data = fs.readFileSync(WORKSHOPS_FILE, 'utf8');
      const workshops = JSON.parse(data);
      
      // تبدیل ساختار workshops به لیست مربی‌ها
      const coaches = [];
      if (workshops.coach) {
        Object.entries(workshops.coach).forEach(([id, coach]) => {
          coaches.push({
            id: id,
            name: coach.name,
            phone: coach.phone,
            cost: coach.cost,
            link: coach.link,
            description: coach.description,
            capacity: coach.capacity,
            duration: coach.duration,
            level: coach.level
          });
        });
      }
      
      console.log(`✅ [OSATD] Loaded ${coaches.length} coaches from workshops.json`);
      return coaches;
    }
  } catch (error) {
    console.error('❌ [OSATD] Error loading coaches from workshops:', error);
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
        if (userState.data && 
            userState.data.userRole === 'quran_student' && 
            userState.data.coachId === coach.id &&
            userState.data.paymentStatus === 'paid') {
          // فقط دانشجویانی که در این کارگاه ثبت‌نام کرده‌اند و پرداخت کرده‌اند
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
    console.log(`🔍 [OSATD] getCoachStudents called with coachId=${coachId}`);
    
    const registrations = loadRegistrations();
    const attendance = loadAttendance();
    
    const students = [];
    
    Object.entries(registrations.userStates).forEach(([userId, userState]) => {
      if (userState.data && 
          userState.data.userRole === 'quran_student' && 
          userState.data.coachId === coachId &&
          userState.data.paymentStatus === 'paid') {
        // فقط دانشجویانی که در این کارگاه ثبت‌نام کرده‌اند و پرداخت کرده‌اند
        const attendanceStatus = attendance[userId] || 'حاضر';
        
        students.push({
          id: userId,
          name: userState.data.fullName || userState.data.firstName || `دانشجو ${userId}`,
          phone: userState.data.phone || '',
          workshopId: userState.data.workshopId || '',
          month: userState.data.month || '',
          attendance: attendanceStatus,
          registrationDate: userState.timestamp
        });
      }
    });
    
    console.log(`✅ [OSATD] Found ${students.length} students for coach ${coachId}`);
    console.log(`🔍 [OSATD] Students:`, students.map(s => `${s.name} (${s.id})`));
    
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

// تابع تغییر وضعیت حضور و غیاب همه دانشجویان یک مربی
const updateAllStudentsAttendance = (coachId, status) => {
  try {
    console.log(`🔍 [OSATD] updateAllStudentsAttendance called with coachId=${coachId}, status=${status}`);
    
    const students = getCoachStudents(coachId);
    const attendance = loadAttendance();
    let updatedCount = 0;
    
    console.log(`🔍 [OSATD] Found ${students.length} students for coach ${coachId}`);
    
    students.forEach(student => {
      console.log(`🔍 [OSATD] Updating student ${student.id} (${student.name}) to status: ${status}`);
      attendance[student.id] = status;
      updatedCount++;
    });
    
    if (saveAttendance(attendance)) {
      console.log(`✅ [OSATD] Updated attendance status for ${updatedCount} students of coach ${coachId}: ${status}`);
      return { success: true, message: `وضعیت حضور و غیاب ${updatedCount} دانشجو با موفقیت به‌روزرسانی شد` };
    } else {
      return { success: false, message: 'خطا در ذخیره وضعیت حضور و غیاب' };
    }
    
  } catch (error) {
    console.error('❌ [OSATD] Error updating all students attendance:', error);
    return { success: false, message: 'خطا در به‌روزرسانی وضعیت حضور و غیاب همه دانشجویان' };
  }
};

// تابع دریافت گزارش حضور و غیاب
const getAttendanceReport = (coachId) => {
  try {
    const students = getCoachStudents(coachId);
    
    const report = {
      total: students.length,
      present: students.filter(s => s.attendance === 'حاضر').length,
      late: students.filter(s => s.attendance === 'حضور با تاخیر').length,
      absent: students.filter(s => s.attendance === 'غایب').length,
      excused: students.filter(s => s.attendance === 'غیبت(موجه)').length,
      pending: students.filter(s => s.attendance === 'در انتظار').length,
      students: students
    };
    
    console.log(`✅ [OSATD] Generated attendance report for coach ${coachId}`);
    return report;
    
  } catch (error) {
    console.error('❌ [OSATD] Error getting attendance report:', error);
    return { total: 0, present: 0, late: 0, absent: 0, excused: 0, pending: 0, students: [] };
  }
};

// تابع تولید کیبرد گزارش حضور و غیاب
const generateReportKeyboard = (coachId) => {
  try {
    const keyboard = [
      [{ text: '🔙 بازگشت به لیست دانشجویان', callback_data: `coach_${coachId}` }]
    ];
    
    console.log(`✅ [OSATD] Generated report keyboard for coach ${coachId}`);
    return keyboard;
    
  } catch (error) {
    console.error('❌ [OSATD] Error generating report keyboard:', error);
    return [[{ text: '❌ خطا در بارگذاری کیبرد گزارش', callback_data: 'error_report' }]];
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
    
    const keyboard = [];
    
    // لیست دانشجویان (اول) - با coachId در callback
    students.forEach((student, index) => {
      const statusEmoji = {
        'حاضر': '✅',
        'حضور با تاخیر': '⏰',
        'غایب': '❌',
        'غیبت(موجه)': '📄',
        'در انتظار': '⏳'
      }[student.attendance] || '❓';
      
      const text = `${index + 1}. ${student.name} ${statusEmoji}`;
      keyboard.push([{ text: text, callback_data: `student_${student.id}_${coachId}` }]);
    });
    
    // دکمه‌های عملیات سریع - همه وضعیت‌ها (بعد از دانشجویان)
    keyboard.push([
      { text: '✅ حاضر همه', callback_data: `attendance_all_${coachId}_حاضر` },
      { text: '⏰ تاخیر همه', callback_data: `attendance_all_${coachId}_حضور با تاخیر` }
    ]);
    keyboard.push([
      { text: '❌ غایب همه', callback_data: `attendance_all_${coachId}_غایب` },
      { text: '📄 موجه همه', callback_data: `attendance_all_${coachId}_غیبت(موجه)` }
    ]);
    keyboard.push([
      { text: '⏳ انتظار همه', callback_data: `attendance_all_${coachId}_در انتظار` }
    ]);
    
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
const generateAttendanceKeyboard = (studentId, coachId) => {
  try {
    const attendance = loadAttendance();
    const currentStatus = attendance[studentId] || 'حاضر';
    
    const keyboard = [
      [{ text: '✅ حاضر', callback_data: `attendance_${studentId}_حاضر` }],
      [{ text: '⏰ حضور با تاخیر', callback_data: `attendance_${studentId}_حضور با تاخیر` }],
      [{ text: '❌ غایب', callback_data: `attendance_${studentId}_غایب` }],
      [{ text: '📄 غیبت(موجه)', callback_data: `attendance_${studentId}_غیبت(موجه)` }],
      [{ text: '⏳ در انتظار', callback_data: `attendance_${studentId}_در انتظار` }],
      [{ text: '🔙 بازگشت', callback_data: `back_to_students_${coachId}` }]
    ];
    
    console.log(`✅ [OSATD] Generated attendance keyboard for student ${studentId} with coachId ${coachId}`);
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
      const { getRoleDisplayName } = require('./3config');
      const keyboard = generateCoachesKeyboard();
      const text = `👨‍🏫 *لیست ${getRoleDisplayName('COACH')}‌ها و کارگاه‌ها*\n\n${getRoleDisplayName('COACH')} مورد نظر خود را انتخاب کنید:`;
      
      return { text, keyboard, parse_mode: 'Markdown' };
      
    } else if (data.startsWith('coach_')) {
      // نمایش دانشجویان یک مربی
      const { getRoleDisplayName } = require('./3config');
      const coachId = data.replace('coach_', '');
      const keyboard = generateStudentsKeyboard(coachId);
      const text = `📚 *${getRoleDisplayName('STUDENT')}ان این ${getRoleDisplayName('COACH')}*\n\n${getRoleDisplayName('STUDENT')} مورد نظر خود را انتخاب کنید:`;
      
      return { text, keyboard, parse_mode: 'Markdown' };
      
    } else if (data.startsWith('student_')) {
      // نمایش کیبرد حضور و غیاب برای دانشجو
      const parts = data.split('_');
      const studentId = parts[1];
      
      // ساخت مجدد coachId از parts
      let coachId = null;
      if (parts.length >= 5) {
        // student_1790308237_phone_1755212603854_ga1njd27g
        // parts[0] = student
        // parts[1] = 1790308237 (studentId)
        // parts[2] = phone (نوع)
        // parts[3] = 1755212603854 (شماره)
        // parts[4] = ga1njd27g (شناسه)
        coachId = `${parts[2]}_${parts[3]}_${parts[4]}`;
      }
      
      if (!coachId) {
        // اگر coachId ساخته نشد، از coaches.json استفاده می‌کنیم
        const coaches = loadCoaches();
        if (coaches.length > 0) {
          coachId = coaches[0].id;
        }
      }
      
      const keyboard = generateAttendanceKeyboard(studentId, coachId);
      const text = '📝 *تغییر وضعیت حضور و غیاب*\n\nوضعیت جدید را انتخاب کنید:';
      
      return { text, keyboard, parse_mode: 'Markdown' };
      
    } else if (data.startsWith('attendance_') && !data.startsWith('attendance_all_')) {
      // تغییر وضعیت حضور و غیاب یک دانشجو
      const parts = data.split('_');
      const studentId = parts[1];
      const status = parts[2];
      
      const result = updateAttendanceStatus(studentId, status);
      
      if (result.success) {
        // پس از تغییر وضعیت، لیست دانشجویان را دوباره نمایش دهیم
        // coachId را از callback data قبلی دریافت می‌کنیم
        // فعلاً از coaches.json استفاده می‌کنیم
        const coaches = loadCoaches();
        let coachId = null;
        
        if (coaches.length > 0) {
          coachId = coaches[0].id; // فعلاً اولین مربی را در نظر می‌گیریم
        }
        
        if (coachId) {
          const keyboard = generateStudentsKeyboard(coachId);
          const { getRoleDisplayName } = require('./3config');
          const text = `✅ *وضعیت حضور و غیاب به‌روزرسانی شد*\n\n${getRoleDisplayName('STUDENT')}: ${studentId}\nوضعیت جدید: ${status}\n\n📚 *${getRoleDisplayName('STUDENT')}ان این ${getRoleDisplayName('COACH')}*\n\n${getRoleDisplayName('STUDENT')} مورد نظر خود را انتخاب کنید:`;
          
          return { text, keyboard, parse_mode: 'Markdown' };
        } else {
          const text = `✅ *وضعیت حضور و غیاب به‌روزرسانی شد*\n\nدانشجو: ${studentId}\nوضعیت جدید: ${status}`;
          return { text, parse_mode: 'Markdown' };
        }
      } else {
        const text = `❌ *خطا در به‌روزرسانی*\n\n${result.message}`;
        return { text, parse_mode: 'Markdown' };
      }
      
         } else if (data.startsWith('attendance_all_')) {
       // تغییر وضعیت حضور و غیاب همه دانشجویان
       const parts = data.split('_');
       // فرمت جدید: attendance_all_3_حاضر
       // parts[0] = attendance
       // parts[1] = all
       // parts[2] = 3 (coachId)
       // parts[3] = حاضر (وضعیت)
       
       if (parts.length >= 4) {
         const coachId = parts[2];
         const status = parts[3];
         
         console.log(`🔍 [OSATD] Parsing attendance_all_: coachId=${coachId}, status=${status}`);
         console.log(`🔍 [OSATD] Parts:`, parts);
         
         const result = updateAllStudentsAttendance(coachId, status);
         
         if (result.success) {
           // پس از تغییر وضعیت، لیست دانشجویان را دوباره نمایش دهیم
           const keyboard = generateStudentsKeyboard(coachId);
           const { getRoleDisplayName } = require('./3config');
           const text = `✅ *وضعیت حضور و غیاب همه ${getRoleDisplayName('STUDENT')}ان به‌روزرسانی شد*\n\nوضعیت جدید: ${status}\n${result.message}\n\n📚 *${getRoleDisplayName('STUDENT')}ان این ${getRoleDisplayName('COACH')}*\n\n${getRoleDisplayName('STUDENT')} مورد نظر خود را انتخاب کنید:`;
           
           return { text, keyboard, parse_mode: 'Markdown' };
         } else {
           const text = `❌ *خطا در به‌روزرسانی*\n\n${result.message}`;
           return { text, parse_mode: 'Markdown' };
         }
       } else {
         console.error(`❌ [OSATD] Invalid attendance_all_ callback data: ${data}, parts:`, parts);
         const text = '❌ *خطا در پردازش درخواست*\n\nفرمت callback data نامعتبر است';
         return { text, parse_mode: 'Markdown' };
       }
      
    } else if (data.startsWith('report_')) {
      // نمایش گزارش حضور و غیاب
      const coachId = data.replace('report_', '');
      const report = getAttendanceReport(coachId);
      
      // دریافت نام مربی
      const { getRoleDisplayName } = require('./3config');
      const coaches = loadCoaches();
      const coach = coaches.find(c => c.id === coachId);
      const coachName = coach ? coach.name : getRoleDisplayName('COACH');
      
      const text = `📊 *گزارش حضور و غیاب - ${coachName}*\n\n` +
        `📝 *لیست ${getRoleDisplayName('STUDENT')}ان:*\n` +
        report.students.map((student, index) => {
          const statusEmoji = {
            'حاضر': '✅',
            'حضور با تاخیر': '⏰',
            'غایب': '❌',
            'غیبت(موجه)': '📄',
            'در انتظار': '⏳'
          }[student.attendance] || '❓';
          
          return `${index + 1}. ${student.name} - ${statusEmoji} ${student.attendance}`;
        }).join('\n') + `\n👥 *کل ${getRoleDisplayName('STUDENT')}ان:* ${report.total}\n\n` +
        `📈 *آمار:*\n` +
        `✅ حاضر: ${report.present}\n` +
        `⏰ حضور با تاخیر: ${report.late}\n` +
        `❌ غایب: ${report.absent}\n` +
        `📄 غیبت(موجه): ${report.excused}\n` +
        `⏳ در انتظار: ${report.pending}\n\n\n` +
        `🗓️ *آخرین بروزرسانی:* ${new Date().toLocaleDateString('fa-IR')} ساعت ${new Date().toLocaleTimeString('fa-IR')}`;
      
      const keyboard = generateReportKeyboard(coachId);
      return { text, keyboard, parse_mode: 'Markdown' };
      
    } else if (data === 'back_to_coaches') {
      // بازگشت به لیست مربی‌ها
      const { getRoleDisplayName } = require('./3config');
      const keyboard = generateCoachesKeyboard();
      const text = `👨‍🏫 *لیست ${getRoleDisplayName('COACH')}‌ها و کارگاه‌ها*\n\n${getRoleDisplayName('COACH')} مورد نظر خود را انتخاب کنید:`;
      
      return { text, keyboard, parse_mode: 'Markdown' };
      
    } else if (data === 'back_to_workshops') {
      // بازگشت به منوی کارگاه‌ها
      return { text: '🔙 بازگشت به منوی کارگاه‌ها' };
      
    } else if (data.startsWith('back_to_students_')) {
      // بازگشت به لیست دانشجویان
      const coachId = data.replace('back_to_students_', '');
      
      if (coachId) {
        const { getRoleDisplayName } = require('./3config');
        const keyboard = generateStudentsKeyboard(coachId);
        const text = `📚 *${getRoleDisplayName('STUDENT')}ان این ${getRoleDisplayName('COACH')}*\n\n${getRoleDisplayName('STUDENT')} مورد نظر خود را انتخاب کنید:`;
        
        return { text, keyboard, parse_mode: 'Markdown' };
      } else {
        // اگر coachId پیدا نشد، به لیست مربی‌ها برمی‌گردیم
        const { getRoleDisplayName } = require('./3config');
        const keyboard = generateCoachesKeyboard();
        const text = `👨‍🏫 *لیست ${getRoleDisplayName('COACH')}‌ها و کارگاه‌ها*\n\n${getRoleDisplayName('COACH')} مورد نظر خود را انتخاب کنید:`;
        
        return { text, keyboard, parse_mode: 'Markdown' };
      }
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
  updateAllStudentsAttendance,
  getAttendanceReport,
  
  // توابع تولید کیبرد
  generateCoachesKeyboard,
  generateStudentsKeyboard,
  generateAttendanceKeyboard,
  generateReportKeyboard,
  
  // تابع مدیریت callback
  handleCoachesCallback,
  
  // توابع کمکی
  loadCoaches,
  loadRegistrations,
  loadAttendance,
  saveAttendance
};