import { useEffect, useState } from "react";
import { gw } from "../lib/gateway";

export default function WorkshopManager() {
  const [workshops, setWorkshops] = useState([]);
  const [form, setForm] = useState({
    id: '',
    title: '',
    coach: '',
    phone: '',
    price: '',
    baleLink: ''
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadWorkshops();
  }, []);

  async function loadWorkshops() {
    try {
      const data = await gw.workshops();
      setWorkshops(data);
    } catch (error) {
      console.error('خطا در لود کردن کارگاه‌ها:', error);
    }
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm(f => ({
      ...f, 
      [name]: name === 'price' ? (value ? Number(value) : '') : value
    }));
  }

  function startEdit(workshop) {
    setForm(workshop);
    setEditing(true);
  }

  function cancelEdit() {
    setForm({ id: '', title: '', coach: '', phone: '', price: '', baleLink: '' });
    setEditing(false);
  }

  async function saveWorkshop() {
    if (!form.title || !form.coach || !form.price || !form.baleLink) {
      setMsg('لطفاً همه فیلدها را پر کنید');
      return;
    }

    setSaving(true);
    setMsg("");
    
    try {
      const workshopData = {
        ...form,
        id: form.id || `w-${Date.now()}`,
        price: Number(form.price)
      };
      
      await gw.saveWorkshop(workshopData);
      await loadWorkshops();
      cancelEdit();
      setMsg('کارگاه با موفقیت ذخیره شد ✅');
    } catch (error) {
      console.error('خطا در ذخیره کارگاه:', error);
      setMsg('خطا در ذخیره کارگاه ❌');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white shadow rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-bold">مدیریت کارگاه‌ها</h2>
      
      {/* فرم افزودن/ویرایش */}
      <div className="border rounded-lg p-4 bg-slate-50">
        <h3 className="font-semibold mb-3">
          {editing ? 'ویرایش کارگاه' : 'افزودن کارگاه جدید'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">عنوان کارگاه</span>
            <input 
              name="title" 
              value={form.title} 
              onChange={onChange}
              className="border rounded-lg px-3 py-2 border-slate-300"
              placeholder="نام کارگاه"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">نام مربی</span>
            <input 
              name="coach" 
              value={form.coach} 
              onChange={onChange}
              className="border rounded-lg px-3 py-2 border-slate-300"
              placeholder="نام مربی"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">تلفن مربی (اختیاری)</span>
            <input 
              name="phone" 
              value={form.phone} 
              onChange={onChange}
              className="border rounded-lg px-3 py-2 border-slate-300 ltr"
              placeholder="09123456789"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">قیمت (تومان)</span>
            <input 
              name="price" 
              type="number"
              value={form.price} 
              onChange={onChange}
              className="border rounded-lg px-3 py-2 border-slate-300 ltr"
              placeholder="120000"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">لینک گروه بله</span>
            <input 
              name="baleLink" 
              value={form.baleLink} 
              onChange={onChange}
              className="border rounded-lg px-3 py-2 border-slate-300 ltr"
              placeholder="https://ble.im/join/..."
            />
          </label>
        </div>
        <div className="flex gap-3 mt-4">
          <button 
            onClick={saveWorkshop} 
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
          >
            {saving ? 'در حال ذخیره...' : (editing ? 'به‌روزرسانی' : 'افزودن کارگاه')}
          </button>
          {editing && (
            <button 
              onClick={cancelEdit}
              className="px-4 py-2 rounded-lg bg-slate-600 text-white"
            >
              انصراف
            </button>
          )}
          {msg && <span className="text-slate-700 self-center">{msg}</span>}
        </div>
      </div>

      {/* لیست کارگاه‌ها */}
      <div className="space-y-3">
        <h3 className="font-semibold">کارگاه‌های موجود</h3>
        {workshops.length === 0 ? (
          <p className="text-slate-500 text-center py-4">هیچ کارگاهی ثبت نشده است</p>
        ) : (
          <div className="grid gap-3">
            {workshops.map(workshop => (
              <div key={workshop.id} className="border rounded-lg p-4 flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold">{workshop.title}</h4>
                  <p className="text-sm text-slate-600">👨‍🏫 {workshop.coach}</p>
                  {workshop.phone && (
                    <p className="text-sm text-slate-600">📱 {workshop.phone}</p>
                  )}
                  <p className="text-sm text-slate-600">💰 {workshop.price.toLocaleString('fa-IR')} تومان</p>
                  <p className="text-xs text-slate-500 ltr">🔗 {workshop.baleLink}</p>
                </div>
                <button 
                  onClick={() => startEdit(workshop)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  ویرایش
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
