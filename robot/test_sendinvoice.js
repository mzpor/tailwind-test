const { sendInvoice } = require('./4bale');

console.log('🧪 تست sendInvoice...');

// تست ارسال صورتحساب
async function testSendInvoice() {
    try {
        const success = await sendInvoice(parseInt(574330749), {
            title: "تست پرداخت",
            description: "تست ارسال صورتحساب",
            payload: "test_payload",
            provider_token: "WALLET-LIiCzxGZnCd58Obr",
            currency: "IRR",
            prices: [{
                label: "تست",
                amount: 10000
            }],
            need_phone_number: true
        });
        
        if (success) {
            console.log('✅ صورتحساب با موفقیت ارسال شد!');
        } else {
            console.log('❌ خطا در ارسال صورتحساب');
        }
    } catch (error) {
        console.error('❌ خطا در تست:', error);
    }
}

testSendInvoice();
