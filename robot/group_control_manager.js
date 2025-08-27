/**
 * 🤖 Group Control Manager - مدیریت گروه‌ها
 * 🎯 کنترل گروه‌ها با قابلیت زمان‌بندی و پنل مدیریت
 *
 * قابلیت‌ها:
 * - زمان‌بندی گروه‌ها (باز/بسته در زمان مشخص)
 * - کنترل دستی از طریق پنل ادمین
 * - ارسال پیام‌های مناسب هنگام باز/بسته شدن
 * - سیستم کانفیگ پیشرفته
 */

const path = require('path');
const fs = require('fs');
const { sendMessage } = require('./4bale');
const { getGroupName, isGroupEnabled, setGroupStatus, getAllGroupsStatus } = require('./3config');
const { loadMembersData } = require('./7group');

// مسیر فایل کانفیگ گروه‌ها
const GROUP_CONTROL_CONFIG_FILE = path.join(__dirname, 'data', 'group_control_config.json');

// کلاس مدیریت کنترل گروه‌ها
class GroupControlManager {
  constructor() {
    this.schedules = new Map(); // ذخیره زمان‌بندی‌ها
    this.activeTimers = new Map(); // ذخیره تایمرهای فعال
    this.loadConfig();
    this.startScheduledTasks();
  }

  // بارگذاری کانفیگ از فایل
  loadConfig() {
    try {
      if (fs.existsSync(GROUP_CONTROL_CONFIG_FILE)) {
        const data = fs.readFileSync(GROUP_CONTROL_CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        console.log('✅ [GROUP_CONTROL] Config loaded successfully');

        // بازسازی schedules از فایل
        if (config.schedules) {
          this.schedules = new Map(Object.entries(config.schedules));
        }

        return config;
      } else {
        // ایجاد فایل پیش‌فرض
        const defaultConfig = {
          schedules: {},
          config: {
            defaultCloseMessage: '🚫 گروه موقتاً بسته است.',
            defaultOpenMessage: '✅ گروه باز است و آماده فعالیت!',
            lastUpdate: new Date().toISOString(),
            updatedBy: 'system'
          }
        };
        this.saveConfig(defaultConfig);
        return defaultConfig;
      }
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error loading config:', error);
      return {
        schedules: {},
        config: {
          defaultCloseMessage: '🚫 گروه موقتاً بسته است.',
          defaultOpenMessage: '✅ گروه باز است و آماده فعالیت!',
          lastUpdate: new Date().toISOString(),
          updatedBy: 'system'
        }
      };
    }
  }

  // ذخیره کانفیگ در فایل
  saveConfig(config) {
    try {
      const dataDir = path.dirname(GROUP_CONTROL_CONFIG_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // تبدیل Map به Object برای ذخیره
      const configToSave = {
        ...config,
        schedules: Object.fromEntries(this.schedules)
      };

      fs.writeFileSync(GROUP_CONTROL_CONFIG_FILE, JSON.stringify(configToSave, null, 2), 'utf8');
      console.log('✅ [GROUP_CONTROL] Config saved successfully');
      return true;
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error saving config:', error);
      return false;
    }
  }

  // افزودن زمان‌بندی برای گروه
  addSchedule(groupId, scheduleData) {
    try {
      const schedule = {
        id: `schedule_${Date.now()}`,
        groupId: groupId,
        name: scheduleData.name || `زمان‌بندی گروه ${groupId}`,
        enabled: scheduleData.enabled !== false,
        rules: scheduleData.rules || [],
        createdAt: new Date().toISOString(),
        updatedBy: scheduleData.updatedBy || 'unknown'
      };

      this.schedules.set(groupId, schedule);
      this.saveConfig(this.loadConfig());

      // راه‌اندازی زمان‌بندی جدید
      this.startSchedule(schedule);

      console.log(`✅ [GROUP_CONTROL] Schedule added for group ${groupId}`);
      return schedule;
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error adding schedule:', error);
      return null;
    }
  }

  // راه‌اندازی زمان‌بندی
  startSchedule(schedule) {
    if (!schedule.enabled) return;

    const groupId = schedule.groupId;

    // پاک کردن تایمر قبلی اگر وجود داشته باشد
    if (this.activeTimers.has(groupId)) {
      clearInterval(this.activeTimers.get(groupId));
      this.activeTimers.delete(groupId);
    }

    // راه‌اندازی تایمر جدید
    const timer = setInterval(() => {
      this.checkAndExecuteSchedule(schedule);
    }, 60000); // هر دقیقه چک کن

    this.activeTimers.set(groupId, timer);
    console.log(`⏰ [GROUP_CONTROL] Schedule timer started for group ${groupId}`);
  }

  // بررسی و اجرای زمان‌بندی
  async checkAndExecuteSchedule(schedule) {
    try {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // دقیقه از ابتدای روز
      const currentDay = now.getDay(); // 0=یکشنبه، 1=دوشنبه، ...

      for (const rule of schedule.rules) {
        if (!rule.enabled) continue;

        // بررسی روز
        const daysMatch = rule.days.includes(currentDay);

        // بررسی زمان شروع
        if (rule.action === 'close' && rule.startTime && daysMatch) {
          const [startHour, startMin] = rule.startTime.split(':').map(Number);
          const startTime = startHour * 60 + startMin;

          if (currentTime >= startTime && currentTime < startTime + 5) { // 5 دقیقه tolerance
            await this.closeGroup(schedule.groupId, rule.message || '🚫 گروه بسته شد.', 'schedule');
          }
        }

        // بررسی زمان پایان
        if (rule.action === 'open' && rule.endTime && daysMatch) {
          const [endHour, endMin] = rule.endTime.split(':').map(Number);
          const endTime = endHour * 60 + endMin;

          if (currentTime >= endTime && currentTime < endTime + 5) { // 5 دقیقه tolerance
            await this.openGroup(schedule.groupId, rule.message || '✅ گروه باز شد.', 'schedule');
          }
        }
      }
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error executing schedule:', error);
    }
  }

  // بستن گروه با پیام
  async closeGroup(groupId, message = null, updatedBy = 'system') {
    try {
      const config = this.loadConfig();
      const closeMessage = message || config.config.defaultCloseMessage;

      // تغییر وضعیت گروه به بسته
      const result = setGroupStatus(groupId, false, updatedBy);
      if (!result) {
        console.error(`❌ [GROUP_CONTROL] Failed to close group ${groupId}`);
        return false;
      }

      // ارسال پیام بسته شدن به گروه
      try {
        const groupName = await getGroupName(groupId);
        await sendMessage(groupId, `${closeMessage}\n\n🏷️ گروه: ${groupName}\n⏰ ${new Date().toLocaleString('fa-IR')}`);
        console.log(`✅ [GROUP_CONTROL] Group ${groupId} closed with message`);
      } catch (error) {
        console.log(`⚠️ [GROUP_CONTROL] Could not send close message to group ${groupId}:`, error.message);
      }

      return true;
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error closing group:', error);
      return false;
    }
  }

  // باز کردن گروه با پیام
  async openGroup(groupId, message = null, updatedBy = 'system') {
    try {
      const config = this.loadConfig();
      const openMessage = message || config.config.defaultOpenMessage;

      // تغییر وضعیت گروه به باز
      const result = setGroupStatus(groupId, true, updatedBy);
      if (!result) {
        console.error(`❌ [GROUP_CONTROL] Failed to open group ${groupId}`);
        return false;
      }

      // ارسال پیام باز شدن به گروه
      try {
        const groupName = await getGroupName(groupId);
        await sendMessage(groupId, `${openMessage}\n\n🏷️ گروه: ${groupName}\n⏰ ${new Date().toLocaleString('fa-IR')}`);
        console.log(`✅ [GROUP_CONTROL] Group ${groupId} opened with message`);
      } catch (error) {
        console.log(`⚠️ [GROUP_CONTROL] Could not send open message to group ${groupId}:`, error.message);
      }

      return true;
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error opening group:', error);
      return false;
    }
  }

  // کنترل دستی گروه (باز/بسته)
  async controlGroup(groupId, action, message = null, updatedBy = 'admin') {
    try {
      if (action === 'close') {
        return await this.closeGroup(groupId, message, updatedBy);
      } else if (action === 'open') {
        return await this.openGroup(groupId, message, updatedBy);
      } else {
        console.error(`❌ [GROUP_CONTROL] Invalid action: ${action}`);
        return false;
      }
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error controlling group:', error);
      return false;
    }
  }

  // راه‌اندازی تمام زمان‌بندی‌های فعال
  startScheduledTasks() {
    console.log('🚀 [GROUP_CONTROL] Starting scheduled tasks...');

    this.schedules.forEach((schedule) => {
      if (schedule.enabled) {
        this.startSchedule(schedule);
      }
    });

    console.log(`✅ [GROUP_CONTROL] ${this.activeTimers.size} scheduled tasks started`);
  }

  // توقف تمام زمان‌بندی‌ها
  stopAllSchedules() {
    console.log('🛑 [GROUP_CONTROL] Stopping all schedules...');

    this.activeTimers.forEach((timer) => {
      clearInterval(timer);
    });

    this.activeTimers.clear();
    console.log('✅ [GROUP_CONTROL] All schedules stopped');
  }

  // دریافت لیست گروه‌ها با وضعیت
  getGroupsStatus() {
    try {
      console.log('🔍 [GROUP_CONTROL] getGroupsStatus called');

      // استفاده از loadMembersData برای سازگاری با سیستم مدیریت گروه‌ها
      const membersData = loadMembersData();
      console.log('📂 [GROUP_CONTROL] Members data loaded:', JSON.stringify(membersData, null, 2));

      // بررسی وجود داده
      if (!membersData || !membersData.groups) {
        console.log('⚠️ [GROUP_CONTROL] No members data or groups found');
        return {};
      }

      const groupsWithSchedules = {};

      console.log('🔍 [GROUP_CONTROL] Processing groups...');
      Object.keys(membersData.groups).forEach(groupId => {
        console.log(`🔍 [GROUP_CONTROL] Processing group: ${groupId}`);

        const groupMembers = membersData.groups[groupId];
        console.log(`🔍 [GROUP_CONTROL] Group members for ${groupId}:`, groupMembers);

        // بررسی اینکه گروه عضو دارد یا نه (سازگاری با ساختار قدیمی)
        const hasMembers = Array.isArray(groupMembers) && groupMembers.length > 0;
        console.log(`🔍 [GROUP_CONTROL] Group ${groupId} has members: ${hasMembers}`);

        if (hasMembers) {
          const schedule = this.schedules.get(groupId);
          console.log(`🔍 [GROUP_CONTROL] Group ${groupId} schedule:`, schedule);

          // دریافت اطلاعات گروه از 3config یا استفاده از نام پیش‌فرض
          const groupConfig = getAllGroupsStatus()[groupId] || {
            name: `گروه ${groupId}`,
            enabled: 1,
            lastUpdate: new Date().toISOString(),
            updatedBy: 'system'
          };
          console.log(`🔍 [GROUP_CONTROL] Group config for ${groupId}:`, groupConfig);

          groupsWithSchedules[groupId] = {
            ...groupConfig,
            totalMembers: groupMembers.length,
            hasSchedule: !!schedule,
            scheduleEnabled: schedule ? schedule.enabled : false
          };

          console.log(`✅ [GROUP_CONTROL] Added group ${groupId} to results:`, groupsWithSchedules[groupId]);
        } else {
          console.log(`⚠️ [GROUP_CONTROL] Skipped group ${groupId} - no members`);
        }
      });

      console.log('✅ [GROUP_CONTROL] Final groups result:', Object.keys(groupsWithSchedules));
      console.log('✅ [GROUP_CONTROL] Returning groups:', groupsWithSchedules);
      return groupsWithSchedules;
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error getting groups status:', error);
      console.error('❌ [GROUP_CONTROL] Error stack:', error.stack);
      return {};
    }
  }

  // دریافت زمان‌بندی گروه
  getGroupSchedule(groupId) {
    return this.schedules.get(groupId) || null;
  }

  // حذف زمان‌بندی گروه
  removeSchedule(groupId) {
    try {
      if (this.activeTimers.has(groupId)) {
        clearInterval(this.activeTimers.get(groupId));
        this.activeTimers.delete(groupId);
      }

      this.schedules.delete(groupId);
      this.saveConfig(this.loadConfig());

      console.log(`✅ [GROUP_CONTROL] Schedule removed for group ${groupId}`);
      return true;
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error removing schedule:', error);
      return false;
    }
  }

  // ایجاد پنل مدیریت گروه‌ها
  createManagementPanel(userId) {
    try {
      console.log(`🔧 [GROUP_CONTROL] createManagementPanel called for user: ${userId}`);

      const groups = this.getGroupsStatus();
      console.log(`📊 [GROUP_CONTROL] Groups received: ${Object.keys(groups).length} groups`);
      console.log(`📊 [GROUP_CONTROL] Groups data:`, JSON.stringify(groups, null, 2));

      const keyboard = [];

      // اگر هیچ گروهی پیدا نشد
      if (Object.keys(groups).length === 0) {
        console.log('⚠️ [GROUP_CONTROL] No groups found, returning no groups message');
        keyboard.push([{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]);
        const text = `📝 هیچ گروهی یافت نشد.

لطفاً ابتدا گروه‌ها را در سیستم مدیریت گروه‌ها ثبت کنید.

⏰ ${new Date().toLocaleString('fa-IR')}`;
        return { text, keyboard };
      }

      // دکمه‌های اصلی
      keyboard.push([
        { text: '📊 وضعیت گروه‌ها', callback_data: 'group_control_status' },
        { text: '⏰ زمان‌بندی جدید', callback_data: 'group_control_new_schedule' }
      ]);

      // لیست گروه‌ها - مشابه مدیریت گروه‌ها
      Object.keys(groups).forEach(groupId => {
        const group = groups[groupId];
        console.log(`📋 [GROUP_CONTROL] Adding group to list: ${groupId}`, group);

        const status = group.enabled ? '🟢' : '🔴';
        const schedule = group.hasSchedule ? (group.scheduleEnabled ? '⏰' : '⏰❌') : '➖';
        const memberCount = group.totalMembers || 0;

        keyboard.push([
          {
            text: `${status} ${schedule} ${group.name} (${memberCount} عضو)`,
            callback_data: `group_control_manage_${groupId}`
          }
        ]);
      });

      // دکمه بازگشت
      keyboard.push([
        { text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }
      ]);

      const text = `🚪 کنترل گروه‌ها

📋 گروه‌های موجود: ${Object.keys(groups).length}

👆 برای هر گروه می‌توانید:
• وضعیت را تغییر دهید (باز/بسته)
• زمان‌بندی اضافه کنید
• تنظیمات را تغییر دهید
• لیست اعضا را مشاهده کنید

⏰ ${new Date().toLocaleString('fa-IR')}`;

      console.log(`✅ [GROUP_CONTROL] Management panel created with ${keyboard.length} buttons`);
      return { text, keyboard };
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error creating management panel:', error);
      console.error('❌ [GROUP_CONTROL] Error stack:', error.stack);
      return {
        text: '❌ خطا در ایجاد پنل مدیریت',
        keyboard: [[{ text: '🔙 بازگشت', callback_data: 'back_to_main' }]]
      };
    }
  }

  // پردازش callback های مدیریت گروه
  async handleCallback(callbackData, userId, chatId) {
    try {
      console.log(`🔧 [GROUP_CONTROL] handleCallback called with: ${callbackData}`);

      // بررسی callback های خاص
      if (callbackData === 'group_control_panel') {
        console.log(`🔧 [GROUP_CONTROL] Creating management panel for user: ${userId}`);
        return this.createManagementPanel(userId);
      }

      if (callbackData === 'group_control_status') {
        console.log(`🔧 [GROUP_CONTROL] Showing status for user: ${userId}`);
        return this.handleStatusCallback(userId, chatId);
      }

      if (callbackData === 'group_control_new_schedule') {
        console.log(`🔧 [GROUP_CONTROL] Creating new schedule for user: ${userId}`);
        return this.handleNewScheduleCallback(userId, chatId);
      }

      if (callbackData.startsWith('group_control_manage_')) {
        const groupId = callbackData.replace('group_control_manage_', '');
        console.log(`🔧 [GROUP_CONTROL] Managing group: ${groupId} for user: ${userId}`);
        return this.handleManageGroupCallback(groupId, userId, chatId);
      }

      if (callbackData.startsWith('group_control_members_')) {
        const groupId = callbackData.replace('group_control_members_', '');
        console.log(`🔧 [GROUP_CONTROL] Showing members for group: ${groupId}`);
        return this.handleGroupMembersCallback(groupId, userId, chatId);
      }

      if (callbackData.startsWith('group_control_stats_')) {
        const groupId = callbackData.replace('group_control_stats_', '');
        console.log(`🔧 [GROUP_CONTROL] Showing stats for group: ${groupId}`);
        return this.handleGroupStatsCallback(groupId, userId, chatId);
      }

      const parts = callbackData.split('_');
      const action = parts[2]; // group_control_action

      console.log(`🔧 [GROUP_CONTROL] Action detected: ${action}`);

      switch (action) {
        case 'status':
          return this.handleStatusCallback(userId, chatId);
        case 'manage':
          return this.handleManageGroupCallback(parts[3], userId, chatId);
        case 'new':
          return this.handleNewScheduleCallback(userId, chatId);
        default:
          console.log(`🔧 [GROUP_CONTROL] Unknown action: ${action}`);
          return { text: '❌ فرمان ناشناخته', keyboard: [[{ text: '🔙 بازگشت', callback_data: 'back_to_main' }]] };
      }
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error handling callback:', error);
      console.error('❌ [GROUP_CONTROL] Error stack:', error.stack);
      return { text: '❌ خطا در پردازش فرمان', keyboard: [[{ text: '🔙 بازگشت', callback_data: 'back_to_main' }]] };
    }
  }

  // نمایش وضعیت گروه‌ها
  handleStatusCallback(userId, chatId) {
    const groups = this.getGroupsStatus();
    let text = '📊 وضعیت گروه‌ها\n\n';

    Object.values(groups).forEach(group => {
      const status = group.enabled ? '🟢 باز' : '🔴 بسته';
      const schedule = group.hasSchedule ?
        (group.scheduleEnabled ? '⏰ زمان‌بندی فعال' : '⏰ زمان‌بندی غیرفعال') :
        '➖ بدون زمان‌بندی';

      text += `🏷️ ${group.name}\n`;
      text += `📍 وضعیت: ${status}\n`;
      text += `⏰ زمان‌بندی: ${schedule}\n\n`;
    });

    const keyboard = [
      [{ text: '🔄 بروزرسانی', callback_data: 'group_control_status' }],
      [{ text: '🔙 بازگشت به مدیریت گروه‌ها', callback_data: 'group_control_panel' }]
    ];

    return { text, keyboard };
  }

  // مدیریت گروه خاص
  handleManageGroupCallback(groupId, userId, chatId) {
    try {
      console.log(`🔧 [GROUP_CONTROL] handleManageGroupCallback called for group: ${groupId}`);

      const groups = this.getGroupsStatus();
      const group = groups[groupId];

      if (!group) {
        console.log(`⚠️ [GROUP_CONTROL] Group ${groupId} not found`);
        return {
          text: '❌ گروه یافت نشد',
          keyboard: [[{ text: '🔙 بازگشت', callback_data: 'group_control_panel' }]]
        };
      }

      // دریافت اطلاعات اعضا از members.json
      const membersData = loadMembersData();
      const groupMembers = membersData.groups[groupId] || [];
      console.log(`📊 [GROUP_CONTROL] Group ${groupId} members:`, groupMembers);

      const status = group.enabled ? '🟢 باز' : '🔴 بسته';
      let text = `🏷️ مدیریت گروه: ${group.name}\n`;
      text += `🆔 شناسه گروه: \`${groupId}\`\n\n`;
      text += `📍 وضعیت فعلی: ${status}\n`;
      text += `👥 تعداد اعضا: ${group.totalMembers || 0}\n`;
      text += `⏰ آخرین تغییر: ${group.lastUpdate}\n`;
      text += `👤 تغییر توسط: ${group.updatedBy}\n\n`;

      // نمایش لیست اعضا
      if (groupMembers.length > 0) {
        text += `👥 لیست اعضا:\n`;
        groupMembers.forEach((member, index) => {
          text += `${index + 1}. ${member.name} (@${member.id})\n`;
        });
        text += `\n`;

        // دریافت لینک دعوت گروه
        const groupConfig = getAllGroupsStatus()[groupId];
        if (groupConfig && groupConfig.invite_link) {
          text += `🔗 لینک دعوت: ${groupConfig.invite_link}\n\n`;
        }
      } else {
        text += `📝 این گروه هیچ عضوی ندارد.\n`;
        text += `لطفاً قرآن آموزان را عضو گروه کنید.\n\n`;

        // دریافت لینک دعوت گروه برای گروه‌های خالی
        const groupConfig = getAllGroupsStatus()[groupId];
        if (groupConfig && groupConfig.invite_link) {
          text += `🔗 لینک دعوت گروه: ${groupConfig.invite_link}\n\n`;
        }
      }

      const keyboard = [
        [
          { text: '🔓 باز کردن گروه', callback_data: `group_control_toggle_${groupId}_open` },
          { text: '🔒 بستن گروه', callback_data: `group_control_toggle_${groupId}_close` }
        ],
        [
          { text: '⏰ افزودن زمان‌بندی', callback_data: `group_control_schedule_${groupId}` },
          { text: '❌ حذف زمان‌بندی', callback_data: `group_control_remove_schedule_${groupId}` }
        ],
        [
          { text: '👥 لیست اعضا', callback_data: `group_control_members_${groupId}` },
          { text: '📊 آمار گروه', callback_data: `group_control_stats_${groupId}` }
        ],
        [{ text: '🔙 بازگشت', callback_data: 'group_control_panel' }]
      ];

      console.log(`✅ [GROUP_CONTROL] Group management panel created for: ${groupId}`);
      return { text, keyboard };
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error in handleManageGroupCallback:', error);
      console.error('❌ [GROUP_CONTROL] Error stack:', error.stack);
      return {
        text: '❌ خطا در نمایش اطلاعات گروه',
        keyboard: [[{ text: '🔙 بازگشت', callback_data: 'group_control_panel' }]]
      };
    }
  }

  // نمایش لیست اعضا
  handleGroupMembersCallback(groupId, userId, chatId) {
    try {
      console.log(`🔧 [GROUP_CONTROL] handleGroupMembersCallback called for group: ${groupId}`);

      // دریافت اطلاعات اعضا از members.json
      const membersData = loadMembersData();
      const groupMembers = membersData.groups[groupId] || [];
      console.log(`📊 [GROUP_CONTROL] Group ${groupId} members:`, groupMembers);

      // دریافت اطلاعات گروه
      const groups = this.getGroupsStatus();
      const group = groups[groupId];

      let text = `👥 لیست اعضای گروه: ${group ? group.name : groupId}\n\n`;

      if (groupMembers.length > 0) {
        text += `📋 اعضا (${groupMembers.length} نفر):\n\n`;
        groupMembers.forEach((member, index) => {
          text += `${index + 1}. ${member.name}\n`;
          text += `   🆔 ID: \`${member.id}\`\n`;
          text += `   ⏰ عضو شده: ${new Date(member.joinedAt).toLocaleString('fa-IR')}\n\n`;
        });
      } else {
        text += `📝 این گروه هیچ عضوی ندارد.\n\n`;
        text += `لطفاً قرآن آموزان را عضو گروه کنید.\n\n`;

        // دریافت لینک دعوت گروه
        const groupConfig = getAllGroupsStatus()[groupId];
        if (groupConfig && groupConfig.invite_link) {
          text += `🔗 لینک دعوت گروه:\n${groupConfig.invite_link}\n\n`;
        }
      }

      const keyboard = [
        [
          { text: '🔙 بازگشت به مدیریت گروه', callback_data: `group_control_manage_${groupId}` },
          { text: '🏠 بازگشت به کنترل گروه‌ها', callback_data: 'group_control_panel' }
        ]
      ];

      console.log(`✅ [GROUP_CONTROL] Members list created for group: ${groupId}`);
      return { text, keyboard };
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error in handleGroupMembersCallback:', error);
      console.error('❌ [GROUP_CONTROL] Error stack:', error.stack);
      return {
        text: '❌ خطا در نمایش لیست اعضا',
        keyboard: [[{ text: '🔙 بازگشت', callback_data: 'group_control_panel' }]]
      };
    }
  }

  // نمایش آمار گروه
  handleGroupStatsCallback(groupId, userId, chatId) {
    try {
      console.log(`🔧 [GROUP_CONTROL] handleGroupStatsCallback called for group: ${groupId}`);

      // دریافت اطلاعات گروه
      const groups = this.getGroupsStatus();
      const group = groups[groupId];

      // دریافت اطلاعات اعضا از members.json
      const membersData = loadMembersData();
      const groupMembers = membersData.groups[groupId] || [];

      let text = `📊 آمار گروه: ${group ? group.name : groupId}\n`;
      text += `🆔 شناسه گروه: \`${groupId}\`\n\n`;

      text += `👥 آمار اعضا:\n`;
      text += `   • تعداد کل اعضا: ${groupMembers.length}\n`;

      if (groupMembers.length > 0) {
        // آمار زمانی عضویت
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        let todayCount = 0;
        let weekCount = 0;
        let monthCount = 0;

        groupMembers.forEach(member => {
          const joinedDate = new Date(member.joinedAt);
          if (joinedDate >= today) todayCount++;
          if (joinedDate >= thisWeek) weekCount++;
          if (joinedDate >= thisMonth) monthCount++;
        });

        text += `   • عضو شده امروز: ${todayCount}\n`;
        text += `   • عضو شده این هفته: ${weekCount}\n`;
        text += `   • عضو شده این ماه: ${monthCount}\n\n`;
      }

      text += `📍 وضعیت گروه:\n`;
      text += `   • وضعیت فعلی: ${group.enabled ? '🟢 باز' : '🔴 بسته'}\n`;
      text += `   • آخرین تغییر: ${group.lastUpdate}\n`;
      text += `   • تغییر توسط: ${group.updatedBy}\n\n`;

      text += `⏰ زمان‌بندی:\n`;
      if (group.hasSchedule) {
        text += `   • وضعیت زمان‌بندی: ${group.scheduleEnabled ? '✅ فعال' : '❌ غیرفعال'}\n`;
        const schedule = this.schedules.get(groupId);
        if (schedule) {
          text += `   • زمان باز شدن: ${schedule.openTime}\n`;
          text += `   • زمان بسته شدن: ${schedule.closeTime}\n`;
        }
      } else {
        text += `   • زمان‌بندی: ندارد\n`;
      }

      const keyboard = [
        [
          { text: '🔙 بازگشت به مدیریت گروه', callback_data: `group_control_manage_${groupId}` },
          { text: '🏠 بازگشت به کنترل گروه‌ها', callback_data: 'group_control_panel' }
        ]
      ];

      console.log(`✅ [GROUP_CONTROL] Stats panel created for group: ${groupId}`);
      return { text, keyboard };
    } catch (error) {
      console.error('❌ [GROUP_CONTROL] Error in handleGroupStatsCallback:', error);
      console.error('❌ [GROUP_CONTROL] Error stack:', error.stack);
      return {
        text: '❌ خطا در نمایش آمار گروه',
        keyboard: [[{ text: '🔙 بازگشت', callback_data: 'group_control_panel' }]]
      };
    }
  }

  // ایجاد زمان‌بندی جدید
  handleNewScheduleCallback(userId, chatId) {
    const text = `⏰ ایجاد زمان‌بندی جدید

برای ایجاد زمان‌بندی جدید، لطفاً از فرمت زیر استفاده کنید:

/schedule GROUP_ID نام_زمان‌بندی

مثال:
/schedule 123456789 زمان_درس

یا از دکمه‌های زیر برای مدیریت گروه‌های موجود استفاده کنید.`;

    const groups = this.getGroupsStatus();
    const keyboard = [];

    Object.keys(groups).forEach(groupId => {
      const group = groups[groupId];
      keyboard.push([
        { text: `⏰ زمان‌بندی ${group.name}`, callback_data: `group_control_schedule_${groupId}` }
      ]);
    });

    keyboard.push([{ text: '🔙 بازگشت', callback_data: 'group_control_panel' }]);

    return { text, keyboard };
  }
}

// ایجاد instance واحد
const groupControlManager = new GroupControlManager();

// توابع کمکی برای استفاده خارجی
function getGroupControlManager() {
  return groupControlManager;
}

function createGroupControlPanel(userId) {
  return groupControlManager.createManagementPanel(userId);
}

async function handleGroupControlCallback(callbackData, userId, chatId) {
  return await groupControlManager.handleCallback(callbackData, userId, chatId);
}

async function controlGroup(groupId, action, message = null, updatedBy = 'admin') {
  return await groupControlManager.controlGroup(groupId, action, message, updatedBy);
}

function getGroupsStatus() {
  return groupControlManager.getGroupsStatus();
}

module.exports = {
  GroupControlManager,
  getGroupControlManager,
  createGroupControlPanel,
  handleGroupControlCallback,
  controlGroup,
  getGroupsStatus
};

