import { useEffect, useState } from "react";
import { gw } from "../lib/gateway";

export default function SettingsForm(){
  const [form, setForm] = useState({ schoolName:'', registrationOpen:true, maxStudents:100, adminMessage:'' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(()=>{ gw.getSettings().then(setForm).catch(()=>{}); },[]);
  function onChange(e){
    const { name, value, type, checked } = e.target;
    setForm(f=>({...f, [name]: type==='checkbox'? checked : (name==='maxStudents'? Number(value||0) : value)}));
  }
  async function save(){
    setSaving(true); setMsg("");
    try{
      const res = await gw.setSettings(form);
      setMsg(res?.message || 'ذخیره شد ✅');
    }catch{ setMsg('ذخیره ناموفق ❌'); }
    finally{ setSaving(false); }
  }

  return (
    <div className="bg-white shadow rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-bold">تنظیمات مدرسه</h2>
      <div className="grid gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">نام مدرسه</span>
          <input name="schoolName" value={form.schoolName} onChange={onChange}
                 className="border rounded-lg px-3 py-2 border-slate-300"/>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="registrationOpen" checked={form.registrationOpen} onChange={onChange}/>
          <span>ثبت‌نام باز باشد</span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">حداکثر دانش‌آموز</span>
          <input name="maxStudents" value={form.maxStudents} onChange={onChange}
                 className="border rounded-lg px-3 py-2 border-slate-300 ltr"/>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">پیام مدیر</span>
          <textarea name="adminMessage" value={form.adminMessage} onChange={onChange}
                    className="border rounded-lg px-3 py-2 border-slate-300"/>
        </label>
      </div>
      <div className="flex gap-3">
        <button onClick={save} disabled={saving}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white">
          {saving? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </button>
        {msg && <span className="text-slate-700">{msg}</span>}
      </div>
    </div>
  );
}
