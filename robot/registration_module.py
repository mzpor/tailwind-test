# registration_module.py
import os
import json
import re
import logging
import requests
from typing import Dict, List, Optional, Any
import importlib.util

# تنظیم لاگ
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# بارگذاری config
try:
    spec = importlib.util.spec_from_file_location("config", "config.py")
    config = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(config)
    BASE_URL = config.BASE_URL
    ADMIN_USER_IDS = config.ADMIN_USER_IDS
    AUTHORIZED_USER_IDS = config.AUTHORIZED_USER_IDS
    HELPER_COACH_USER_IDS = config.HELPER_COACH_USER_IDS
except Exception as e:
    logger.error(f"Error loading config: {e}")
    # مقادیر پیش‌فرض
    BASE_URL = "https://tapi.bale.ai/bot1778171143:vD6rjJXAYidLL7hQyQkBeu5TJ9KpRd4zAKegqUt3"
    ADMIN_USER_IDS = [1114227010, 1775811194]
    AUTHORIZED_USER_IDS = [574330749, 1114227010, 1775811194]
    HELPER_COACH_USER_IDS = [2045777722]

class RegistrationModule:
    def __init__(self, kargah_module=None):
        self.data_file = "registration_data.json"
        self.user_data = self.load_data()
        self.user_states = {}  # وضعیت کاربران برای ثبت‌نام
        self.kargah_module = kargah_module  # ارجاع به ماژول کارگاه
        logger.info("RegistrationModule initialized successfully")

    def load_data(self) -> Dict:
        """بارگذاری داده‌های ثبت‌نام"""
        if not os.path.exists(self.data_file):
            return {}
        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading registration data: {e}")
            return {}

    def save_data(self, data: Dict):
        """ذخیره داده‌های ثبت‌نام"""
        try:
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            logger.info("Registration data saved successfully")
        except Exception as e:
            logger.error(f"Error saving registration data: {e}")

    def _make_request(self, url: str, payload: Dict[str, Any]) -> Optional[requests.Response]:
        """ارسال درخواست HTTP"""
        try:
            response = requests.post(url, json=payload, timeout=10)
            logger.debug(f"Request to {url}: {response.status_code}")
            return response
        except Exception as e:
            logger.error(f"Error in request to {url}: {e}")
            return None

    def send_message(self, chat_id: int, text: str, reply_markup: Optional[Dict] = None) -> bool:
        """ارسال پیام"""
        if not text or not text.strip():
            logger.error("Empty message text provided")
            return False
            
        payload = {
            "chat_id": chat_id, 
            "text": text,
            "parse_mode": "Markdown"
        }
        
        if reply_markup:
            payload["reply_markup"] = reply_markup
            
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

    def build_reply_keyboard(self, buttons: List[List[str]]) -> Dict:
        """ساخت کیبورد معمولی"""
        return {
            "keyboard": [[{"text": btn} for btn in row] for row in buttons],
            "resize_keyboard": True
        }

    def build_inline_keyboard(self, buttons: List[List[Dict]]) -> Dict:
        """ساخت کیبورد شیشه‌ای"""
        return {"inline_keyboard": buttons}

    def is_valid_national_id(self, nid: str) -> bool:
        """بررسی اعتبار کد ملی"""
        return bool(re.fullmatch(r"\d{10}", nid))

    def is_user_registered(self, user_id: str) -> bool:
        """بررسی اینکه آیا کاربر ثبت‌نام کرده است"""
        return user_id in self.user_data and "full_name" in self.user_data[user_id]

    def is_registration_complete(self, user_id: str) -> bool:
        """بررسی اینکه آیا ثبت‌نام کاربر کامل است"""
        if user_id not in self.user_data:
            return False
        
        user_info = self.user_data[user_id]
        required_fields = ["full_name", "national_id", "phone"]
        return all(field in user_info and user_info[field] for field in required_fields)

    def get_missing_fields(self, user_id: str) -> List[str]:
        """دریافت فیلدهای ناقص ثبت‌نام"""
        if user_id not in self.user_data:
            return ["نام", "کد ملی", "تلفن"]
        
        user_info = self.user_data[user_id]
        missing = []
        
        if "full_name" not in user_info or not user_info["full_name"]:
            missing.append("نام")
        if "national_id" not in user_info or not user_info["national_id"]:
            missing.append("کد ملی")
        if "phone" not in user_info or not user_info["phone"]:
            missing.append("تلفن")
        
        return missing

    def is_admin_or_teacher(self, user_id: int) -> bool:
        """بررسی اینکه آیا کاربر مدیر یا مربی است"""
        return (user_id in ADMIN_USER_IDS or 
                user_id in AUTHORIZED_USER_IDS or 
                user_id in HELPER_COACH_USER_IDS)

    def get_user_role(self, user_id: int) -> str:
        """دریافت نقش کاربر"""
        if user_id in ADMIN_USER_IDS:
            return "مدیر"
        elif user_id in AUTHORIZED_USER_IDS:
            return "مربی"
        elif user_id in HELPER_COACH_USER_IDS:
            return "کمک مربی"
        else:
            return "قرآن‌آموز"

    def handle_message(self, message: Dict):
        """پردازش پیام‌های متنی"""
        if not self._validate_message_structure(message):
            return
        
        chat_id = message["chat"]["id"]
        user_id = chat_id  # استفاده از chat_id به عنوان user_id
        user_id_str = str(user_id)
        text = message.get("text", "")
        contact = message.get("contact")
        
        logger.info(f"Processing message from user {user_id}: text='{text}', contact={contact}")
        
        # بررسی مدیر یا مربی بودن
        if self.is_admin_or_teacher(user_id):
            self._handle_admin_message(chat_id, user_id, text)
            return
        
        # پردازش پیام‌های معمولی
        if text == "/start" or text == "شروع مجدد":
            self._handle_start_command(chat_id, user_id_str)
        elif text == "معرفی مدرسه":
            self._handle_school_intro(chat_id)
        elif text == "ثبت‌نام":
            self._handle_registration_start(chat_id, user_id_str)
        elif text == "خروج":
            self._handle_exit_command(chat_id)
        elif text == "برگشت به قبل":
            self._handle_back_command(chat_id, user_id_str)
        elif text == "پنل قرآن‌آموز":
            self._handle_quran_student_panel(chat_id, user_id_str)
        elif text == "📚 انتخاب کلاس":
            # هدایت به انتخاب کلاس
            if self.kargah_module:
                self.kargah_module.show_workshops_for_student(chat_id, user_id)
            else:
                self.send_message(chat_id, "❌ خطا در دسترسی به ماژول کارگاه")
        elif text == "شروع":
            # برای کاربران ثبت‌نام شده، پنل قرآن‌آموز نمایش بده
            if self.is_user_registered(user_id_str):
                self._handle_quran_student_panel(chat_id, user_id_str)
            else:
                # برای کاربران غیر ثبت‌نام، منوی اصلی
                self._handle_start_command(chat_id, user_id_str)
        elif contact and user_id_str in self.user_states:
            # پردازش contact برای کاربران در حال ثبت‌نام
            logger.info(f"User {user_id_str} has contact, processing registration step")
            self._handle_registration_step(chat_id, user_id_str, "", contact)
        elif user_id_str in self.user_states:
            # پردازش مراحل ثبت‌نام
            logger.info(f"User {user_id_str} in registration state, processing step")
            self._handle_registration_step(chat_id, user_id_str, text, contact)
        else:
            # برای سایر پیام‌ها، بررسی کنیم که آیا کاربر ثبت‌نام کرده است
            if self.is_user_registered(user_id_str):
                # کاربر ثبت‌نام کرده - پنل قرآن‌آموز
                self._handle_quran_student_panel(chat_id, user_id_str)
            else:
                # کاربر ثبت‌نام نکرده - منوی اصلی
                self._handle_start_command(chat_id, user_id_str)

    def handle_callback(self, callback: Dict):
        """پردازش callback query ها"""
        if not self._validate_callback_structure(callback):
            return
        
        chat_id = callback["message"]["chat"]["id"]
        user_id_str = str(chat_id)
        data = callback["data"]
        
        logger.info(f"Processing callback from user {chat_id}: {data}")
        
        if data == "start_registration":
            self._handle_registration_start(chat_id, user_id_str)
        elif data == "edit_name":
            self._handle_edit_name(chat_id, user_id_str)
        elif data == "edit_national_id":
            self._handle_edit_national_id(chat_id, user_id_str)
        elif data == "edit_phone":
            self._handle_edit_phone(chat_id, user_id_str)
        elif data == "edit_info":
            self._handle_edit_info(chat_id, user_id_str)
        elif data == "final_confirm":
            self._handle_final_confirm(chat_id, user_id_str)
        elif data == "quran_student_panel":
            self._handle_quran_student_panel(chat_id, user_id_str)
        elif data == "complete_registration":
            self._handle_complete_registration(chat_id, user_id_str)

    def _handle_start_command(self, chat_id: int, user_id: str):
        """پردازش دستور شروع"""
        if self.is_user_registered(user_id):
            # کاربر ثبت‌نام کرده
            user_info = self.user_data[user_id]
            first_name = user_info.get("first_name", "کاربر")
            full_name = user_info["full_name"]
            national_id = user_info.get("national_id", "هنوز مانده")
            phone = user_info.get("phone", "هنوز مانده")
            
            # بررسی کامل بودن ثبت‌نام
            if self.is_registration_complete(user_id):
                # ثبت‌نام کامل
                welcome_text = f"_🌟 {first_name} عزیز، خوش آمدی!\nحساب کاربری شما آماده است 👇_\n*نام*: {full_name}\n*کد ملی*: {national_id}\n*تلفن*: {phone}"
                
                self.send_message(chat_id, welcome_text,
                    reply_markup=self.build_reply_keyboard([
                        ["📚 پنل قرآن‌آموز", "شروع مجدد"],
                        ["خروج"]
                    ])
                )
            else:
                # ثبت‌نام ناقص
                missing_fields = self.get_missing_fields(user_id)
                missing_text = "، ".join(missing_fields)
                
                welcome_text = f"_⚠️ {first_name} عزیز، ثبت‌نام شما ناقص است!\n\n📋 اطلاعات فعلی:\n*نام*: {full_name}\n*کد ملی*: {national_id}\n*تلفن*: {phone}\n\n❌ فیلدهای ناقص: {missing_text}_"
                
                self.send_message(chat_id, welcome_text,
                    reply_markup=self.build_inline_keyboard([
                        [{"text": "✏️ تصحیح نام", "callback_data": "edit_name"}],
                        [{"text": "🆔 تصحیح کد ملی", "callback_data": "edit_national_id"}],
                        [{"text": "📱 تصحیح تلفن", "callback_data": "edit_phone"}]
                    ])
                )
                
                # اضافه کردن دکمه شروع مجدد
                self.send_message(chat_id, "_برای شروع مجدد روی دکمه زیر کلیک کنید:_",
                    reply_markup=self.build_reply_keyboard([
                        ["شروع مجدد", "خروج"]
                    ])
                )
        else:
            # کاربر ثبت‌نام نکرده - نمایش گزینه ثبت‌نام
            welcome_text = "_🌟 خوش آمدید! به مدرسه تلاوت خوش آمدید!_"
            self.send_message(chat_id, welcome_text,
                reply_markup=self.build_reply_keyboard([
                    ["شروع مجدد", "معرفی مدرسه", "خروج"],
                    ["ثبت‌نام"]
                ])
            )

    def _handle_school_intro(self, chat_id: int):
        """پردازش معرفی مدرسه"""
        intro_text = """_🏫 *معرفی مدرسه تلاوت*

مدرسه تلاوت با بیش از ۱۰ سال سابقه در زمینه آموزش قرآن کریم، خدمات متنوعی ارائه می‌دهد:

📚 *کلاس‌های موجود:*
• تجوید قرآن کریم
• صوت و لحن
• حفظ قرآن کریم
• تفسیر قرآن

💎 *مزایای ثبت‌نام:*
• اساتید مجرب
• کلاس‌های آنلاین و حضوری
• گواهی پایان دوره
• قیمت مناسب_

برای ثبت‌نام روی دکمه زیر کلیک کنید:"""
        
        self.send_message(chat_id, intro_text,
            reply_markup=self.build_inline_keyboard([
                [{"text": "📝 ثبت‌نام", "callback_data": "start_registration"}]
            ])
        )

    def _handle_registration_start(self, chat_id: int, user_id: str):
        """شروع فرآیند ثبت‌نام"""
        self.user_states[user_id] = {"step": "name"}
        self.user_data[user_id] = {}
        self.save_data(self.user_data)
        
        self.send_message(chat_id, "_لطفاً نام و نام خانوادگی خود را وارد کنید (مثال: علی رضایی)._",
            reply_markup=self.build_reply_keyboard([
                ["شروع مجدد", "خروج", "برگشت به قبل"]
            ])
        )

    def _handle_registration_step(self, chat_id: int, user_id: str, text: str, contact: Optional[Dict] = None):
        """پردازش مراحل ثبت‌نام"""
        if user_id not in self.user_states:
            logger.warning(f"User {user_id} not in user_states")
            return
        
        state = self.user_states[user_id]
        step = state.get("step")
        
        logger.info(f"Processing registration step for user {user_id}: step={step}, text='{text}', contact={contact}")
        
        if step == "name":
            # مرحله نام
            self.user_data[user_id]["full_name"] = text
            self.user_data[user_id]["first_name"] = text.split()[0]
            self.save_data(self.user_data)
            
            first_name = self.user_data[user_id]["first_name"]
            status_text = f"_{first_name} عزیز،\nنام شما: {text}\nکد ملی: هنوز مانده\nتلفن: هنوز مانده_\n\nلطفاً کد ملی ۱۰ رقمی خود را وارد کنید."
            
            self.send_message(chat_id, status_text,
                reply_markup=self.build_reply_keyboard([
                    ["شروع مجدد", "خروج", "برگشت به قبل"]
                ])
            )
            
            self.send_message(chat_id, "می‌خواهید نام را ویرایش کنید؟",
                reply_markup=self.build_inline_keyboard([
                    [{"text": "✏️ تصحیح نام", "callback_data": "edit_name"}]
                ])
            )
            
            state["step"] = "national_id"
            
        elif step == "national_id":
            # مرحله کد ملی
            if self.is_valid_national_id(text):
                self.user_data[user_id]["national_id"] = text
                self.save_data(self.user_data)
                
                first_name = self.user_data[user_id]["first_name"]
                full_name = self.user_data[user_id]["full_name"]
                status_text = f"_{first_name} عزیز،\nنام شما: {full_name}\nکد ملی: {text}\nتلفن: هنوز مانده_\n\n📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید."
                
                self.send_message(chat_id, status_text,
                    reply_markup=self.build_reply_keyboard([
                        ["شروع مجدد", "خروج", "برگشت به قبل"]
                    ])
                )
                
                self.send_message(chat_id, "📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید.",
                    reply_markup={
                        "keyboard": [[{"text": "📱 ارسال شماره تلفن", "request_contact": True}]],
                        "resize_keyboard": True
                    }
                )
                
                state["step"] = "phone"
            else:
                self.send_message(chat_id, "_❌ کد ملی نامعتبر است. لطفاً ۱۰ رقم وارد کنید._")
                
        elif step == "phone" and contact:
            # مرحله شماره تلفن
            logger.info(f"Processing phone step for user {user_id} with contact: {contact}")
            phone_number = contact["phone_number"]
            self.user_data[user_id]["phone"] = phone_number
            self.save_data(self.user_data)
            
            logger.info(f"Phone number saved for user {user_id}: {phone_number}")
            
            first_name = self.user_data[user_id]["first_name"]
            full_name = self.user_data[user_id]["full_name"]
            national_id = self.user_data[user_id]["national_id"]
            
            status_text = f"_📋 {first_name} عزیز، حساب کاربری شما:\nنام: {full_name}\nکد ملی: {national_id}\nتلفن: {phone_number}_"
            
            self.send_message(chat_id, status_text,
                reply_markup=self.build_inline_keyboard([
                    [{"text": "✅ تأیید نهایی", "callback_data": "final_confirm"}],
                    [{"text": "✏️ تصحیح نام", "callback_data": "edit_name"}],
                    [{"text": "🆔 تصحیح کد ملی", "callback_data": "edit_national_id"}],
                    [{"text": "📱 ارسال مجدد تلفن", "callback_data": "edit_phone"}]
                ])
            )
            
            # بازگرداندن کیبورد معمولی
            self.send_message(chat_id, "🎉 ثبت‌نام شما تکمیل شد!",
                reply_markup=self.build_reply_keyboard([
                    ["شروع مجدد", "خروج"],
                    ["پنل قرآن‌آموز"]
                ])
            )
            
            # پاک کردن وضعیت
            if user_id in self.user_states:
                del self.user_states[user_id]
                logger.info(f"Registration completed for user {user_id}")
        elif step == "phone" and not contact:
            logger.warning(f"User {user_id} in phone step but no contact provided")
            self.send_message(chat_id, "_📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید._",
                reply_markup={
                    "keyboard": [[{"text": "📱 ارسال شماره تلفن", "request_contact": True}]],
                    "resize_keyboard": True
                }
            )
        else:
            logger.warning(f"Unknown step '{step}' for user {user_id}")

    def _handle_edit_name(self, chat_id: int, user_id: str):
        """ویرایش نام"""
        if user_id in self.user_data:
            self.user_data[user_id].pop("full_name", None)
            self.save_data(self.user_data)
            self.user_states[user_id] = {"step": "name"}
            self.send_message(chat_id, "_نام جدید را وارد کنید._")

    def _handle_edit_national_id(self, chat_id: int, user_id: str):
        """ویرایش کد ملی"""
        if user_id in self.user_data:
            self.user_data[user_id].pop("national_id", None)
            self.save_data(self.user_data)
            self.user_states[user_id] = {"step": "national_id"}
            self.send_message(chat_id, "_کد ملی جدید را وارد کنید._")

    def _handle_edit_phone(self, chat_id: int, user_id: str):
        """ویرایش شماره تلفن"""
        if user_id in self.user_data:
            self.user_data[user_id].pop("phone", None)
            self.save_data(self.user_data)
            self.user_states[user_id] = {"step": "phone"}
            self.send_message(chat_id, "_📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید._",
                reply_markup={
                    "keyboard": [[{"text": "📱 ارسال شماره تلفن", "request_contact": True}]],
                    "resize_keyboard": True
                }
            )

    def _handle_edit_info(self, chat_id: int, user_id: str):
        """ویرایش اطلاعات"""
        if user_id in self.user_data:
            self.user_data[user_id] = {}
            self.save_data(self.user_data)
            self.user_states[user_id] = {"step": "name"}
            self.send_message(chat_id, "_بیایید دوباره شروع کنیم. لطفاً نام و نام خانوادگی خود را وارد کنید._")

    def _handle_final_confirm(self, chat_id: int, user_id: str):
        """تأیید نهایی"""
        if user_id in self.user_data:
            try:
                first_name = self.user_data[user_id].get("first_name", "کاربر")
                full_name = self.user_data[user_id].get("full_name", "نامشخص")
                national_id = self.user_data[user_id].get("national_id", "")
                phone = self.user_data[user_id].get("phone", "")
                
                # تنظیم user_type به عنوان quran_student
                self.user_data[user_id]["user_type"] = "quran_student"
                self.save_data(self.user_data)
                
                confirm_text = f"""🎉 **ثبت‌نام با موفقیت تکمیل شد!**

🌟 {first_name} عزیز، ثبت‌نام شما با موفقیت انجام شد!

📋 **اطلاعات ثبت‌نام:**
• نام: {full_name}
• کد ملی: {national_id}
• تلفن: {phone}

✅ حساب کاربری شما آماده است و می‌توانید از خدمات مدرسه استفاده کنید.

حالا می‌توانید کلاس مورد نظر خود را انتخاب کنید:"""
                
                self.send_message(chat_id, confirm_text,
                    reply_markup=self.build_reply_keyboard([
                        ["📚 انتخاب کلاس"],
                        ["پنل قرآن‌آموز"],
                        ["شروع مجدد", "خروج"]
                    ])
                )
            except Exception as e:
                logger.error(f"Error in final_confirm for user {user_id}: {e}")
                self.send_message(chat_id, "🎉 ثبت‌نام شما با موفقیت تکمیل شد!",
                    reply_markup=self.build_reply_keyboard([
                        ["شروع مجدد", "خروج"],
                        ["پنل قرآن‌آموز"]
                    ])
                )

    def _handle_complete_registration(self, chat_id: int, user_id: str):
        """تکمیل ثبت‌نام ناقص"""
        if not self.is_user_registered(user_id):
            self._handle_registration_start(chat_id, user_id)
            return
        
        missing_fields = self.get_missing_fields(user_id)
        if not missing_fields:
            # ثبت‌نام کامل است
            self._handle_quran_student_panel(chat_id, user_id)
            return
        
        # شروع از اولین فیلد ناقص
        if "نام" in missing_fields:
            self._handle_edit_name(chat_id, user_id)
        elif "کد ملی" in missing_fields:
            self._handle_edit_national_id(chat_id, user_id)
        elif "تلفن" in missing_fields:
            self._handle_edit_phone(chat_id, user_id)

    def _handle_quran_student_panel(self, chat_id: int, user_id: str):
        """پنل قرآن‌آموز"""
        if self.is_user_registered(user_id):
            if self.is_registration_complete(user_id):
                # ثبت‌نام کامل - نمایش پنل
                user_info = self.user_data[user_id]
                first_name = user_info.get("first_name", "کاربر")
                
                welcome_text = f"""📚 **پنل قرآن‌آموز**

سلام {first_name} عزیز! 👋
به پنل قرآن‌آموز خوش آمدید.

لطفاً یکی از گزینه‌های زیر را انتخاب کنید:"""
                
                self.send_message(chat_id, welcome_text,
                    reply_markup=self.build_reply_keyboard([
                        ["📊 مشاهده لیست حضور و غیاب"],
                        ["📈 آمار کلی"],
                        ["🏠 برگشت به منو", "خروج"]
                    ])
                )
            else:
                # ثبت‌نام ناقص - نمایش گزینه‌های تکمیل
                missing_fields = self.get_missing_fields(user_id)
                missing_text = "، ".join(missing_fields)
                
                user_info = self.user_data[user_id]
                first_name = user_info.get("first_name", "کاربر")
                
                warning_text = f"""⚠️ **ثبت‌نام ناقص**

{first_name} عزیز، ثبت‌نام شما کامل نیست!
فیلدهای ناقص: {missing_text}

لطفاً ابتدا ثبت‌نام خود را تکمیل کنید."""
                
                self.send_message(chat_id, warning_text,
                    reply_markup=self.build_inline_keyboard([
                        [{"text": "✏️ تصحیح نام", "callback_data": "edit_name"}],
                        [{"text": "🆔 تصحیح کد ملی", "callback_data": "edit_national_id"}],
                        [{"text": "📱 تصحیح تلفن", "callback_data": "edit_phone"}]
                    ])
                )
        else:
            self.send_message(chat_id, "_❌ شما هنوز ثبت‌نام نکرده‌اید. لطفاً ابتدا ثبت‌نام کنید._",
                reply_markup=self.build_reply_keyboard([
                    ["شروع مجدد", "ثبت‌نام"]
                ])
            )

    def _handle_admin_message(self, chat_id: int, user_id: int, text: str):
        """پردازش پیام‌های مدیران"""
        role = self.get_user_role(user_id)
        
        if text == "/start" or text == "شروع مجدد":
            self.send_message(chat_id, f"_👑 {role} عزیز، به پنل مدیریتی خوش آمدید!_",
                reply_markup=self.build_reply_keyboard([
                    ["📊 آمار کاربران", "👥 مدیریت کاربران"],
                    ["📚 مدیریت کلاس‌ها", "⚙️ تنظیمات"],
                    ["🔙 بازگشت به حالت عادی"]
                ])
            )
        elif text == "🔙 بازگشت به حالت عادی":
            # نمایش منوی عادی برای مدیر
            self.send_message(chat_id, "_🌟 خوش آمدید! به مدرسه تلاوت خوش آمدید!_",
                reply_markup=self.build_reply_keyboard([
                    ["شروع مجدد", "معرفی مدرسه", "خروج"]
                ])
            )

    def _handle_exit_command(self, chat_id: int):
        """پردازش دستور خروج"""
        self.send_message(chat_id, "_👋 با تشکر از استفاده شما از ربات ما. موفق باشید! 🌟_")

    def _handle_back_command(self, chat_id: int, user_id: str):
        """پردازش دستور برگشت"""
        if user_id in self.user_data:
            if "phone" in self.user_data[user_id]:
                self.user_data[user_id].pop("phone", None)
                self.save_data(self.user_data)
                self.user_states[user_id] = {"step": "phone"}
                self.send_message(chat_id, "_لطفاً شماره تلفن خود را دوباره ارسال کنید._",
                    reply_markup={
                        "keyboard": [[{"text": "📱 ارسال شماره تلفن", "request_contact": True}]],
                        "resize_keyboard": True
                    }
                )
            elif "national_id" in self.user_data[user_id]:
                self.user_data[user_id].pop("national_id", None)
                self.save_data(self.user_data)
                self.user_states[user_id] = {"step": "national_id"}
                self.send_message(chat_id, "_لطفاً کد ملی خود را دوباره وارد کنید._")
            elif "full_name" in self.user_data[user_id]:
                self.user_data[user_id].pop("full_name", None)
                self.save_data(self.user_data)
                self.user_states[user_id] = {"step": "name"}
                self.send_message(chat_id, "_لطفاً نام خود را دوباره وارد کنید._")

    def _validate_message_structure(self, message: Dict) -> bool:
        """اعتبارسنجی ساختار پیام"""
        required_fields = ["chat", "from"]
        
        # بررسی فیلدهای اجباری
        if not all(field in message for field in required_fields):
            return False
        
        # برای پیام‌های contact، text اختیاری است
        if "contact" in message:
            return True
        
        # برای سایر پیام‌ها، text اجباری است
        if "text" not in message:
            return False
        
        return True

    def _validate_callback_structure(self, callback: Dict) -> bool:
        """اعتبارسنجی ساختار callback"""
        required_fields = ["message", "from", "data", "id"]
        return all(field in callback for field in required_fields)

    def get_registered_users_count(self) -> int:
        """دریافت تعداد کاربران ثبت‌نام شده"""
        return len([user for user in self.user_data.keys() if self.is_user_registered(user)])

    def get_all_users_count(self) -> int:
        """دریافت تعداد کل کاربران"""
        return len(self.user_data)

    def export_user_data(self, user_id: str) -> Optional[Dict]:
        """صادرات اطلاعات کاربر"""
        if user_id in self.user_data:
            return self.user_data[user_id].copy()
        return None 