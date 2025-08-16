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
        
        // ایجاد فایل‌های داده در صورت عدم وجود
        this.initializeDataFiles();
        
        this.loadAllData();
        this.ensureDataDirectories();
    }



    initializeDataFiles() {
        // ایجاد فایل‌های داده با ساختار پیش‌فرض
        const dataFiles = [
            { file: this.evaluationDataFile, data: { pending_evaluations: {}, completed_evaluations: {}, evaluators: {} } },
            { file: this.practiceDataFile, data: { daily_practices: {} } },
            { file: this.satisfactionDataFile, data: { surveys: {} } },
            { file: this.weeklyReportFile, data: { reports: {}, last_update: null } },
            { file: this.monthlyReportFile, data: { reports: {}, last_update: null } }
        ];

        dataFiles.forEach(({ file, data }) => {
            if (!fs.existsSync(file)) {
                try {
                    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
                    console.log(`✅ [ARZYABI] فایل داده ایجاد شد: ${path.basename(file)}`);
                } catch (error) {
                    console.error(`❌ [ARZYABI] خطا در ایجاد فایل ${path.basename(file)}:`, error.message);
                }
            }
        });
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
                    daily_practices: {}
                };
                this.savePracticeData();
            }
        } catch (error) {
            console.error('❌ خطا در بارگذاری داده‌های تمرین:', error.message);
            this.practiceData = {
                daily_practices: {}
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
        try {
            // استفاده از تابع مرکزی در 3config.js
            const { isPracticeTime: configIsPracticeTime } = require('./3config');
            return configIsPracticeTime();
        } catch (error) {
            console.error('❌ [ARZYABI] Error in isPracticeTime:', error.message);
            return false;
        }
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
        this.sendPracticeReportToAdmin(userId, userData, null, currentDate, currentTime);

        const { getRoleDisplayName } = require('./3config');
        return {
            success: true,
            message: `✅ تمرین شما با موفقیت ثبت شد.\n📝 منتظر ارزیابی ${getRoleDisplayName('COACH')}ان هستیم.`
        };
    }

    // ===== تشخیص تمرین از پیام =====
    isPracticeMessage(message) {
        try {
            // استفاده از توابع مرکزی در 3config.js
            const { 
                isPracticeDetectionEnabled,
                isVoiceWithCaptionEnabled,
                isVoiceWithReplyTaskEnabled,
                isVoiceWithReplyStudentEnabled,
                isTextOnlyEnabled,
                isTextReplyToVoiceEnabled
            } = require('./3config');

            // بررسی اینکه آیا سیستم تشخیص تمرین فعال است
            if (!isPracticeDetectionEnabled()) {
                return false;
            }

            // روش 1: صوت با کپشن "تکلیف"
            if (message.voice && message.caption && isVoiceWithCaptionEnabled()) {
                const caption = message.caption.toLowerCase().trim();
                if (caption.includes('تکلیف') || caption.includes('تمرین')) {
                    console.log('✅ [ARZYABI] Practice detected: voice with caption');
                    return true;
                }
            }

            // روش 2: صوت با ریپلای به متن "تکلیف"
            if (message.voice && message.reply_to_message && isVoiceWithReplyTaskEnabled()) {
                const replyText = message.reply_to_message.text || '';
                const replyLower = replyText.toLowerCase().trim();
                if (replyLower.includes('تکلیف') || replyLower.includes('تمرین')) {
                    console.log('✅ [ARZYABI] Practice detected: voice with reply to task');
                    return true;
                }
            }

            // روش 3: صوت با ریپلای به "قرآن آموز"
            if (message.voice && message.reply_to_message && isVoiceWithReplyStudentEnabled()) {
                const replyText = message.reply_to_message.text || '';
                const replyLower = replyText.toLowerCase().trim();
                if (replyLower.includes('قرآن آموز')) {
                    console.log('✅ [ARZYABI] Practice detected: voice with reply to student');
                    return true;
                }
            }

            // روش 4: متن "تکلیف" یا "تمرین" (برای تست)
            if (message.text && isTextOnlyEnabled()) {
                const text = message.text.toLowerCase().trim();
                if (text === 'تکلیف' || text === 'تمرین') {
                    console.log('✅ [ARZYABI] Practice detected: text only');
                    return true;
                }
            }

            // روش 5: متن ریپلای به صوت (مثل "تکلیف" ریپلای به صوت)
            if (message.text && message.reply_to_message && message.reply_to_message.voice && isTextReplyToVoiceEnabled()) {
                const text = message.text.toLowerCase().trim();
                if (text.includes('تکلیف') || text.includes('تمرین') || text.includes('قرآن آموز')) {
                    console.log('✅ [ARZYABI] Practice detected: text reply to voice message');
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('❌ [ARZYABI] Error in isPracticeMessage:', error.message);
            return false;
        }
    }

    // ===== پردازش پیام تمرین =====
    processPracticeMessage(message, userData) {
        try {
            // بررسی اینکه آیا پیام تمرین است
            if (!this.isPracticeSubmission(message)) {
                return null;
            }

            // بررسی نقش کاربر (STUDENT یا quran_student)
            if (userData.user_type !== 'quran_student' && userData.user_type !== 'STUDENT') {
                return {
                    success: false,
                    message: "⚠️ فقط قرآن‌آموزان می‌توانند تمرین ارسال کنند."
                };
            }

            // بررسی اینکه آیا زمان تمرین است
            if (!this.isPracticeTime()) {
                return {
                    success: false,
                    message: "⚠️ زمان ارسال تمرین نیست. لطفاً در ساعات مشخص شده تمرین ارسال کنید."
                };
            }

            // پردازش تمرین جدید
            const result = this.handleNewPractice(message, userData);
            
            if (result.success) {
                // ایجاد کیبورد ارزیابی
                const keyboardData = this.createEvaluationKeyboard(result.evaluation_id, userData.full_name || userData.first_name);
                
                return {
                    success: true,
                    message: result.message,
                    evaluation_id: result.evaluation_id,
                    keyboard: keyboardData
                };
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ [ARZYABI] خطا در پردازش پیام تمرین:', error.message);
            return { success: false, message: '❌ خطا در پردازش تمرین' };
        }
    }

    // ===== تابع اصلی پردازش callback ارزیابی =====
    processEvaluationCallback(callbackData, evaluatorId, evaluatorName, userRole) {
        try {
            // بررسی نقش کاربر (مربی یا کمک مربی - هماهنگ با سیستم مرکزی)
            if (!['teacher', 'assistant_teacher', 'COACH', 'ASSISTANT'].includes(userRole)) {
                return {
                    success: false,
                    message: "⚠️ فقط مربیان و کمک مربیان می‌توانند ارزیابی کنند."
                };
            }

            // پردازش callback ارزیابی
            return this.handleEvaluationCallback(callbackData, evaluatorId, evaluatorName);
            
        } catch (error) {
            console.error('❌ [ARZYABI] خطا در پردازش callback ارزیابی:', error.message);
            return { success: false, message: '❌ خطا در پردازش ارزیابی' };
        }
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

    // ===== تشخیص تمرین جدید =====
    isPracticeSubmission(message) {
        try {
            // فقط حالت: متن "تکلیف" + ریپلای به صوت (طبق درخواست کاربر)
            if (message.text && message.reply_to_message?.voice) {
                const text = message.text.toLowerCase().trim();
                if (text.includes('تکلیف') || text.includes('تمرین')) {
                    console.log('✅ 
                        [ARZYABI] تمرین تشخیص داده شد: متن تکلیف + ریپلای به صوت');
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('❌ [ARZYABI] خطا در تشخیص تمرین:', error.message);
            return false;
        }
    }

    // ===== پردازش تمرین جدید =====
    handleNewPractice(message, userData) {
        try {
            const userId = message.from.id;
            const chatId = message.chat.id;
            const messageId = message.message_id;
            const currentTime = this.getCurrentTime();
            
            // ایجاد ID منحصر به فرد
            const evaluationId = `eval_${userId}_${Date.now()}`;
            
            // ذخیره در pending_evaluations
            this.evaluationData.pending_evaluations[evaluationId] = {
                user_id: userId,
                user_name: userData.full_name || userData.first_name || `کاربر ${userId}`,
                chat_id: chatId,
                message_id: messageId,
                submission_time: currentTime,
                evaluations: {},
                status: 'waiting_for_evaluation'
            };
            
            this.saveEvaluationData();
            
            // ارسال گزارش به گروه گزارش
            this.sendPracticeReportToAdmin(userId, userData, evaluationId, this.getCurrentDate(), currentTime);
            
            console.log(`✅ [ARZYABI] تمرین جدید ثبت شد: ${evaluationId}`);
            
            return {
                success: true,
                evaluation_id: evaluationId,
                message: `✅ تمرین شما با موفقیت ثبت شد!\n📝 منتظر ارزیابی مربیان هستیم.`
            };
            
        } catch (error) {
            console.error('❌ [ARZYABI] خطا در پردازش تمرین:', error.message);
            return { success: false, message: '❌ خطا در ثبت تمرین' };
        }
    }

    // ===== ایجاد کیبورد ارزیابی =====
    createEvaluationKeyboard(evaluationId, studentName) {
        const keyboard = [
            [
                { text: "🔴 نیاز به تلاش بیشتر", callback_data: `evaluate_${evaluationId}_1` },
                { text: "🟡 متوسط", callback_data: `evaluate_${evaluationId}_2` }
            ],
            [
                { text: "🟢 خوب", callback_data: `evaluate_${evaluationId}_3` },
                { text: "🔵 عالی", callback_data: `evaluate_${evaluationId}_4` }
            ],
            [
                { text: "⭐ ممتاز", callback_data: `evaluate_${evaluationId}_5` }
            ]
        ];

        return {
            text: `📝 **ارزیابی تمرین قرآن‌آموز**\n\n👤 قرآن‌آموز: ${studentName}\n\n📊 لطفاً تمرین ارسالی را ارزیابی کنید:`,
            keyboard: keyboard
        };
    }

    // ===== پردازش ارزیابی مربی =====
    handleEvaluationCallback(callbackData, evaluatorId, evaluatorName) {
        try {
            const parts = callbackData.split('_');
            if (parts.length < 3) {
                return { success: false, message: "❌ فرمت callback نامعتبر است." };
            }

            const evaluationId = parts[1];
            const score = parseInt(parts[2]);

            // بررسی وجود ارزیابی
            if (!this.evaluationData.pending_evaluations[evaluationId]) {
                return { success: false, message: "❌ ارزیابی مورد نظر یافت نشد." };
            }

            // ذخیره ارزیابی
            this.evaluationData.pending_evaluations[evaluationId].evaluations[evaluatorId] = {
                evaluator_id: evaluatorId,
                evaluator_name: evaluatorName,
                score: score,
                evaluation_time: this.getCurrentTime()
            };

            this.saveEvaluationData();

            // بررسی تکمیل ارزیابی
            this.checkEvaluationCompletion(evaluationId);

            // ارسال گزارش به گروه گزارش
            this.sendEvaluationReportToAdmin(evaluationId);

            console.log(`✅ [ARZYABI] ارزیابی ثبت شد: ${evaluationId} توسط ${evaluatorName}`);

            const scoreText = ["نیاز به تلاش بیشتر", "متوسط", "خوب", "عالی", "ممتاز"][score - 1];
            return {
                success: true,
                message: `✅ ارزیابی شما ثبت شد!\n\n📊 نمره: ${scoreText} (${score}/5)\n👤 قرآن‌آموز: ${evaluation.user_name}\n⏰ زمان: ${this.getCurrentTime()}`
            };

        } catch (error) {
            console.error('❌ [ARZYABI] خطا در پردازش ارزیابی:', error.message);
            return { success: false, message: '❌ خطا در ثبت ارزیابی' };
        }
    }

    // ===== بررسی تکمیل ارزیابی =====
    checkEvaluationCompletion(evaluationId) {
        try {
            const evaluation = this.evaluationData.pending_evaluations[evaluationId];
            if (!evaluation) return;

            // اگر حداقل 2 ارزیابی وجود دارد، تکمیل کن
            if (Object.keys(evaluation.evaluations).length >= 2) {
                this.completeEvaluation(evaluationId);
            }
        } catch (error) {
            console.error('❌ [ARZYABI] خطا در بررسی تکمیل ارزیابی:', error.message);
        }
    }

    // ===== تکمیل ارزیابی =====
    completeEvaluation(evaluationId) {
        try {
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
                completion_time: this.getCurrentTime(),
                status: 'completed'
            };

            // حذف از ارزیابی‌های در انتظار
            delete this.evaluationData.pending_evaluations[evaluationId];
            this.saveEvaluationData();

            console.log(`✅ [ARZYABI] ارزیابی تکمیل شد: ${evaluationId} - سطح: ${overallLevel}`);
            
            // ارسال پیام تکمیل ارزیابی به گروه اصلی
            if (this.sendMessage) {
                try {
                    const completionMessage = `🎉 **ارزیابی تکمیل شد!**\n\n` +
                        `👤 قرآن‌آموز: ${evaluation.user_name}\n` +
                        `📊 میانگین نمرات: ${averageScore.toFixed(1)}/5\n` +
                        `🏆 سطح کلی: ${overallLevel}\n` +
                        `⏰ زمان تکمیل: ${this.getCurrentTime()}`;
                    
                    this.sendMessage(evaluation.chat_id, completionMessage);
                    console.log('📤 پیام تکمیل ارزیابی به گروه اصلی ارسال شد');
                } catch (error) {
                    console.error('❌ [ARZYABI] خطا در ارسال پیام تکمیل:', error.message);
                }
            }

        } catch (error) {
            console.error('❌ [ARZYABI] خطا در تکمیل ارزیابی:', error.message);
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

    // ===== ارسال گزارش تمرین به گروه گزارش =====
    sendPracticeReportToAdmin(userId, userData, evaluationId, date, time) {
        // دریافت ساعت‌های فعال تمرین
        const { getPracticeHours } = require('./3config');
        const practiceHours = getPracticeHours();
        const hoursText = practiceHours.length > 0 ? 
            practiceHours.map(h => `${h}:00`).join(', ') : 
            'تنظیم نشده';
        
        let reportText = `📝 **گزارش تمرین جدید**\n\n` +
            `👤 کاربر: ${userData.full_name || userData.first_name || `کاربر ${userId}`}\n`;
        
        if (evaluationId) {
            reportText += `🆔 کد ارزیابی: ${evaluationId}\n`;
        }
        
        reportText += `📅 تاریخ: ${date}\n` +
            `⏰ زمان: ${time}\n` +
            `⏰ ساعت‌های تمرین: ${hoursText}\n` +
            `📊 وضعیت: در انتظار ارزیابی\n\n` +
            `🔔 لطفاً مربیان محترم این تمرین را ارزیابی کنند.`;

        // ارسال به گروه گزارش
        if (this.sendMessage) {
            try {
                const { REPORT_GROUP_ID } = require('./6mid');
                this.sendMessage(REPORT_GROUP_ID, reportText);
                console.log('📤 گزارش تمرین به گروه گزارش ارسال شد:', reportText);
            } catch (error) {
                console.error('❌ [ARZYABI] Error sending practice report to admin group:', error.message);
            }
        } else {
            console.log('📤 گزارش تمرین به گروه گزارش ارسال شد (sendMessage not set):', reportText);
        }
        
        return reportText;
    }

    // ===== ارسال گزارش ارزیابی به گروه گزارش =====
    sendEvaluationReportToAdmin(evaluationId) {
        try {
            const evaluation = this.evaluationData.pending_evaluations[evaluationId];
            if (!evaluation) return;

            let reportText = `📊 **گزارش ارزیابی جدید**\n\n` +
                `👤 قرآن‌آموز: ${evaluation.user_name}\n` +
                `📅 تاریخ: ${this.getCurrentDate()}\n\n` +
                `**📋 لیست ارزیابی‌های فعلی:**\n`;

            if (Object.keys(evaluation.evaluations).length === 0) {
                reportText += "❌ هنوز ارزیابی‌ای ثبت نشده است.";
            } else {
                let index = 1;
                for (const [evaluatorId, evalData] of Object.entries(evaluation.evaluations)) {
                    const scoreText = ["نیاز به تلاش بیشتر", "متوسط", "خوب", "عالی", "ممتاز"][evalData.score - 1];
                    const emoji = ["🔴", "🟡", "🟢", "🔵", "⭐"][evalData.score - 1];
                    reportText += `${index}. ${emoji} ${evalData.evaluator_name}: ${scoreText} (${evalData.score}/5)\n`;
                    index++;
                }
                
                // نمایش تعداد ارزیابی‌های باقی‌مانده
                const remainingEvaluations = 2 - Object.keys(evaluation.evaluations).length;
                if (remainingEvaluations > 0) {
                    reportText += `\n⏳ ${remainingEvaluations} ارزیابی دیگر برای تکمیل نیاز است.`;
                } else {
                    reportText += `\n✅ ارزیابی‌ها تکمیل شده است!`;
                }
            }

            reportText += `\n📅 تاریخ: ${this.getCurrentDate()}`;

            // ارسال به گروه گزارش
            if (this.sendMessage) {
                try {
                    const { REPORT_GROUP_ID } = require('./6mid');
                    this.sendMessage(REPORT_GROUP_ID, reportText);
                    console.log('📤 گزارش ارزیابی به گروه گزارش ارسال شد:', reportText);
                } catch (error) {
                    console.error('❌ [ARZYABI] خطا در ارسال گزارش ارزیابی:', error.message);
                }
            } else {
                console.log('📤 گزارش ارزیابی به گروه گزارش ارسال شد (sendMessage not set):', reportText);
            }
            
            return reportText;
        } catch (error) {
            console.error('❌ [ARZYABI] خطا در ارسال گزارش ارزیابی:', error.message);
        }
    }

    // ===== گزارش‌گیری =====
    generateWeeklyReport(weekStartDate) {
        const weekEndDate = this.addDays(weekStartDate, 6);
        
        // دریافت ساعت‌های فعال تمرین
        const { getPracticeHours } = require('./3config');
        const practiceHours = getPracticeHours();
        const hoursText = practiceHours.length > 0 ? 
            practiceHours.map(h => `${h}:00`).join(', ') : 
            'تنظیم نشده';
        
        const report = {
            week_start: weekStartDate,
            week_end: weekEndDate,
            practice_hours: hoursText,
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
        // دریافت ساعت‌های فعال تمرین
        const { getPracticeHours } = require('./3config');
        const practiceHours = getPracticeHours();
        const hoursText = practiceHours.length > 0 ? 
            practiceHours.map(h => `${h}:00`).join(', ') : 
            'تنظیم نشده';
        
        const report = {
            year: year,
            month: month,
            practice_hours: hoursText,
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
            .filter(evaluation => evaluation.completion_time && evaluation.completion_time.startsWith(date));
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
        // تنظیمات تمرین حالا از 3config.js خوانده می‌شود
        console.log('✅ [ARZYABI] Practice schedule settings are now managed centrally via 3config.js');
        return { success: true, message: "✅ تنظیمات زمان تمرین از پنل مدیر مدیریت می‌شود." };
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

    // ===== نمایش وضعیت ارزیابی‌های در انتظار =====
    getPendingEvaluationsStatus() {
        const pendingEvaluations = this.evaluationData.pending_evaluations;
        const pendingCount = Object.keys(pendingEvaluations).length;
        
        if (pendingCount === 0) {
            return {
                has_pending: false,
                message: "✅ هیچ ارزیابی در انتظار وجود ندارد."
            };
        }

        let statusMessage = `📋 **وضعیت ارزیابی‌های در انتظار**\n\n`;
        statusMessage += `📊 تعداد کل: ${pendingCount} ارزیابی\n\n`;

        Object.entries(pendingEvaluations).forEach(([evaluationId, evaluation], index) => {
            const evaluationCount = Object.keys(evaluation.evaluations).length;
            const remainingCount = 2 - evaluationCount;
            const progressBar = "🟢".repeat(evaluationCount) + "⚪".repeat(remainingCount);
            
            statusMessage += `${index + 1}. 👤 ${evaluation.user_name}\n`;
            statusMessage += `   📊 ${evaluationCount}/2 ارزیابی ${progressBar}\n`;
            statusMessage += `   ⏳ ${remainingCount} ارزیابی باقی‌مانده\n\n`;
        });

        return {
            has_pending: true,
            message: statusMessage
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
        try {
            const { getPracticeDays, getPracticeHours } = require('./3config');
            const now = new Date();
            const currentDay = now.getDay();
            const currentHour = now.getHours();
            
            // تبدیل صحیح به روزهای هفته فارسی
            let persianDay;
            if (currentDay === 0) persianDay = 1;      // یکشنبه -> 1
            else if (currentDay === 1) persianDay = 2; // دوشنبه -> 2
            else if (currentDay === 2) persianDay = 3; // سه‌شنبه -> 3
            else if (currentDay === 3) persianDay = 4; // چهارشنبه -> 4
            else if (currentDay === 4) persianDay = 5; // پنج‌شنبه -> 5
            else if (currentDay === 5) persianDay = 6; // جمعه -> 6
            else if (currentDay === 6) persianDay = 0; // شنبه -> 0
            
            const practiceDays = getPracticeDays();
            const practiceHours = getPracticeHours();
            
            const isActiveDay = practiceDays.includes(persianDay);
            const isActiveHour = practiceHours.includes(currentHour);
            
            const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
            const currentDayName = dayNames[persianDay];
            
            return {
                is_active: this.isPracticeTime(),
                current_day: currentDayName,
                current_hour: currentHour,
                is_active_day: isActiveDay,
                is_active_hour: isActiveHour,
                schedule: { days: practiceDays, hours: practiceHours }
            };
        } catch (error) {
            console.error('❌ [ARZYABI] Error in getPracticeTimeStatus:', error.message);
            return { is_active: false, error: error.message };
        }
    }

    // ===== نمایش آمار کامل =====
    getCompleteStatistics() {
        try {
            const stats = this.getStatistics();
            const timeStatus = this.getPracticeTimeStatus();
            const pendingStatus = this.getPendingEvaluationsStatus();
            
            let report = `📊 **آمار کامل سیستم ارزیابی**\n\n`;
            
            // وضعیت زمان تمرین
            report += `⏰ **وضعیت زمان تمرین:**\n`;
            report += `   📅 روز: ${timeStatus.current_day}\n`;
            report += `   🕐 ساعت: ${timeStatus.current_hour}:00\n`;
            report += `   🔴 فعال: ${timeStatus.is_active ? '✅ بله' : '❌ خیر'}\n`;
            report += `   📋 روزهای فعال: ${timeStatus.schedule.days.map(d => ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'][d]).join(', ')}\n`;
            report += `   ⏰ ساعت‌های فعال: ${timeStatus.schedule.hours.map(h => `${h}:00`).join(', ')}\n\n`;
            
            // آمار تمرین‌ها
            report += `📝 **آمار تمرین‌ها:**\n`;
            report += `   📅 امروز: ${stats.today_practices} تمرین\n`;
            report += `   ⏳ در انتظار ارزیابی: ${stats.total_pending_evaluations} تمرین\n`;
            report += `   ✅ تکمیل شده: ${stats.total_completed_evaluations} تمرین\n`;
            report += `   📊 نظرسنجی: ${stats.total_satisfaction_surveys} نظرسنجی\n\n`;
            
            // وضعیت ارزیابی‌های در انتظار
            if (pendingStatus.has_pending) {
                report += pendingStatus.message;
            } else {
                report += pendingStatus.message + '\n';
            }
            
            return {
                success: true,
                message: report
            };
            
        } catch (error) {
            console.error('❌ [ARZYABI] خطا در تولید آمار کامل:', error.message);
            return {
                success: false,
                message: '❌ خطا در تولید آمار'
            };
        }
    }

    // ===== تنظیم توابع ارسال پیام =====
    setSendMessage(sendMessage) {
        this.sendMessage = sendMessage;
    }

    setSendMessageWithInlineKeyboard(sendMessageWithInlineKeyboard) {
        this.sendMessageWithInlineKeyboard = sendMessageWithInlineKeyboard;
    }

    setEditMessageWithInlineKeyboard(editMessageWithInlineKeyboard) {
        this.editMessageWithInlineKeyboard = editMessageWithInlineKeyboard;
    }
}

module.exports = { ArzyabiModule };
