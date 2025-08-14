// 🧪 تست PracticeManager
// تست عملکرد تشکر از تمرین

const { practiceManager } = require('./practice_manager');

async function testPracticeManager() {
  console.log('🧪 شروع تست PracticeManager...\n');

  try {
    // تست 1: بررسی وضعیت سیستم
    console.log('📋 تست 1: وضعیت سیستم');
    const status = practiceManager.getStatus();
    console.log('✅ وضعیت سیستم:', status);

    // تست 2: بررسی پیام تمرین
    console.log('\n📋 تست 2: بررسی پیام تمرین');
    
    // پیام تمرین معتبر
    const validPracticeMessage = {
      voice: { file_id: 'test_voice_id' },
      caption: 'تمرین سوره حمد',
      chat: { id: 12345, title: 'گروه تست' },
      from: { first_name: 'احمد', last_name: 'محمدی' }
    };
    
    const isValidPractice = practiceManager.isPracticeMessage(validPracticeMessage);
    console.log('✅ پیام تمرین معتبر:', isValidPractice);

    // پیام غیر تمرین
    const invalidMessage = {
      text: 'سلام',
      chat: { id: 12345, title: 'گروه تست' },
      from: { first_name: 'احمد', last_name: 'محمدی' }
    };
    
    const isInvalidPractice = practiceManager.isPracticeMessage(invalidMessage);
    console.log('✅ پیام غیر تمرین:', !isInvalidPractice);

    // پیام صوتی بدون کپشن
    const voiceWithoutCaption = {
      voice: { file_id: 'test_voice_id' },
      chat: { id: 12345, title: 'گروه تست' },
      from: { first_name: 'احمد', last_name: 'محمدی' }
    };
    
    const isVoiceWithoutCaption = practiceManager.isPracticeMessage(voiceWithoutCaption);
    console.log('✅ پیام صوتی بدون کپشن:', !isVoiceWithoutCaption);

    // تست 3: کلمات کلیدی تمرین
    console.log('\n📋 تست 3: کلمات کلیدی تمرین');
    
    const testKeywords = [
      'تمرین سوره حمد',
      'tamrin surah fatiha',
      'practice quran',
      'تمرینات روزانه',
      'tamrinat roozane'
    ];
    
    testKeywords.forEach(keyword => {
      const testMessage = {
        voice: { file_id: 'test_voice_id' },
        caption: keyword,
        chat: { id: 12345, title: 'گروه تست' },
        from: { first_name: 'احمد', last_name: 'محمدی' }
      };
      
      const isPractice = practiceManager.isPracticeMessage(testMessage);
      console.log(`✅ "${keyword}": ${isPractice ? 'تمرین' : 'غیر تمرین'}`);
    });

    console.log('\n🎉 تمام تست‌ها با موفقیت انجام شد!');
    console.log('\n💡 برای تست واقعی:');
    console.log('1. ربات را در گروه قرار دهید');
    console.log('2. پیام صوتی با کپشن "تمرین" ارسال کنید');
    console.log('3. ربات باید تشکر کند');

  } catch (error) {
    console.error('❌ خطا در تست:', error);
  }
}

// اجرای تست
if (require.main === module) {
  testPracticeManager();
}

module.exports = { testPracticeManager };
