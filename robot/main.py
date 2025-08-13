# main.py - فایل اصلی ربات بله
import logging
import requests
import json
import time
from datetime import datetime, timedelta
from modules.database import Database
from modules.user_manager import UserManager
from modules.report_manager import ReportManager
from modules.role_manager import RoleManager
from config import BOT_TOKEN, BASE_URL

# تنظیمات لاگ
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class HierarchyBot:
    def __init__(self):
        self.base_url = BASE_URL
        self.offset = 0
        self.consecutive_errors = 0
        self.last_connection_error = 0
        self.connection_error_count = 0
        
        # Initialize modules
        self.db = Database()
        self.user_manager = UserManager(self.db)
        self.report_manager = ReportManager(self.db)
        self.role_manager = RoleManager()
        
        # User data storage for registration process
        self.user_data = {}
        
        logger.info("🤖 Hierarchy Bot initialized")
    
    def get_timestamp(self):
        """دریافت timestamp فعلی"""
        now = datetime.now()
        return now.strftime("⏰ %H:%M:%S 🗓️ %Y/%m/%d")
    
    def handle_connection_status(self, connected):
        """مدیریت وضعیت اتصال"""
        now = time.time()
        
        if not connected:
            self.connection_error_count += 1
            if now - self.last_connection_error > 30:
                logger.warning(f"🌐 Weak internet connection ({self.connection_error_count} errors)")
                self.last_connection_error = now
        else:
            if self.connection_error_count > 0:
                logger.info("🌐 Internet connection restored")
                self.connection_error_count = 0
    
    def get_updates(self):
        """دریافت آپدیت‌های جدید از بله"""
        try:
            response = requests.get(f"{self.base_url}/getUpdates", params={
                'offset': self.offset,
                'timeout': 10
            }, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok'):
                    updates = data.get('result', [])
                    if updates:
                        self.offset = updates[-1]['update_id'] + 1
                        logger.info(f"📥 Received {len(updates)} new updates")
                    self.handle_connection_status(True)
                    return updates
                else:
                    logger.error(f"❌ خطا در API: {data}")
                    self.handle_connection_status(False)
                    return []
            else:
                logger.error(f"❌ خطای HTTP: {response.status_code}")
                self.handle_connection_status(False)
                return []
                
        except requests.exceptions.Timeout:
            logger.warning("⏰ Timeout receiving updates")
            self.handle_connection_status(False)
            return []
        except requests.exceptions.ConnectionError:
            logger.error("🔌 Server connection error")
            self.handle_connection_status(False)
            return []
        except Exception as e:
            logger.error(f"❌ Error getting updates: {e}")
            self.handle_connection_status(False)
            return []
    
    def send_message(self, chat_id, text, keyboard=None):
        """ارسال پیام با کیبورد اختیاری"""
        try:
            data = {
                'chat_id': chat_id,
                'text': text,
                'parse_mode': 'HTML'
            }
            
            if keyboard:
                data['reply_markup'] = json.dumps(keyboard)
            
            response = requests.post(f"{self.base_url}/sendMessage", json=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('ok'):
                    logger.info(f"✅ Message sent to {chat_id}")
                    return True
                else:
                    logger.error(f"❌ Failed to send message: {result}")
                    return False
            else:
                logger.error(f"❌ HTTP error sending message: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error sending message: {e}")
            return False
    
    def answer_callback_query(self, callback_query_id, text):
        """پاسخ به کالبک کوئری"""
        try:
            data = {
                'callback_query_id': callback_query_id,
                'text': text
            }
            
            response = requests.post(f"{self.base_url}/answerCallbackQuery", json=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('ok'):
                    logger.info(f"✅ Callback query answered: {callback_query_id}")
                    return True
                else:
                    logger.error(f"❌ Failed to answer callback query: {result}")
                    return False
            else:
                logger.error(f"❌ HTTP error answering callback query: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error answering callback query: {e}")
            return False
    
    def handle_start_command(self, chat_id, user_id, first_name):
        """پردازش دستور /start"""
        # Check if user is in registration process
        if user_id in self.user_data:
            # User is in registration process, continue from current step
            step = self.user_data[user_id]["step"]
            if step == "start":
                return self.start_registration(chat_id, user_id, first_name)
            elif step == "full_name":
                return self.handle_full_name_input(chat_id, user_id, self.user_data[user_id]["full_name"])
            elif step == "national_code":
                return self.handle_national_code_input(chat_id, user_id, self.user_data[user_id]["national_code"])
            elif step == "phone":
                # Show phone input step again
                return self.handle_national_code_input(chat_id, user_id, self.user_data[user_id]["national_code"])
        
        # Check if user is registered in database
        user_info = self.db.get_user_by_telegram_id(user_id)
        
        if not user_info:
            # User is not registered, start registration process
            return self.start_registration(chat_id, user_id, first_name)
        else:
            # User is registered, show main menu
            return self.show_main_menu(chat_id, user_id, first_name)
    
    def start_registration(self, chat_id, user_id, first_name):
        """شروع فرآیند ثبت نام"""
        # Store user data for registration process
        self.user_data[user_id] = {
            "first_name": first_name,
            "full_name": first_name,
            "step": "start"
        }
        
        welcome_text = f"""👋 <b>سلام {first_name} عزیز!</b>

🎯 <b>به ربات سلسله مراتبی خوش آمدید!</b>

📝 <b>برای استفاده از ربات، لطفاً ثبت نام کنید:</b>

🔑 <b>آیدی کاربر:</b> {user_id}

💡 <b>لطفاً نام کامل خود را وارد کنید:</b>"""
        
        # Create keyboard for back
        keyboard = {
            'keyboard': [
                ['🔙 بازگشت']
            ],
            'resize_keyboard': True
        }
        
        return self.send_message(chat_id, welcome_text, keyboard)
    
    def handle_full_name_input(self, chat_id, user_id, text):
        """پردازش ورود نام کامل"""
        if user_id not in self.user_data:
            return self.start_registration(chat_id, user_id, "کاربر")
        
        # Store full name
        self.user_data[user_id]["full_name"] = text
        self.user_data[user_id]["step"] = "full_name"
        
        status_text = f"""✅ <b>نام شما ثبت شد!</b>

👤 <b>نام کامل:</b> {text}

💡 <b>حالا لطفاً کد ملی خود را وارد کنید:</b>"""
        
        # Create keyboard with back option
        keyboard = {
            'keyboard': [
                ['🔙 بازگشت']
            ],
            'resize_keyboard': True
        }
        
        return self.send_message(chat_id, status_text, keyboard)
    
    def handle_national_code_input(self, chat_id, user_id, text):
        """پردازش ورود کد ملی"""
        if user_id not in self.user_data:
            return self.start_registration(chat_id, user_id, "کاربر")
        
        # Store national code
        self.user_data[user_id]["national_code"] = text
        self.user_data[user_id]["step"] = "national_code"
        
        first_name = self.user_data[user_id]["first_name"]
        full_name = self.user_data[user_id]["full_name"]
        
        status_text = f"""✅ <b>اطلاعات شما ثبت شد!</b>

👤 <b>نام:</b> {full_name}
🆔 <b>کد ملی:</b> {text}

📱 <b>حالا لطفاً شماره تلفن خود را ارسال کنید:</b>

💡 <b>نکته:</b>
• شماره تلفن باید ۱۱ رقم باشد
• با ۰۹ شروع شود
• مثال: 09123456789"""
        
        # Create keyboard with options
        keyboard = {
            'inline_keyboard': [
                [{'text': '🔄 شروع مجدد', 'callback_data': 'restart_registration'}],
                [{'text': '🔙 برگشت به قبل', 'callback_data': 'back_to_previous'}],
                [{'text': '📱 ویرایش تلفن', 'callback_data': 'edit_phone'}],
                [{'text': '🚪 خروج', 'callback_data': 'cancel_registration'}]
            ]
        }
        
        # Send status with options
        self.send_message(chat_id, status_text, keyboard)
        
        # Send contact button for phone number
        contact_text = f"_{first_name} عزیز،\nنام شما: {full_name}\nکد ملی: {text}\nتلفن: هنوز مانده_\n\n📱 لطفاً شماره تلفن خود را با دکمه زیر ارسال کنید:"
        
        contact_keyboard = {
            "keyboard": [[{"text": "📱 ارسال شماره تلفن", "request_contact": True}]],
            "resize_keyboard": True
        }
        
        self.send_message(chat_id, contact_text, contact_keyboard)
        
        self.user_data[user_id]["step"] = "phone"
    
    def show_main_menu(self, chat_id, user_id, first_name):
        """نمایش منوی اصلی برای کاربران ثبت نام شده"""
        user_info = self.db.get_user_by_telegram_id(user_id)
        
        if not user_info:
            return self.start_registration(chat_id, user_id, first_name)
        
        role = user_info['role']
        welcome_text = f"""🤖 <b>سلام {first_name} عزیز!</b>

🎯 <b>به ربات سلسله مراتبی خوش آمدید!</b>

👤 <b>اطلاعات شما:</b>
• نام: {user_info.get('name', 'نامشخص')}
• منطقه: {user_info.get('region', 'نامشخص')}
• نقش: {self.role_manager.get_role_name(role)}

🔧 <b>دستورات موجود:</b>
• /start - منوی اصلی
• /profile - پروفایل کاربر
• /help - راهنما

{self.get_timestamp()}"""
        
        # Check if user has admin privileges
        if role == 1:  # مدیر کل
            keyboard = {
                'keyboard': [
                    ['➕ افزودن کاربر جدید', '📊 مشاهده گزارشات'],
                    ['👥 مدیریت کاربران', '👤 پروفایل'],
                    ['❓ راهنما', '🚪 خروج']
                ],
                'resize_keyboard': True
            }
        elif role in [2, 3, 4, 5]:  # سایر نقش‌ها
            keyboard = {
                'keyboard': [
                    ['📝 ارسال گزارش', '📊 مشاهده گزارشات'],
                    ['👤 پروفایل', '❓ راهنما'],
                    ['🚪 خروج']
                ],
                'resize_keyboard': True
            }
        else:  # فعال
            keyboard = {
                'keyboard': [
                    ['👤 پروفایل', '❓ راهنما'],
                    ['🚪 خروج']
                ],
                'resize_keyboard': True
            }
        
        return self.send_message(chat_id, welcome_text, keyboard)
    
    def handle_add_user(self, chat_id, user_id):
        """افزودن کاربر جدید (فقط مدیر کل)"""
        user_info = self.db.get_user_by_telegram_id(user_id)
        
        if not user_info or user_info['role'] != 1:
            return self.send_message(chat_id, "❌ <b>دسترسی محدود</b>\n\n🔒 شما مجوز این عملیات را ندارید.")
        
        add_text = """➕ <b>افزودن کاربر جدید</b>

📝 <b>لطفاً اطلاعات کاربر جدید را به صورت زیر وارد کنید:</b>

نام | شماره تلفن | منطقه | نقش

<b>مثال:</b>
احمد محمدی | 09123456789 | تهران | 2

<b>نقش‌ها:</b>
1 = مدیر کل
2 = مدیر
3 = راهبر
4 = دبیر
5 = مسئول
6 = فعال

💡 <b>نکته:</b>
• از علامت | برای جدا کردن فیلدها استفاده کنید
• شماره تلفن باید ۱۱ رقم باشد
• نقش باید بین ۱ تا ۶ باشد"""
        
        return self.send_message(chat_id, add_text)
    
    def handle_user_addition(self, chat_id, user_id, text):
        """پردازش افزودن کاربر جدید"""
        try:
            parts = [p.strip() for p in text.split('|')]
            if len(parts) != 4:
                raise ValueError("تعداد فیلدها نادرست است")
            
            name, phone, region, role_str = parts
            role = int(role_str)
            
            if role not in [1, 2, 3, 4, 5, 6]:
                raise ValueError("نقش نامعتبر")
            
            # افزودن کاربر
            success = self.db.add_user(name, phone, region, role)
            
            if success:
                success_text = f"""✅ <b>کاربر جدید با موفقیت اضافه شد!</b>

👤 <b>اطلاعات کاربر:</b>
• نام: {name}
• تلفن: {phone}
• منطقه: {region}
• نقش: {self.role_manager.get_role_name(role)}

💡 <b>کاربر اکنون می‌تواند با ارسال شماره تلفن خود ثبت نام کند.</b>"""
                
                return self.send_message(chat_id, success_text)
            else:
                error_text = "❌ <b>خطا در افزودن کاربر</b>\n\n🔴 احتمالاً شماره تلفن تکراری است."
                return self.send_message(chat_id, error_text)
        
        except Exception as e:
            error_text = f"""❌ <b>خطا در پردازش اطلاعات</b>

🔴 <b>مشکل:</b> {str(e)}

💡 <b>لطفاً فرمت صحیح را رعایت کنید:</b>
نام | شماره تلفن | منطقه | نقش"""
            
            return self.send_message(chat_id, error_text)
    
    def handle_send_report(self, chat_id, user_id):
        """ارسال گزارش"""
        user_info = self.db.get_user_by_telegram_id(user_id)
        
        if not user_info or user_info['role'] == 6:  # فعال گزارش نمی‌دهد
            return self.send_message(chat_id, "❌ <b>دسترسی محدود</b>\n\n🔒 شما مجوز ارسال گزارش را ندارید.")
        
        # بررسی گزارش امروز
        if self.db.has_today_report(user_id):
            return self.send_message(chat_id, "⚠️ <b>گزارش تکراری</b>\n\n🔴 شما امروز قبلاً گزارش ارسال کرده‌اید.")
        
        report_text = """📝 <b>ارسال گزارش</b>

📋 <b>لطفاً گزارش خود را به صورت زیر ارسال کنید:</b>

آیا امروز ارتباط گرفتید؟ (بله/خیر)
نحوه ارتباط: (تلفن/حضوری)
میزان رضایت (1-5):
موضوع: (ارتقای فعالیت/...)
توضیحات:

<b>مثال:</b>
بله
تلفن
4
ارتقای فعالیت
جلسه‌ای برای بررسی برنامه‌های آینده برگزار شد

💡 <b>نکته:</b>
• هر فیلد را در یک خط جداگانه وارد کنید
• میزان رضایت باید بین ۱ تا ۵ باشد"""
        
        return self.send_message(chat_id, report_text)
    
    def handle_report_submission(self, chat_id, user_id, text):
        """پردازش ارسال گزارش"""
        try:
            lines = text.strip().split('\n')
            if len(lines) < 5:
                raise ValueError("گزارش ناکامل است")
            
            contact_made = lines[0].strip().lower() in ['بله', 'yes']
            contact_method = lines[1].strip()
            satisfaction = int(lines[2].strip())
            topic = lines[3].strip()
            description = '\n'.join(lines[4:]).strip()
            
            if satisfaction < 1 or satisfaction > 5:
                raise ValueError("میزان رضایت باید بین 1 تا 5 باشد")
            
            success = self.db.add_report(
                user_id, contact_made, contact_method, 
                satisfaction, topic, description
            )
            
            if success:
                success_text = """✅ <b>گزارش شما با موفقیت ثبت شد!</b>

📊 <b>جزئیات گزارش:</b>
• ارتباط: {'✅' if contact_made else '❌'} ({contact_method})
• رضایت: {satisfaction}/5
• موضوع: {topic}
• توضیحات: {description[:50]}{'...' if len(description) > 50 else ''}

💡 <b>گزارش شما در سیستم ذخیره شد.</b>"""
                
                return self.send_message(chat_id, success_text)
            else:
                error_text = "❌ <b>خطا در ثبت گزارش</b>\n\n🔴 لطفاً دوباره تلاش کنید."
                return self.send_message(chat_id, error_text)
        
        except Exception as e:
            error_text = f"""❌ <b>خطا در پردازش گزارش</b>

🔴 <b>مشکل:</b> {str(e)}

💡 <b>لطفاً فرمت صحیح را رعایت کنید:</b>
بله/خیر
تلفن/حضوری
1-5
موضوع
توضیحات"""
            
            return self.send_message(chat_id, error_text)
    
    def show_reports(self, chat_id, user_id):
        """نمایش گزارشات"""
        user_info = self.db.get_user_by_telegram_id(user_id)
        
        if not user_info:
            return self.send_message(chat_id, "❌ <b>خطا</b>\n\n🔴 کاربر یافت نشد.")
        
        # گزارشات مربوط به کاربر فعلی یا زیردستان
        reports = self.report_manager.get_user_reports(user_info)
        
        if not reports:
            return self.send_message(chat_id, "📊 <b>گزارشات</b>\n\n🔍 گزارشی یافت نشد.")
        
        report_text = "📊 <b>گزارشات:</b>\n\n"
        
        for report in reports[:10]:  # نمایش ۱۰ گزارش اخیر
            date_str = report['created_at'][:10]  # تاریخ
            contact_status = "✅" if report['contact_made'] else "❌"
            
            report_text += (
                f"📅 {date_str}\n"
                f"👤 {report['user_name']}\n"
                f"📞 ارتباط: {contact_status} ({report['contact_method']})\n"
                f"⭐ رضایت: {report['satisfaction']}/5\n"
                f"📋 موضوع: {report['topic']}\n"
                f"💬 {report['description'][:50]}{'...' if len(report['description']) > 50 else ''}\n"
                f"{'-'*30}\n"
            )
        
        return self.send_message(chat_id, report_text)
    
    def show_user_info(self, chat_id, user_id):
        """نمایش اطلاعات کاربر"""
        user_info = self.db.get_user_by_telegram_id(user_id)
        
        if user_info:
            info_text = f"""👤 <b>پروفایل کاربر</b>

🎯 <b>نام کاربر:</b> {user_info.get('name', 'نامشخص')}
📞 <b>تلفن:</b> {user_info.get('phone', 'بدون تلفن')}
🏢 <b>منطقه:</b> {user_info.get('region', 'نامشخص')}
👔 <b>نقش:</b> {self.role_manager.get_role_name(user_info['role'])}
📅 <b>تاریخ عضویت:</b> {user_info['created_at'][:10] if user_info.get('created_at') else 'نامشخص'}

💎 <b>دکمه شیشه‌ای:</b> برای ریست اطلاعات ثبت نام"""
            
            keyboard = {
                'keyboard': [
                    ['🔙 بازگشت به منو'],
                    ['💎 ریست اطلاعات ثبت نام']
                ],
                'resize_keyboard': True
            }
            
            return self.send_message(chat_id, info_text, keyboard)
        else:
            return self.send_message(chat_id, "❌ <b>خطا</b>\n\n🔴 اطلاعات پروفایل یافت نشد.")
    
    def handle_help_command(self, chat_id):
        """پردازش دستور /help"""
        help_text = f"""📚 <b>راهنمای ربات سلسله مراتبی</b>

🎯 <b>نحوه استفاده:</b>
• ابتدا باید در ربات ثبت نام کنید
• از دستور /start برای شروع استفاده کنید
• از دکمه‌های منو استفاده کنید

🔧 <b>دستورات:</b>
• <code>/start</code> - شروع ربات و منوی اصلی
• <code>/help</code> - نمایش این راهنما
• <code>/profile</code> - مشاهده پروفایل کاربر

📊 <b>ویژگی‌ها:</b>
• <code>👤 پروفایل</code> - مشاهده اطلاعات کاربر
• <code>📝 ارسال گزارش</code> - ارسال گزارش روزانه
• <code>📊 مشاهده گزارشات</code> - مشاهده گزارشات
• <code>➕ افزودن کاربر</code> - افزودن کاربر جدید (مدیران)

💡 <b>نکات:</b>
• ربات 24/7 فعال است
• برای استفاده باید ثبت نام کنید
• اطلاعات شما محفوظ است

{self.get_timestamp()}"""
        
        return self.send_message(chat_id, help_text)
    
    def handle_text_message(self, chat_id, user_id, text, first_name):
        """پردازش پیام‌های متنی"""
        
        # Debug log
        logger.info(f"Processing text message: '{text}' from user {user_id}")
        
        # بررسی دستورات
        if text.startswith('/'):
            if text == '/start':
                return self.handle_start_command(chat_id, user_id, first_name)
            elif text == '/help':
                return self.handle_help_command(chat_id)
            elif text == '/profile':
                return self.show_user_info(chat_id, user_id)
            else:
                # دستور ناشناخته
                unknown_text = f"""❓ <b>دستور ناشناخته</b>

🔍 <b>دستور شما:</b> <code>{text}</code>

💡 <b>دستورات موجود:</b>
• <code>/start</code> - شروع ربات
• <code>/help</code> - راهنما
• <code>/profile</code> - مشاهده پروفایل کاربر

{self.get_timestamp()}"""
                return self.send_message(chat_id, unknown_text)
        
        # Handle button clicks
        elif text == '👤 پروفایل':
            return self.show_user_info(chat_id, user_id)
        elif text == '❓ راهنما':
            return self.handle_help_command(chat_id)
        elif text == '🔙 بازگشت به منو':
            return self.handle_start_command(chat_id, user_id, first_name)
        elif text == '💎 ریست اطلاعات ثبت نام':
            # ریست اطلاعات ثبت نام
            if user_id in self.user_data:
                del self.user_data[user_id]
            
            reset_text = f"""💎 <b>اطلاعات ثبت نام ریست شد!</b>

🔄 <b>حالا می‌توانید از ابتدا ثبت نام کنید:</b>
• نام کامل
• کد ملی  
• شماره تلفن

💡 <b>دستور /start را ارسال کنید</b>"""
            
            return self.send_message(chat_id, reset_text)
        elif text == '🔙 بازگشت':
            # Handle back button from registration process
            if user_id in self.user_data:
                step = self.user_data[user_id]["step"]
                if step == "full_name":
                    # Go back to start
                    self.user_data[user_id]["step"] = "start"
                    return self.start_registration(chat_id, user_id, first_name)
                elif step == "national_code":
                    # Go back to full name step
                    self.user_data[user_id]["step"] = "full_name"
                    return self.handle_full_name_input(chat_id, user_id, self.user_data[user_id]["full_name"])
                elif step == "phone":
                    # Go back to national code step
                    self.user_data[user_id]["step"] = "national_code"
                    return self.handle_national_code_input(chat_id, user_id, self.user_data[user_id]["national_code"])
            return self.start_registration(chat_id, user_id, first_name)
        elif text == '🚪 خروج':
            exit_text = f"""🚪 <b>خروج از ربات</b>

👋 <b>خداحافظ {first_name} عزیز!</b>

💡 <b>برای بازگشت:</b>
دستور <code>/start</code> را ارسال کنید.

{self.get_timestamp()}"""
            return self.send_message(chat_id, exit_text)
        elif text == '➕ افزودن کاربر جدید':
            return self.handle_add_user(chat_id, user_id)
        elif text == '📝 ارسال گزارش':
            return self.handle_send_report(chat_id, user_id)
        elif text == '📊 مشاهده گزارشات':
            return self.show_reports(chat_id, user_id)
        else:
            # Check if this is a user addition or report submission
            user_info = self.db.get_user_by_telegram_id(user_id)
            
            if user_info:
                # Check if this looks like a user addition (contains |)
                if '|' in text and user_info['role'] == 1:
                    return self.handle_user_addition(chat_id, user_id, text)
                # Check if this looks like a report submission (multiple lines)
                elif '\n' in text and user_info['role'] != 6:
                    return self.handle_report_submission(chat_id, user_id, text)
                else:
                    # No echo functionality - just show info
                    info_text = f"""ℹ️ <b>اطلاعات</b>

📝 <b>پیام شما دریافت شد اما ربات قابلیت اکو ندارد.</b>

💡 <b>برای استفاده:</b>
• از دکمه‌های منو استفاده کنید
• از دستورات موجود استفاده کنید
• برای راهنما: /help

{self.get_timestamp()}"""
                    return self.send_message(chat_id, info_text)
            else:
                # User is not registered - check registration step
                if user_id in self.user_data:
                    step = self.user_data[user_id]["step"]
                    
                    if step == "start":
                        # User should enter full name
                        return self.handle_full_name_input(chat_id, user_id, text)
                    elif step == "full_name":
                        # User should enter national code
                        return self.handle_national_code_input(chat_id, user_id, text)
                    elif step == "phone":
                        # User should send phone number
                        if self.is_valid_phone_number(text):
                            return self.process_phone_registration(chat_id, user_id, text, first_name)
                        else:
                            error_text = """❌ <b>شماره تلفن نامعتبر</b>

📞 <b>لطفاً شماره تلفن صحیح وارد کنید:</b>
• ۱۱ رقم باشد
• با ۰۹ شروع شود
• مثال: 09123456789

💡 <b>نکته:</b>
• شماره را بدون فاصله یا خط تیره وارد کنید
• یا از دکمه "📱 ارسال شماره تلفن" استفاده کنید"""
                            
                            # Show contact button for easier input
                            contact_keyboard = {
                                "keyboard": [[{"text": "📱 ارسال شماره تلفن", "request_contact": True}]],
                                "resize_keyboard": True
                            }
                            
                            return self.send_message(chat_id, error_text, contact_keyboard)
                    else:
                        # Unknown step, restart registration
                        return self.start_registration(chat_id, user_id, first_name)
                else:
                    # Check if this is a phone number for existing users
                    if self.is_valid_phone_number(text):
                        return self.process_phone_registration(chat_id, user_id, text, first_name)
                    else:
                        # Invalid phone number format
                        reminder_text = f"""📝 <b>ثبت نام ضروری است</b>

🔑 <b>برای استفاده از ربات، ابتدا باید ثبت نام کنید.</b>

💡 <b>لطفاً:</b>
• دستور /start را ارسال کنید
• مراحل ثبت نام را تکمیل کنید
• نام کامل، کد ملی و شماره تلفن خود را وارد کنید

{self.get_timestamp()}"""
                        return self.send_message(chat_id, reminder_text)
    
    def is_valid_phone_number(self, text):
        """بررسی اعتبار شماره تلفن"""
        # Remove any non-digit characters
        digits_only = ''.join(filter(str.isdigit, text))
        # Check if it's 11 digits starting with 09
        return len(digits_only) == 11 and digits_only.startswith('09')
    
    def process_phone_registration(self, chat_id, user_id, phone, first_name):
        """پردازش ثبت نام با شماره تلفن"""
        try:
            # Clean phone number and handle different formats
            clean_phone = ''.join(filter(str.isdigit, phone))
            
            # Handle international format conversion
            if clean_phone.startswith('98') and len(clean_phone) == 12:
                clean_phone = '0' + clean_phone[2:]  # 989123456789 -> 09123456789
            elif clean_phone.startswith('9') and len(clean_phone) == 10:
                clean_phone = '0' + clean_phone  # 9123456789 -> 09123456789
            
            # Validate phone number format
            if not self.is_valid_phone_number(clean_phone):
                error_text = """❌ <b>شماره تلفن نامعتبر</b>

📞 <b>لطفاً شماره تلفن صحیح وارد کنید:</b>
• ۱۱ رقم باشد
• با ۰۹ شروع شود
• مثال: 09123456789

💡 <b>نکته:</b>
• شماره را بدون فاصله یا خط تیره وارد کنید
• یا از دکمه "📱 ارسال شماره تلفن" استفاده کنید"""
                
                # Show contact button again
                contact_keyboard = {
                    "keyboard": [[{"text": "📱 ارسال شماره تلفن", "request_contact": True}]],
                    "resize_keyboard": True
                }
                
                return self.send_message(chat_id, error_text, contact_keyboard)
            
            # Check if phone number exists in database
            existing_user = self.db.get_user_by_phone(clean_phone)
            
            if existing_user:
                # Phone number exists, link telegram_id to existing user
                success = self.db.link_telegram_to_user(clean_phone, user_id)
                
                if success:
                    success_text = f"""✅ <b>ثبت نام موفق!</b>

👋 <b>سلام {first_name} عزیز!</b>

🎯 <b>شما با موفقیت در ربات ثبت نام شدید!</b>

👤 <b>اطلاعات شما:</b>
• نام: {existing_user.get('name', 'نامشخص')}
• منطقه: {existing_user.get('region', 'نامشخص')}
• نقش: {self.role_manager.get_role_name(existing_user['role'])}

💡 <b>حالا می‌توانید از تمام امکانات ربات استفاده کنید!</b>"""
                    
                    # Clear user data after successful registration
                    if user_id in self.user_data:
                        del self.user_data[user_id]
                    
                    # Show main menu after successful registration
                    self.send_message(chat_id, success_text)
                    return self.show_main_menu(chat_id, user_id, first_name)
                else:
                    error_text = """❌ <b>خطا در ثبت نام</b>

🔴 <b>مشکلی در ثبت نام پیش آمد.</b>

💡 <b>لطفاً:</b>
• دوباره تلاش کنید
• با پشتیبانی تماس بگیرید
• دستور /start را دوباره ارسال کنید"""
                    
                    return self.send_message(chat_id, error_text)
            else:
                # Phone number not found - create new user with collected data
                if user_id in self.user_data:
                    user_info = self.user_data[user_id]
                    
                    # Add new user to database
                    success = self.db.add_user(
                        user_info["full_name"],
                        clean_phone,
                        "نامشخص",  # Default region
                        6  # Default role: فعال
                    )
                    
                    if success:
                        # Link telegram_id to new user
                        link_success = self.db.link_telegram_to_user(clean_phone, user_id)
                        
                        if link_success:
                            success_text = f"""✅ <b>ثبت نام موفق!</b>

👋 <b>سلام {first_name} عزیز!</b>

🎯 <b>شما با موفقیت در ربات ثبت نام شدید!</b>

👤 <b>اطلاعات شما:</b>
• نام: {user_info["full_name"]}
• تلفن: {clean_phone}
• منطقه: نامشخص
• نقش: فعال

💡 <b>حالا می‌توانید از تمام امکانات ربات استفاده کنید!</b>"""
                            
                            # Clear user data after successful registration
                            del self.user_data[user_id]
                            
                            # Show main menu after successful registration
                            self.send_message(chat_id, success_text)
                            return self.show_main_menu(chat_id, user_id, first_name)
                        else:
                            error_text = """❌ <b>خطا در ثبت نام</b>

🔴 <b>مشکلی در ثبت نام پیش آمد.</b>

💡 <b>لطفاً:</b>
• دوباره تلاش کنید
• با پشتیبانی تماس بگیرید
• دستور /start را دوباره ارسال کنید"""
                            
                            return self.send_message(chat_id, error_text)
                    else:
                        error_text = """❌ <b>خطا در ثبت نام</b>

🔴 <b>مشکلی در ثبت نام پیش آمد.</b>

💡 <b>لطفاً:</b>
• دوباره تلاش کنید
• با پشتیبانی تماس بگیرید
• دستور /start را دوباره ارسال کنید"""
                        
                        return self.send_message(chat_id, error_text)
                else:
                    # No user data available
                    not_found_text = f"""❌ <b>شماره تلفن یافت نشد</b>

📞 <b>شماره تلفن:</b> {clean_phone}

🔴 <b>این شماره تلفن در سیستم ثبت نشده است.</b>

💡 <b>لطفاً:</b>
• شماره تلفن صحیح را وارد کنید
• با مدیر سیستم تماس بگیرید
• یا دستور /start را دوباره ارسال کنید"""
                    
                    return self.send_message(chat_id, not_found_text)
                
        except Exception as e:
            logger.error(f"❌ Error processing phone registration: {e}")
            error_text = """❌ <b>خطا در پردازش</b>

🔴 <b>مشکلی در پردازش شماره تلفن پیش آمد.</b>

💡 <b>لطفاً:</b>
• دوباره تلاش کنید
• شماره تلفن را به درستی وارد کنید
• یا دستور /start را دوباره ارسال کنید"""
            
            return self.send_message(chat_id, error_text)
    
    def handle_callback_query(self, callback_query):
        """پردازش کالبک کوئری"""
        try:
            data = callback_query.get('data')
            user_id = callback_query['from']['id']
            chat_id = callback_query['message']['chat']['id']
            first_name = callback_query['from'].get('first_name', 'کاربر')
            
            logger.info(f"🔄 Callback query received: {data} from user {user_id}")
            
            if data == 'cancel_registration':
                # Cancel registration and clear user data
                if user_id in self.user_data:
                    del self.user_data[user_id]
                # Go back to start
                return self.handle_start_command(chat_id, user_id, first_name)
            elif data == 'restart_registration':
                # Restart registration process
                if user_id in self.user_data:
                    del self.user_data[user_id]
                return self.start_registration(chat_id, user_id, first_name)
            elif data == 'back_to_previous':
                # Go back to previous step
                if user_id in self.user_data:
                    step = self.user_data[user_id]["step"]
                    if step == "phone":
                        # Go back to national code step
                        self.user_data[user_id]["step"] = "national_code"
                        return self.handle_national_code_input(chat_id, user_id, self.user_data[user_id]["national_code"])
                    elif step == "national_code":
                        # Go back to full name step
                        self.user_data[user_id]["step"] = "start"
                        return self.start_registration(chat_id, user_id, first_name)
                return self.start_registration(chat_id, user_id, first_name)
            elif data == 'edit_phone':
                # Edit phone number - show contact button
                if user_id in self.user_data:
                    self.user_data[user_id]["step"] = "phone"
                    
                    edit_phone_text = f"""📱 <b>ویرایش شماره تلفن</b>

{first_name} عزیز، لطفاً شماره تلفن جدید خود را با دکمه زیر ارسال کنید:"""
                    
                    contact_keyboard = {
                        "keyboard": [[{"text": "📱 ارسال شماره تلفن", "request_contact": True}]],
                        "resize_keyboard": True
                    }
                    
                    return self.send_message(chat_id, edit_phone_text, contact_keyboard)
                else:
                    return self.start_registration(chat_id, user_id, first_name)
            else:
                # Unknown callback query
                logger.warning(f"⚠️ Unknown callback query: {data}")
                return self.answer_callback_query(callback_query['id'], "⚠️ گزینه ناشناخته")
                
        except Exception as e:
            logger.error(f"❌ Error processing callback query: {e}")
            return False
    
    def start_polling(self):
        """شروع polling"""
        logger.info("🚀 Starting polling...")
        logger.info(f"🔗 Connecting to: {BASE_URL}")
        logger.info("📱 Bot ready to receive messages")
        logger.info("💡 To stop: Ctrl+C")
        
        while True:
            try:
                updates = self.get_updates()
                self.consecutive_errors = 0  # ریست کردن شمارنده خطاها
                
                for update in updates:
                    try:
                        # پردازش پیام
                        if 'message' in update:
                            message = update['message']
                            chat_id = message['chat']['id']
                            user_id = message['from']['id']
                            first_name = message['from'].get('first_name', 'کاربر')
                            
                            # بررسی پیام‌های contact
                            if 'contact' in message:
                                contact = message['contact']
                                logger.info(f"📱 Contact received from {first_name}: {contact.get('phone_number', 'N/A')}")
                                
                                # پردازش contact برای ثبت نام
                                if user_id in self.user_data and self.user_data[user_id]["step"] == "phone":
                                    phone_number = contact.get('phone_number', '')
                                    if phone_number:
                                        # حذف کد کشور (+98) و تبدیل به فرمت ایرانی
                                        if phone_number.startswith('+98'):
                                            phone_number = '0' + phone_number[3:]
                                        elif phone_number.startswith('98'):
                                            phone_number = '0' + phone_number[2:]
                                        
                                        # پردازش شماره تلفن
                                        self.process_phone_registration(chat_id, user_id, phone_number, first_name)
                                    else:
                                        logger.warning(f"❌ No phone number in contact from user {user_id}")
                                        self.send_message(chat_id, "❌ <b>خطا در دریافت شماره تلفن</b>\n\n🔴 لطفاً دوباره تلاش کنید.")
                                else:
                                    # کاربر در مرحله ثبت نام نیست
                                    self.send_message(chat_id, "📝 <b>ثبت نام ضروری است</b>\n\n🔑 برای استفاده از ربات، ابتدا باید ثبت نام کنید.\n\n💡 دستور /start را ارسال کنید.")
                            
                            elif 'text' in message:
                                text = message['text']
                                logger.info(f"📥 Message received: {text[:50]}... from {first_name}")
                                
                                # Normal text message handling
                                self.handle_text_message(chat_id, user_id, text, first_name)
                        
                        # پردازش کالبک کوئری
                        elif 'callback_query' in update:
                            callback_query = update['callback_query']
                            self.handle_callback_query(callback_query)
                    
                    except Exception as e:
                        logger.error(f"❌ Error processing update: {e}")
                        continue
                
                # تنظیم سرعت polling بر اساس وضعیت
                if self.consecutive_errors > 3:
                    time.sleep(2)  # کندتر در صورت خطا
                else:
                    time.sleep(0.1)  # سریع در حالت عادی
                    
            except KeyboardInterrupt:
                logger.info("🛑 Bot stopped by user")
                break
            except Exception as e:
                self.consecutive_errors += 1
                logger.error(f"🔴 Polling error: {e}")
                
                # اگر خطاهای متوالی زیاد شد، polling را کندتر کن
                if self.consecutive_errors > 3:
                    logger.warning(f"⏱️ Reducing polling speed due to consecutive errors: {self.consecutive_errors}")
                    time.sleep(5)
                else:
                    time.sleep(1)

def main():
    """تابع اصلی اجرای ربات"""
    try:
        bot = HierarchyBot()
        bot.start_polling()
    except Exception as e:
        logger.error(f"❌ Main error: {e}")
        print(f"❌ Error starting bot: {e}")

if __name__ == '__main__':
    main()