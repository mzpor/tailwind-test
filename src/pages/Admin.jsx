import { useMemo, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { gw } from "../lib/gateway";

// Import تابع getBaseUrl برای پورت پویا
async function getBaseUrl() {
  try {
    const response = await fetch('/src/lib/gateway-config.json');
    if (response.ok) {
      const config = await response.json();
      return config.gatewayUrl;
    }
  } catch (error) {
    // fallback
  }
  return import.meta.env.VITE_GATEWAY_BASE || "http://localhost:3002";
}
import SettingsForm from "../components/SettingsForm";
import WorkshopManager from "../components/WorkshopManager";
import WorkshopsAdmin from "../components/WorkshopsAdmin";

function toCSV(rows){
  const head = Object.keys(rows[0]).join(',');
  const body = rows.map(r=>Object.values(r).join(',')).join('\n');
  return head+'\n'+body;
}

export default function Admin(){
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('reports');
  const [reportsEnabled, setReportsEnabled] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [surveyEnabled, setSurveyEnabled] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [notification, setNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // checking, connected, manual
  const [lastSync, setLastSync] = useState(new Date());
  const [lastTimestamp, setLastTimestamp] = useState(0);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const eventSourceRef = useRef(null);
  const siteEventSourceRef = useRef(null);
  
  // State های جدید برای داشبورد جامعه ربات
  const [robotStatus, setRobotStatus] = useState({
    isOnline: false,
    lastPing: null,
    uptime: null,
    version: null,
    groups: [],
    members: []
  });
  const [siteStatus, setSiteStatus] = useState({
    isOnline: true,
    lastActivity: new Date(),
    visitors: 0,
    registrations: 0
  });
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // تشخیص tab فعال بر اساس URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/reports')) {
      setActiveTab('reports');
    } else if (path.includes('/settings')) {
      setActiveTab('settings');
    } else if (path.includes('/workshops')) {
      setActiveTab('workshops');
    } else if (path.includes('/robot-dashboard')) {
      setActiveTab('robot-dashboard');
    } else {
      setActiveTab('reports'); // پیش‌فرض
    }
  }, [location.pathname]);

  const rows = useMemo(()=>[
    { name:'علی رضایی', phone:'09120000000', status:'paid' },
    { name:'سارا محمدی', phone:'09121111111', status:'pending' },
    { name:'حسین احمدی', phone:'09123333333', status:'paid' },
  ],[]);

  // بارگذاری وضعیت گزارش‌ها (برای آپدیت دستی)
  const loadReportStatus = async (showLoading = false) => {
    if (showLoading) setIsManualRefreshing(true);
    
    try {
      const data = await gw.getReportStatus();
      updateReportStatus(data, false);
      
      // چک کردن heartbeat ربات (فقط در آپدیت دستی)
      if (showLoading && data.lastRobotPing) {
        const lastPing = new Date(data.lastRobotPing);
        const now = new Date();
        const diffMinutes = (now - lastPing) / (1000 * 60);
        
        if (diffMinutes <= 10) {
          // ربات آنلاین شده! بیا به SSE برو
          console.log('🎉 [MANUAL] Robot is back online, switching to SSE!');
          setConnectionStatus('connecting');
          setTimeout(() => startSSE(), 500);
          showNotification('🎉 ربات آنلاین شد! اتصال real-time برقرار شد', 'success');
        } else {
          showNotification('✅ وضعیت به‌روزرسانی شد', 'success');
        }
      } else if (showLoading) {
        showNotification('✅ وضعیت به‌روزرسانی شد', 'success');
      }
    } catch (error) {
      console.error('خطا در بارگذاری وضعیت گزارش‌ها:', error);
      if (showLoading) {
        showNotification('❌ خطا در به‌روزرسانی', 'error');
      }
    } finally {
      if (showLoading) setIsManualRefreshing(false);
    }
  };

  // آپدیت وضعیت گزارش‌ها
  const updateReportStatus = (data, showNotif = true) => {
    const wasEnabled = reportsEnabled;
    
    // فقط اگر timestamp تغییر کرده باشد، state را آپدیت کن
    if (data.lastUpdate && data.lastUpdate !== lastTimestamp) {
      setReportsEnabled(data.enabled);
      setLastTimestamp(data.lastUpdate);
      setLastSync(new Date());
      
      // اگر وضعیت تغییر کرده باشد و این اولین بار نیست، نوتیفیکیشن نشان بده
      if (showNotif && wasEnabled !== data.enabled && lastTimestamp > 0) {
        showNotification(
          `🔄 وضعیت گزارش‌ها از ${data.updatedFrom || 'ربات'} تغییر کرد: ${data.enabled ? '✅ فعال' : '❌ غیرفعال'}`,
          'info'
        );
      }
    }
  };

  // تشخیص وضعیت ربات و شروع اتصال مناسب
  const checkRobotAndConnect = async () => {
    console.log('🔍 [CONNECTION] Checking robot status...');
    setConnectionStatus('checking');
    
    try {
      // تست اتصال به ربات با پورت پویا
      const baseUrl = await getBaseUrl();
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        console.log('✅ [CONNECTION] Robot is online, starting SSE...');
        startSSE();
      } else {
        throw new Error('Robot not responding');
      }
    } catch (error) {
      console.log('⚠️ [CONNECTION] Robot is offline, switching to manual mode');
      setConnectionStatus('manual');
      showNotification('ربات غیرفعال است. برای به‌روزرسانی از دکمه آپدیت استفاده کنید.', 'info');
    }
  };

  // شروع SSE اتصال
  const startSSE = async () => {
    if (eventSourceRef.current) return;
    
    console.log('🔄 [SSE] Starting SSE connection...');
    setConnectionStatus('connecting');
    
    const baseUrl = await getBaseUrl();
    const eventSource = new EventSource(`${baseUrl}/api/report-events`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ [SSE] Connected successfully');
      setConnectionStatus('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 [SSE] Received update:', data);
        updateReportStatus(data, true);
      } catch (error) {
        console.error('❌ [SSE] Error parsing message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ [SSE] Connection error:', error);
      
      // بعد از 2 تلاش ناموفق، به حالت دستی برو
      const attempts = parseInt(eventSource.dataset?.attempts || '0') + 1;
      eventSource.dataset = { attempts: attempts.toString() };
      
      if (attempts > 2) {
        console.log('⚠️ [SSE] Max attempts reached, switching to manual mode');
        stopSSE();
        setConnectionStatus('manual');
        showNotification('اتصال به ربات قطع شد. برای به‌روزرسانی از دکمه آپدیت استفاده کنید.', 'info');
        return;
      }
      
      setConnectionStatus('checking');
      
      // اتصال مجدد بعد از 3 ثانیه
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          console.log(`🔄 [SSE] Attempting to reconnect... (${attempts}/2)`);
          startSSE();
        }
      }, 3000);
    };
  };

  // توقف SSE
  const stopSSE = () => {
    if (eventSourceRef.current) {
      console.log('🔌 [SSE] Closing connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  // بارگذاری وضعیت‌های ثبت‌نام و نظرسنجی
  const loadSiteStatuses = async () => {
    try {
      const [regStatus, surveyStatus] = await Promise.all([
        gw.getRegistrationStatus(),
        gw.getSurveyStatus()
      ]);
      setRegistrationEnabled(regStatus.enabled);
      setSurveyEnabled(surveyStatus.enabled);
    } catch (error) {
      console.error('خطا در بارگذاری وضعیت‌های سایت:', error);
    }
  };

  // شروع SSE برای رویدادهای سایت
  const startSiteSSE = async () => {
    if (siteEventSourceRef.current) return;
    
    try {
      const baseUrl = await getBaseUrl();
      const eventSource = new EventSource(`${baseUrl}/api/site-events`);
      siteEventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'registration') {
            setRegistrationEnabled(data.enabled);
            showNotification(
              `🔄 وضعیت ثبت‌نام از ${data.updatedFrom || 'ربات'} تغییر کرد: ${data.enabled ? '✅ فعال' : '❌ غیرفعال'}`,
              'info'
            );
          } else if (data.type === 'survey') {
            setSurveyEnabled(data.enabled);
            showNotification(
              `🔄 وضعیت نظرسنجی از ${data.updatedFrom || 'ربات'} تغییر کرد: ${data.enabled ? '✅ فعال' : '❌ غیرفعال'}`,
              'info'
            );
          }
        } catch (error) {
          console.error('❌ [SITE-SSE] Error parsing message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ [SITE-SSE] Connection error:', error);
        // اتصال مجدد بعد از 5 ثانیه
        setTimeout(() => {
          if (siteEventSourceRef.current?.readyState === EventSource.CLOSED) {
            startSiteSSE();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('❌ خطا در شروع Site SSE:', error);
    }
  };

  // توقف Site SSE
  const stopSiteSSE = () => {
    if (siteEventSourceRef.current) {
      siteEventSourceRef.current.close();
      siteEventSourceRef.current = null;
    }
  };

  useEffect(() => {
    loadReportStatus(); // بارگذاری اولیه
    loadSiteStatuses(); // بارگذاری وضعیت‌های سایت
    checkRobotAndConnect(); // تشخیص وضعیت ربات و اتصال مناسب
    startSiteSSE(); // شروع SSE برای رویدادهای سایت
    
    // بارگذاری اطلاعات جدید
    loadRobotStatus();
    loadSiteStatus();
    loadLogs();
    
    // اطلاع‌رسانی آنلاین شدن سایت
    announceSiteOnline();
    
    // cleanup در هنگام unmount
    return () => {
      stopSSE();
      stopSiteSSE();
      // اطلاع‌رسانی خاموشی سایت
      announceSiteOffline();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // تابع اطلاع‌رسانی آنلاین شدن سایت
  const announceSiteOnline = async () => {
    try {
      await gw.announceSiteOnline();
      console.log('✅ [SITE] Site online notification sent');
    } catch (error) {
      console.log('⚠️ [SITE] Could not send site online notification:', error);
    }
  };
  
  // تابع اطلاع‌رسانی خاموشی سایت
  const announceSiteOffline = async () => {
    try {
      await gw.announceSiteOffline();
      console.log('✅ [SITE] Site offline notification sent');
    } catch (error) {
      console.log('⚠️ [SITE] Could not send site offline notification:', error);
    }
  };

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

  async function toggleRegistration() {
    setToggling(true);
    try {
      const newStatus = !registrationEnabled;
      console.log(`🔄 [ADMIN] Toggling registration to: ${newStatus}`);
      
      const result = await gw.toggleRegistration(newStatus);
      console.log('✅ [ADMIN] Registration toggle response:', result);
      
      setRegistrationEnabled(newStatus);
      showNotification(
        `✅ ثبت‌نام ${newStatus ? 'فعال' : 'غیرفعال'} شد و پیام به گروه بله ارسال شد!`, 
        'success'
      );
    } catch (error) {
      console.error('❌ [ADMIN] خطا در تغییر وضعیت ثبت‌نام:', error);
      showNotification('❌ خطا در تغییر وضعیت ثبت‌نام', 'error');
    } finally {
      setToggling(false);
    }
  }

  async function toggleSurvey() {
    setToggling(true);
    try {
      const newStatus = !surveyEnabled;
      console.log(`🔄 [ADMIN] Toggling survey to: ${newStatus}`);
      
      const result = await gw.toggleSurvey(newStatus);
      console.log('✅ [ADMIN] Survey toggle response:', result);
      
      setSurveyEnabled(newStatus);
      showNotification(
        `✅ نظرسنجی ${newStatus ? 'فعال' : 'غیرفعال'} شد و پیام به گروه بله ارسال شد!`, 
        'success'
      );
    } catch (error) {
      console.error('❌ [ADMIN] خطا در تغییر وضعیت نظرسنجی:', error);
      showNotification('❌ خطا در تغییر وضعیت نظرسنجی', 'error');
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

  // بارگذاری وضعیت ربات
  const loadRobotStatus = async () => {
    try {
      const baseUrl = await getBaseUrl();
      const response = await fetch(`${baseUrl}/api/reports/combined`);
      if (response.ok) {
        const data = await response.json();
        setRobotStatus({
          isOnline: data.systemStatus?.robot || false,
          lastPing: data.lastRobotPing,
          uptime: data.systemStatus?.lastUpdate || null,
          version: data.systemStatus?.version || 'نامشخص',
          groups: data.groups || [],
          members: data.members || []
        });
      }
    } catch (error) {
      console.error('خطا در بارگذاری وضعیت ربات:', error);
    }
  };

  // بارگذاری لوگ‌ها
  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const baseUrl = await getBaseUrl();
      const response = await fetch(`${baseUrl}/api/logs`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        // اگر API لوگ‌ها موجود نبود، لوگ‌های نمونه نمایش بده
        setLogs([
          { timestamp: new Date().toISOString(), level: 'INFO', message: 'سیستم راه‌اندازی شد' },
          { timestamp: new Date(Date.now() - 60000).toISOString(), level: 'INFO', message: 'اتصال به ربات برقرار شد' },
          { timestamp: new Date(Date.now() - 120000).toISOString(), level: 'WARNING', message: 'ربات پاسخ نمی‌دهد' },
          { timestamp: new Date(Date.now() - 300000).toISOString(), level: 'ERROR', message: 'خطا در اتصال به سرور' }
        ]);
      }
    } catch (error) {
      console.error('خطا در بارگذاری لوگ‌ها:', error);
      // لوگ‌های نمونه در صورت خطا
      setLogs([
        { timestamp: new Date().toISOString(), level: 'ERROR', message: 'خطا در بارگذاری لوگ‌ها' },
        { timestamp: new Date(Date.now() - 60000).toISOString(), level: 'INFO', message: 'سیستم در حال اجرا است' }
      ]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // بارگذاری وضعیت سایت
  const loadSiteStatus = async () => {
    try {
      const baseUrl = await getBaseUrl();
      const response = await fetch(`${baseUrl}/api/site-status`);
      if (response.ok) {
        const data = await response.json();
        setSiteStatus({
          isOnline: data.isOnline || true,
          lastActivity: data.lastActivity || new Date(),
          visitors: data.visitors || 0,
          registrations: data.registrations || 0
        });
      }
    } catch (error) {
      console.error('خطا در بارگذاری وضعیت سایت:', error);
    }
  };

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
        
        {/* Navigation Tabs */}
        <div className="bg-white shadow rounded-2xl p-4">
          <div className="flex space-x-4 space-x-reverse">
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 گزارش‌ها
            </button>
            <button
              onClick={() => setActiveTab('robot-dashboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'robot-dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🤖 داشبورد ربات
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⚙️ تنظیمات
            </button>
            <button
              onClick={() => setActiveTab('workshops')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'workshops'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🎓 کارگاه‌ها
            </button>
          </div>
        </div>
        
        {/* محتوای Tab ها */}
        {activeTab === 'reports' && (
          <>
            {/* گزارش‌ها */}
            <div className="bg-white shadow rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold">وضعیت گزارش‌ها</h2>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-emerald-500' : 
                      connectionStatus === 'checking' || connectionStatus === 'connecting' ? 'bg-yellow-500' : 
                      connectionStatus === 'manual' ? 'bg-blue-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-xs text-slate-500">
                      {connectionStatus === 'connected' ? 'متصل (SSE)' : 
                       connectionStatus === 'connecting' ? 'در حال اتصال...' : 
                       connectionStatus === 'checking' ? 'بررسی وضعیت...' :
                       connectionStatus === 'manual' ? 'حالت دستی' : 'قطع شده'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* دکمه آپدیت دستی */}
                  <button 
                    onClick={() => {
                      if (connectionStatus === 'manual') {
                        loadReportStatus(true);
                      } else {
                        stopSSE();
                        checkRobotAndConnect();
                      }
                    }}
                    disabled={toggling || isManualRefreshing}
                    className={`px-3 py-2 rounded-lg text-slate-700 disabled:opacity-50 ${
                      connectionStatus === 'manual' ? 'bg-blue-200 hover:bg-blue-300' : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                    title={connectionStatus === 'manual' ? 'آپدیت دستی' : 'بررسی مجدد اتصال'}
                  >
                    {isManualRefreshing ? '⏳' : '🔄'}
                  </button>
                  {/* سه دکمه تنظیمات - به ترتیب: نظرسنجی، گزارش، ثبت‌نام */}
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={toggleSurvey} 
                      disabled={toggling}
                      className={`px-3 py-2 rounded-lg text-white text-sm ${
                        surveyEnabled 
                          ? 'bg-emerald-600 hover:bg-emerald-700' 
                          : 'bg-red-600 hover:bg-red-700'
                      } disabled:opacity-50`}
                    >
                      نظرسنجی {surveyEnabled ? '✅' : '❌'}
                    </button>
                    <button 
                      onClick={toggleReports} 
                      disabled={toggling}
                      className={`px-3 py-2 rounded-lg text-white text-sm ${
                        reportsEnabled 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-red-600 hover:bg-red-700'
                      } disabled:opacity-50`}
                    >
                      گزارش {reportsEnabled ? '✅' : '❌'}
                    </button>
                    <button 
                      onClick={toggleRegistration} 
                      disabled={toggling}
                      className={`px-3 py-2 rounded-lg text-white text-sm ${
                        registrationEnabled 
                          ? 'bg-purple-600 hover:bg-purple-700' 
                          : 'bg-red-600 hover:bg-red-700'
                      } disabled:opacity-50`}
                    >
                      ثبت‌نام {registrationEnabled ? '✅' : '❌'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  گزارش‌ها در حال حاضر {reportsEnabled ? '✅ فعال' : '❌ غیرفعال'} هستند
                </p>
                {connectionStatus === 'manual' && (
                  <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    💡 ربات غیرفعال است. برای به‌روزرسانی دکمه 🔄 را کلیک کنید
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  آخرین همگام‌سازی: {lastSync.toLocaleTimeString('fa-IR')}
                </p>
              </div>
            </div>

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
          </>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white shadow rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">تنظیمات مدرسه</h2>
            <SettingsForm />
          </div>
        )}

        {activeTab === 'robot-dashboard' && (
          <>
            {/* وضعیت ربات */}
            <div className="bg-white shadow rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">وضعیت ربات</h2>
                <button 
                  onClick={loadRobotStatus}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  🔄 بروزرسانی
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${robotStatus.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium">وضعیت ربات</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {robotStatus.isOnline ? '🟢 آنلاین' : '🔴 آفلاین'}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium mb-2">آخرین پینگ</div>
                  <p className="text-sm text-gray-600">
                    {robotStatus.lastPing ? new Date(robotStatus.lastPing).toLocaleString('fa-IR') : 'نامشخص'}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium mb-2">نسخه</div>
                  <p className="text-sm text-gray-600">{robotStatus.version}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium mb-2">تعداد گروه‌ها</div>
                  <p className="text-sm text-gray-600">{robotStatus.groups.length}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium mb-2">تعداد اعضا</div>
                  <p className="text-sm text-gray-600">{robotStatus.members.length}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium mb-2">آخرین بروزرسانی</div>
                  <p className="text-sm text-gray-600">
                    {robotStatus.uptime ? new Date(robotStatus.uptime).toLocaleString('fa-IR') : 'نامشخص'}
                  </p>
                </div>
              </div>
            </div>

            {/* وضعیت سایت */}
            <div className="bg-white shadow rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">وضعیت سایت</h2>
                <button 
                  onClick={loadSiteStatus}
                  className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                  🔄 بروزرسانی
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{siteStatus.visitors}</div>
                  <div className="text-sm text-gray-600">بازدیدکننده</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{siteStatus.registrations}</div>
                  <div className="text-sm text-gray-600">ثبت‌نام</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className={`text-2xl font-bold ${siteStatus.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {siteStatus.isOnline ? '🟢' : '🔴'}
                  </div>
                  <div className="text-sm text-gray-600">وضعیت سایت</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-gray-600">آخرین فعالیت</div>
                  <div className="text-xs text-gray-500">
                    {siteStatus.lastActivity.toLocaleString('fa-IR')}
                  </div>
                </div>
              </div>
            </div>

            {/* لوگ‌ها */}
            <div className="bg-white shadow rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">لوگ‌های سیستم</h2>
                <button 
                  onClick={loadLogs}
                  disabled={isLoadingLogs}
                  className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {isLoadingLogs ? '⏳' : '🔄'} بروزرسانی
                </button>
              </div>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">هیچ لوگی موجود نیست</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-2">
                      <span className="text-gray-400">[{new Date(log.timestamp).toLocaleString('fa-IR')}]</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        log.level === 'ERROR' ? 'bg-red-900 text-red-200' :
                        log.level === 'WARNING' ? 'bg-yellow-900 text-yellow-200' :
                        'bg-green-900 text-green-200'
                      }`}>
                        {log.level}
                      </span>
                      <span className="ml-2">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'workshops' && (
          <div className="bg-white shadow rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">مدیریت کارگاه‌ها</h2>
            <WorkshopsAdmin />
          </div>
        )}
      </div>
    </div>
  );
}
