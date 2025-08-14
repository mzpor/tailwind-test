const { spawn } = require('child_process');

console.log('🧪 تست ساده API بله...');

// تست sendMessage
const testMessage = spawn('python', ['payment_module.py', 'test_message', '12345', 'تست پیام']);

testMessage.stdout.on('data', (data) => {
    console.log(`🐍 Output: ${data}`);
});

testMessage.stderr.on('data', (data) => {
    console.log(`🐍 Error: ${data}`);
});

testMessage.on('close', (code) => {
    console.log(`🐍 Python process exited with code ${code}`);
    if (code === 0) {
        console.log('✅ تست sendMessage موفق بود!');
    } else {
        console.log('❌ تست sendMessage ناموفق بود!');
    }
});
