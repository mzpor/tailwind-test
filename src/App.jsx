import { useState } from "react";
import SSEConnection from "./components/SSEConnection";

const isIranMobile = (p) => /^09\d{9}$/.test(p);

// Admin Panel Component
function AdminPanel({ onBack }) {
  const [activeTab, setActiveTab] = useState("reports");
  
  // Sample student data
  const students = [
    { id: 1, name: "علی رضایی", phone: "09120000000", status: "پرداخت شده", payment: "green" },
    { id: 2, name: "سارا محمدی", phone: "09121111111", status: "در انتظار پرداخت", payment: "yellow" },
    { id: 3, name: "حسین احمدی", phone: "09123333333", status: "پرداخت شده", payment: "green" },
    { id: 4, name: "فاطمه کریمی", phone: "09124444444", status: "پرداخت شده", payment: "green" },
    { id: 5, name: "محمد نوری", phone: "09125555555", status: "در انتظار پرداخت", payment: "yellow" }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "reports":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-blue-700 mb-4">وضعیت گزارش‌ها متصل (SSE)</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-green-700">گزارش‌ها در حال حاضر فعال هستند</span>
                </div>
                <p className="text-slate-600">آخرین همگام‌سازی: {new Date().toLocaleTimeString('fa-IR')}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-blue-700">لیست دانش‌آموزان</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  خروجی CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 text-slate-600">نام</th>
                      <th className="text-right py-3 px-4 text-slate-600">موبایل</th>
                      <th className="text-right py-3 px-4 text-slate-600">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b border-gray-100">
                        <td className="py-3 px-4">{student.name}</td>
                        <td className="py-3 px-4">{student.phone}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            student.payment === 'green' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      
      case "robot":
        return (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-blue-700 mb-4">داشبورد ربات 🤖</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-700 mb-2">وضعیت ربات</h3>
                <p className="text-blue-600">ربات فعال و در حال کار</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-700 mb-2">پیام‌های امروز</h3>
                <p className="text-green-600">۱۵ پیام جدید</p>
              </div>
            </div>
          </div>
        );
      
      case "settings":
        return (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-blue-700 mb-4">تنظیمات ⚙️</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>اعلان‌های ایمیل</span>
                <button className="w-12 h-6 bg-blue-500 rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>اعلان‌های موبایل</span>
                <button className="w-12 h-6 bg-gray-300 rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                </button>
              </div>
            </div>
          </div>
        );
      
      case "workshops":
        return (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-blue-700 mb-4">کارگاه‌ها 🎓</h2>
            <div className="space-y-4">
              <div className="p-4 border border-emerald-200 rounded-lg">
                <h3 className="font-semibold text-emerald-700">کلاس قرآن مقدماتی</h3>
                <p className="text-slate-600">شنبه و سه‌شنبه - ساعت 18:00</p>
                <p className="text-sm text-emerald-600 mt-2">تعداد دانش‌آموز: ۱۲ نفر</p>
              </div>
              <div className="p-4 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-700">کلاس قرآن پیشرفته</h3>
                <p className="text-slate-600">یکشنبه و چهارشنبه - ساعت 19:00</p>
                <p className="text-sm text-blue-600 mt-2">تعداد دانش‌آموز: ۸ نفر</p>
              </div>
            </div>
          </div>
        );
      
      case "registrations":
        return (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-blue-700 mb-4">ثبت‌نام‌ها ✏️</h2>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-700">امروز: ۳ ثبت‌نام جدید</p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700">این هفته: ۱۵ ثبت‌نام</p>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-blue-700">پنل مدیریت</h1>
              <p className="text-slate-600">مدیریت کارگاه قرآن</p>
            </div>
            <button
              onClick={onBack}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition"
            >
              بازگشت
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap gap-4 border-b border-gray-200 pb-4">
            {[
              { id: "reports", label: "گزارش‌ها", icon: "📊" },
              { id: "robot", label: "داشبورد ربات", icon: "🤖" },
              { id: "settings", label: "تنظیمات", icon: "⚙️" },
              { id: "workshops", label: "کارگاه‌ها", icon: "🎓" },
              { id: "registrations", label: "ثبت‌نام‌ها", icon: "✏️" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-lg font-medium transition ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Left Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-blue-700 mb-4">منوهای فعال</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-700">نظرسنجی</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-700">گزارش</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-700">ثبت‌نام</span>
                </div>
              </div>
              <button className="w-full mt-4 p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition">
                🔄
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-2">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin Access Component
function AdminAccess({ onAccessGranted, onBack }) {
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Admin code entered:", adminCode); // Debug log
    if (adminCode === "0000") {
      console.log("Access granted!"); // Debug log
      onAccessGranted();
    } else {
      setError("کد مدیریت نادرست است");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6 space-y-6 border border-gray-100">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-blue-700">دسترسی مدیریت</h1>
          <p className="text-sm text-slate-600">کد مدیریت را وارد کنید</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-600">کد مدیریت</label>
            <input
              type="text"
              value={adminCode}
              onChange={(e) => {
                setAdminCode(e.target.value);
                setError("");
              }}
              className={`px-3 py-3 text-center text-lg font-mono rounded-lg border outline-none focus:ring-2 focus:ring-blue-300 ${error ? "border-rose-400" : "border-slate-300"}`}
              placeholder="0000"
              maxLength="4"
              autoFocus
            />
            {error && <small className="text-rose-600 text-center">{error}</small>}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg py-2.5 transition"
            >
              بازگشت
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 transition"
            >
              ورود
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  const [currentView, setCurrentView] = useState("main");
  const [form, setForm] = useState({ firstName: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState("");

  function onChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(err => ({ ...err, [e.target.name]: undefined }));
  }

  function submit(e) {
    e.preventDefault();
    console.log("Form submitted:", form); // Debug log
    
    const eObj = {};
    if (!form.firstName.trim()) eObj.firstName = "نام (یا نام خانوادگی) را وارد کنید";
    if (!isIranMobile(form.phone)) eObj.phone = "شماره موبایل ایران مثل 09123456789";
    
    setErrors(eObj);
    
    if (Object.keys(eObj).length === 0) {
      setMsg("ثبت موقتی انجام شد ✅ (بعداً به ربات بله وصل می‌کنیم)");
      setForm({ firstName: "", phone: "" });
      console.log("Registration successful!"); // Debug log
    } else {
      setMsg("");
      console.log("Validation errors:", eObj); // Debug log
    }
  }

  const handleAdminAccess = () => {
    console.log("Admin access granted, switching to admin panel"); // Debug log
    setCurrentView("admin");
  };

  const handleBackToMain = () => {
    setCurrentView("main");
  };

  console.log("Current view:", currentView); // Debug log

  if (currentView === "admin") {
    return <AdminPanel onBack={handleBackToMain} />;
  }

  if (currentView === "sse") {
    return <SSEConnection />;
  }

  if (currentView === "admin_access") {
    return <AdminAccess onAccessGranted={handleAdminAccess} onBack={handleBackToMain} />;
  }

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Admin Access Button */}
        <div className="text-center mb-4 space-x-2">
          <button
            onClick={() => setCurrentView("admin_access")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            ورود به پنل مدیریت 🔐
          </button>
          <button
            onClick={() => setCurrentView("sse")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
          >
            اتصال SSE 🔗
          </button>
        </div>

        {/* Main Form */}
        <form onSubmit={submit} className="w-full bg-white shadow-xl rounded-2xl p-5 space-y-4 border border-gray-100">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-emerald-700">ثبت‌نام سریع</h1>
            <p className="text-sm text-slate-600">لطفاً اطلاعات خود را وارد کنید</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">نام و نام خانوادگی</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={onChange}
              className={`px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-emerald-300 ${errors.firstName ? "border-rose-400" : "border-slate-300"}`}
              placeholder="مثال: محمد احمدی"
            />
            {errors.firstName && <small className="text-rose-600">{errors.firstName}</small>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">شماره موبایل</label>
            <input
              name="phone"
              value={form.phone}
              onChange={onChange}
              className={`px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-emerald-300 ltr ${errors.phone ? "border-rose-400" : "border-slate-300"}`}
              placeholder="09123456789"
            />
            {errors.phone && <small className="text-rose-600">{errors.phone}</small>}
          </div>

          <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 transition">
            ثبت‌نام کنید
          </button>

          {msg && <p className="text-center text-emerald-700">{msg}</p>}
        </form>
      </div>
    </div>
  );
}