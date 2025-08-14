// 🎯 ماژول مدیریت گروه و ارزیابی - نسخه 1.0.0
// مدیریت بستن/باز کردن گروه و سیستم ارزیابی خودکار

const { groupEvaluationConfig } = require('./group_evaluation_config');
const { getUserInfo } = require('./3config');

class GroupEvaluationManager {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.evaluationSessions = new Map();
    this.groupStatus = new Map(); // وضعیت گروه‌ها
    this.lastActions = new Map(); // آخرین اقدامات انجام شده
    
    console.log('✅ [GROUP_EVAL_MANAGER] Manager initialized successfully');
  }

  // شروع سیستم مدیریت
  start() {
    if (this.isRunning) {
      console.log('⚠️ [GROUP_EVAL_MANAGER] Manager is already running');
      return false;
    }

    const config = groupEvaluationConfig.getConfig();
    if (!config.systemEnabled) {
      console.log('⚠️ [GROUP_EVAL_MANAGER] System is disabled in config');
      return false;
    }

    this.isRunning = true;
    this.checkInterval = setInterval(() => {
      this.checkScheduledActions();
    }, 60000); // بررسی هر دقیقه

    console.log('✅ [GROUP_EVAL_MANAGER] Manager started successfully');
    return true;
  }

  // توقف سیستم مدیریت
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ [GROUP_EVAL_MANAGER] Manager is not running');
      return false;
    }

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('✅ [GROUP_EVAL_MANAGER] Manager stopped successfully');
    return true;
  }

  // بررسی اقدامات زمان‌بندی شده
  async checkScheduledActions() {
    try {
      const config = groupEvaluationConfig.getConfig();
      
      if (!config.systemEnabled) return;

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDay = now.getDay();

      // بررسی زمان ارزیابی
      if (config.evaluation.enabled && this.shouldStartEvaluation(currentTime, currentDay)) {
        await this.startEvaluation();
      }

      // بررسی زمان بستن گروه
      if (config.groupManagement.enabled && this.shouldCloseGroup(currentTime, currentDay)) {
        await this.closeAllGroups();
      }

      // بررسی زمان باز کردن گروه
      if (config.groupManagement.enabled && this.shouldOpenGroup(currentTime, currentDay)) {
        await this.openAllGroups();
      }

      // بررسی برنامه‌های سفارشی
      await this.checkCustomSchedules(currentTime, currentDay);

    } catch (error) {
      console.error('❌ [GROUP_EVAL_MANAGER] Error in scheduled actions check:', error);
    }
  }

  // بررسی اینکه آیا باید ارزیابی شروع شود
  shouldStartEvaluation(currentTime, currentDay) {
    const config = groupEvaluationConfig.getConfig();
    return config.evaluation.evaluationDays.includes(currentDay) && 
           currentTime === config.evaluation.evaluationTime;
  }

  // بررسی اینکه آیا باید گروه بسته شود
  shouldCloseGroup(currentTime, currentDay) {
    const config = groupEvaluationConfig.getConfig();
    if (!config.groupManagement.autoClose) return false;

    if (config.groupManagement.weekendMode && currentDay === 6) {
      return currentTime === config.groupManagement.weekendCloseTime;
    }
    return currentTime === config.groupManagement.closeTime;
  }

  // بررسی اینکه آیا باید گروه باز شود
  shouldOpenGroup(currentTime, currentDay) {
    const config = groupEvaluationConfig.getConfig();
    if (!config.groupManagement.autoOpen) return false;

    if (config.groupManagement.weekendMode && currentDay === 0) {
      return currentTime === config.groupManagement.weekendOpenTime;
    }
    return currentTime === config.groupManagement.openTime;
  }

  // شروع ارزیابی
  async startEvaluation() {
    try {
      const config = groupEvaluationConfig.getConfig();
      const sessionId = `eval_${Date.now()}`;
      
      const evaluationSession = {
        id: sessionId,
        startTime: new Date(),
        duration: config.evaluation.evaluationDuration,
        questions: config.evaluation.questionsPerEvaluation,
        participants: new Set(),
        status: 'active'
      };

      this.evaluationSessions.set(sessionId, evaluationSession);

      // ارسال اعلان به گروه‌ها
      await this.notifyEvaluationStart(sessionId);
      
      // تنظیم تایمر پایان ارزیابی
      setTimeout(() => {
        this.endEvaluation(sessionId);
      }, config.evaluation.evaluationDuration * 60000);

      console.log(`✅ [GROUP_EVAL_MANAGER] Evaluation session ${sessionId} started`);
      return sessionId;

    } catch (error) {
      console.error('❌ [GROUP_EVAL_MANAGER] Error starting evaluation:', error);
      return null;
    }
  }

  // پایان ارزیابی
  async endEvaluation(sessionId) {
    try {
      const session = this.evaluationSessions.get(sessionId);
      if (!session) return;

      session.status = 'completed';
      session.endTime = new Date();

      // ارسال اعلان پایان ارزیابی
      await this.notifyEvaluationEnd(sessionId);

      // پردازش نتایج
      await this.processEvaluationResults(sessionId);

      console.log(`✅ [GROUP_EVAL_MANAGER] Evaluation session ${sessionId} ended`);
    } catch (error) {
      console.error('❌ [GROUP_EVAL_MANAGER] Error ending evaluation:', error);
    }
  }

  // بستن تمام گروه‌ها
  async closeAllGroups() {
    try {
      const config = groupEvaluationConfig.getConfig();
      if (!config.groupManagement.enabled || !config.groupManagement.autoClose) return;

      // دریافت لیست گروه‌ها از کانفیگ
      const { GROUP_NAMES } = require('./3config');
      const groupIds = Object.keys(GROUP_NAMES).map(Number);

      for (const groupId of groupIds) {
        await this.closeGroup(groupId);
      }

      console.log('✅ [GROUP_EVAL_MANAGER] All groups closed successfully');
    } catch (error) {
      console.error('❌ [GROUP_EVAL_MANAGER] Error closing groups:', error);
    }
  }

  // باز کردن تمام گروه‌ها
  async openAllGroups() {
    try {
      const config = groupEvaluationConfig.getConfig();
      if (!config.groupManagement.enabled || !config.groupManagement.autoOpen) return;

      // دریافت لیست گروه‌ها از کانفیگ
      const { GROUP_NAMES } = require('./3config');
      const groupIds = Object.keys(GROUP_NAMES).map(Number);

      for (const groupId of groupIds) {
        await this.openGroup(groupId);
      }

      console.log('✅ [GROUP_EVAL_MANAGER] All groups opened successfully');
    } catch (error) {
      console.error('❌ [GROUP_EVAL_MANAGER] Error opening groups:', error);
    }
  }

  // بستن گروه خاص
  async closeGroup(groupId) {
    try {
      const { restrictChatMember } = require('./4bale');
      
      // بستن گروه با محدود کردن ارسال پیام
      const result = await restrictChatMember(groupId, 'all', {
        can_send_messages: false,
        can_send_media_messages: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
        can_change_info: false,
        can_invite_users: false,
        can_pin_messages: false
      });

      if (result) {
        this.groupStatus.set(groupId, { status: 'closed', timestamp: new Date() });
        await this.notifyGroupStatusChange(groupId, 'closed');
        console.log(`✅ [GROUP_EVAL_MANAGER] Group ${groupId} closed successfully`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ [GROUP_EVAL_MANAGER] Error closing group ${groupId}:`, error);
      return false;
    }
  }

  // باز کردن گروه خاص
  async openGroup(groupId) {
    try {
      const { restrictChatMember } = require('./4bale');
      
      // باز کردن گروه با حذف محدودیت‌ها
      const result = await restrictChatMember(groupId, 'all', {
        can_send_messages: true,
        can_send_media_messages: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
        can_change_info: false,
        can_invite_users: false,
        can_pin_messages: false
      });

      if (result) {
        this.groupStatus.set(groupId, { status: 'open', timestamp: new Date() });
        await this.notifyGroupStatusChange(groupId, 'open');
        console.log(`✅ [GROUP_EVAL_MANAGER] Group ${groupId} opened successfully`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ [GROUP_EVAL_MANAGER] Error opening group ${groupId}:`, error);
      return false;
    }
  }

  // بررسی برنامه‌های زمان‌بندی سفارشی
  async checkCustomSchedules(currentTime, currentDay) {
    try {
      const customSchedules = groupEvaluationConfig.getCustomSchedules();
      
      for (const schedule of customSchedules) {
        if (schedule.time === currentTime && schedule.days && schedule.days.includes(currentDay)) {
          await this.executeCustomSchedule(schedule);
        }
      }
    } catch (error) {
      console.error('❌ [GROUP_EVAL_MANAGER] Error checking custom schedules:', error);
    }
  }

  // اجرای برنامه زمان‌بندی سفارشی
  async executeCustomSchedule(schedule) {
    try {
      console.log(`🔄 [GROUP_EVAL_MANAGER] Executing custom schedule: ${schedule.name}`);

      switch (schedule.action) {
        case 'close_group':
          if (schedule.groupId) {
            await this.closeGroup(schedule.groupId);
          } else {
            await this.closeAllGroups();
          }
          break;

        case 'open_group':
          if (schedule.groupId) {
            await this.openGroup(schedule.groupId);
          } else {
            await this.openAllGroups();
          }
          break;

        case 'start_evaluation':
          await this.startEvaluation();
          break;

        case 'send_notification':
          await this.sendCustomNotification(schedule);
          break;

        default:
          console.log(`⚠️ [GROUP_EVAL_MANAGER] Unknown schedule action: ${schedule.action}`);
      }

      // ثبت آخرین اجرا
      this.lastActions.set(schedule.id, {
        executedAt: new Date(),
        status: 'success'
      });

    } catch (error) {
      console.error(`❌ [GROUP_EVAL_MANAGER] Error executing custom schedule ${schedule.name}:`, error);
      
      this.lastActions.set(schedule.id, {
        executedAt: new Date(),
        status: 'error',
        error: error.message
      });
    }
  }

  // ارسال اعلان شروع ارزیابی
  async notifyEvaluationStart(sessionId) {
    try {
      const config = groupEvaluationConfig.getConfig();
      if (!config.notifications.enabled) return;

      const { GROUP_NAMES } = require('./3config');
      const message = `🎯 ارزیابی شروع شد!\n\n⏰ مدت زمان: ${config.evaluation.evaluationDuration} دقیقه\n📝 تعداد سوالات: ${config.evaluation.questionsPerEvaluation}\n\nلطفاً آماده باشید!`;

      for (const [groupId, groupName] of Object.entries(GROUP_NAMES)) {
        try {
          const { sendMessage } = require('./4bale');
          await sendMessage(Number(groupId), message);
        } catch (error) {
          console.error(`❌ [GROUP_EVAL_MANAGER] Error sending evaluation start notification to group ${groupId}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [GROUP_EVAL_MANAGER] Error notifying evaluation start:', error);
    }
  }

  // ارسال اعلان پایان ارزیابی
  async notifyEvaluationEnd(sessionId) {
    try {
      const config = groupEvaluationConfig.getConfig();
      if (!config.notifications.enabled) return;

      const { GROUP_NAMES } = require('./3config');
      const message = `🏁 ارزیابی به پایان رسید!\n\nنتایج به زودی اعلام خواهد شد.`;

      for (const [groupId, groupName] of Object.entries(GROUP_NAMES)) {
        try {
          const { sendMessage } = require('./4bale');
          await sendMessage(Number(groupId), message);
        } catch (error) {
          console.error(`❌ [GROUP_EVAL_MANAGER] Error sending evaluation end notification to group ${groupId}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [GROUP_EVAL_MANAGER] Error notifying evaluation end:', error);
    }
  }

  // اعلان تغییر وضعیت گروه
  async notifyGroupStatusChange(groupId, status) {
    try {
      const config = groupEvaluationConfig.getConfig();
      if (!config.notifications.groupStatusChange) return;

      const { GROUP_NAMES } = require('./3config');
      const groupName = GROUP_NAMES[groupId] || `گروه ${groupId}`;
      
      const statusText = status === 'closed' ? 'بسته شد' : 'باز شد';
      const message = `🔒 گروه ${groupName} ${statusText}`;

      // ارسال اعلان به گروه گزارش
      try {
        const { REPORT_GROUP_ID } = require('./3config');
        const { sendMessage } = require('./4bale');
        await sendMessage(REPORT_GROUP_ID, message);
      } catch (error) {
        console.error('❌ [GROUP_EVAL_MANAGER] Error sending group status notification to report group:', error);
      }
    } catch (error) {
      console.error('❌ [GROUP_EVAL_MANAGER] Error notifying group status change:', error);
    }
  }

  // ارسال اعلان سفارشی
  async sendCustomNotification(schedule) {
    try {
      const { GROUP_NAMES } = require('./3config');
      const message = schedule.message || 'اعلان سیستم';

      if (schedule.groupId) {
        // ارسال به گروه خاص
        const { sendMessage } = require('./4bale');
        await sendMessage(schedule.groupId, message);
      } else {
        // ارسال به تمام گروه‌ها
        for (const [groupId, groupName] of Object.entries(GROUP_NAMES)) {
          try {
            const { sendMessage } = require('./4bale');
            await sendMessage(Number(groupId), message);
          } catch (error) {
            console.error(`❌ [GROUP_EVAL_MANAGER] Error sending custom notification to group ${groupId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ [GROUP_EVAL_MANAGER] Error sending custom notification:', error);
    }
  }

  // پردازش نتایج ارزیابی
  async processEvaluationResults(sessionId) {
    try {
      const session = this.evaluationSessions.get(sessionId);
      if (!session) return;

      // اینجا می‌توانید منطق پردازش نتایج را اضافه کنید
      console.log(`📊 [GROUP_EVAL_MANAGER] Processing results for evaluation session ${sessionId}`);
      
      // برای مثال: ذخیره نتایج در دیتابیس، ارسال گزارش و غیره
      
    } catch (error) {
      console.error('❌ [GROUP_EVAL_MANAGER] Error processing evaluation results:', error);
    }
  }

  // دریافت وضعیت فعلی سیستم
  getStatus() {
    return {
      isRunning: this.isRunning,
      systemEnabled: groupEvaluationConfig.getConfig().systemEnabled,
      evaluationSessions: Array.from(this.evaluationSessions.values()),
      groupStatus: Object.fromEntries(this.groupStatus),
      lastActions: Object.fromEntries(this.lastActions),
      config: groupEvaluationConfig.getSystemStatus()
    };
  }

  // دریافت وضعیت گروه خاص
  getGroupStatus(groupId) {
    return this.groupStatus.get(groupId) || { status: 'unknown', timestamp: null };
  }

  // دریافت وضعیت ارزیابی
  getEvaluationStatus(sessionId) {
    return this.evaluationSessions.get(sessionId) || null;
  }

  // پاک کردن تاریخچه
  clearHistory() {
    this.evaluationSessions.clear();
    this.groupStatus.clear();
    this.lastActions.clear();
    console.log('✅ [GROUP_EVAL_MANAGER] History cleared successfully');
  }
}

// ایجاد نمونه از کلاس
const groupEvaluationManager = new GroupEvaluationManager();

module.exports = {
  GroupEvaluationManager,
  groupEvaluationManager
};
