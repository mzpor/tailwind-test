// ماژول ثبت اطلاعات و گزارش‌دهی روزانه
// مربی هر روز گزارش می‌دهد: 2 سوال تستی + 1 سوال تشریحی

const fs = require('fs');
const path = require('path');

class SabtManager {
  constructor() {
    this.reportsFile = path.join(__dirname, 'data', 'daily_reports.json');
    this.reports = this.loadReports();
    this.userStates = new Map(); // وضعیت کاربران در حال ثبت گزارش
  }

  // بارگذاری گزارش‌های موجود
  loadReports() {
    try {
      if (fs.existsSync(this.reportsFile)) {
        const data = fs.readFileSync(this.reportsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('❌ خطا در بارگذاری گزارش‌ها:', error);
    }
    return {};
  }

  // ذخیره گزارش‌ها
  saveReports() {
    try {
      const dir = path.dirname(this.reportsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.reportsFile, JSON.stringify(this.reports, null, 2));
      return true;
    } catch (error) {
      console.error('❌ خطا در ذخیره گزارش‌ها:', error);
      return false;
    }
  }

  // شروع ثبت گزارش جدید
  startReport(chatId, userId, userName) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // بررسی اینکه آیا امروز گزارش داده شده یا نه
    if (this.reports[today] && this.reports[today][userId]) {
      return {
        text: '📝 شما امروز گزارش داده‌اید. آیا می‌خواهید گزارش خود را ویرایش کنید؟',
        keyboard: [
          [{ text: '✏️ ویرایش گزارش' }, { text: '❌ انصراف' }]
        ]
      };
    }

    // شروع گزارش جدید
    this.userStates.set(chatId, {
      userId,
      userName,
      date: today,
      step: 'question1',
      answers: {}
    });

    return {
      text: '📝 *ثبت گزارش روزانه*\n\nسوال اول (تستی):\n\n🎯 امروز چند نفر در کلاس حضور داشتند؟\n\n1️⃣ کمتر از 5 نفر\n2️⃣ 5 تا 10 نفر\n3️⃣ 10 تا 15 نفر\n4️⃣ بیشتر از 15 نفر',
      keyboard: [
        [{ text: '1️⃣' }, { text: '2️⃣' }],
        [{ text: '3️⃣' }, { text: '4️⃣' }],
        [{ text: '❌ انصراف' }]
      ]
    };
  }

  // پردازش پاسخ‌ها
  handleAnswer(chatId, text) {
    const state = this.userStates.get(chatId);
    if (!state) {
      return { text: '❌ خطا: وضعیت ثبت گزارش یافت نشد. لطفاً دوباره شروع کنید.' };
    }

    if (text === '❌ انصراف') {
      this.userStates.delete(chatId);
      return { text: '❌ ثبت گزارش لغو شد.' };
    }

    switch (state.step) {
      case 'question1':
        return this.handleQuestion1(chatId, text);
      case 'question2':
        return this.handleQuestion2(chatId, text);
      case 'question3':
        return this.handleQuestion3(chatId, text);
      case 'confirm':
        return this.handleConfirm(chatId, text);
      default:
        return { text: '❌ خطا: مرحله نامعتبر.' };
    }
  }

  // پردازش سوال اول
  handleQuestion1(chatId, text) {
    const state = this.userStates.get(chatId);
    const answer = text.replace(/[1-4]️⃣/, '').trim();
    
    if (!['1', '2', '3', '4'].includes(answer)) {
      return { text: '❌ لطفاً یکی از گزینه‌های 1️⃣ تا 4️⃣ را انتخاب کنید.' };
    }

    state.answers.question1 = answer;
    state.step = 'question2';

    return {
      text: '📝 *ثبت گزارش روزانه*\n\nسوال دوم (تستی):\n\n📚 سطح رضایت دانشجویان از کلاس امروز چقدر بود؟\n\n1️⃣ خیلی کم\n2️⃣ کم\n3️⃣ متوسط\n4️⃣ زیاد\n5️⃣ خیلی زیاد',
      keyboard: [
        [{ text: '1️⃣' }, { text: '2️⃣' }, { text: '3️⃣' }],
        [{ text: '4️⃣' }, { text: '5️⃣' }],
        [{ text: '❌ انصراف' }]
      ]
    };
  }

  // پردازش سوال دوم
  handleQuestion2(chatId, text) {
    const state = this.userStates.get(chatId);
    const answer = text.replace(/[1-5]️⃣/, '').trim();
    
    if (!['1', '2', '3', '4', '5'].includes(answer)) {
      return { text: '❌ لطفاً یکی از گزینه‌های 1️⃣ تا 5️⃣ را انتخاب کنید.' };
    }

    state.answers.question2 = answer;
    state.step = 'question3';

    return {
      text: '📝 *ثبت گزارش روزانه*\n\nسوال سوم (تشریحی):\n\n💭 مشکلات و چالش‌های امروز در کلاس چه بود؟\n\nلطفاً توضیح دهید:',
      keyboard: [
        [{ text: '❌ انصراف' }]
      ]
    };
  }

  // پردازش سوال سوم
  handleQuestion3(chatId, text) {
    const state = this.userStates.get(chatId);
    
    if (text === '❌ انصراف') {
      this.userStates.delete(chatId);
      return { text: '❌ ثبت گزارش لغو شد.' };
    }

    if (text.trim().length < 10) {
      return { text: '❌ لطفاً توضیح کامل‌تری ارائه دهید (حداقل 10 کاراکتر).' };
    }

    state.answers.question3 = text.trim();
    state.step = 'confirm';

    // نمایش خلاصه گزارش برای تایید
    const summary = this.generateReportSummary(state);
    
    return {
      text: `📋 *خلاصه گزارش شما:*\n\n${summary}\n\n✅ آیا می‌خواهید این گزارش را ثبت کنید؟`,
      keyboard: [
        [{ text: '✅ ثبت گزارش' }, { text: '❌ انصراف' }]
      ]
    };
  }

  // تایید و ثبت نهایی گزارش
  handleConfirm(chatId, text) {
    const state = this.userStates.get(chatId);
    
    if (text === '❌ انصراف') {
      this.userStates.delete(chatId);
      return { text: '❌ ثبت گزارش لغو شد.' };
    }

    if (text === '✅ ثبت گزارش') {
      // ثبت گزارش
      const success = this.saveReport(state);
      if (success) {
        this.userStates.delete(chatId);
        return { text: '✅ گزارش شما با موفقیت ثبت شد و برای مدیر ارسال گردید.' };
      } else {
        return { text: '❌ خطا در ثبت گزارش. لطفاً دوباره تلاش کنید.' };
      }
    }

    return { text: '❌ لطفاً یکی از گزینه‌های ✅ یا ❌ را انتخاب کنید.' };
  }

  // تولید خلاصه گزارش
  generateReportSummary(state) {
    const answers = state.answers;
    
    const q1Text = {
      '1': 'کمتر از 5 نفر',
      '2': '5 تا 10 نفر', 
      '3': '10 تا 15 نفر',
      '4': 'بیشتر از 15 نفر'
    }[answers.question1];

    const q2Text = {
      '1': 'خیلی کم',
      '2': 'کم',
      '3': 'متوسط',
      '4': 'زیاد',
      '5': 'خیلی زیاد'
    }[answers.question2];

    return `👥 تعداد حاضرین: ${q1Text}\n😊 سطح رضایت: ${q2Text}\n💭 مشکلات: ${answers.question3}`;
  }

  // ذخیره گزارش در فایل
  saveReport(state) {
    try {
      const { date, userId, userName, answers } = state;
      
      if (!this.reports[date]) {
        this.reports[date] = {};
      }
      
      this.reports[date][userId] = {
        userName,
        timestamp: new Date().toISOString(),
        answers
      };

      return this.saveReports();
    } catch (error) {
      console.error('❌ خطا در ذخیره گزارش:', error);
      return false;
    }
  }

  // دریافت گزارش‌های یک روز خاص
  getDailyReports(date) {
    return this.reports[date] || {};
  }

  // دریافت گزارش‌های یک کاربر
  getUserReports(userId) {
    const userReports = {};
    Object.keys(this.reports).forEach(date => {
      if (this.reports[date][userId]) {
        userReports[date] = this.reports[date][userId];
      }
    });
    return userReports;
  }

  // دریافت آمار کلی
  getStats() {
    const totalReports = Object.keys(this.reports).length;
    let totalUsers = 0;
    let totalAnswers = 0;

    Object.values(this.reports).forEach(dayReports => {
      totalUsers += Object.keys(dayReports).length;
      Object.values(dayReports).forEach(report => {
        totalAnswers += Object.keys(report.answers).length;
      });
    });

    return {
      totalDays: totalReports,
      totalUsers,
      totalAnswers,
      averageAnswersPerDay: totalReports > 0 ? (totalAnswers / totalReports).toFixed(1) : 0
    };
  }

  // پاک کردن وضعیت کاربر
  clearUserState(chatId) {
    this.userStates.delete(chatId);
  }

  // بررسی وضعیت کاربر
  getUserState(chatId) {
    return this.userStates.get(chatId);
  }
}

module.exports = SabtManager;
