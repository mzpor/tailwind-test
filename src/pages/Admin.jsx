import { useMemo, useEffect, useState, useRef } from "react";
import { gw } from "../lib/gateway";
import SettingsForm from "../components/SettingsForm";
import WorkshopManager from "../components/WorkshopManager";
import WorkshopsAdmin from "../components/WorkshopsAdmin";

function toCSV(rows){
  const head = Object.keys(rows[0]).join(',');
  const body = rows.map(r=>Object.values(r).join(',')).join('\n');
  return head+'\n'+body;
}

export default function Admin(){
  const [reportsEnabled, setReportsEnabled] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [notification, setNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [lastSync, setLastSync] = useState(new Date());
  const [lastTimestamp, setLastTimestamp] = useState(0);
  const pollingInterval = useRef(null);

  const rows = useMemo(()=>[
    { name:'علی رضایی', phone:'09120000000', status:'paid' },
    { name:'سارا محمدی', phone:'09121111111', status:'pending' },
    { name:'حسین احمدی', phone:'09123333333', status:'paid' },
  ],[]);

  // بارگذاری اولیه انلاین وضعیت گزارش‌ها
  const loadReportStatus = async () => {
    try {
      const data = await gw.getReportStatus();
      const wasEnabled = reportsEnabled;
      
      // فقط اگر timestamp تغییر کرده باشد، state را آپدیت کن
      if (data.lastUpdate && data.lastUpdate !== lastTimestamp) {
        setReportsEnabled(data.enabled);
        setLastTimestamp(data.lastUpdate);
        
        // اگر وضعیت تغییر کرده باشد و این اولین بار نیست، نوتیفیکیشن نشان بده
        if (wasEnabled !== data.enabled && lastTimestamp > 0) {
          showNotification(
            `🔄 وضعیت گزارش‌ها از ${data.updatedFrom || 'ربات'} تغییر کرد: ${data.enabled ? '✅ فعال' : '❌ غیرفعال'}`,
            'info'
          );
        }
      }
      
      setLastSync(new Date());
      setConnectionStatus('connected');
    } catch (error) {
      console.error('خطا در بارگذاری وضعیت گزارش‌ها:', error);
      setConnectionStatus('disconnected');
    }
  };

  // شروع polling برای همگام‌سازی
  const startPolling = () => {
    if (pollingInterval.current) return;
    
    pollingInterval.current = setInterval(() => {
      loadReportStatus();
    }, 3000); // هر 3 ثانیه چک کن
  };

  // توقف polling
  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  useEffect(() => {
    loadReportStatus();
    startPolling();
    
    // cleanup در هنگام unmount
    return () => {
      stopPolling();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function showNotification(message, type = 'success') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }

  async function toggleReports() {
    setToggling(true);
    try {
      const newStatus = !reportsEnabled;
      console.log(`🔄 [ADMIN] Toggling reports to: ${newStatus}`);
      
      const result = await gw.toggleReports(newStatus);
      console.log('✅ [ADMIN] Toggle response:', result);
      
      setReportsEnabled(newStatus);
      setLastTimestamp(Date.now()); // آپدیت timestamp برای جلوگیری از نوتیفیکیشن اضافی
      showNotification(
        `✅ گزارش‌ها ${newStatus ? 'فعال' : 'غیرفعال'} شدند و پیام به گروه بله ارسال شد!`, 
        'success'
      );
      
      // همگام‌سازی فوری برای اطمینان
      setTimeout(() => loadReportStatus(), 1000);
    } catch (error) {
      console.error('❌ [ADMIN] خطا در تغییر وضعیت گزارش‌ها:', error);
      showNotification('❌ خطا در تغییر وضعیت گزارش‌ها', 'error');
    } finally {
      setToggling(false);
    }
  }

  function exportCSV(){
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'enrollments.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen p-6 bg-slate-50" dir="rtl">
      {/* اعلان */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
          notification.type === 'success' ? 'bg-emerald-600' : 
          notification.type === 'error' ? 'bg-red-600' : 
          notification.type === 'info' ? 'bg-blue-600' : 'bg-gray-600'
        }`}>
          {notification.message}
        </div>
      )}
      
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* گزارش‌ها */}
        <div className="bg-white shadow rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold">وضعیت گزارش‌ها</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-slate-500">
                  {connectionStatus === 'connected' ? 'متصل' : 'قطع شده'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={loadReportStatus}
                disabled={toggling}
                className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 disabled:opacity-50"
                title="همگام‌سازی دستی"
              >
                🔄
              </button>
              <button 
                onClick={toggleReports} 
                disabled={toggling}
                className={`px-4 py-2 rounded-lg text-white ${
                  reportsEnabled 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {toggling ? 'در حال تغییر...' : (reportsEnabled ? 'غیرفعال کردن گزارش‌ها' : 'فعال کردن گزارش‌ها')}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              گزارش‌ها در حال حاضر {reportsEnabled ? '✅ فعال' : '❌ غیرفعال'} هستند
            </p>
            <p className="text-xs text-slate-400">
              آخرین همگام‌سازی: {lastSync.toLocaleTimeString('fa-IR')}
            </p>
          </div>
        </div>

        {/* تنظیمات مدرسه */}
        <SettingsForm />

        {/* مدیریت کارگاه‌ها */}
        <WorkshopsAdmin />

        {/* جدول دانش‌آموزان */}
        <div className="bg-white shadow rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">لیست دانش‌آموزان</h1>
            <button onClick={exportCSV} className="px-4 py-2 rounded-lg bg-emerald-600 text-white">
              خروجی CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-slate-600 border-b">
                  <th className="py-3 px-2">نام</th>
                  <th className="py-3 px-2">موبایل</th>
                  <th className="py-3 px-2">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-2">{r.name}</td>
                    <td className="py-3 px-2 ltr">{r.phone}</td>
                    <td className="py-3 px-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        r.status==='paid'
                          ?'bg-emerald-100 text-emerald-700'
                          :'bg-amber-100 text-amber-700'
                      }`}>
                        {r.status === 'paid' ? 'پرداخت شده' : 'در انتظار پرداخت'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
