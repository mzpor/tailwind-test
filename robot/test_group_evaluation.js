// 🧪 تست سیستم ارزیابی و مدیریت گروه
// تست تمام قابلیت‌های سیستم

const { groupEvaluationConfig } = require('./group_evaluation_config');
const { groupEvaluationManager } = require('./group_evaluation_manager');
const { evaluationModule } = require('./evaluation_module');

async function testGroupEvaluationSystem() {
  console.log('🧪 شروع تست سیستم ارزیابی و مدیریت گروه...\n');

  try {
    // تست 1: کانفیگ
    console.log('📋 تست 1: کانفیگ سیستم');
    const config = groupEvaluationConfig.getConfig();
    console.log('✅ کانفیگ بارگذاری شد:', {
      systemEnabled: config.systemEnabled,
      evaluationEnabled: config.evaluation.enabled,
      groupManagementEnabled: config.groupManagement.enabled
    });

    // تست 2: تغییر تنظیمات
    console.log('\n📋 تست 2: تغییر تنظیمات');
    const testTime = '21:00';
    const result = groupEvaluationConfig.setEvaluationTime(testTime, 'test_user');
    console.log(`✅ تنظیم زمان ارزیابی به ${testTime}:`, result);

    // تست 3: بررسی دسترسی
    console.log('\n📋 تست 3: بررسی دسترسی کاربران');
    const hasAccess = groupEvaluationConfig.hasPermission(1775811194, 'evaluationAccess');
    console.log('✅ دسترسی کاربر 1775811194 به ارزیابی:', hasAccess);

    // تست 4: شروع سیستم مدیریت
    console.log('\n📋 تست 4: شروع سیستم مدیریت');
    const startResult = groupEvaluationManager.start();
    console.log('✅ شروع سیستم مدیریت:', startResult);

    // تست 5: وضعیت سیستم
    console.log('\n📋 تست 5: وضعیت سیستم');
    const status = groupEvaluationManager.getStatus();
    console.log('✅ وضعیت سیستم:', {
      isRunning: status.isRunning,
      systemEnabled: status.systemEnabled
    });

    // تست 6: ماژول ارزیابی
    console.log('\n📋 تست 6: ماژول ارزیابی');
    const questions = evaluationModule.getAllQuestions();
    console.log(`✅ تعداد سوالات موجود: ${questions.length}`);

    // تست 7: اضافه کردن سوال جدید
    console.log('\n📋 تست 7: اضافه کردن سوال جدید');
    const newQuestion = {
      category: 'تست',
      question: 'این یک سوال تست است؟',
      options: ['بله', 'خیر', 'شاید', 'مطمئن نیستم'],
      correctAnswer: 0,
      difficulty: 'آسان',
      explanation: 'این یک سوال تست برای بررسی عملکرد سیستم است.'
    };
    const questionId = evaluationModule.addQuestion(newQuestion);
    console.log('✅ سوال جدید اضافه شد با ID:', questionId);

    // تست 8: شروع جلسه ارزیابی
    console.log('\n📋 تست 8: شروع جلسه ارزیابی');
    const sessionConfig = {
      questionsPerEvaluation: 3,
      evaluationDuration: 30,
      passingScore: 70
    };
    const sessionId = `test_session_${Date.now()}`;
    const session = evaluationModule.startEvaluationSession(sessionId, sessionConfig);
    console.log('✅ جلسه ارزیابی شروع شد:', {
      sessionId: session.id,
      questionsCount: session.questions.length,
      duration: session.duration
    });

    // تست 9: ثبت‌نام شرکت‌کننده
    console.log('\n📋 تست 9: ثبت‌نام شرکت‌کننده');
    const participant = evaluationModule.registerParticipant(sessionId, 12345, 'کاربر تست');
    console.log('✅ شرکت‌کننده ثبت‌نام شد:', {
      userId: participant.userId,
      userName: participant.userName
    });

    // تست 10: ارسال پاسخ
    console.log('\n📋 تست 10: ارسال پاسخ');
    if (session.questions.length > 0) {
      const firstQuestion = session.questions[0];
      const answerResult = evaluationModule.submitAnswer(sessionId, 12345, firstQuestion.id, 0);
      console.log('✅ پاسخ ارسال شد:', {
        isCorrect: answerResult.isCorrect,
        currentScore: answerResult.currentScore
      });
    }

    // تست 11: وضعیت جلسه
    console.log('\n📋 تست 11: وضعیت جلسه');
    const sessionStatus = evaluationModule.getSessionStatus(sessionId);
    console.log('✅ وضعیت جلسه:', {
      status: sessionStatus.status,
      participantsCount: sessionStatus.participantsCount,
      remainingTime: Math.round(sessionStatus.remainingTime / 1000 / 60) + ' دقیقه'
    });

    // تست 12: پایان جلسه ارزیابی
    console.log('\n📋 تست 12: پایان جلسه ارزیابی');
    const results = evaluationModule.endEvaluationSession(sessionId);
    console.log('✅ جلسه ارزیابی پایان یافت:', {
      totalParticipants: results.totalParticipants,
      averageScore: results.statistics.averageScore,
      passedCount: results.statistics.passedCount
    });

    // تست 13: برنامه زمان‌بندی سفارشی
    console.log('\n📋 تست 13: برنامه زمان‌بندی سفارشی');
    const customSchedule = {
      name: 'اعلان تست',
      action: 'send_notification',
      time: '22:00',
      days: [0, 1, 2, 3, 4, 5, 6],
      message: 'این یک اعلان تست است!'
    };
    const scheduleResult = groupEvaluationConfig.addCustomSchedule(customSchedule, 'test_user');
    console.log('✅ برنامه زمان‌بندی سفارشی اضافه شد:', scheduleResult);

    // تست 14: دریافت برنامه‌های سفارشی
    console.log('\n📋 تست 14: دریافت برنامه‌های سفارشی');
    const customSchedules = groupEvaluationConfig.getCustomSchedules();
    console.log(`✅ تعداد برنامه‌های سفارشی: ${customSchedules.length}`);

    // تست 15: توقف سیستم مدیریت
    console.log('\n📋 تست 15: توقف سیستم مدیریت');
    const stopResult = groupEvaluationManager.stop();
    console.log('✅ توقف سیستم مدیریت:', stopResult);

    // تست 16: پاک کردن تاریخچه
    console.log('\n📋 تست 16: پاک کردن تاریخچه');
    evaluationModule.clearHistory();
    groupEvaluationManager.clearHistory();
    console.log('✅ تاریخچه پاک شد');

    console.log('\n🎉 تمام تست‌ها با موفقیت انجام شد!');

  } catch (error) {
    console.error('❌ خطا در تست:', error);
  }
}

// اجرای تست
if (require.main === module) {
  testGroupEvaluationSystem();
}

module.exports = {
  testGroupEvaluationSystem
};
