// test_arzyabi.js - تست ماژول ارزیابی
const { ArzyabiModule } = require('./17arzyabi');

// ایجاد نمونه ماژول
const arzyabi = new ArzyabiModule();

// تنظیم توابع ارسال پیام (برای تست)
arzyabi.setSendMessage((chatId, text) => {
    console.log(`📤 [TEST] ارسال پیام به ${chatId}:`, text);
    return { success: true };
});

arzyabi.setSendMessageWithInlineKeyboard((chatId, text, keyboard) => {
    console.log(`📤 [TEST] ارسال پیام با کیبورد به ${chatId}:`, text);
    console.log(`⌨️ کیبورد:`, JSON.stringify(keyboard, null, 2));
    return { success: true };
});

// تست 1: تشخیص تمرین
console.log('\n🧪 تست 1: تشخیص تمرین');
const testMessage = {
    voice: { file_id: 'test_voice_123' },
    reply_to_message: {
        text: 'تکلیف امروز: سوره بقره آیه 1-5'
    },
    from: { id: '12345' },
    chat: { id: 'test_chat' },
    message_id: 'msg_123'
};

const isPractice = arzyabi.isPracticeSubmission(testMessage);
console.log(`✅ تشخیص تمرین: ${isPractice}`);

// تست 2: پردازش تمرین با نقش STUDENT
console.log('\n🧪 تست 2: پردازش تمرین با نقش STUDENT');
const userDataStudent = {
    user_type: 'STUDENT',  // نقش سیستم مرکزی
    full_name: 'احمد محمدی',
    first_name: 'احمد'
};

const practiceResult = arzyabi.processPracticeMessage(testMessage, userDataStudent);
console.log(`✅ نتیجه پردازش تمرین:`, practiceResult);

// تست 3: پردازش تمرین با نقش quran_student
console.log('\n🧪 تست 3: پردازش تمرین با نقش quran_student');
const userDataQuranStudent = {
    user_type: 'quran_student',  // نقش قدیمی
    full_name: 'علی احمدی',
    first_name: 'علی'
};

const practiceResult2 = arzyabi.processPracticeMessage(testMessage, userDataQuranStudent);
console.log(`✅ نتیجه پردازش تمرین:`, practiceResult2);

// تست 4: ایجاد کیبورد ارزیابی
if (practiceResult && practiceResult.keyboard) {
    console.log('\n🧪 تست 4: کیبورد ارزیابی');
    console.log(`✅ متن کیبورد:`, practiceResult.keyboard.text);
    console.log(`⌨️ دکمه‌ها:`, practiceResult.keyboard.keyboard.inline_keyboard.length, 'ردیف');
}

// تست 5: پردازش ارزیابی با نقش COACH
console.log('\n🧪 تست 5: پردازش ارزیابی با نقش COACH');
if (practiceResult && practiceResult.evaluation_id) {
    const evaluationResult = arzyabi.processEvaluationCallback(
        `evaluate_${practiceResult.evaluation_id}_4`, // عالی
        'teacher_123',
        'مربی علی',
        'COACH'  // نقش سیستم مرکزی
    );
    console.log(`✅ نتیجه ارزیابی:`, evaluationResult);
}

// تست 6: پردازش ارزیابی با نقش teacher
console.log('\n🧪 تست 6: پردازش ارزیابی با نقش teacher');
if (practiceResult && practiceResult.evaluation_id) {
    const evaluationResult2 = arzyabi.processEvaluationCallback(
        `evaluate_${practiceResult.evaluation_id}_3`, // خوب
        'teacher_456',
        'مربی محمد',
        'teacher'  // نقش قدیمی
    );
    console.log(`✅ نتیجه ارزیابی:`, evaluationResult2);
}

// تست 7: نمایش وضعیت فعلی
console.log('\n🧪 تست 7: وضعیت فعلی');
console.log(`📊 ارزیابی‌های در انتظار:`, Object.keys(arzyabi.evaluationData.pending_evaluations).length);
console.log(`✅ ارزیابی‌های تکمیل شده:`, Object.keys(arzyabi.evaluationData.completed_evaluations).length);

console.log('\n🎉 تست‌ها تکمیل شد!');
