# arzyabi.py - ماژول ارزیابی قرآن‌آموزان
import json
import os
from datetime import datetime, timedelta
from config import BASE_URL, BOT_TOKEN, PRACTICE_DAY, EVALUATION_DAY, ENABLE_SATISFACTION_SURVEY
import requests

class ArzyabiModule:
    def __init__(self, kargah_module):
        self.kargah_module = kargah_module
        self.evaluation_data_file = "evaluation_data.json"
        self.load_evaluation_data()
        
    def load_evaluation_data(self):
        """بارگذاری داده‌های ارزیابی از فایل"""
        try:
            if os.path.exists(self.evaluation_data_file):
                with open(self.evaluation_data_file, 'r', encoding='utf-8') as f:
                    self.evaluation_data = json.load(f)
                    # اطمینان از وجود فیلدهای ضروری
                    if "satisfaction_surveys" not in self.evaluation_data:
                        self.evaluation_data["satisfaction_surveys"] = {}
                    if "user_states" not in self.evaluation_data:
                        self.evaluation_data["user_states"] = {}
            else:
                self.evaluation_data = {
                    "pending_evaluations": {},  # ارزیابی‌های در انتظار
                    "completed_evaluations": {},  # ارزیابی‌های تکمیل شده
                    "evaluation_scores": {
                        "نیاز به تلاش بیشتر": 1,
                        "متوسط": 2,
                        "خوب": 3,
                        "عالی": 4,
                        "ممتاز": 5
                    },
                    "satisfaction_surveys": {},  # نظرسنجی‌های رضایت
                    "user_states": {}  # وضعیت کاربران
                }
                self.save_evaluation_data()
        except Exception as e:
            print(f"خطا در بارگذاری داده‌های ارزیابی: {e}")
            self.evaluation_data = {
                "pending_evaluations": {},
                "completed_evaluations": {},
                "evaluation_scores": {
                    "نیاز به تلاش بیشتر": 1,
                    "متوسط": 2,
                    "خوب": 3,
                    "عالی": 4,
                    "ممتاز": 5
                },
                "satisfaction_surveys": {},  # نظرسنجی‌های رضایت
                "user_states": {}  # وضعیت کاربران
            }
    
    def save_evaluation_data(self):
        """ذخیره داده‌های ارزیابی در فایل"""
        try:
            with open(self.evaluation_data_file, 'w', encoding='utf-8') as f:
                json.dump(self.evaluation_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"خطا در ذخیره داده‌های ارزیابی: {e}")
    
    def is_quran_student(self, user_id):
        """بررسی اینکه آیا کاربر قرآن‌آموز است"""
        try:
            with open('registration_data.json', 'r', encoding='utf-8') as f:
                registration_data = json.load(f)
                user_data = registration_data.get(str(user_id), {})
                return user_data.get('user_type') == 'quran_student'
        except:
            return False
    
    def is_teacher_or_assistant(self, user_id):
        """بررسی اینکه آیا کاربر مربی یا کمک مربی است"""
        try:
            with open('registration_data.json', 'r', encoding='utf-8') as f:
                registration_data = json.load(f)
                user_data = registration_data.get(str(user_id), {})
                return user_data.get('user_type') in ['teacher', 'assistant_teacher']
        except:
            return False
    
    def get_user_name(self, user_id):
        """دریافت نام کاربر"""
        try:
            with open('registration_data.json', 'r', encoding='utf-8') as f:
                registration_data = json.load(f)
                user_data = registration_data.get(str(user_id), {})
                # ابتدا full_name را بررسی کن
                if user_data.get('full_name'):
                    return user_data.get('full_name')
                # سپس first_name را بررسی کن
                elif user_data.get('first_name'):
                    return user_data.get('first_name')
                # در نهایت از نام تلگرام استفاده کن
                else:
                    return f"قرآن‌آموز {user_id}"
        except:
            return f"قرآن‌آموز {user_id}"
    
    def handle_message(self, message):
        """پردازش پیام‌های دریافتی"""
        user_id = message["from"]["id"]
        chat_id = message["chat"]["id"]
        text = message.get("text", "")
        
        # بررسی پیام‌های صوتی با کپشن "دلیل"
        if "voice" in message and "caption" in message:
            caption = message.get("caption", "").strip()
            if "دلیل" in caption:
                self.handle_satisfaction_reason(message, user_id, caption)
                return
        
        # بررسی پیام‌های متنی که با "دلیل" شروع می‌شوند
        if text and text.strip().startswith("دلیل"):
            self.handle_satisfaction_reason(message, user_id, text)
            return
        
        # بررسی پیام‌های صوتی با کپشن "تمرین"
        if "voice" in message and "caption" in message:
            caption = message.get("caption", "").strip()
            if "تمرین" in caption:
                if self.is_quran_student(user_id):
                    self.handle_practice_submission(message)
                else:
                    # اگر کاربر قرآن‌آموز نیست، پیام هشدار ارسال کن
                    self.send_message(chat_id, "⚠️ فقط قرآن‌آموزان می‌توانند تمرین ارسال کنند.")
                return
    
    def handle_callback(self, callback):
        """پردازش callback query ها"""
        callback_data = callback["data"]
        if callback_data.startswith("evaluate_"):
            self.handle_evaluation_callback(callback)
            return True  # نشان می‌دهد که callback پردازش شده است
        elif callback_data.startswith("satisfaction_"):
            self.handle_satisfaction_callback(callback)
            return True  # نشان می‌دهد که callback پردازش شده است
        return False  # نشان می‌دهد که callback پردازش نشده است
    
    def handle_practice_submission(self, message):
        """پردازش ارسال تمرین"""
        user_id = message["from"]["id"]
        chat_id = message["chat"]["id"]
        user_name = self.get_user_name(user_id)
        
        # تشکر از ارسال تمرین
        thank_you_text = f"✅ تشکر از ارسال تمرین شما {user_name} عزیز\n\n"
        thank_you_text += "📝 منتظر ارزیابی مربیان هستیم."
        
        self.send_message(chat_id, thank_you_text)
        
        # ایجاد درخواست ارزیابی
        from persian_date import PersianDateManager
        now = jdatetime.datetime.now()
        evaluation_id = f"{user_id}_{now.strftime('%Y%m%d_%H%M%S')}"
        self.evaluation_data["pending_evaluations"][evaluation_id] = {
            "user_id": user_id,
            "user_name": user_name,
            "chat_id": chat_id,
            "message_id": message["message_id"],
            "submission_time": datetime.now().isoformat(),
            "evaluations": {}  # ارزیابی‌های مربیان
        }
        self.save_evaluation_data()
        
        # ارسال کیبورد ارزیابی در همان گروه
        self.send_evaluation_keyboard(chat_id, evaluation_id, user_name)
    
    def send_evaluation_keyboard(self, chat_id, evaluation_id, student_name):
        """ارسال کیبورد ارزیابی در گروه"""
        text = f"📝 **ارزیابی تمرین قرآن‌آموز**\n\n"
        text += f"قرآن‌آموز: {student_name}\n"
        text += f"لطفاً تمرین ارسالی را ارزیابی کنید:"
        
        # ایجاد کیبورد ارزیابی
        keyboard = {
            "inline_keyboard": [
                [
                    {"text": "نیاز به تلاش بیشتر", "callback_data": f"evaluate_{evaluation_id}_1"},
                    {"text": "متوسط", "callback_data": f"evaluate_{evaluation_id}_2"}
                ],
                [
                    {"text": "خوب", "callback_data": f"evaluate_{evaluation_id}_3"},
                    {"text": "عالی", "callback_data": f"evaluate_{evaluation_id}_4"}
                ],
                [
                    {"text": "ممتاز", "callback_data": f"evaluate_{evaluation_id}_5"}
                ]
            ]
        }
        
        self.send_message_with_keyboard(chat_id, text, keyboard)
    

    
    def handle_evaluation_callback(self, callback_query):
        """پردازش callback ارزیابی"""
        data = callback_query["data"]
        user_id = callback_query["from"]["id"]
        
        print(f"🔍 Processing evaluation callback: {data} from user {user_id}")
        
        if not self.is_teacher_or_assistant(user_id):
            print(f"❌ User {user_id} is not a teacher or assistant")
            self.answer_callback_query(callback_query["id"], "فقط مربیان و کمک مربیان می‌توانند ارزیابی کنند.")
            return
        
        # تجزیه callback data - format: evaluate_{evaluation_id}_{score}
        parts = data.split("_")
        if len(parts) >= 3:
            # evaluation_id ممکن است شامل underscore باشد، پس باید آخرین قسمت را به عنوان score بگیریم
            score = int(parts[-1])  # آخرین قسمت
            evaluation_id = "_".join(parts[1:-1])  # همه قسمت‌های میانی
            
            print(f"🔍 Parsed: evaluation_id={evaluation_id}, score={score}")
            
            if evaluation_id in self.evaluation_data["pending_evaluations"]:
                self.process_evaluation(evaluation_id, user_id, score, callback_query)
            else:
                print(f"❌ Evaluation ID {evaluation_id} not found in pending evaluations")
                self.answer_callback_query(callback_query["id"], "❌ ارزیابی مورد نظر یافت نشد.")
        else:
            print(f"❌ Invalid callback data format: {data}")
            self.answer_callback_query(callback_query["id"], "❌ فرمت callback نامعتبر است.")
    
    def process_evaluation(self, evaluation_id, teacher_id, score, callback_query):
        """پردازش ارزیابی مربی"""
        eval_data = self.evaluation_data["pending_evaluations"][evaluation_id]
        teacher_name = self.get_user_name(teacher_id)
        
        # ذخیره ارزیابی
        eval_data["evaluations"][str(teacher_id)] = {
            "score": score,
            "teacher_name": teacher_name,
            "evaluation_time": datetime.now().isoformat()
        }
        
        # بررسی اینکه آیا همه مربیان ارزیابی کرده‌اند
        self.check_evaluation_completion(evaluation_id)
        
        # پاسخ به callback
        score_text = list(self.evaluation_data["evaluation_scores"].keys())[score - 1]
        self.answer_callback_query(callback_query["id"], f"✅ ارزیابی شما ({score_text}) ثبت شد.")
        
        # نمایش لیست فعلی ارزیابی‌ها
        self.show_current_evaluations(evaluation_id)
    
    def check_evaluation_completion(self, evaluation_id):
        """بررسی تکمیل ارزیابی‌ها"""
        eval_data = self.evaluation_data["pending_evaluations"][evaluation_id]
        
        # شمارش تعداد مربیان
        try:
            with open('registration_data.json', 'r', encoding='utf-8') as f:
                registration_data = json.load(f)
                
            teacher_count = 0
            for user_data in registration_data.values():
                if user_data.get('user_type') in ['teacher', 'assistant_teacher']:
                    teacher_count += 1
            
            # اگر همه مربیان ارزیابی کرده‌اند
            if len(eval_data["evaluations"]) >= teacher_count:
                self.complete_evaluation(evaluation_id)
        
        except Exception as e:
            print(f"خطا در بررسی تکمیل ارزیابی: {e}")
    
    def show_current_evaluations(self, evaluation_id):
        """نمایش لیست فعلی ارزیابی‌ها"""
        try:
            eval_data = self.evaluation_data["pending_evaluations"][evaluation_id]
            chat_id = eval_data["chat_id"]
            
            text = f"📊 **لیست ارزیابی‌های فعلی**\n\n"
            text += f"قرآن‌آموز: {eval_data['user_name']}\n\n"
            
            if eval_data["evaluations"]:
                for i, (teacher_id, evaluation) in enumerate(eval_data["evaluations"].items(), 1):
                    score_text = list(self.evaluation_data["evaluation_scores"].keys())[evaluation["score"] - 1]
                    text += f"{i}. {evaluation['teacher_name']}: {score_text}\n"
            else:
                text += "هنوز ارزیابی‌ای ثبت نشده است."
            
            self.send_message(chat_id, text)
        except KeyError:
            print(f"❌ Evaluation ID {evaluation_id} not found in pending evaluations")
            # ارسال پیام خطا
            self.send_message(chat_id, "❌ ارزیابی مورد نظر یافت نشد.")
    
    def complete_evaluation(self, evaluation_id):
        """تکمیل فرآیند ارزیابی"""
        eval_data = self.evaluation_data["pending_evaluations"][evaluation_id]
        
        # محاسبه میانگین نمرات
        total_score = sum(eval["score"] for eval in eval_data["evaluations"].values())
        average_score = total_score / len(eval_data["evaluations"])
        
        # تعیین سطح کلی
        score_levels = ["نیاز به تلاش بیشتر", "متوسط", "خوب", "عالی", "ممتاز"]
        overall_level = score_levels[min(int(average_score) - 1, 4)]
        
        # انتقال به ارزیابی‌های تکمیل شده
        self.evaluation_data["completed_evaluations"][evaluation_id] = {
            **eval_data,
            "average_score": average_score,
            "overall_level": overall_level,
            "completion_time": datetime.now().isoformat()
        }
        
        # حذف از ارزیابی‌های در انتظار
        del self.evaluation_data["pending_evaluations"][evaluation_id]
        self.save_evaluation_data()
        
        # ارسال گزارش نهایی
        self.send_final_evaluation_report(evaluation_id)
        
        # ارسال نظرسنجی رضایت
        if ENABLE_SATISFACTION_SURVEY:
            self.send_satisfaction_survey(evaluation_id)
        
        # ارسال گزارش به روم گزارش
        self.send_report_to_admin_room(evaluation_id)
    
    def send_final_evaluation_report(self, evaluation_id):
        """ارسال گزارش نهایی ارزیابی"""
        eval_data = self.evaluation_data["completed_evaluations"][evaluation_id]
        chat_id = eval_data["chat_id"]
        
        text = f"🎉 **گزارش نهایی ارزیابی**\n\n"
        text += f"قرآن‌آموز: {eval_data['user_name']}\n"
        text += f"سطح کلی: {eval_data['overall_level']}\n\n"
        text += "جزئیات ارزیابی‌ها:\n"
        
        for teacher_id, evaluation in eval_data["evaluations"].items():
            score_text = list(self.evaluation_data["evaluation_scores"].keys())[evaluation["score"] - 1]
            text += f"• {evaluation['teacher_name']}: {score_text}\n"
        
        self.send_message(chat_id, text)
    
    def send_report_to_admin_room(self, evaluation_id):
        """ارسال گزارش به روم گزارش"""
        eval_data = self.evaluation_data["completed_evaluations"][evaluation_id]
        
        text = f"📋 **گزارش ارزیابی تکمیل شده**\n\n"
        text += f"قرآن‌آموز: {eval_data['user_name']}\n"
        text += f"سطح کلی: {eval_data['overall_level']}\n"
        from persian_date import PersianDateManager
        text += f"تاریخ تکمیل: {PersianDateManager.get_persian_datetime()}\n"
        text += f"تعداد ارزیابی‌کنندگان: {len(eval_data['evaluations'])}"
        
        # در اینجا باید به روم گزارش ارسال شود
        # برای تست، به گروه اصلی ارسال می‌کنیم
        self.send_message(eval_data["chat_id"], text)
    
    def send_satisfaction_survey(self, evaluation_id):
        """ارسال نظرسنجی رضایت"""
        eval_data = self.evaluation_data["completed_evaluations"][evaluation_id]
        chat_id = eval_data["chat_id"]
        student_id = eval_data["user_id"]
        
        text = f"📊 **نظرسنجی رضایت**\n\n"
        text += f"قرآن‌آموز: {eval_data['user_name']}\n"
        text += f"سطح کلی: {eval_data['overall_level']}\n\n"
        text += f"لطفاً از نمره‌ای که دریافت کرده‌اید رضایت خود را اعلام کنید:"
        
        # ایجاد کیبورد نظرسنجی
        keyboard = {
            "inline_keyboard": [
                [
                    {"text": "1", "callback_data": f"satisfaction_{evaluation_id}_1"},
                    {"text": "2", "callback_data": f"satisfaction_{evaluation_id}_2"},
                    {"text": "3", "callback_data": f"satisfaction_{evaluation_id}_3"}
                ],
                [
                    {"text": "4", "callback_data": f"satisfaction_{evaluation_id}_4"},
                    {"text": "5", "callback_data": f"satisfaction_{evaluation_id}_5"}
                ]
            ]
        }
        
        self.send_message_with_keyboard(chat_id, text, keyboard)
        
        # ذخیره وضعیت نظرسنجی
        self.evaluation_data["satisfaction_surveys"][evaluation_id] = {
            "status": "waiting_for_score",
            "student_id": student_id,
            "student_name": eval_data['user_name']
        }
        self.save_evaluation_data()
    
    def handle_satisfaction_callback(self, callback_query):
        """پردازش callback نظرسنجی رضایت"""
        data = callback_query["data"]
        user_id = callback_query["from"]["id"]
        user_name = self.get_user_name(user_id)
        
        print(f"🔍 Processing satisfaction callback: {data} from user {user_id}")
        
        # تجزیه callback data - format: satisfaction_{evaluation_id}_{score}
        parts = data.split("_")
        if len(parts) >= 3:
            score = int(parts[-1])  # آخرین قسمت
            evaluation_id = "_".join(parts[1:-1])  # همه قسمت‌های میانی
            
            print(f"🔍 Parsed satisfaction: evaluation_id={evaluation_id}, score={score}")
            
            if evaluation_id in self.evaluation_data["completed_evaluations"]:
                # بررسی اینکه آیا کاربر مجاز است (فقط قرآن‌آموزی که ارزیابی شده)
                eval_data = self.evaluation_data["completed_evaluations"][evaluation_id]
                authorized_student_id = eval_data["user_id"]
                
                if user_id != authorized_student_id:
                    # کاربر غیرمجاز - گزارش به گروه گزارش
                    self.report_unauthorized_satisfaction_attempt(evaluation_id, user_id, user_name, eval_data)
                    # هیچ پاسخ عمومی نمی‌دهیم
                    return
                
                # بررسی اینکه آیا قبلاً نظرسنجی شده
                if evaluation_id in self.evaluation_data["satisfaction_surveys"]:
                    survey_data = self.evaluation_data["satisfaction_surveys"][evaluation_id]
                    if survey_data.get("status") == "completed":
                        # قبلاً نظرسنجی شده - هیچ پاسخ عمومی نمی‌دهیم
                        print(f"❌ User {user_id} already completed satisfaction survey for {evaluation_id}")
                        return
                
                self.process_satisfaction(evaluation_id, user_id, score, callback_query)
            else:
                print(f"❌ Evaluation ID {evaluation_id} not found in completed evaluations")
                print(f"Available completed evaluations: {list(self.evaluation_data['completed_evaluations'].keys())}")
                # هیچ پاسخ عمومی نمی‌دهیم
        else:
            print(f"❌ Invalid satisfaction callback data format: {data}")
            # هیچ پاسخ عمومی نمی‌دهیم
    
    def process_satisfaction(self, evaluation_id, student_id, score, callback_query):
        """پردازش نظرسنجی رضایت"""
        eval_data = self.evaluation_data["completed_evaluations"][evaluation_id]
        student_name = self.get_user_name(student_id)
        chat_id = eval_data["chat_id"]
        
        # ذخیره نمره رضایت با وضعیت تکمیل شده
        if evaluation_id in self.evaluation_data["satisfaction_surveys"]:
            self.evaluation_data["satisfaction_surveys"][evaluation_id].update({
                "satisfaction_score": score,
                "survey_time": datetime.now().isoformat(),
                "status": "completed"
            })
        else:
            self.evaluation_data["satisfaction_surveys"][evaluation_id] = {
                "student_id": student_id,
                "student_name": student_name,
                "satisfaction_score": score,
                "survey_time": datetime.now().isoformat(),
                "status": "completed"
            }
        self.save_evaluation_data()
        
        # پاسخ به callback
        self.answer_callback_query(callback_query["id"], f"✅ نمره رضایت شما ({score}/5) ثبت شد.")
        
        # تشکر از نظرسنجی در گروه
        thank_you_text = f"🎉 **تشکر از نظر سنجی شما**\n\n"
        thank_you_text += f"قرآن‌آموز: {student_name}\n"
        thank_you_text += f"رضایت شما: {score}/5\n"
        thank_you_text += f"نظرات شما به بهبود سیستم کمک می‌کند."
        
        # ارسال پیام تشکر در گروه
        self.send_message(chat_id, thank_you_text)
        
        # ارسال گزارش به گروه گزارش
        self.send_satisfaction_report_to_admin(evaluation_id, student_name, score)
    
    def report_unauthorized_satisfaction_attempt(self, evaluation_id, unauthorized_user_id, unauthorized_user_name, eval_data):
        """گزارش تلاش غیرمجاز برای نظرسنجی"""
        authorized_student_name = eval_data["user_name"]
        chat_id = eval_data["chat_id"]
        
        text = f"⚠️ **تلاش غیرمجاز برای نظرسنجی**\n\n"
        text += f"ارزیابی: {evaluation_id}\n"
        text += f"قرآن‌آموز مجاز: {authorized_student_name}\n"
        text += f"کاربر غیرمجاز: {unauthorized_user_name} (@{unauthorized_user_id})\n"
        text += f"گروه: {chat_id}\n"
        from persian_date import PersianDateManager
        text += f"زمان: {PersianDateManager.get_persian_datetime()}"
        
        # ارسال به گروه گزارش
        from config import REPORT_GROUP_ID
        print(f"📤 Sending unauthorized attempt report to admin group {REPORT_GROUP_ID}")
        result = self.send_message(REPORT_GROUP_ID, text)
        print(f"📤 Unauthorized attempt report sent: {result}")
    
    def send_satisfaction_report_to_admin(self, evaluation_id, student_name, score):
        """ارسال گزارش نظرسنجی به گروه گزارش"""
        eval_data = self.evaluation_data["completed_evaluations"][evaluation_id]
        
        text = f"📊 **گزارش نظرسنجی رضایت**\n\n"
        text += f"قرآن‌آموز: {student_name}\n"
        text += f"سطح کلی ارزیابی: {eval_data['overall_level']}\n"
        text += f"رضایت از نمره: {score}/5\n"
        from persian_date import PersianDateManager
        text += f"تاریخ نظرسنجی: {PersianDateManager.get_persian_datetime()}"
        
        # ارسال به گروه گزارش
        from config import REPORT_GROUP_ID
        print(f"📤 Sending satisfaction report to admin group {REPORT_GROUP_ID}")
        result = self.send_message(REPORT_GROUP_ID, text)
        print(f"📤 Satisfaction report sent: {result}")
        
        # همچنین در گروه اصلی نیز ارسال کن
        chat_id = eval_data["chat_id"]
        self.send_message(chat_id, f"📋 گزارش نظرسنجی به گروه گزارش ارسال شد.")
    
    def handle_satisfaction_reason(self, message, user_id, reason_text):
        """پردازش دلیل نظرسنجی"""
        user_name = self.get_user_name(user_id)
        chat_id = message["chat"]["id"]
        message_id = message["message_id"]
        
        # بررسی اینکه آیا کاربر نظرسنجی تکمیل شده دارد
        found_evaluation = None
        for evaluation_id, survey_data in self.evaluation_data["satisfaction_surveys"].items():
            if (survey_data.get("student_id") == user_id and 
                survey_data.get("status") == "completed" and
                not survey_data.get("reason")):  # هنوز دلیل نداده
                found_evaluation = evaluation_id
                break
        
        if not found_evaluation:
            # کاربر نظرسنجی تکمیل شده ندارد یا قبلاً دلیل داده
            return
        
        # بررسی اینکه آیا پیام صوت است یا متن
        is_voice = "voice" in message
        
        # ذخیره دلیل
        self.evaluation_data["satisfaction_surveys"][found_evaluation]["reason"] = reason_text
        self.save_evaluation_data()
        
        # تشکر از دلیل در گروه
        thank_you_text = f"🎉 **تشکر از دلیل شما**\n\n"
        thank_you_text += f"قرآن‌آموز: {user_name}\n"
        thank_you_text += f"دلیل شما به بهبود سیستم کمک می‌کند."
        self.send_message(chat_id, thank_you_text)
        
        if is_voice:
            # اگر صوت است، آن را به گروه گزارش بفرست و از گروه حذف کن
            self.forward_voice_to_admin_and_delete(message, found_evaluation, user_name, reason_text)
        else:
            # اگر متن است، فقط گزارش بفرست
            self.send_reason_report_to_admin(found_evaluation, user_name, reason_text)
    
    def send_reason_report_to_admin(self, evaluation_id, student_name, reason):
        """ارسال گزارش دلیل به گروه گزارش"""
        eval_data = self.evaluation_data["completed_evaluations"][evaluation_id]
        survey_data = self.evaluation_data["satisfaction_surveys"][evaluation_id]
        
        text = f"📝 **گزارش دلیل نظرسنجی**\n\n"
        text += f"قرآن‌آموز: {student_name}\n"
        text += f"سطح کلی ارزیابی: {eval_data['overall_level']}\n"
        text += f"رضایت از نمره: {survey_data.get('satisfaction_score', 'نامشخص')}/5\n"
        text += f"دلیل: {reason}\n"
        from persian_date import PersianDateManager
        text += f"تاریخ: {PersianDateManager.get_persian_datetime()}"
        
        # ارسال به گروه گزارش
        from config import REPORT_GROUP_ID
        print(f"📤 Sending reason report to admin group {REPORT_GROUP_ID}")
        result = self.send_message(REPORT_GROUP_ID, text)
        print(f"📤 Reason report sent: {result}")
    
    def forward_voice_to_admin_and_delete(self, message, evaluation_id, student_name, reason_text):
        """ارسال صوت به گروه گزارش و حذف از گروه اصلی"""
        chat_id = message["chat"]["id"]
        message_id = message["message_id"]
        voice_file_id = message["voice"]["file_id"]
        
        # ارسال صوت به گروه گزارش
        from config import REPORT_GROUP_ID
        
        # ابتدا گزارش متنی بفرست
        eval_data = self.evaluation_data["completed_evaluations"][evaluation_id]
        survey_data = self.evaluation_data["satisfaction_surveys"][evaluation_id]
        
        text = f"🎤 **گزارش دلیل صوتی نظرسنجی**\n\n"
        text += f"قرآن‌آموز: {student_name}\n"
        text += f"سطح کلی ارزیابی: {eval_data['overall_level']}\n"
        text += f"رضایت از نمره: {survey_data.get('satisfaction_score', 'نامشخص')}/5\n"
        text += f"کپشن: {reason_text}\n"
        from persian_date import PersianDateManager
        text += f"تاریخ: {PersianDateManager.get_persian_datetime()}"
        
        print(f"📤 Sending voice reason report to admin group {REPORT_GROUP_ID}")
        result = self.send_message(REPORT_GROUP_ID, text)
        print(f"📤 Voice reason report sent: {result}")
        
        # سپس صوت را بفرست
        self.send_voice_to_admin(REPORT_GROUP_ID, voice_file_id, f"دلیل صوتی از {student_name}")
        
        # حذف پیام از گروه اصلی
        self.delete_message(chat_id, message_id)
    
    def send_voice_to_admin(self, chat_id, file_id, caption=""):
        """ارسال صوت به گروه گزارش"""
        url = f"{BASE_URL}/sendVoice"
        data = {
            "chat_id": chat_id,
            "voice": file_id
        }
        if caption:
            data["caption"] = caption
        
        try:
            response = requests.post(url, json=data)
            return response.json()
        except Exception as e:
            print(f"خطا در ارسال صوت: {e}")
    
    def delete_message(self, chat_id, message_id):
        """حذف پیام از گروه"""
        url = f"{BASE_URL}/deleteMessage"
        data = {
            "chat_id": chat_id,
            "message_id": message_id
        }
        try:
            response = requests.post(url, json=data)
            return response.json()
        except Exception as e:
            print(f"خطا در حذف پیام: {e}")
    

    
    def send_message(self, chat_id, text):
        """ارسال پیام متنی"""
        url = f"{BASE_URL}/sendMessage"
        data = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML"
        }
        try:
            response = requests.post(url, json=data)
            return response.json()
        except Exception as e:
            print(f"خطا در ارسال پیام: {e}")
    
    def send_message_with_keyboard(self, chat_id, text, keyboard):
        """ارسال پیام با کیبورد"""
        url = f"{BASE_URL}/sendMessage"
        data = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "reply_markup": keyboard
        }
        try:
            response = requests.post(url, json=data)
            return response.json()
        except Exception as e:
            print(f"خطا در ارسال پیام با کیبورد: {e}")
    
    def answer_callback_query(self, callback_query_id, text):
        """پاسخ به callback query"""
        url = f"{BASE_URL}/answerCallbackQuery"
        data = {
            "callback_query_id": callback_query_id,
            "text": text
        }
        try:
            response = requests.post(url, json=data)
            return response.json()
        except Exception as e:
            print(f"خطا در پاسخ به callback: {e}") 