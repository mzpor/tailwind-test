// تنظیمات
const ADMIN_ID = 0; // مدیر مدرسه (شماره 0)
let isAdminLoggedIn = false;

// نمایش اعلان
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// بررسی مدیر
function checkAdmin() {
    const adminIdInput = document.getElementById('adminId');
    const adminStatus = document.getElementById('adminStatus');
    const adminPanel = document.getElementById('adminPanel');
    
    const enteredId = parseInt(adminIdInput.value);
    
    if (enteredId === ADMIN_ID) {
        isAdminLoggedIn = true;
        adminStatus.textContent = '✅ احراز هویت موفق! خوش آمدید مدیر عزیز';
        adminStatus.className = 'status success';
        adminPanel.style.display = 'block';
        loadSettings();
        showNotification('خوش آمدید مدیر عزیز! 👋', 'success');
    } else {
        adminStatus.textContent = '❌ شماره ID اشتباه است';
        adminStatus.className = 'status error';
        adminPanel.style.display = 'none';
        showNotification('شماره ID اشتباه است!', 'error');
    }
}

// لود کردن تنظیمات
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        
        // پر کردن فرم
        document.getElementById('schoolName').value = settings.schoolName || '';
        document.getElementById('registrationOpen').value = settings.registrationOpen.toString();
        document.getElementById('maxStudents').value = settings.maxStudents || 100;
        document.getElementById('adminMessage').value = settings.adminMessage || '';
        
        // نمایش وضعیت فعلی
        updateStatusDisplay(settings);
        
    } catch (error) {
        console.error('خطا در لود کردن تنظیمات:', error);
        showNotification('خطا در لود کردن تنظیمات', 'error');
    }
}

// بروزرسانی نمایش وضعیت
function updateStatusDisplay(settings) {
    const statusDisplay = document.getElementById('currentStatus');
    
    const statusHTML = `
        <p><strong>🏫 نام مدرسه:</strong> ${settings.schoolName}</p>
        <p><strong>📝 وضعیت ثبت‌نام:</strong> ${settings.registrationOpen ? '✅ باز' : '❌ بسته'}</p>
        <p><strong>👥 حداکثر دانش‌آموز:</strong> ${settings.maxStudents}</p>
        <p><strong>💬 پیام مدیر:</strong> ${settings.adminMessage}</p>
        <p><strong>⏰ آخرین بروزرسانی:</strong> ${new Date().toLocaleString('fa-IR')}</p>
    `;
    
    statusDisplay.innerHTML = statusHTML;
}

// ذخیره تنظیمات
async function saveSettings() {
    if (!isAdminLoggedIn) {
        showNotification('لطفاً ابتدا وارد شوید', 'error');
        return;
    }
    
    const settings = {
        schoolName: document.getElementById('schoolName').value,
        registrationOpen: document.getElementById('registrationOpen').value === 'true',
        maxStudents: parseInt(document.getElementById('maxStudents').value),
        adminMessage: document.getElementById('adminMessage').value
    };
    
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ تنظیمات با موفقیت ذخیره شد!', 'success');
            updateStatusDisplay(settings);
        } else {
            showNotification('❌ خطا در ذخیره تنظیمات', 'error');
        }
        
    } catch (error) {
        console.error('خطا در ذخیره تنظیمات:', error);
        showNotification('❌ خطا در ذخیره تنظیمات', 'error');
    }
}

// بروزرسانی وضعیت
async function refreshStatus() {
    if (!isAdminLoggedIn) {
        showNotification('لطفاً ابتدا وارد شوید', 'error');
        return;
    }
    
    try {
        await loadSettings();
        showNotification('🔄 وضعیت بروزرسانی شد', 'success');
    } catch (error) {
        showNotification('❌ خطا در بروزرسانی وضعیت', 'error');
    }
}

// بازنشانی تنظیمات
async function resetSettings() {
    if (!isAdminLoggedIn) {
        showNotification('لطفاً ابتدا وارد شوید', 'error');
        return;
    }
    
    if (!confirm('آیا مطمئن هستید که می‌خواهید تنظیمات را به حالت پیش‌فرض بازگردانید؟')) {
        return;
    }
    
    const defaultSettings = {
        schoolName: "مدرسه تلاوت",
        registrationOpen: true,
        maxStudents: 100,
        adminMessage: "سلام مدیر عزیز! 👋"
    };
    
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(defaultSettings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('🔄 تنظیمات به حالت پیش‌فرض بازگردانده شد', 'success');
            await loadSettings();
        } else {
            showNotification('❌ خطا در بازنشانی تنظیمات', 'error');
        }
        
    } catch (error) {
        console.error('خطا در بازنشانی تنظیمات:', error);
        showNotification('❌ خطا در بازنشانی تنظیمات', 'error');
    }
}

// خروج
function logout() {
    isAdminLoggedIn = false;
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminId').value = '';
    document.getElementById('adminStatus').textContent = '';
    document.getElementById('adminStatus').className = 'status';
    showNotification('🚪 با موفقیت خارج شدید', 'success');
}

// بازگشت به صفحه اصلی
function goToHome() {
    window.location.href = '/';
}

// ===== توابع جدید برای پنل پیشرفته =====

// نمایش روزهای تمرین
function showPracticeDays() {
    hideAllPanels();
    document.getElementById('practiceDaysPanel').style.display = 'block';
    loadDaysSettings('practice');
}

// نمایش روزهای ارزیابی
function showEvaluationDays() {
    hideAllPanels();
    document.getElementById('evaluationDaysPanel').style.display = 'block';
    loadDaysSettings('evaluation');
}

// نمایش روزهای حضور
function showAttendanceDays() {
    hideAllPanels();
    document.getElementById('attendanceDaysPanel').style.display = 'block';
    loadDaysSettings('attendance');
}

// نمایش تنظیمات نظرسنجی
function showSurveySettings() {
    hideAllPanels();
    document.getElementById('surveyPanel').style.display = 'block';
    loadSurveySettings();
}

// نمایش تنظیمات گزارش‌ها
function showReportSettings() {
    hideAllPanels();
    document.getElementById('reportPanel').style.display = 'block';
    loadReportSettings();
}

// نمایش تنظیمات ثبت‌نام
function showRegistrationSettings() {
    hideAllPanels();
    document.getElementById('registrationPanel').style.display = 'block';
    loadRegistrationSettings();
}

// نمایش بازنشانی تنظیمات
function showResetSettings() {
    hideAllPanels();
    document.getElementById('resetPanel').style.display = 'block';
}

// مخفی کردن همه پنل‌ها
function hideAllPanels() {
    const panels = [
        'practiceDaysPanel',
        'evaluationDaysPanel', 
        'attendanceDaysPanel',
        'surveyPanel',
        'reportPanel',
        'registrationPanel',
        'resetPanel'
    ];
    
    panels.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) panel.style.display = 'none';
    });
}

// بازگشت به منوی اصلی
function backToMainMenu() {
    hideAllPanels();
    document.querySelector('.settings-main-menu').style.display = 'block';
}

// انتخاب همه روزها
function selectAllDays(type) {
    const panel = document.getElementById(`${type}DaysPanel`);
    const dayItems = panel.querySelectorAll('.day-item');
    
    dayItems.forEach(item => {
        const status = item.querySelector('.day-status');
        status.setAttribute('data-status', 'active');
        status.textContent = '🟢';
    });
    
    showNotification(`✅ همه روزهای ${getTypeName(type)} انتخاب شدند`, 'success');
}

// انتخاب هیچ روزی
function selectNoneDays(type) {
    const panel = document.getElementById(`${type}DaysPanel`);
    const dayItems = panel.querySelectorAll('.day-item');
    
    dayItems.forEach(item => {
        const status = item.querySelector('.day-status');
        status.setAttribute('data-status', 'inactive');
        status.textContent = '🔴';
    });
    
    showNotification(`❌ هیچ روزی برای ${getTypeName(type)} انتخاب نشد`, 'warning');
}

// نام فارسی نوع
function getTypeName(type) {
    const names = {
        'practice': 'تمرین',
        'evaluation': 'ارزیابی',
        'attendance': 'حضور'
    };
    return names[type] || type;
}

// لود تنظیمات روزها
async function loadDaysSettings(type) {
    try {
        const response = await fetch(`/api/days-settings/${type}`);
        const settings = await response.json();
        
        const panel = document.getElementById(`${type}DaysPanel`);
        const dayItems = panel.querySelectorAll('.day-item');
        
        dayItems.forEach((item, index) => {
            const status = item.querySelector('.day-status');
            const isActive = settings.activeDays && settings.activeDays.includes(index);
            
            status.setAttribute('data-status', isActive ? 'active' : 'inactive');
            status.textContent = isActive ? '🟢' : '🔴';
        });
        
    } catch (error) {
        console.error(`خطا در لود تنظیمات روزهای ${type}:`, error);
        // در صورت خطا، همه روزها را فعال در نظر می‌گیریم
        const panel = document.getElementById(`${type}DaysPanel`);
        const dayItems = panel.querySelectorAll('.day-item');
        
        dayItems.forEach(item => {
            const status = item.querySelector('.day-status');
            status.setAttribute('data-status', 'active');
            status.textContent = '🟢';
        });
    }
}

// ذخیره روزهای تمرین
async function savePracticeDays() {
    await saveDaysSettings('practice');
}

// ذخیره روزهای ارزیابی
async function saveEvaluationDays() {
    await saveDaysSettings('evaluation');
}

// ذخیره روزهای حضور
async function saveAttendanceDays() {
    await saveDaysSettings('attendance');
}

// ذخیره تنظیمات روزها
async function saveDaysSettings(type) {
    const panel = document.getElementById(`${type}DaysPanel`);
    const dayItems = panel.querySelectorAll('.day-item');
    const activeDays = [];
    
    dayItems.forEach((item, index) => {
        const status = item.querySelector('.day-status');
        if (status.getAttribute('data-status') === 'active') {
            activeDays.push(index);
        }
    });
    
    try {
        const response = await fetch(`/api/days-settings/${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ activeDays })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`✅ تنظیمات روزهای ${getTypeName(type)} ذخیره شد`, 'success');
        } else {
            showNotification(`❌ خطا در ذخیره تنظیمات روزهای ${getTypeName(type)}`, 'error');
        }
        
    } catch (error) {
        console.error(`خطا در ذخیره تنظیمات روزهای ${type}:`, error);
        showNotification(`❌ خطا در ذخیره تنظیمات روزهای ${getTypeName(type)}`, 'error');
    }
}

// لود تنظیمات نظرسنجی
async function loadSurveySettings() {
    try {
        const response = await fetch('/api/survey-settings');
        const settings = await response.json();
        
        // نمایش وضعیت فعلی
        const statusText = document.getElementById('surveyStatusText');
        if (statusText) {
            statusText.textContent = settings.satisfactionSurvey ? '✅ فعال' : '❌ غیرفعال';
            statusText.style.color = settings.satisfactionSurvey ? '#28a745' : '#dc3545';
        }
        
        // ذخیره وضعیت فعلی برای استفاده در toggle
        window.currentSurveyStatus = settings.satisfactionSurvey;
        
    } catch (error) {
        console.error('خطا در لود تنظیمات نظرسنجی:', error);
        const statusText = document.getElementById('surveyStatusText');
        if (statusText) {
            statusText.textContent = '✅ فعال';
            statusText.style.color = '#28a745';
        }
        window.currentSurveyStatus = true;
    }
}

// تغییر وضعیت نظرسنجی با دکمه
async function toggleSurveyManual() {
    const newStatus = !window.currentSurveyStatus;
    console.log('تغییر وضعیت نظرسنجی به:', newStatus);
    
    try {
        const response = await fetch('/api/survey-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ satisfactionSurvey: newStatus })
        });
        
        const result = await response.json();
        console.log('پاسخ سرور:', result);
        
        if (result.success) {
            window.currentSurveyStatus = newStatus;
            showNotification(`✅ نظرسنجی ${newStatus ? 'فعال' : 'غیرفعال'} شد`, 'success');
            // بروزرسانی نمایش
            await loadSurveySettings();
        } else {
            showNotification('❌ خطا در تغییر وضعیت نظرسنجی', 'error');
        }
        
    } catch (error) {
        console.error('خطا در تغییر وضعیت نظرسنجی:', error);
        showNotification('❌ خطا در تغییر وضعیت نظرسنجی', 'error');
    }
}

// لود تنظیمات گزارش‌ها
async function loadReportSettings() {
    try {
        const response = await fetch('/api/report-status');
        const status = await response.json();
        
        // نمایش وضعیت فعلی
        const statusText = document.getElementById('reportStatusText');
        if (statusText) {
            statusText.textContent = status.enabled ? '✅ فعال' : '❌ غیرفعال';
            statusText.style.color = status.enabled ? '#28a745' : '#dc3545';
        }
        
        // ذخیره وضعیت فعلی برای استفاده در toggle
        window.currentReportStatus = status.enabled;
        
    } catch (error) {
        console.error('خطا در لود تنظیمات گزارش‌ها:', error);
        const statusText = document.getElementById('reportStatusText');
        if (statusText) {
            statusText.textContent = '✅ فعال';
            statusText.style.color = '#28a745';
        }
        window.currentReportStatus = true;
    }
}

// تغییر وضعیت گزارش‌ها با دکمه
async function toggleReportsManual() {
    const newStatus = !window.currentReportStatus;
    console.log('تغییر وضعیت گزارش‌ها به:', newStatus);
    
    try {
        const response = await fetch('/api/toggle-reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled: newStatus })
        });
        
        const result = await response.json();
        console.log('پاسخ سرور:', result);
        
        if (result.success) {
            window.currentReportStatus = newStatus;
            showNotification(`✅ گزارش‌ها ${newStatus ? 'فعال' : 'غیرفعال'} شدند`, 'success');
            // بروزرسانی نمایش
            await loadReportSettings();
        } else {
            showNotification('❌ خطا در تغییر وضعیت گزارش‌ها', 'error');
        }
        
    } catch (error) {
        console.error('خطا در تغییر وضعیت گزارش‌ها:', error);
        showNotification('❌ خطا در تغییر وضعیت گزارش‌ها', 'error');
    }
}

// لود تنظیمات ثبت‌نام
async function loadRegistrationSettings() {
    try {
        const response = await fetch('/api/registration-status');
        const status = await response.json();
        
        // نمایش وضعیت فعلی
        const statusText = document.getElementById('registrationStatusText');
        if (statusText) {
            statusText.textContent = status.enabled ? '✅ فعال' : '❌ غیرفعال';
            statusText.style.color = status.enabled ? '#28a745' : '#dc3545';
        }
        
        // ذخیره وضعیت فعلی برای استفاده در toggle
        window.currentRegistrationStatus = status.enabled;
        
    } catch (error) {
        console.error('خطا در لود تنظیمات ثبت‌نام:', error);
        const statusText = document.getElementById('registrationStatusText');
        if (statusText) {
            statusText.textContent = '✅ فعال';
            statusText.style.color = '#28a745';
        }
        window.currentRegistrationStatus = true;
    }
}

// تغییر وضعیت ثبت‌نام با دکمه
async function toggleRegistrationManual() {
    const newStatus = !window.currentRegistrationStatus;
    console.log('تغییر وضعیت ثبت‌نام به:', newStatus);
    
    try {
        const response = await fetch('/api/toggle-registration', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled: newStatus })
        });
        
        const result = await response.json();
        console.log('پاسخ سرور:', result);
        
        if (result.success) {
            window.currentRegistrationStatus = newStatus;
            showNotification(`✅ ثبت‌نام ${newStatus ? 'فعال' : 'غیرفعال'} شد`, 'success');
            // بروزرسانی نمایش
            await loadRegistrationSettings();
        } else {
            showNotification('❌ خطا در تغییر وضعیت ثبت‌نام', 'error');
        }
        
    } catch (error) {
        console.error('خطا در تغییر وضعیت ثبت‌نام:', error);
        showNotification('❌ خطا در تغییر وضعیت ثبت‌نام', 'error');
    }
}

// تغییر وضعیت گزارش‌ها (بدون نیاز به ذخیره)
async function toggleReports() {
    console.log('toggleReports فراخوانی شد!');
    const enabled = document.getElementById('botReports').checked;
    console.log('وضعیت جدید:', enabled);
    
    try {
        const response = await fetch('/api/toggle-reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled })
        });
        
        const result = await response.json();
        console.log('پاسخ سرور:', result);
        
        if (result.success) {
            showNotification(`✅ گزارش‌ها ${enabled ? 'فعال' : 'غیرفعال'} شدند`, 'success');
        } else {
            showNotification('❌ خطا در تغییر وضعیت گزارش‌ها', 'error');
        }
        
    } catch (error) {
        console.error('خطا در تغییر وضعیت گزارش‌ها:', error);
        showNotification('❌ خطا در تغییر وضعیت گزارش‌ها', 'error');
    }
}

// تایید بازنشانی تنظیمات
async function confirmResetSettings() {
    if (!confirm('⚠️ آیا مطمئن هستید که می‌خواهید همه تنظیمات را به حالت پیش‌فرض بازگردانید؟\n\nاین عمل قابل بازگشت نیست!')) {
        return;
    }
    
    try {
        const response = await fetch('/api/reset-all-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('🔄 همه تنظیمات به حالت پیش‌فرض بازگردانده شد', 'success');
            backToMainMenu();
        } else {
            showNotification('❌ خطا در بازنشانی تنظیمات', 'error');
        }
        
    } catch (error) {
        console.error('خطا در بازنشانی تنظیمات:', error);
        showNotification('❌ خطا در بازنشانی تنظیمات', 'error');
    }
}

// کلید Enter برای ورود
document.getElementById('adminId').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        checkAdmin();
    }
});

// لود اولیه
document.addEventListener('DOMContentLoaded', function() {
    console.log('پنل مدیر لود شد');
    console.log('برای ورود، شماره ID مدیر را وارد کنید:', ADMIN_ID);
    
    // اضافه کردن event listener برای کلیک روی روزها
    document.querySelectorAll('.day-item').forEach(item => {
        item.addEventListener('click', function() {
            const status = this.querySelector('.day-status');
            const currentStatus = status.getAttribute('data-status');
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            
            status.setAttribute('data-status', newStatus);
            status.textContent = newStatus === 'active' ? '🟢' : '🔴';
        });
    });
    
    // Event listener برای toggle switch در showReportSettings اضافه می‌شود
});
