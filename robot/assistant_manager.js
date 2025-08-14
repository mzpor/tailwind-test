// ماژول مدیریت کمک مربی‌ها
// مشابه KargahModule اما فقط برای کمک مربی‌ها

const fs = require('fs');
const path = require('path');

class AssistantManagerModule {
    constructor() {
        this.assistants = {}; // ذخیره کمک مربی‌ها
        this.userStates = {}; // وضعیت کاربران
        this.tempData = {}; // داده‌های موقت برای اضافه/ویرایش
        this.assistantsFile = path.join(__dirname, 'data', 'assistants.json');
        this.loadAssistants();
        console.log('✅ AssistantManagerModule initialized successfully');
    }
    
    loadAssistants() {
        try {
            if (fs.existsSync(this.assistantsFile)) {
                const data = fs.readFileSync(this.assistantsFile, 'utf8');
                this.assistants = JSON.parse(data);
                console.log('✅ Assistants loaded successfully');
            } else {
                this.assistants = {};
                console.log('No assistants file found, starting with empty assistants');
            }
        } catch (error) {
            console.error('Error loading assistants:', error.message);
            this.assistants = {};
        }
    }
    
    saveAssistants() {
        try {
            // اطمینان از وجود پوشه data
            const dataDir = path.dirname(this.assistantsFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(this.assistantsFile, JSON.stringify(this.assistants, null, 2), 'utf8');
            console.log('✅ Assistants saved successfully');
        } catch (error) {
            console.error('Error saving assistants:', error.message);
        }
    }
    
    // دریافت کیبرد لیست کمک مربی‌ها
    getAssistantListKeyboard() {
        const keyboard = [];
        
        if (!this.assistants || Object.keys(this.assistants).length === 0) {
            keyboard.push([{ text: '📝 کمک مربی جدید', callback_data: 'assistant_add' }]);
            keyboard.push([{ text: '🔙 بازگشت', callback_data: 'assistant_back' }]);
        } else {
            for (const [assistantId, assistant] of Object.entries(this.assistants)) {
                const name = assistant.name || 'نامشخص';
                const phone = assistant.phone || 'نامشخص';
                keyboard.push([{
                    text: `👨‍🏫 ${name} - ${phone}`,
                    callback_data: `assistant_view_${assistantId}`
                }]);
            }
            
            keyboard.push([{ text: '📝 کمک مربی جدید', callback_data: 'assistant_add' }]);
            keyboard.push([{ text: '🔙 بازگشت', callback_data: 'assistant_back' }]);
        }
        
        return { inline_keyboard: keyboard };
    }
    
    // دریافت کیبرد مدیریت کمک مربی
    getAssistantManagementKeyboard() {
        const keyboard = [];
        
        // نمایش لیست کمک مربی‌ها
        if (this.assistants && Object.keys(this.assistants).length > 0) {
            for (const [assistantId, assistant] of Object.entries(this.assistants)) {
                const name = assistant.name || 'نامشخص';
                const phone = assistant.phone || 'نامشخص';
                keyboard.push([{
                    text: `👨‍🏫 ${name} - ${phone}`,
                    callback_data: `assistant_view_${assistantId}`
                }]);
            }
        }
        
        // دکمه‌های عملیات
        keyboard.push([{ text: '📝 اضافه کردن کمک مربی', callback_data: 'assistant_add' }]);
        
        return { inline_keyboard: keyboard };
    }
    
    // دریافت کیبرد ویرایش کمک مربی
    getAssistantEditKeyboard(assistantId) {
        const keyboard = [
            [{ text: '✏️ ویرایش نام', callback_data: `assistant_edit_name_${assistantId}` }],
            [{ text: '📱 ویرایش تلفن', callback_data: `assistant_edit_phone_${assistantId}` }],
            [{ text: '🗑️ حذف کمک مربی', callback_data: `assistant_delete_${assistantId}` }],
            [{ text: '🔙 بازگشت', callback_data: 'assistant_list' }]
        ];
        return { inline_keyboard: keyboard };
    }
    
    // نمایش پنل مدیریت کمک مربی
    async showAssistantManagement(chatId, userId) {
        let text = '';
        if (!this.assistants || Object.keys(this.assistants).length === 0) {
            text = '👨‍🏫 *مدیریت کمک مربی‌ها*\n\n❌ هیچ کمک مربی ثبت نشده است.\nبرای شروع، کمک مربی جدید اضافه کنید:';
        } else {
            text = '👨‍🏫 *مدیریت کمک مربی‌ها*\n\n📋 لیست کمک مربی‌های ثبت شده:\n';
            for (const [assistantId, assistant] of Object.entries(this.assistants)) {
                const name = assistant.name || 'نامشخص';
                const phone = assistant.phone || 'نامشخص';
                text += `👨‍🏫 *${name}* - ${phone}\n`;
            }
            text += '\nبرای مشاهده جزئیات و ویرایش، روی کمک مربی مورد نظر کلیک کنید:';
        }
        
        const replyMarkup = this.getAssistantManagementKeyboard();
        return { text, keyboard: replyMarkup.inline_keyboard };
    }
    
    // پردازش callback ها
    async handleCallback(callback) {
        const chatId = callback.message.chat.id;
        const userId = callback.from.id;
        const messageId = callback.message.message_id;
        const data = callback.data;
        const callbackQueryId = callback.id;
        
        return this.routeCallback(chatId, messageId, userId, data, callbackQueryId);
    }
    
    // مسیریابی callback ها
    async routeCallback(chatId, messageId, userId, data, callbackQueryId) {
        try {
            console.log(`Routing assistant callback: ${data}`);
            
            if (data === 'assistant_add') {
                return this.handleAddAssistant(chatId, messageId, userId, callbackQueryId);
            } else if (data === 'assistant_back') {
                return this.handleBackToMain(chatId, messageId, userId, callbackQueryId);
            } else if (data === 'assistant_list') {
                return this.handleListAssistants(chatId, messageId, userId, callbackQueryId);
            } else if (data.startsWith('assistant_view_')) {
                const assistantId = data.replace('assistant_view_', '');
                return this.handleViewAssistant(chatId, messageId, userId, assistantId, callbackQueryId);
            } else if (data.startsWith('assistant_edit_name_')) {
                const assistantId = data.replace('assistant_edit_name_', '');
                return this.handleEditAssistantName(chatId, messageId, userId, assistantId, callbackQueryId);
            } else if (data.startsWith('assistant_edit_phone_')) {
                const assistantId = data.replace('assistant_edit_phone_', '');
                return this.handleEditAssistantPhone(chatId, messageId, userId, assistantId, callbackQueryId);
            } else if (data.startsWith('assistant_delete_')) {
                const assistantId = data.replace('assistant_delete_', '');
                return this.handleDeleteAssistant(chatId, messageId, userId, assistantId, callbackQueryId);
            }
            
            return false;
        } catch (error) {
            console.error('Error in routeCallback:', error);
            return false;
        }
    }
    
    // اضافه کردن کمک مربی جدید
    async handleAddAssistant(chatId, messageId, userId, callbackQueryId) {
        // تنظیم وضعیت کاربر
        this.userStates[userId] = 'assistant_add_name';
        
        const text = '📝 *اضافه کردن کمک مربی جدید*\n\n👤 لطفاً نام و فامیل کمک مربی را وارد کنید:';
        const keyboard = [[{ text: '🔙 بازگشت', callback_data: 'assistant_back' }]];
        
        return { text, keyboard };
    }
    
    // نمایش لیست کمک مربی‌ها
    async handleListAssistants(chatId, messageId, userId, callbackQueryId) {
        return await this.showAssistantManagement(chatId, userId);
    }
    
    // مشاهده جزئیات کمک مربی
    async handleViewAssistant(chatId, messageId, userId, assistantId, callbackQueryId) {
        const assistant = this.assistants[assistantId];
        if (!assistant) {
            return { text: '❌ کمک مربی یافت نشد', keyboard: [[{ text: '🔙 بازگشت', callback_data: 'assistant_list' }]] };
        }
        
        const text = `👨‍🏫 *جزئیات کمک مربی*\n\n👤 **نام:** ${assistant.name || 'نامشخص'}\n📱 **تلفن:** ${assistant.phone || 'نامشخص'}\n📅 **تاریخ ثبت:** ${assistant.created_at || 'نامشخص'}`;
        const keyboard = this.getAssistantEditKeyboard(assistantId).inline_keyboard;
        
        return { text, keyboard };
    }
    
    // ویرایش نام کمک مربی
    async handleEditAssistantName(chatId, messageId, userId, assistantId, callbackQueryId) {
        this.userStates[userId] = `assistant_edit_name_${assistantId}`;
        
        const text = '✏️ *ویرایش نام کمک مربی*\n\n👤 لطفاً نام جدید را وارد کنید:';
        const keyboard = [[{ text: '🔙 بازگشت', callback_data: `assistant_view_${assistantId}` }]];
        
        return { text, keyboard };
    }
    
    // ویرایش تلفن کمک مربی
    async handleEditAssistantPhone(chatId, messageId, userId, assistantId, callbackQueryId) {
        this.userStates[userId] = `assistant_edit_phone_${assistantId}`;
        
        const text = '📱 *ویرایش تلفن کمک مربی*\n\n📞 لطفاً شماره تلفن جدید را وارد کنید:';
        const keyboard = [[{ text: '🔙 بازگشت', callback_data: `assistant_view_${assistantId}` }]];
        
        return { text, keyboard };
    }
    
    // حذف کمک مربی
    async handleDeleteAssistant(chatId, messageId, userId, assistantId, callbackQueryId) {
        const assistant = this.assistants[assistantId];
        if (!assistant) {
            return { text: '❌ کمک مربی یافت نشد', keyboard: [[{ text: '🔙 بازگشت', callback_data: 'assistant_list' }]] };
        }
        
        // حذف کمک مربی
        delete this.assistants[assistantId];
        this.saveAssistants();
        
        const text = `🗑️ *کمک مربی حذف شد*\n\n👤 **نام:** ${assistant.name}\n📱 **تلفن:** ${assistant.phone}\n\n✅ کمک مربی با موفقیت حذف شد.`;
        const keyboard = [[{ text: '🔙 بازگشت به لیست', callback_data: 'assistant_list' }]];
        
        return { text, keyboard };
    }
    
    // بازگشت به منوی اصلی
    async handleBackToMain(chatId, messageId, userId, callbackQueryId) {
        // پاک کردن وضعیت کاربر
        delete this.userStates[userId];
        
        const text = '🔙 بازگشت به منوی اصلی';
        const keyboard = [[{ text: '🔙 بازگشت', callback_data: 'back' }]];
        
        return { text, keyboard };
    }
    
    // پردازش پیام‌های متنی
    async handleMessage(message) {
        const chatId = message.chat.id;
        const userId = message.from.id;
        const text = message.text || '';
        
        // بررسی وضعیت کاربر
        const userState = this.userStates[userId] || '';
        
        if (userState.startsWith('assistant_add_')) {
            return this.handleAddAssistantStep(chatId, userId, text, userState);
        } else if (userState.startsWith('assistant_edit_')) {
            return this.handleEditAssistantStep(chatId, userId, text, userState);
        }
        
        return false;
    }
    
    // پردازش مراحل اضافه کردن کمک مربی
    async handleAddAssistantStep(chatId, userId, text, userState) {
        if (userState === 'assistant_add_name') {
            // ذخیره نام
            this.tempData[userId] = { name: text };
            this.userStates[userId] = 'assistant_add_phone';
            
            const responseText = '📱 *شماره تلفن*\n\n📞 لطفاً شماره تلفن کمک مربی را وارد کنید:';
            const keyboard = [[{ text: '🔙 بازگشت', callback_data: 'assistant_back' }]];
            
            return { text: responseText, keyboard };
        } else if (userState === 'assistant_add_phone') {
            // ذخیره تلفن و تکمیل
            const tempData = this.tempData[userId] || {};
            const name = tempData.name || 'نامشخص';
            
            // ایجاد ID منحصر به فرد
            const assistantId = Date.now().toString();
            
            // ذخیره کمک مربی
            this.assistants[assistantId] = {
                name: name,
                phone: text,
                created_at: new Date().toISOString()
            };
            
            this.saveAssistants();
            
            // پاک کردن داده‌های موقت
            delete this.tempData[userId];
            delete this.userStates[userId];
            
            const responseText = `✅ *کمک مربی اضافه شد*\n\n👤 **نام:** ${name}\n📱 **تلفن:** ${text}\n\n🎉 کمک مربی جدید با موفقیت ثبت شد.`;
            const keyboard = [
                [{ text: '📝 کمک مربی دیگر', callback_data: 'assistant_add' }],
                [{ text: '🔙 بازگشت به لیست', callback_data: 'assistant_list' }]
            ];
            
            return { text: responseText, keyboard };
        }
        
        return false;
    }
    
    // پردازش مراحل ویرایش کمک مربی
    async handleEditAssistantStep(chatId, userId, text, userState) {
        if (userState.startsWith('assistant_edit_name_')) {
            const assistantId = userState.replace('assistant_edit_name_', '');
            const assistant = this.assistants[assistantId];
            
            if (assistant) {
                assistant.name = text;
                this.saveAssistants();
                
                const responseText = `✅ *نام کمک مربی ویرایش شد*\n\n👤 **نام جدید:** ${text}\n📱 **تلفن:** ${assistant.phone}`;
                const keyboard = this.getAssistantEditKeyboard(assistantId).inline_keyboard;
                
                // پاک کردن وضعیت کاربر
                delete this.userStates[userId];
                
                return { text: responseText, keyboard };
            }
        } else if (userState.startsWith('assistant_edit_phone_')) {
            const assistantId = userState.replace('assistant_edit_phone_', '');
            const assistant = this.assistants[assistantId];
            
            if (assistant) {
                assistant.phone = text;
                this.saveAssistants();
                
                const responseText = `✅ *تلفن کمک مربی ویرایش شد*\n\n👤 **نام:** ${assistant.name}\n📱 **تلفن جدید:** ${text}`;
                const keyboard = this.getAssistantEditKeyboard(assistantId).inline_keyboard;
                
                // پاک کردن وضعیت کاربر
                delete this.userStates[userId];
                
                return { text: responseText, keyboard };
            }
        }
        
        return false;
    }
}

module.exports = AssistantManagerModule;
