import { useEffect, useState } from "react";
import { gw } from "../lib/gateway";

export default function WorkshopsAdmin(){
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ id:"", title:"", coach:"", price:0, baleLink:"" });
  const [msg, setMsg] = useState("");

  async function load(){ try{ setList(await gw.workshops()); }catch{} }
  useEffect(()=>{ load(); },[]);
  function onChange(e){ const {name,value} = e.target; setForm(f=>({...f,[name]: name==='price'? Number(value||0) : value})); }
  function edit(w){ setForm(w); }
  function clear(){ setForm({ id:"", title:"", coach:"", price:0, baleLink:"" }); }

  async function save(){
    setMsg("");
    try{
      const res = await gw.saveWorkshop(form);
      setMsg(res.ok ? "ذخیره شد ✅" : "خطا ❌");
      clear(); await load();
    }catch{ setMsg("خطا در ذخیره ❌"); }
  }

  return (
    <div className="bg-white shadow rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-bold">مدیریت کارگاه‌ها</h2>

      <div className="grid sm:grid-cols-2 gap-3">
        <input name="title" value={form.title} onChange={onChange} placeholder="عنوان کارگاه"
               className="border rounded-lg px-3 py-2 border-slate-300"/>
        <input name="coach" value={form.coach} onChange={onChange} placeholder="نام مربی"
               className="border rounded-lg px-3 py-2 border-slate-300"/>
        <input name="price" value={form.price} onChange={onChange} placeholder="قیمت (تومان)"
               className="border rounded-lg px-3 py-2 border-slate-300 ltr"/>
        <input name="baleLink" value={form.baleLink} onChange={onChange} placeholder="لینک گروه بله"
               className="border rounded-lg px-3 py-2 border-slate-300 ltr"/>
      </div>

      <div className="flex gap-3">
        <button onClick={save} className="px-4 py-2 rounded-lg bg-emerald-600 text-white">ذخیره</button>
        <button onClick={clear} className="px-4 py-2 rounded-lg bg-slate-200">جدید</button>
        {msg && <span className="text-slate-700">{msg}</span>}
      </div>

      <div className="border-t pt-3">
        <div className="grid gap-2">
          {list.map(w=>(
            <div key={w.id} className="flex items-center justify-between border rounded-lg p-3">
              <div className="space-y-0.5">
                <div className="font-medium">{w.title}</div>
                <div className="text-sm text-slate-600">مربی: {w.coach} • قیمت: {w.price?.toLocaleString()} تومان</div>
              </div>
              <div className="flex gap-2">
                {w.baleLink && <a className="px-3 py-1 rounded bg-slate-100" href={w.baleLink} target="_blank">گروه</a>}
                <button className="px-3 py-1 rounded bg-amber-100" onClick={()=>edit(w)}>ویرایش</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
