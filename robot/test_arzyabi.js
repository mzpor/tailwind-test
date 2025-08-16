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

// تست 1: تشخیص تمرین - حالت صوت ریپلای به متن
console.log('\n🧪 تست 1: تشخیص تمرین - صوت ریپلای به متن');
const testMessage1 = {
    voice: { file_id: 'test_voice_123' },
    reply_to_message: {
        text: 'تکلیف امروز: سوره بقره آیه 1-5'
    },
    from: { id: '12345' },
    chat: { id: 'test_chat' },
    message_id: 'msg_123'
};

const isPractice1 = arzyabi.isPracticeSubmission(testMessage1);
console.log(`✅ تشخیص تمرین (صوت ریپلای به متن): ${isPractice1}`);

// تست 2: تشخیص تمرین - حالت متن ریپلای به صوت
console.log('\n🧪 تست 2: تشخیص تمرین - متن ریپلای به صوت');
const testMessage2 = {
    text: 'تکلیف',
    reply_to_message: {
        voice: { file_id: 'test_voice_456' }
    },
    from: { id: '12345' },
    chat: { id: 'test_chat' },
    message_id: 'msg_124'
};

const isPractice2 = arzyabi.isPracticeSubmission(testMessage2);
console.log(`✅ تشخیص تمرین (متن ریپلای به صوت): ${isPractice2}`);

// تست 3: پردازش تمرین با نقش STUDENT
console.log('\n🧪 تست 3: پردازش تمرین با نقش STUDENT');
const userDataStudent = {
    user_type: 'STUDENT',  // نقش سیستم مرکزی
    full_name: 'احمد محمدی',
    first_name: 'احمد'
};

const practiceResult = arzyabi.processPracticeMessage(testMessage2, userDataStudent);
console.log(`✅ نتیجه پردازش تمرین:`, practiceResult);

// تست 4: پردازش تمرین با نقش quran_student
console.log('\n🧪 تست 4: پردازش تمرین با نقش quran_student');
const userDataQuranStudent = {
    user_type: 'quran_student',  // نقش قدیمی
    full_name: 'علی احمدی',
    first_name: 'علی'
};

const practiceResult2 = arzyabi.processPracticeMessage(testMessage2, userDataQuranStudent);
console.log(`✅ نتیجه پردازش تمرین:`, practiceResult2);

// تست 5: ایجاد کیبورد ارزیابی
if (practiceResult && practiceResult.keyboard) {
    console.log('\n🧪 تست 5: کیبورد ارزیابی');
    console.log(`✅ متن کیبورد:`, practiceResult.keyboard.text);
    console.log(`⌨️ دکمه‌ها:`, practiceResult.keyboard.keyboard.inline_keyboard.length, 'ردیف');
}

// تست 6: پردازش ارزیابی با نقش COACH
console.log('\n🧪 تست 6: پردازش ارزیابی با نقش COACH');
if (practiceResult && practiceResult.evaluation_id) {
    const evaluationResult = arzyabi.processEvaluationCallback(
        `evaluate_${practiceResult.evaluation_id}_4`, // عالی
        'teacher_123',
        'مربی علی',
        'COACH'  // نقش سیستم مرکزی
    );
    console.log(`✅ نتیجه ارزیابی:`, evaluationResult);
}

// تست 7: پردازش ارزیابی با نقش teacher
console.log('\n🧪 تست 7: پردازش ارزیابی با نقش teacher');
if (practiceResult && practiceResult.evaluation_id) {
    const evaluationResult2 = arzyabi.processEvaluationCallback(
        `evaluate_${practiceResult.evaluation_id}_3`, // خوب
        'teacher_456',
        'مربی محمد',
        'teacher'  // نقش قدیمی
    );
    console.log(`✅ نتیجه ارزیابی:`, evaluationResult2);
}

// تست 8: نمایش وضعیت فعلی
console.log('\n🧪 تست 8: وضعیت فعلی');
console.log(`📊 ارزیابی‌های در انتظار:`, Object.keys(arzyabi.evaluationData.pending_evaluations).length);
console.log(`✅ ارزیابی‌های تکمیل شده:`, Object.keys(arzyabi.evaluationData.completed_evaluations).length);

console.log('\n🎉 تست‌ها تکمیل شد!');
