import { useState } from "react";

const isIranMobile = (p) => /^09\d{9}$/.test(p);

export default function App() {
  const [form, setForm] = useState({ firstName: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState("");

  function onChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(err => ({ ...err, [e.target.name]: undefined }));
  }

  function submit(e) {
    e.preventDefault();
    const eObj = {};
    if (!form.firstName.trim()) eObj.firstName = "نام (یا نام خانوادگی) را وارد کنید";
    if (!isIranMobile(form.phone)) eObj.phone = "شماره موبایل ایران مثل 09123456789";
    setErrors(eObj);
    if (Object.keys(eObj).length === 0) {
      setMsg("ثبت موقتی انجام شد ✅ (بعداً به ربات بله وصل می‌کنیم)");
      setForm({ firstName: "", phone: "" });
    } else {
      setMsg("");
    }
  }

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white shadow-xl rounded-2xl p-5 space-y-4 border border-gray-100">
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
  );
}