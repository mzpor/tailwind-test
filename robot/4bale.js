//⏰ 09:01:10 🗓️ دوشنبه 13 مرداد 1404
// ماژول API Bale - ارسال و دریافت پیام

const axios = require('axios');
const { API_URL } = require('./3config');

async function getUpdates(offset) {
  console.log('📥 [BALE] getUpdates STARTED');
  console.log(`📥 [BALE] Offset: ${offset}`);
  
  try {
    const res = await axios.get(`${API_URL()}/getUpdates`, { 
      params: { offset },
      timeout: 10000 // 10 ثانیه timeout
    });
    console.log('📥 [BALE] getUpdates SUCCESS');
    console.log(`📥 [BALE] Updates count: ${res.data.result?.length || 0}`);
    if (res.data.result && res.data.result.length > 0) {
      console.log('📥 [BALE] First update:', JSON.stringify(res.data.result[0], null, 2));
      
      // بررسی callback data در اولین update
      const firstUpdate = res.data.result[0];
      if (firstUpdate.callback_query) {
        console.log('📥 [BALE] Callback query detected in first update');
        console.log(`📥 [BALE] Callback data: ${firstUpdate.callback_query.data}`);
        console.log(`📥 [BALE] Callback data type: ${typeof firstUpdate.callback_query.data}`);
        console.log(`📥 [BALE] Callback data length: ${firstUpdate.callback_query.data.length}`);
        console.log(`📥 [BALE] Callback data starts with 'practice_': ${firstUpdate.callback_query.data.startsWith('practice_')}`);
        console.log(`📥 [BALE] Callback data === 'practice_evaluation_days_settings': ${firstUpdate.callback_query.data === 'practice_evaluation_days_settings'}`);
      }
    }
    return res.data.result || [];
  } catch (error) {
    console.error('❌ [BALE] getUpdates ERROR:', error.message);
    console.error('❌ [BALE] Error response:', error.response?.data);
    throw error;
  }
}

async function sendMessage(chat_id, text, keyboard = null) {
  console.log('📤 [BALE] sendMessage STARTED');
  console.log(`📤 [BALE] ChatId: ${chat_id}, Text: ${text.substring(0, 100)}...`);
  console.log(`📤 [BALE] Keyboard:`, JSON.stringify(keyboard, null, 2));
  
  const payload = { chat_id, text };
  if (keyboard) {
    // اگر keyboard یک object کامل است (دارای keyboard property)
    if (keyboard.keyboard) {
      payload.reply_markup = keyboard;
    } else {
      // اگر keyboard فقط آرایه دکمه‌ها است
      payload.reply_markup = {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: false
      };
    }
  }
  
  console.log('📤 [BALE] Final payload:', JSON.stringify(payload, null, 2));
  console.log('📤 [BALE] Calling axios.post...');
  
  try {
    const response = await axios.post(`${API_URL()}/sendMessage`, payload, {
      timeout: 10000 // 10 ثانیه timeout
    });
    console.log('📤 [BALE] sendMessage SUCCESS');
    console.log('📤 [BALE] Response:', JSON.stringify(response.data, null, 2));
    return response;
  } catch (error) {
    console.error('❌ [BALE] sendMessage ERROR:', error.message);
    console.error('❌ [BALE] Error response:', error.response?.data);
    throw error;
  }
}

async function sendMessageWithInlineKeyboard(chat_id, text, inline_keyboard = null) {
  console.log('📤 [BALE] sendMessageWithInlineKeyboard STARTED');
  console.log(`📤 [BALE] ChatId: ${chat_id}, Text: ${text.substring(0, 100)}...`);
  console.log(`📤 [BALE] Inline keyboard:`, JSON.stringify(inline_keyboard, null, 2));
  
  // بررسی callback data ها
  if (inline_keyboard) {
    console.log('📤 [BALE] Checking callback data in keyboard...');
    inline_keyboard.forEach((row, rowIndex) => {
      row.forEach((button, buttonIndex) => {
        console.log(`📤 [BALE] Button [${rowIndex}][${buttonIndex}]: text="${button.text}", callback_data="${button.callback_data}"`);
      });
    });
  }
  
  const payload = { chat_id, text };
  if (inline_keyboard) {
    payload.reply_markup = {
      inline_keyboard
    };
  }
  
  console.log('📤 [BALE] Final payload:', JSON.stringify(payload, null, 2));
  console.log('📤 [BALE] Calling axios.post...');
  
  try {
    const response = await axios.post(`${API_URL()}/sendMessage`, payload, {
      timeout: 10000 // 10 ثانیه timeout
    });
    console.log('📤 [BALE] sendMessageWithInlineKeyboard SUCCESS');
    console.log('📤 [BALE] Response:', JSON.stringify(response.data, null, 2));
    return response;
  } catch (error) {
    console.error('❌ [BALE] sendMessageWithInlineKeyboard ERROR:', error.message);
    console.error('❌ [BALE] Error response:', error.response?.data);
    throw error;
  }
}

async function deleteMessage(chat_id, message_id) {
  console.log('🗑️ [BALE] deleteMessage STARTED');
  console.log(`🗑️ [BALE] ChatId: ${chat_id}, MessageId: ${message_id}`);
  
  const payload = { chat_id, message_id };
  console.log('🗑️ [BALE] Final payload:', JSON.stringify(payload, null, 2));
  console.log('🗑️ [BALE] Calling axios.post...');
  
  try {
    const response = await axios.post(`${API_URL()}/deleteMessage`, payload, {
      timeout: 10000
    });
    console.log('🗑️ [BALE] deleteMessage SUCCESS');
    console.log('🗑️ [BALE] Response:', JSON.stringify(response.data, null, 2));
    return response;
  } catch (error) {
    console.error('❌ [BALE] deleteMessage ERROR:', error.message);
    console.error('❌ [BALE] Error response:', error.response?.data);
    throw error;
  }
}

async function getChatAdministrators(chat_id) {
  const res = await axios.get(`${API_URL()}/getChatAdministrators`, { 
    params: { chat_id },
    timeout: 10000
  });
  return res.data.result || [];
}

async function getChatMember(chat_id, user_id = null) {
  const params = { chat_id };
  if (user_id) {
    params.user_id = user_id;
  }
  
  const res = await axios.get(`${API_URL()}/getChatMember`, { 
    params,
    timeout: 10000
  });
  return res.data.result || [];
}

async function answerCallbackQuery(callback_query_id, text = null, show_alert = false) {
  console.log('🔘 [BALE] answerCallbackQuery STARTED');
  console.log(`🔘 [BALE] CallbackQueryId: ${callback_query_id}, Text: ${text}, ShowAlert: ${show_alert}`);
  
  const payload = { callback_query_id };
  
  if (text) {
    payload.text = text.substring(0, 200); // محدودیت طول متن
  }
  if (show_alert) {
    payload.show_alert = show_alert;
  }
  
  console.log('🔘 [BALE] Final payload:', JSON.stringify(payload, null, 2));
  console.log('🔘 [BALE] Calling axios.post...');
  
  try {
    const response = await axios.post(`${API_URL()}/answerCallbackQuery`, payload, {
      timeout: 10000
    });
    console.log('🔘 [BALE] answerCallbackQuery SUCCESS');
    console.log('🔘 [BALE] Response:', JSON.stringify(response.data, null, 2));
    return response;
  } catch (error) {
    console.error('❌ [BALE] answerCallbackQuery ERROR:', error.message);
    console.error('❌ [BALE] Error response:', error.response?.data);
    throw error;
  }
}

async function editMessage(chat_id, message_id, text, inline_keyboard = null) {
  console.log('✏️ [BALE] editMessage STARTED');
  console.log(`✏️ [BALE] ChatId: ${chat_id}, MessageId: ${message_id}, Text: ${text.substring(0, 100)}...`);
  console.log(`✏️ [BALE] Inline keyboard:`, JSON.stringify(inline_keyboard, null, 2));
  
  // بررسی callback data ها
  if (inline_keyboard && inline_keyboard.length > 0) {
    console.log('✏️ [BALE] Checking callback data in keyboard...');
    inline_keyboard.forEach((row, rowIndex) => {
      row.forEach((button, buttonIndex) => {
        console.log(`✏️ [BALE] Button [${rowIndex}][${buttonIndex}]: text="${button.text}", callback_data="${button.callback_data}"`);
      });
    });
  }
  
  const payload = { 
    chat_id, 
    message_id, 
    text
  };
  
  // اضافه کردن parse_mode فقط اگر متن شامل Markdown باشد
  if (text.includes('*') || text.includes('_') || text.includes('`')) {
    payload.parse_mode = 'Markdown';
  }
  
  // فقط اگر keyboard وجود داشته باشد و خالی نباشد، اضافه کن
  if (inline_keyboard && inline_keyboard.length > 0) {
    payload.reply_markup = {
      inline_keyboard
    };
  }
  
  console.log('✏️ [BALE] Final payload:', JSON.stringify(payload, null, 2));
  console.log('✏️ [BALE] Calling axios.post...');
  
  try {
    const response = await axios.post(`${API_URL()}/editMessageText`, payload, {
      timeout: 10000
    });
    console.log('✏️ [BALE] editMessage SUCCESS');
    console.log('✏️ [BALE] Response:', JSON.stringify(response.data, null, 2));
    return response;
  } catch (error) {
    console.error('❌ [BALE] editMessage ERROR:', error.message);
    console.error('❌ [BALE] Error response:', error.response?.data);
    throw error;
  }
}

async function editMessageWithInlineKeyboard(chat_id, message_id, text, inline_keyboard = null) {
  console.log('✏️ [BALE] editMessageWithInlineKeyboard STARTED');
  console.log(`✏️ [BALE] ChatId: ${chat_id}, MessageId: ${message_id}, Text: ${text.substring(0, 100)}...`);
  console.log(`✏️ [BALE] Inline keyboard:`, JSON.stringify(inline_keyboard, null, 2));
  
  // بررسی callback data ها
  if (inline_keyboard && inline_keyboard.length > 0) {
    console.log('✏️ [BALE] Checking callback data in keyboard...');
    inline_keyboard.forEach((row, rowIndex) => {
      row.forEach((button, buttonIndex) => {
        console.log(`✏️ [BALE] Button [${rowIndex}][${buttonIndex}]: text="${button.text}", callback_data="${button.callback_data}"`);
      });
    });
  }
  
  const payload = { 
    chat_id, 
    message_id, 
    text,
    parse_mode: 'Markdown'
  };
  
  // فقط اگر keyboard وجود داشته باشد و خالی نباشد، اضافه کن
  if (inline_keyboard && inline_keyboard.length > 0) {
    payload.reply_markup = {
      inline_keyboard
    };
  }
  
  console.log('✏️ [BALE] Final payload:', JSON.stringify(payload, null, 2));
  console.log('✏️ [BALE] Calling axios.post...');
  
  try {
    const response = await axios.post(`${API_URL()}/editMessageText`, payload, {
      timeout: 10000
    });
    console.log('✏️ [BALE] editMessageWithInlineKeyboard SUCCESS');
    console.log('✏️ [BALE] Response:', JSON.stringify(response.data, null, 2));
    return response;
  } catch (error) {
    console.error('❌ [BALE] editMessageWithInlineKeyboard ERROR:', error.message);
    console.error('❌ [BALE] Error response:', error.response?.data);
    throw error;
  }
}

async function getChat(chat_id) {
  console.log('📋 [BALE] getChat STARTED');
  console.log(`📋 [BALE] ChatId: ${chat_id}`);
  
  try {
    const res = await axios.get(`${API_URL()}/getChat`, { 
      params: { chat_id },
      timeout: 10000 // 10 ثانیه timeout
    });
    console.log('📋 [BALE] getChat SUCCESS');
    console.log('📋 [BALE] Chat info:', JSON.stringify(res.data.result, null, 2));
    return res.data.result;
  } catch (error) {
    console.error('❌ [BALE] getChat ERROR:', error.message);
    console.error('❌ [BALE] Error response:', error.response?.data);
    throw error;
  }
}

async function sendInvoice(chat_id, invoiceData) {
  console.log('💳 [BALE] sendInvoice STARTED');
  console.log(`💳 [BALE] ChatId: ${chat_id}, Invoice data:`, JSON.stringify(invoiceData, null, 2));
  
  try {
    // اضافه کردن chat_id به payload
    const payload = { chat_id, ...invoiceData };
    console.log('💳 [BALE] Final payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(`${API_URL()}/sendInvoice`, payload, {
      timeout: 10000 // 10 ثانیه timeout
    });
    console.log('💳 [BALE] sendInvoice SUCCESS');
    console.log('💳 [BALE] Response:', JSON.stringify(response.data, null, 2));
    return response.data.ok;
  } catch (error) {
    console.error('❌ [BALE] sendInvoice ERROR:', error.message);
    console.error('❌ [BALE] Error response:', error.response?.data);
    return false;
  }
}

async function answerPreCheckoutQuery(pre_checkout_query_id, ok = true, error_message = null) {
  console.log('📋 [BALE] answerPreCheckoutQuery STARTED');
  console.log(`📋 [BALE] PreCheckoutQueryId: ${pre_checkout_query_id}, Ok: ${ok}`);
  
  try {
    const payload = {
      pre_checkout_query_id,
      ok
    };
    
    if (error_message) {
      payload.error_message = error_message;
    }
    
    console.log('📋 [BALE] Final payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(`${API_URL()}/answerPreCheckoutQuery`, payload, {
      timeout: 10000 // 10 ثانیه timeout
    });
    console.log('📋 [BALE] answerPreCheckoutQuery SUCCESS');
    console.log('📋 [BALE] Response:', JSON.stringify(response.data, null, 2));
    return response.data.ok;
  } catch (error) {
    console.error('❌ [BALE] answerPreCheckoutQuery ERROR:', error.message);
    console.error('❌ [BALE] Error response:', error.response?.data);
    return false;
  }
}

module.exports = { 
  getUpdates, 
  sendMessage, 
  sendMessageWithInlineKeyboard, 
  deleteMessage,
  getChatAdministrators,
  getChatMember,
  getChat,
  answerCallbackQuery,
  editMessage,
  editMessageWithInlineKeyboard,
  sendInvoice,
  answerPreCheckoutQuery
};