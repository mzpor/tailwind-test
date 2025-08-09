# payment_module.py
import requests
import time
import json
import uuid
from typing import Dict, List, Optional, Any
from config import BASE_URL, BOT_TOKEN
import logging

# تنظیم لاگ
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PaymentModule:
    def __init__(self, kargah_module=None):
        self.kargah_module = kargah_module
        self.user_states = {}
        self.payment_token = "WALLET-LIiCzxGZnCd58Obr"  # توکن تولید
        self.group_link = "ble.ir/join/Gah9cS9LzQ"
        logger.info("PaymentModule initialized successfully")

    def _make_request(self, url: str, payload: Dict[str, Any]) -> Optional[requests.Response]:
        """ارسال درخواست HTTP با مدیریت خطا"""
        try:
            response = requests.post(url, json=payload, timeout=10)
            logger.debug(f"Request to {url}: {response.status_code}")
            return response
        except Exception as e:
            logger.error(f"Error in request to {url}: {e}")
            return None

    def send_message(self, chat_id: int, text: str, reply_markup: Optional[Dict] = None, secondary_reply_markup: Optional[Dict] = None) -> bool:
        """ارسال پیام به کاربر"""
        if not text or not text.strip():
            logger.error("Empty message text provided")
            return False
            
        payload = {"chat_id": chat_id, "text": text}
        
        if reply_markup and secondary_reply_markup:
            # ترکیب کیبورد شیشه‌ای و معمولی
            payload["reply_markup"] = reply_markup
            payload["reply_markup"].update(secondary_reply_markup)
        elif reply_markup:
            payload["reply_markup"] = reply_markup
        elif secondary_reply_markup:
            payload["reply_markup"] = secondary_reply_markup
            
        response = self._make_request(f"{BASE_URL}/sendMessage", payload)
        if response and response.status_code == 200:
            result = response.json()
            if result.get("ok"):
                logger.info(f"Message sent successfully to {chat_id}")
                return True
            else:
                logger.error(f"Telegram API error: {result.get('description', 'Unknown error')}")
        
        logger.error(f"Failed to send message to {chat_id}")
        return False

    def build_reply_keyboard(self, buttons: List[str]) -> Dict:
        """ساخت کیبورد معمولی"""
        return {
            "keyboard": [[{"text": btn}] for btn in buttons],
            "resize_keyboard": True
        }

    def build_inline_keyboard(self, buttons: List[Dict]) -> Dict:
        """ساخت کیبورد شیشه‌ای"""
        return {
            "inline_keyboard": [[{"text": btn["text"], "callback_data": btn["callback_data"]}] for btn in buttons]
        }

    def send_invoice(self, chat_id: int, workshop_id: str, workshop_data: Dict) -> bool:
        """ارسال پیام صورتحساب برای کارگاه"""
        try:
            # تبدیل هزینه به عدد
            cost_text = workshop_data.get('cost', '0 تومان')
            cost_amount = self._extract_amount_from_cost(cost_text)
            
            payload = {
                "chat_id": chat_id,
                "title": f"پرداخت برای {workshop_data.get('instructor_name', 'کارگاه')}",
                "description": f"پرداخت برای ثبت‌نام در کارگاه {workshop_data.get('instructor_name', 'کارگاه')} با مبلغ {cost_amount // 10} تومان",
                "payload": str(uuid.uuid4()),
                "provider_token": self.payment_token,
                "currency": "IRR",
                "prices": [{"label": f"کارگاه {workshop_data.get('instructor_name', 'کارگاه')}", "amount": cost_amount}],
                "need_phone_number": True
            }
            
            response = self._make_request(f"{BASE_URL}/sendInvoice", payload)
            if response and response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    logger.info(f"Invoice sent successfully for workshop {workshop_id}")
                    return True
                else:
                    logger.error(f"API error in sendInvoice: {result}")
                    return False
            else:
                logger.error(f"HTTP error in sendInvoice: {response.status_code if response else 'No response'}")
                return False
                
        except Exception as e:
            logger.error(f"Error in send_invoice: {e}")
            return False

    def _extract_amount_from_cost(self, cost_text: str) -> int:
        """استخراج مبلغ از متن هزینه"""
        try:
            # حذف "تومان" و فاصله‌ها
            clean_text = cost_text.replace("تومان", "").replace(" ", "").replace(",", "")
            
            # تبدیل اعداد فارسی به انگلیسی
            persian_to_english = {
                '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
                '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
            }
            
            for persian, english in persian_to_english.items():
                clean_text = clean_text.replace(persian, english)
            
            # تبدیل به عدد و ضرب در 10 (برای ریال)
            amount = int(clean_text) * 10
            return amount
            
        except Exception as e:
            logger.error(f"Error extracting amount from cost: {e}")
            return 10000  # مقدار پیش‌فرض

    def answer_pre_checkout_query(self, pre_checkout_query_id: str, ok: bool = True, error_message: Optional[str] = None) -> bool:
        """پاسخ به PreCheckoutQuery"""
        payload = {
            "pre_checkout_query_id": pre_checkout_query_id,
            "ok": ok
        }
        if error_message:
            payload["error_message"] = error_message
            
        response = self._make_request(f"{BASE_URL}/answerPreCheckoutQuery", payload)
        if response and response.status_code == 200:
            result = response.json()
            if result.get("ok"):
                logger.info(f"PreCheckoutQuery answered successfully")
                return True
            else:
                logger.error(f"API error in answerPreCheckoutQuery: {result}")
        
        logger.error(f"Failed to answer PreCheckoutQuery")
        return False

    def handle_message(self, message: Dict):
        """پردازش پیام‌های متنی"""
        if not self._validate_message_structure(message):
            return
        
        chat_id = message["chat"]["id"]
        user_id = message["from"]["id"]
        text = message.get("text", "")
        
        state = self.user_states.get(user_id, "START")
        
        if text == "/start" or text == "شروع":
            self._handle_start_command(chat_id, user_id)
        elif text == "خروج":
            self._handle_exit_command(chat_id, user_id)
        elif text == "کلاس" or text == "برگشت به قبل":
            self._handle_class_selection(chat_id, user_id)
        elif text == "پرداخت":
            self._handle_payment_menu(chat_id, user_id)

    def handle_callback(self, callback: Dict):
        """پردازش callback query ها"""
        if not self._validate_callback_structure(callback):
            return
        
        chat_id = callback["message"]["chat"]["id"]
        user_id = callback["from"]["id"]
        data = callback["data"]
        
        if data.startswith("pay_workshop_"):
            workshop_id = data.replace("pay_workshop_", "")
            self._handle_workshop_payment(chat_id, user_id, workshop_id)

    def handle_pre_checkout_query(self, pre_checkout_query: Dict):
        """پردازش PreCheckoutQuery"""
        pre_checkout_query_id = pre_checkout_query["id"]
        user_id = pre_checkout_query["from"]["id"]
        
        logger.info(f"Received PreCheckoutQuery from user {user_id}")
        self.answer_pre_checkout_query(pre_checkout_query_id, ok=True)
        self.user_states[user_id] = "PAYMENT_CONFIRMED"

    def handle_successful_payment(self, message: Dict):
        """پردازش پرداخت موفق"""
        try:
            chat_id = message["chat"]["id"]
            user_id = message["from"]["id"]
            successful_payment = message.get("successful_payment", {})
            
            logger.info(f"Processing successful payment for user {user_id}: {successful_payment}")
            
            # دریافت اطلاعات کارگاه از وضعیت کاربر
            workshop_id = self.user_states.get(f"payment_workshop_{user_id}")
            workshop_data = None
            
            if self.kargah_module and workshop_id and workshop_id in self.kargah_module.workshops:
                workshop_data = self.kargah_module.workshops[workshop_id]
                logger.info(f"Found workshop data: {workshop_data}")
            
            instructor_name = workshop_data.get('instructor_name', 'کارگاه') if workshop_data else 'کارگاه'
            group_link = workshop_data.get('link', self.group_link) if workshop_data else self.group_link
            
            # ارسال پیام‌های موفقیت
            success_message = f"💸 پرداخت برای '{instructor_name}' با موفقیت انجام شد!"
            logger.info(f"Sending success message: {success_message}")
            
            self.send_message(chat_id, success_message, 
                             reply_markup=self.build_reply_keyboard(["شروع", "خروج", "کلاس"]))
            
            # ارسال لینک گروه
            group_message = f"📎 لینک ورود به گروه: {group_link}"
            logger.info(f"Sending group link: {group_message}")
            
            self.send_message(chat_id, group_message, 
                             reply_markup=self.build_reply_keyboard(["شروع", "خروج", "کلاس"]))
            
            # ارسال پیام تشکر
            thank_message = "🎉 از اینکه همراه شدید، بی‌نهایت سپاسگزاریم!"
            logger.info(f"Sending thank you message: {thank_message}")
            
            self.send_message(chat_id, thank_message, 
                             reply_markup=self.build_reply_keyboard(["شروع", "خروج", "کلاس"]))
            
            # پاک کردن وضعیت
            self.user_states[user_id] = "DONE"
            if f"payment_workshop_{user_id}" in self.user_states:
                del self.user_states[f"payment_workshop_{user_id}"]
            
            logger.info(f"Payment processing completed for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error in handle_successful_payment: {e}")
            # ارسال پیام خطا به کاربر
            try:
                chat_id = message["chat"]["id"]
                self.send_message(chat_id, "❌ خطا در پردازش پرداخت. لطفاً با پشتیبانی تماس بگیرید.",
                                 reply_markup=self.build_reply_keyboard(["شروع", "خروج"]))
            except:
                pass

    def _handle_start_command(self, chat_id: int, user_id: int):
        """پردازش دستور شروع"""
        self.user_states[user_id] = "START"
        self.send_message(chat_id, "🎓 به ربات خوش اومدی! لطفاً یکی از گزینه‌ها رو انتخاب کن:", 
                         reply_markup=self.build_reply_keyboard(["شروع", "خروج", "کلاس", "پرداخت"]))

    def _handle_exit_command(self, chat_id: int, user_id: int):
        """پردازش دستور خروج"""
        self.user_states[user_id] = "START"
        self.send_message(chat_id, "👋 خداحافظ! هر وقت خواستی برگرد.", 
                         reply_markup={"remove_keyboard": True})

    def _handle_class_selection(self, chat_id: int, user_id: int):
        """پردازش انتخاب کلاس"""
        self.user_states[user_id] = "CHOOSE_CLASS"
        
        if not self.kargah_module or not self.kargah_module.workshops:
            self.send_message(chat_id, "❌ هیچ کارگاهی برای پرداخت موجود نیست.", 
                             reply_markup=self.build_reply_keyboard(["برگشت به قبل"]))
            return
        
        # ساخت دکمه‌های کارگاه‌ها
        buttons = []
        for workshop_id, workshop in self.kargah_module.workshops.items():
            instructor_name = workshop.get('instructor_name', 'نامشخص')
            cost = workshop.get('cost', 'نامشخص')
            buttons.append({
                "text": f"{instructor_name} - {cost}",
                "callback_data": f"pay_workshop_{workshop_id}"
            })
        
        self.send_message(chat_id, "🎓 لطفاً یکی از کارگاه‌ها رو انتخاب کن:", 
                         reply_markup=self.build_inline_keyboard(buttons),
                         secondary_reply_markup=self.build_reply_keyboard(["برگشت به قبل"]))

    def _handle_payment_menu(self, chat_id: int, user_id: int):
        """پردازش منوی پرداخت"""
        self._handle_class_selection(chat_id, user_id)

    def _handle_workshop_payment(self, chat_id: int, user_id: int, workshop_id: str):
        """پردازش پرداخت کارگاه"""
        if not self.kargah_module or workshop_id not in self.kargah_module.workshops:
            self.send_message(chat_id, "❌ کارگاه مورد نظر یافت نشد.", 
                             reply_markup=self.build_reply_keyboard(["برگشت به قبل"]))
            return
        
        workshop_data = self.kargah_module.workshops[workshop_id]
        self.user_states[user_id] = "PAY"
        self.user_states[f"payment_workshop_{user_id}"] = workshop_id
        
        if self.send_invoice(chat_id, workshop_id, workshop_data):
            self.user_states[user_id] = "AWAITING_PAYMENT"
        else:
            self.send_message(chat_id, "❌ خطا در ارسال صورتحساب. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.", 
                             reply_markup=self.build_reply_keyboard(["برگشت به قبل"]))

    def _validate_message_structure(self, message: Dict) -> bool:
        """اعتبارسنجی ساختار پیام"""
        required_fields = ["chat", "from", "text"]
        return all(field in message for field in required_fields)

    def _validate_callback_structure(self, callback: Dict) -> bool:
        """اعتبارسنجی ساختار callback"""
        required_fields = ["message", "from", "data", "id"]
        return all(field in callback for field in required_fields) 