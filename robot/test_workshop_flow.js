// تست جریان کارگاه‌ها - نسخه موقت
const { spawn } = require('child_process');

async function testWorkshopFlow() {
    console.log('🧪 تست جریان کارگاه‌ها...');
    
    try {
        // تست فراخوانی ماژول پایتون
        console.log('🐍 تست فراخوانی ماژول پایتون...');
        
        const pythonProcess = spawn('python', ['payment_module.py', 'send_invoice', '12345', '2']);
        
        return new Promise((resolve, reject) => {
            let output = '';
            let errorOutput = '';
            
            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
                console.log(`🐍 Output: ${data.toString()}`);
            });
            
            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
                console.log(`🐍 Error: ${data.toString()}`);
            });
            
            pythonProcess.on('close', (code) => {
                console.log(`🐍 Python process exited with code ${code}`);
                console.log(`🐍 Final output: ${output}`);
                
                if (errorOutput) {
                    console.error(`🐍 Final error: ${errorOutput}`);
                }
                
                if (code === 0) {
                    console.log('✅ تست موفق بود!');
                    resolve(true);
                } else {
                    console.log('❌ تست ناموفق بود!');
                    resolve(false);
                }
            });
            
            pythonProcess.on('error', (error) => {
                console.error(`❌ Python process error:`, error);
                resolve(false);
            });
        });
        
    } catch (error) {
        console.error('❌ خطا در تست:', error);
        return false;
    }
}

// اجرای تست
testWorkshopFlow().then(success => {
    if (success) {
        console.log('🎉 همه تست‌ها موفق بودند!');
    } else {
        console.log('💥 برخی تست‌ها ناموفق بودند!');
    }
    process.exit(0);
});
