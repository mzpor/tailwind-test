// 17arzyabi.js - ماژول ارزیابی و نظرسنجی قرآن‌آموزان
// ⏰ 09:00:00 🗓️ دوشنبه 13 مرداد 1404

const fs = require('fs');
const path = require('path');

class ArzyabiModule {
    constructor() {
        this.evaluationDataFile = path.join(__dirname, 'data', 'evaluation_data.json');
        this.practiceDataFile = path.join(__dirname, 'data', 'practice_data.json');
        this.satisfactionDataFile = path.join(__dirname, 'data', 'satisfaction_data.json');
        this.weeklyReportFile = path.join(__dirname, 'data', 'weekly_reports.json');
        this.monthlyReportFile = path.join(__dirname, 'data', 'monthly_reports.json');
        
        this.loadAllData();
        this.ensureDataDirectories();
    }

    ensureDataDirectories() {
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    loadAllData() {
        this.loadEvaluationData();
        this.loadPracticeData();
        this.loadSatisfactionData();
        this.loadWeeklyReports();
        this.loadMonthlyReports();
    }

    loadEvaluationData() {
        try {
            if (fs.existsSync(this.evaluationDataFile)) {
                this.evaluationData = JSON.parse(fs.readFileSync(this.evaluationDataFile, 'utf8'));
            } else {
                this.evaluationData = {
                    pending_evaluations: {},
                    completed_evaluations: {},
                    evaluation_scores: {
                        "نیاز به تلاش بیشتر": 1,
                        "متوسط": 2,
                        "خوب": 3,
                        "عالی": 4,
                        "ممتاز": 5
                    }
                };
                this.saveEvaluationData();
            }
        } catch (error) {
            console.error('❌ خطا در بارگذاری داده‌های ارزیابی:', error.message);
            this.evaluationData = {
                pending_evaluations: {},
                completed_evaluations: {},
                evaluation_scores: {
                    "نیاز به تلاش بیشتر": 1,
                    "متوسط": 2,
                    "خوب": 3,
                    "عالی": 4,
                    "ممتاز": 5
                }
            };
        }
    }

    loadPracticeData() {
        try {
            if (fs.existsSync(this.practiceDataFile)) {
                this.practiceData = JSON.parse(fs.readFileSync(this.practiceDataFile, 'utf8'));
            } else {
                this.practiceData = {
                    daily_practices: {},
                    practice_schedule: {
                        enabled: true,
                        hours: [14, 15, 16], // ساعت 2 تا 5 عصر
                        days: [0, 1, 2, 3, 4] // شنبه تا چهارشنبه
                    }
                };
                this.savePracticeData();
            }
        } catch (error) {
            console.error('❌ خطا در بارگذاری داده‌های تمرین:', error.message);
            this.practiceData = {
                daily_practices: {},
                practice_schedule: {
                    enabled: true,
                    hours: [14, 15, 16],
                    days: [0, 1, 2, 3, 4]
                }
            };
        }
    }

    loadSatisfactionData() {
        try {
            if (fs.existsSync(this.satisfactionDataFile)) {
                this.satisfactionData = JSON.parse(fs.readFileSync(this.satisfactionDataFile, 'utf8'));
            } else {
                this.satisfactionData = {
                    surveys: {},
                    settings: {
                        enabled: true,
                        show_after_evaluation: true
                    }
                };
                this.saveSatisfactionData();
            }
        } catch (error) {
            console.error('❌ خطا در بارگذاری داده‌های نظرسنجی:', error.message);
            this.satisfactionData = {
                surveys: {},
                settings: {
                    enabled: true,
                    show_after_evaluation: true
                }
            };
        }
    }

    loadWeeklyReports() {
        try {
            if (fs.existsSync(this.weeklyReportFile)) {
                this.weeklyReports = JSON.parse(fs.readFileSync(this.weeklyReportFile, 'utf8'));
            } else {
                this.weeklyReports = {};
                this.saveWeeklyReports();
            }
        } catch (error) {
            console.error('❌ خطا در بارگذاری گزارش‌های هفتگی:', error.message);
            this.weeklyReports = {};
        }
    }

    loadMonthlyReports() {
        try {
            if (fs.existsSync(this.monthlyReportFile)) {
                this.monthlyReports = JSON.parse(fs.readFileSync(this.monthlyReportFile, 'utf8'));
            } else {
                this.monthlyReports = {};
                this.saveMonthlyReports();
            }
        } catch (error) {
            console.error('❌ خطا در بارگذاری گزارش‌های ماهانه:', error.message);
            this.monthlyReports = {};
        }
    }

    saveEvaluationData() {
        try {
            fs.writeFileSync(this.evaluationDataFile, JSON.stringify(this.evaluationData, null, 2), 'utf8');
        } catch (error) {
            console.error('❌ خطا در ذخیره داده‌های ارزیابی:', error.message);
        }
    }

    savePracticeData() {
        try {
            fs.writeFileSync(this.practiceDataFile, JSON.stringify(this.practiceData, null, 2), 'utf8');
        } catch (error) {
            console.error('❌ خطا در ذخیره داده‌های تمرین:', error.message);
        }
    }

    saveSatisfactionData() {
        try {
            fs.writeFileSync(this.satisfactionDataFile, JSON.stringify(this.satisfactionData, null, 2), 'utf8');
        } catch (error) {
            console.error('❌ خطا در ذخیره داده‌های نظرسنجی:', error.message);
        }
    }

    saveWeeklyReports() {
        try {
            fs.writeFileSync(this.weeklyReportFile, JSON.stringify(this.weeklyReports, null, 2), 'utf8');
        } catch (error) {
            console.error('❌ خطا در ذخیره گزارش‌های هفتگی:', error.message);
        }
    }

    saveMonthlyReports() {
        try {
            fs.writeFileSync(this.monthlyReportFile, JSON.stringify(this.monthlyReports, null, 2), 'utf8');
        } catch (error) {
            console.error('❌ خطا در ذخیره گزارش‌های ماهانه:', error.message);
        }
    }

    // ===== مدیریت زمان‌بندی تمرین =====
    isPracticeTime() {
        if (!this.practiceData.practice_schedule.enabled) {
            return false;
        }

        const now = new Date();
        const currentDay = now.getDay(); // 0 = یکشنبه، 1 = دوشنبه، ...
        const currentHour = now.getHours();

        // تبدیل به روزهای هفته فارسی
        const persianDay = (currentDay + 1) % 7; // 0 = شنبه، 1 = یکشنبه، ...
        
        return this.practiceData.practice_schedule.days.includes(persianDay) &&
               this.practiceData.practice_schedule.hours.includes(currentHour);
    }

    // ===== پردازش تمرین ارسالی =====
    handlePracticeSubmission(message, userData) {
        const userId = message.from.id;
        const chatId = message.chat.id;
        const messageId = message.message_id;
        const currentDate = this.getCurrentDate();
        const currentTime = this.getCurrentTime();

        // بررسی اینکه آیا زمان تمرین است
        if (!this.isPracticeTime()) {
            return {
                success: false,
                message: "⚠️ زمان ارسال تمرین نیست. لطفاً در ساعات مشخص شده تمرین ارسال کنید."
            };
        }

        // ذخیره تمرین
        if (!this.practiceData.daily_practices[currentDate]) {
            this.practiceData.daily_practices[currentDate] = {
                date: currentDate,
                practices: {}
            };
        }

        this.practiceData.daily_practices[currentDate].practices[userId] = {
            user_id: userId,
            user_name: userData.full_name || userData.first_name || `کاربر ${userId}`,
            chat_id: chatId,
            message_id: messageId,
            submission_time: currentTime,
            status: 'pending_evaluation'
        };

        this.savePracticeData();

        // ارسال به گروه گزارش
        this.sendPracticeReportToAdmin(userId, userData, currentDate, currentTime);

        return {
            success: true,
            message: `✅ تمرین شما با موفقیت ثبت شد.\n📝 منتظر ارزیابی مربیان هستیم.`
        };
    }

    // ===== تشخیص تمرین از پیام =====
    isPracticeMessage(message) {
        // روش 1: صوت با کپشن "تکلیف"
        if (message.voice && message.caption) {
            const caption = message.caption.toLowerCase().trim();
            return caption.includes('تکلیف') || caption.includes('تمرین');
        }

        // روش 2: صوت با ریپلای به متن "تکلیف" یا "قرآن آموز"
        if (message.voice && message.reply_to_message) {
            const replyText = message.reply_to_message.text || '';
            const replyLower = replyText.toLowerCase().trim();
            return replyLower.includes('تکلیف') || 
                   replyLower.includes('تمرین') || 
                   replyLower.includes('قرآن آموز');
        }

        // روش 3: متن "تکلیف" یا "تمرین" (برای تست)
        if (message.text) {
            const text = message.text.toLowerCase().trim();
            return text === 'تکلیف' || text === 'تمرین';
        }

        return false;
    }

    // ===== پردازش پیام تمرین =====
    processPracticeMessage(message, userData) {
        // بررسی اینکه آیا پیام تمرین است
        if (!this.isPracticeMessage(message)) {
            return null;
        }

        // بررسی زمان تمرین
        if (!this.isPracticeTime()) {
            return {
                success: false,
                message: "⚠️ زمان ارسال تمرین نیست.\n\n⏰ **ساعات تمرین:**\nشنبه تا چهارشنبه: ساعت 2 تا 5 عصر\n\nلطفاً در زمان مشخص شده تمرین ارسال کنید."
            };
        }

        // پردازش تمرین
        return this.handlePracticeSubmission(message, userData);
    }

    // ===== دستور /لیست =====
    handleListCommand(chatId, userRole) {
        const currentDate = this.getCurrentDate();
        const todayPractices = this.practiceData.daily_practices[currentDate];

        if (!todayPractices || Object.keys(todayPractices.practices).length === 0) {
            return {
                success: true,
                message: "📋 **لیست تمرین‌های امروز**\n\n❌ هیچ تمرینی ارسال نشده است."
            };
        }

        let message = "📋 **لیست تمرین‌های امروز**\n\n";
        let submittedCount = 0;
        let notSubmittedCount = 0;

        // شمارش تمرین‌های ارسال شده
        const submittedUsers = Object.values(todayPractices.practices);
        submittedCount = submittedUsers.length;

        // شمارش کاربرانی که تمرین ارسال نکرده‌اند
        // این بخش نیاز به لیست کامل کاربران گروه دارد
        // فعلاً فقط تمرین‌های ارسال شده را نمایش می‌دهیم

        message += `✅ **تمرین ارسال کرده‌اند (${submittedCount} نفر):**\n`;
        submittedUsers.forEach((practice, index) => {
            message += `${index + 1}. ${practice.user_name}\n`;
        });

        message += `\n⏰ زمان آخرین ارسال: ${this.getCurrentTime()}`;

        return {
            success: true,
            message: message
        };
    }

    // ===== ارزیابی تمرین =====
    createEvaluationKeyboard(evaluationId, studentName) {
        const keyboard = {
            inline_keyboard: [
                [
                    { text: "نیاز به تلاش بیشتر", callback_data: `evaluate_${evaluationId}_1` },
                    { text: "متوسط", callback_data: `evaluate_${evaluationId}_2` }
                ],
                [
                    { text: "خوب", callback_data: `evaluate_${evaluationId}_3` },
                    { text: "عالی", callback_data: `evaluate_${evaluationId}_4` }
                ],
                [
                    { text: "ممتاز", callback_data: `evaluate_${evaluationId}_5` }
                ]
            ]
        };

        return {
            text: `📝 **ارزیابی تمرین قرآن‌آموز**\n\nقرآن‌آموز: ${studentName}\nلطفاً تمرین ارسالی را ارزیابی کنید:`,
            keyboard: keyboard
        };
    }

    handleEvaluationCallback(callbackData, evaluatorId, evaluatorName) {
        const parts = callbackData.split('_');
        if (parts.length < 3) {
            return { success: false, message: "❌ فرمت callback نامعتبر است." };
        }

        const evaluationId = parts[1];
        const score = parseInt(parts[2]);

        // ذخیره ارزیابی
        if (!this.evaluationData.pending_evaluations[evaluationId]) {
            this.evaluationData.pending_evaluations[evaluationId] = {
                evaluations: {}
            };
        }

        this.evaluationData.pending_evaluations[evaluationId].evaluations[evaluatorId] = {
            evaluator_id: evaluatorId,
            evaluator_name: evaluatorName,
            score: score,
            evaluation_time: this.getCurrentTime()
        };

        this.saveEvaluationData();

        // بررسی تکمیل ارزیابی
        this.checkEvaluationCompletion(evaluationId);

        return {
            success: true,
            message: `✅ ارزیابی شما ثبت شد.`
        };
    }

    checkEvaluationCompletion(evaluationId) {
        const evaluation = this.evaluationData.pending_evaluations[evaluationId];
        if (!evaluation) return;

        // اگر حداقل 2 ارزیابی وجود دارد، تکمیل کن
        if (Object.keys(evaluation.evaluations).length >= 2) {
            this.completeEvaluation(evaluationId);
        }
    }

    completeEvaluation(evaluationId) {
        const evaluation = this.evaluationData.pending_evaluations[evaluationId];
        if (!evaluation) return;

        // محاسبه میانگین نمرات
        const scores = Object.values(evaluation.evaluations).map(e => e.score);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        // تعیین سطح کلی
        const scoreLevels = ["نیاز به تلاش بیشتر", "متوسط", "خوب", "عالی", "ممتاز"];
        const overallLevel = scoreLevels[Math.floor(averageScore) - 1] || "متوسط";

        // انتقال به ارزیابی‌های تکمیل شده
        this.evaluationData.completed_evaluations[evaluationId] = {
            ...evaluation,
            average_score: averageScore,
            overall_level: overallLevel,
            completion_time: this.getCurrentTime()
        };

        // حذف از ارزیابی‌های در انتظار
        delete this.evaluationData.pending_evaluations[evaluationId];
        this.saveEvaluationData();

        // ارسال نظرسنجی رضایت
        if (this.satisfactionData.settings.show_after_evaluation) {
            this.sendSatisfactionSurvey(evaluationId);
        }
    }

    // ===== نظرسنجی رضایت =====
    sendSatisfactionSurvey(evaluationId) {
        const evaluation = this.evaluationData.completed_evaluations[evaluationId];
        if (!evaluation) return;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: "1", callback_data: `satisfaction_${evaluationId}_1` },
                    { text: "2", callback_data: `satisfaction_${evaluationId}_2` },
                    { text: "3", callback_data: `satisfaction_${evaluationId}_3` }
                ],
                [
                    { text: "4", callback_data: `satisfaction_${evaluationId}_4` },
                    { text: "5", callback_data: `satisfaction_${evaluationId}_5` }
                ]
            ]
        };

        this.satisfactionData.surveys[evaluationId] = {
            status: 'waiting',
            evaluation_id: evaluationId,
            student_name: evaluation.student_name || 'نامشخص'
        };
        this.saveSatisfactionData();

        return {
            text: `📊 **نظرسنجی رضایت**\n\nلطفاً از نمره‌ای که دریافت کرده‌اید رضایت خود را اعلام کنید:`,
            keyboard: keyboard
        };
    }

    handleSatisfactionCallback(callbackData, userId, userName) {
        const parts = callbackData.split('_');
        if (parts.length < 3) {
            return { success: false, message: "❌ فرمت callback نامعتبر است." };
        }

        const evaluationId = parts[1];
        const score = parseInt(parts[2]);

        if (!this.satisfactionData.surveys[evaluationId]) {
            return { success: false, message: "❌ نظرسنجی مورد نظر یافت نشد." };
        }

        // ذخیره نظرسنجی
        this.satisfactionData.surveys[evaluationId] = {
            ...this.satisfactionData.surveys[evaluationId],
            satisfaction_score: score,
            user_id: userId,
            user_name: userName,
            survey_time: this.getCurrentTime(),
            status: 'completed'
        };

        this.saveSatisfactionData();

        // ارسال گزارش به گروه گزارش
        this.sendSatisfactionReportToAdmin(evaluationId, userName, score);

        return {
            success: true,
            message: `✅ نمره رضایت شما (${score}/5) ثبت شد.`
        };
    }

    // ===== گزارش‌گیری =====
    sendPracticeReportToAdmin(userId, userData, date, time) {
        const reportText = `📝 **گزارش تمرین جدید**\n\n` +
            `کاربر: ${userData.full_name || userData.first_name || `کاربر ${userId}`}\n` +
            `تاریخ: ${date}\n` +
            `زمان: ${time}\n` +
            `وضعیت: در انتظار ارزیابی`;

        // اینجا باید به گروه گزارش ارسال شود
        console.log('📤 گزارش تمرین به گروه گزارش ارسال شد:', reportText);
        return reportText;
    }

    sendSatisfactionReportToAdmin(evaluationId, userName, score) {
        const evaluation = this.evaluationData.completed_evaluations[evaluationId];
        if (!evaluation) return;

        const reportText = `📊 **گزارش نظرسنجی رضایت**\n\n` +
            `کاربر: ${userName}\n` +
            `سطح کلی ارزیابی: ${evaluation.overall_level}\n` +
            `رضایت از نمره: ${score}/5\n` +
            `تاریخ: ${this.getCurrentDate()}`;

        // اینجا باید به گروه گزارش ارسال شود
        console.log('📤 گزارش نظرسنجی به گروه گزارش ارسال شد:', reportText);
        return reportText;
    }

    // ===== گزارش‌های هفتگی و ماهانه =====
    generateWeeklyReport(weekStartDate) {
        const weekEndDate = this.addDays(weekStartDate, 6);
        const report = {
            week_start: weekStartDate,
            week_end: weekEndDate,
            total_practices: 0,
            total_evaluations: 0,
            total_satisfaction_surveys: 0,
            daily_stats: {}
        };

        // جمع‌آوری آمار روزانه
        for (let i = 0; i < 7; i++) {
            const currentDate = this.addDays(weekStartDate, i);
            const practices = this.practiceData.daily_practices[currentDate] || { practices: {} };
            const evaluations = this.getEvaluationsForDate(currentDate);
            const satisfactions = this.getSatisfactionsForDate(currentDate);

            report.daily_stats[currentDate] = {
                practices_count: Object.keys(practices.practices).length,
                evaluations_count: evaluations.length,
                satisfactions_count: satisfactions.length
            };

            report.total_practices += report.daily_stats[currentDate].practices_count;
            report.total_evaluations += report.daily_stats[currentDate].evaluations_count;
            report.total_satisfaction_surveys += report.daily_stats[currentDate].satisfactions_count;
        }

        return report;
    }

    generateMonthlyReport(year, month) {
        const report = {
            year: year,
            month: month,
            total_practices: 0,
            total_evaluations: 0,
            total_satisfaction_surveys: 0,
            weekly_stats: {},
            top_performers: []
        };

        // جمع‌آوری آمار هفتگی
        const weeksInMonth = this.getWeeksInMonth(year, month);
        weeksInMonth.forEach(weekStart => {
            const weeklyReport = this.generateWeeklyReport(weekStart);
            report.weekly_stats[weekStart] = weeklyReport;
            report.total_practices += weeklyReport.total_practices;
            report.total_evaluations += weeklyReport.total_evaluations;
            report.total_satisfaction_surveys += weeklyReport.total_satisfaction_surveys;
        });

        return report;
    }

    // ===== توابع کمکی =====
    getCurrentDate() {
        const now = new Date();
        return now.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    getCurrentTime() {
        const now = new Date();
        return now.toISOString();
    }

    addDays(dateString, days) {
        const date = new Date(dateString);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    getEvaluationsForDate(date) {
        return Object.values(this.evaluationData.completed_evaluations)
            .filter(eval => eval.completion_time && eval.completion_time.startsWith(date));
    }

    getSatisfactionsForDate(date) {
        return Object.values(this.satisfactionData.surveys)
            .filter(survey => survey.survey_time && survey.survey_time.startsWith(date));
    }

    getWeeksInMonth(year, month) {
        const weeks = [];
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        
        let currentWeekStart = new Date(firstDay);
        while (currentWeekStart <= lastDay) {
            weeks.push(currentWeekStart.toISOString().split('T')[0]);
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        }
        
        return weeks;
    }

    // ===== تنظیمات =====
    updatePracticeSchedule(enabled, hours, days) {
        this.practiceData.practice_schedule = {
            enabled: enabled,
            hours: hours || [14, 15, 16],
            days: days || [0, 1, 2, 3, 4]
        };
        this.savePracticeData();
        return { success: true, message: "✅ تنظیمات زمان تمرین به‌روزرسانی شد." };
    }

    updateSatisfactionSettings(enabled, showAfterEvaluation) {
        this.satisfactionData.settings = {
            enabled: enabled,
            show_after_evaluation: showAfterEvaluation
        };
        this.saveSatisfactionData();
        return { success: true, message: "✅ تنظیمات نظرسنجی به‌روزرسانی شد." };
    }

    // ===== دریافت آمار =====
    getStatistics() {
        const currentDate = this.getCurrentDate();
        const todayPractices = this.practiceData.daily_practices[currentDate] || { practices: {} };
        
        return {
            today_practices: Object.keys(todayPractices.practices).length,
            total_pending_evaluations: Object.keys(this.evaluationData.pending_evaluations).length,
            total_completed_evaluations: Object.keys(this.evaluationData.completed_evaluations).length,
            total_satisfaction_surveys: Object.keys(this.satisfactionData.surveys).length,
            practice_time_active: this.isPracticeTime()
        };
    }

    // ===== تشخیص نوع پیام تمرین =====
    getPracticeMessageType(message) {
        if (message.voice && message.caption) {
            return {
                type: 'voice_with_caption',
                description: 'صوت با کپشن',
                caption: message.caption
            };
        }
        
        if (message.voice && message.reply_to_message) {
            return {
                type: 'voice_with_reply',
                description: 'صوت با ریپلای',
                reply_text: message.reply_to_message.text
            };
        }
        
        if (message.text) {
            return {
                type: 'text_only',
                description: 'متن ساده',
                text: message.text
            };
        }
        
        return {
            type: 'unknown',
            description: 'نوع نامشخص'
        };
    }

    // ===== نمایش وضعیت زمان تمرین =====
    getPracticeTimeStatus() {
        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();
        const persianDay = (currentDay + 1) % 7;
        
        const isActiveDay = this.practiceData.practice_schedule.days.includes(persianDay);
        const isActiveHour = this.practiceData.practice_schedule.hours.includes(currentHour);
        
        const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
        const currentDayName = dayNames[persianDay];
        
        return {
            is_active: this.isPracticeTime(),
            current_day: currentDayName,
            current_hour: currentHour,
            is_active_day: isActiveDay,
            is_active_hour: isActiveHour,
            schedule: this.practiceData.practice_schedule
        };
    }
}

module.exports = ArzyabiModule;
