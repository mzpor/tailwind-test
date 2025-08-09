import { useState, useEffect } from "react";
import { gw } from "../lib/gateway";

export default function Register() {
  const [step, setStep] = useState(1); // 1: اطلاعات شخصی, 2: انتخاب کارگاه
  const [form, setForm] = useState({
    firstName: '',
    nationalId: '',
    phone: '',
    workshopId: ''
  });
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // لود کردن کارگاه‌ها
    gw.workshops().then(setWorkshops).catch(() => {});
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function nextStep() {
    if (form.firstName && form.phone) {
      setStep(2);
    }
  }

  function selectWorkshop(workshopId) {
    setForm(f => ({ ...f, workshopId }));
  }

  async function submitRegistration() {
    if (!form.workshopId) return;
    
    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName,
        phone: form.phone,
        workshopId: form.workshopId
      };
      const response = await gw.register(payload);
      setResult(response);
    } catch (error) {
      console.error('خطا در ثبت‌نام:', error);
      setResult({ error: 'خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.' });
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="min-h-screen p-6 bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="max-w-md mx-auto bg-white shadow rounded-2xl p-6 text-center">
          {result.error ? (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-xl font-bold text-red-600 mb-2">خطا در ثبت‌نام</h2>
              <p className="text-slate-600 mb-4">{result.error}</p>
              <button 
                onClick={() => { setResult(null); setStep(1); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                تلاش مجدد
              </button>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-emerald-600 mb-2">ثبت‌نام موفق!</h2>
              <p className="text-slate-600 mb-4">
                ثبت‌نام شما با موفقیت انجام شد. شناسه ثبت‌نام: <code className="bg-slate-100 px-2 py-1 rounded">{result.id}</code>
              </p>
              {(result.ok && result.groupLink) && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">برای ورود به گروه کارگاه روی دکمه زیر کلیک کنید:</p>
                  <a 
                    href={result.groupLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    ورود به گروه بله
                  </a>
                </div>
              )}
              <button 
                onClick={() => { setResult(null); setStep(1); setForm({firstName: '', nationalId: '', phone: '', workshopId: ''}); }}
                className="mt-4 px-4 py-2 bg-slate-600 text-white rounded-lg"
              >
                ثبت‌نام جدید
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-50" dir="rtl">
      <div className="max-w-2xl mx-auto">
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>
            1
          </div>
          <div className={`w-20 h-1 ${step >= 2 ? 'bg-emerald-600' : 'bg-slate-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>
            2
          </div>
        </div>

        {step === 1 && (
          <div className="bg-white shadow rounded-2xl p-6">
            <h1 className="text-2xl font-bold mb-6 text-center">ثبت‌نام در کارگاه</h1>
            <div className="space-y-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">نام و نام خانوادگی *</span>
                <input 
                  name="firstName" 
                  value={form.firstName} 
                  onChange={onChange}
                  className="border rounded-lg px-3 py-2 border-slate-300"
                  placeholder="نام کامل خود را وارد کنید"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">کد ملی (اختیاری)</span>
                <input 
                  name="nationalId" 
                  value={form.nationalId} 
                  onChange={onChange}
                  className="border rounded-lg px-3 py-2 border-slate-300 ltr"
                  placeholder="0123456789"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">شماره موبایل *</span>
                <input 
                  name="phone" 
                  value={form.phone} 
                  onChange={onChange}
                  className="border rounded-lg px-3 py-2 border-slate-300 ltr"
                  placeholder="09123456789"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-center">
              <button 
                onClick={nextStep}
                disabled={!form.firstName || !form.phone}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                مرحله بعد
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white shadow rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6 text-center">انتخاب کارگاه</h2>
            <div className="grid gap-4">
              {workshops.map(workshop => (
                <div 
                  key={workshop.id}
                  onClick={() => selectWorkshop(workshop.id)}
                  className={`border rounded-2xl p-4 cursor-pointer transition-all ${
                    form.workshopId === workshop.id 
                      ? 'border-emerald-400 bg-emerald-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{workshop.title}</h3>
                    <span className="text-emerald-600 font-bold">
                      {workshop.price.toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm">👨‍🏫 مربی: {workshop.coach}</p>
                  {form.workshopId === workshop.id && (
                    <div className="mt-2 flex items-center text-emerald-600 text-sm">
                      <span>✅ انتخاب شده</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-center gap-3">
              <button 
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg"
              >
                مرحله قبل
              </button>
              <button 
                onClick={submitRegistration}
                disabled={!form.workshopId || loading}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'در حال ثبت‌نام...' : 'تأیید ثبت‌نام'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
