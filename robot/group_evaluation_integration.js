// 🔗 ادغام سیستم ارزیابی و مدیریت گروه با ربات اصلی
// نمونه استفاده از سیستم در ربات تلگرام/بله

const { groupEvaluationConfig } = require('./group_evaluation_config');
const { groupEvaluationManager } = require('./group_evaluation_manager');
const { evaluationModule } = require('./evaluation_module');

class GroupEvaluationIntegration {
  constructor() {
    this.isInitialized = false;
    console.log('🔗 [INTEGRATION] Group Evaluation Integration initialized');
  }

  // راه‌اندازی سیستم
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('⚠️ [INTEGRATION] System already initialized');
        return true;
      }

      // شروع سیستم مدیریت
      const startResult = groupEvaluationManager.start();
      if (!startResult) {
        throw new Error('Failed to start group evaluation manager');
      }

      this.isInitialized = true;
      console.log('✅ [INTEGRATION] Group Evaluation System initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ [INTEGRATION] Error initializing system:', error);
      return false;
    }
  }

  // پردازش دستورات کاربر
  async handleCommand(userId, command, args = []) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const userInfo = require('./3config').getUserInfo(userId);
      if (!userInfo) {
        return { success: false, message: 'کاربر شناسایی نشد' };
      }

      switch (command) {
        case 'start_eval':
          return await this.handleStartEvaluation(userId, userInfo);
        
        case 'stop_eval':
          return await this.handleStopEvaluation(userId, userInfo);
        
        case 'close_group':
          return await this.handleCloseGroup(userId, userInfo, args);
        
        case 'open_group':
          return await this.handleOpenGroup(userId, userInfo, args);
        
        case 'eval_status':
          return await this.handleEvaluationStatus(userId, userInfo);
        
        case 'group_status':
          return await this.handleGroupStatus(userId, userInfo, args);
        
        case 'add_question':
          return await this.handleAddQuestion(userId, userInfo, args);
        
        case 'eval_config':
          return await this.handleEvaluationConfig(userId, userInfo, args);
        
        case 'help':
          return await this.handleHelp(userId, userInfo);
        
        default:
          return { success: false, message: 'دستور نامعتبر' };
      }

    } catch (error) {
      console.error('❌ [INTEGRATION] Error handling command:', error);
      return { success: false, message: 'خطا در پردازش دستور' };
    }
  }

  // شروع ارزیابی
  async handleStartEvaluation(userId, userInfo) {
    try {
      if (!groupEvaluationConfig.hasPermission(userId, 'evaluationAccess')) {
        return { success: false, message: 'شما دسترسی به شروع ارزیابی ندارید' };
      }

      const sessionId = await groupEvaluationManager.startEvaluation();
      if (!sessionId) {
        return { success: false, message: 'خطا در شروع ارزیابی' };
      }

      return {
        success: true,
        message: `🎯 ارزیابی شروع شد!\n\nشناسه جلسه: ${sessionId}\n⏰ مدت زمان: ${groupEvaluationConfig.getConfig().evaluation.evaluationDuration} دقیقه`,
        sessionId: sessionId
      };

    } catch (error) {
      console.error('❌ [INTEGRATION] Error starting evaluation:', error);
      return { success: false, message: 'خطا در شروع ارزیابی' };
    }
  }

  // توقف ارزیابی
  async handleStopEvaluation(userId, userInfo) {
    try {
      if (!groupEvaluationConfig.hasPermission(userId, 'evaluationAccess')) {
        return { success: false, message: 'شما دسترسی به توقف ارزیابی ندارید' };
      }

      // پیدا کردن جلسه فعال
      const status = groupEvaluationManager.getStatus();
      const activeSessions = status.evaluationSessions.filter(s => s.status === 'active');
      
      if (activeSessions.length === 0) {
        return { success: false, message: 'هیچ جلسه ارزیابی فعالی وجود ندارد' };
      }

      // پایان دادن به اولین جلسه فعال
      const sessionId = activeSessions[0].id;
      const results = evaluationModule.endEvaluationSession(sessionId);
      
      if (!results) {
        return { success: false, message: 'خطا در پایان دادن به ارزیابی' };
      }

      return {
        success: true,
        message: `🏁 ارزیابی به پایان رسید!\n\n📊 نتایج:\n👥 تعداد شرکت‌کنندگان: ${results.totalParticipants}\n📈 میانگین نمره: ${results.statistics.averageScore}%\n✅ قبول شدگان: ${results.statistics.passedCount}`,
        results: results
      };

    } catch (error) {
      console.error('❌ [INTEGRATION] Error stopping evaluation:', error);
      return { success: false, message: 'خطا در توقف ارزیابی' };
    }
  }

  // بستن گروه
  async handleCloseGroup(userId, userInfo, args) {
    try {
      if (!groupEvaluationConfig.hasPermission(userId, 'groupControlAccess')) {
        return { success: false, message: 'شما دسترسی به بستن گروه ندارید' };
      }

      const groupId = args[0] ? parseInt(args[0]) : null;
      
      if (groupId) {
        // بستن گروه خاص
        const result = await groupEvaluationManager.closeGroup(groupId);
        if (result) {
          return { success: true, message: `🔒 گروه ${groupId} بسته شد` };
        } else {
          return { success: false, message: `خطا در بستن گروه ${groupId}` };
        }
      } else {
        // بستن تمام گروه‌ها
        await groupEvaluationManager.closeAllGroups();
        return { success: true, message: '🔒 تمام گروه‌ها بسته شدند' };
      }

    } catch (error) {
      console.error('❌ [INTEGRATION] Error closing group:', error);
      return { success: false, message: 'خطا در بستن گروه' };
    }
  }

  // باز کردن گروه
  async handleOpenGroup(userId, userInfo, args) {
    try {
      if (!groupEvaluationConfig.hasPermission(userId, 'groupControlAccess')) {
        return { success: false, message: 'شما دسترسی به باز کردن گروه ندارید' };
      }

      const groupId = args[0] ? parseInt(args[0]) : null;
      
      if (groupId) {
        // باز کردن گروه خاص
        const result = await groupEvaluationManager.openGroup(groupId);
        if (result) {
          return { success: true, message: `🔓 گروه ${groupId} باز شد` };
        } else {
          return { success: false, message: `خطا در باز کردن گروه ${groupId}` };
        }
      } else {
        // باز کردن تمام گروه‌ها
        await groupEvaluationManager.openAllGroups();
        return { success: true, message: '🔓 تمام گروه‌ها باز شدند' };
      }

    } catch (error) {
      console.error('❌ [INTEGRATION] Error opening group:', error);
      return { success: false, message: 'خطا در باز کردن گروه' };
    }
  }

  // وضعیت ارزیابی
  async handleEvaluationStatus(userId, userInfo) {
    try {
      const status = groupEvaluationManager.getStatus();
      const activeSessions = status.evaluationSessions.filter(s => s.status === 'active');
      
      if (activeSessions.length === 0) {
        return { success: true, message: '📊 هیچ جلسه ارزیابی فعالی وجود ندارد' };
      }

      const session = activeSessions[0];
      const sessionStatus = evaluationModule.getSessionStatus(session.id);
      
      const message = `📊 وضعیت ارزیابی:\n\n🆔 شناسه جلسه: ${session.id}\n⏰ مدت زمان: ${session.duration} دقیقه\n📝 تعداد سوالات: ${session.questionsCount}\n👥 شرکت‌کنندگان: ${session.participantsCount}\n⏳ زمان باقی‌مانده: ${Math.round(session.remainingTime / 1000 / 60)} دقیقه`;

      return { success: true, message: message, sessionStatus: sessionStatus };

    } catch (error) {
      console.error('❌ [INTEGRATION] Error getting evaluation status:', error);
      return { success: false, message: 'خطا در دریافت وضعیت ارزیابی' };
    }
  }

  // وضعیت گروه
  async handleGroupStatus(userId, userInfo, args) {
    try {
      const groupId = args[0] ? parseInt(args[0]) : null;
      
      if (groupId) {
        // وضعیت گروه خاص
        const status = groupEvaluationManager.getGroupStatus(groupId);
        const statusText = status.status === 'closed' ? 'بسته' : status.status === 'open' ? 'باز' : 'نامشخص';
        
        return {
          success: true,
          message: `🔍 وضعیت گروه ${groupId}:\n\n📊 وضعیت: ${statusText}\n⏰ آخرین تغییر: ${status.timestamp ? new Date(status.timestamp).toLocaleString('fa-IR') : 'نامشخص'}`
        };
      } else {
        // وضعیت تمام گروه‌ها
        const allStatus = groupEvaluationManager.getStatus().groupStatus;
        let message = '🔍 وضعیت تمام گروه‌ها:\n\n';
        
        for (const [gId, status] of Object.entries(allStatus)) {
          const statusText = status.status === 'closed' ? '🔒' : '🔓';
          message += `${statusText} گروه ${gId}: ${status.status === 'closed' ? 'بسته' : 'باز'}\n`;
        }
        
        return { success: true, message: message };
      }

    } catch (error) {
      console.error('❌ [INTEGRATION] Error getting group status:', error);
      return { success: false, message: 'خطا در دریافت وضعیت گروه' };
    }
  }

  // اضافه کردن سوال
  async handleAddQuestion(userId, userInfo, args) {
    try {
      if (!groupEvaluationConfig.hasPermission(userId, 'evaluationAccess')) {
        return { success: false, message: 'شما دسترسی به اضافه کردن سوال ندارید' };
      }

      if (args.length < 6) {
        return { 
          success: false, 
          message: 'فرمت صحیح: /add_question دسته سوال گزینه1 گزینه2 گزینه3 گزینه4 پاسخ_صحیح سطح_دشواری توضیح' 
        };
      }

      const question = {
        category: args[0],
        question: args[1],
        options: [args[2], args[3], args[4], args[5]],
        correctAnswer: parseInt(args[6]) - 1, // تبدیل به index (0-3)
        difficulty: args[7] || 'متوسط',
        explanation: args.slice(8).join(' ') || 'توضیحی ارائه نشده'
      };

      const questionId = evaluationModule.addQuestion(question);
      if (questionId) {
        return { 
          success: true, 
          message: `✅ سوال جدید اضافه شد!\n\n🆔 شناسه: ${questionId}\n📝 سوال: ${question.question}\n📊 دسته: ${question.category}` 
        };
      } else {
        return { success: false, message: 'خطا در اضافه کردن سوال' };
      }

    } catch (error) {
      console.error('❌ [INTEGRATION] Error adding question:', error);
      return { success: false, message: 'خطا در اضافه کردن سوال' };
    }
  }

  // تنظیمات ارزیابی
  async handleEvaluationConfig(userId, userInfo, args) {
    try {
      if (!groupEvaluationConfig.hasPermission(userId, 'configAccess')) {
        return { success: false, message: 'شما دسترسی به تنظیمات ندارید' };
      }

      if (args.length < 2) {
        return { 
          success: false, 
          message: 'فرمت صحیح: /eval_config تنظیم مقدار\n\nتنظیمات موجود:\n- time: زمان ارزیابی (مثل 20:00)\n- close_time: زمان بستن گروه\n- open_time: زمان باز کردن گروه\n- enabled: فعال/غیرفعال کردن سیستم' 
        };
      }

      const setting = args[0];
      const value = args[1];

      let result = false;
      let message = '';

      switch (setting) {
        case 'time':
          result = groupEvaluationConfig.setEvaluationTime(value, userInfo.name);
          message = result ? `✅ زمان ارزیابی به ${value} تنظیم شد` : '❌ خطا در تنظیم زمان';
          break;
        
        case 'close_time':
          result = groupEvaluationConfig.setGroupCloseTime(value, userInfo.name);
          message = result ? `✅ زمان بستن گروه به ${value} تنظیم شد` : '❌ خطا در تنظیم زمان';
          break;
        
        case 'open_time':
          result = groupEvaluationConfig.setGroupOpenTime(value, userInfo.name);
          message = result ? `✅ زمان باز کردن گروه به ${value} تنظیم شد` : '❌ خطا در تنظیم زمان';
          break;
        
        case 'enabled':
          const enabled = value.toLowerCase() === 'true';
          result = groupEvaluationConfig.setSystemEnabled(enabled, userInfo.name);
          message = result ? `✅ سیستم ${enabled ? 'فعال' : 'غیرفعال'} شد` : '❌ خطا در تغییر وضعیت';
          break;
        
        default:
          message = '❌ تنظیم نامعتبر';
          break;
      }

      return { success: result, message: message };

    } catch (error) {
      console.error('❌ [INTEGRATION] Error configuring evaluation:', error);
      return { success: false, message: 'خطا در تنظیمات' };
    }
  }

  // راهنما
  async handleHelp(userId, userInfo) {
    const helpMessage = `📚 راهنمای سیستم ارزیابی و مدیریت گروه:

🎯 دستورات ارزیابی:
/start_eval - شروع ارزیابی
/stop_eval - توقف ارزیابی
/eval_status - وضعیت ارزیابی

🔒 دستورات مدیریت گروه:
/close_group [گروه] - بستن گروه (یا تمام گروه‌ها)
/open_group [گروه] - باز کردن گروه (یا تمام گروه‌ها)
/group_status [گروه] - وضعیت گروه (یا تمام گروه‌ها)

📝 دستورات مدیریت سوالات:
/add_question دسته سوال گزینه1 گزینه2 گزینه3 گزینه4 پاسخ سطح توضیح

⚙️ دستورات تنظیمات:
/eval_config تنظیم مقدار - تغییر تنظیمات سیستم

📊 دستورات اطلاعات:
/help - نمایش این راهنما

💡 نکات:
- پاسخ صحیح باید عدد 1 تا 4 باشد
- سطح دشواری: آسان، متوسط، سخت
- زمان‌ها باید به فرمت HH:MM باشند`;

    return { success: true, message: helpMessage };
  }

  // دریافت وضعیت کلی سیستم
  getSystemStatus() {
    try {
      const configStatus = groupEvaluationConfig.getSystemStatus();
      const managerStatus = groupEvaluationManager.getStatus();
      
      return {
        config: configStatus,
        manager: managerStatus,
        integration: {
          isInitialized: this.isInitialized,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ [INTEGRATION] Error getting system status:', error);
      return null;
    }
  }

  // توقف سیستم
  async shutdown() {
    try {
      if (this.isInitialized) {
        groupEvaluationManager.stop();
        this.isInitialized = false;
        console.log('✅ [INTEGRATION] System shutdown successfully');
      }
    } catch (error) {
      console.error('❌ [INTEGRATION] Error during shutdown:', error);
    }
  }
}

// ایجاد نمونه از کلاس
const groupEvaluationIntegration = new GroupEvaluationIntegration();

module.exports = {
  GroupEvaluationIntegration,
  groupEvaluationIntegration
};
