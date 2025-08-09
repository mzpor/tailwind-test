export default function Home(){
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">مدرسه تلاوت</h1>
        <p className="text-slate-600">به سایت خوش آمدید</p>
        <div className="flex gap-3 justify-center">
          <a className="px-4 py-2 rounded-lg bg-emerald-600 text-white" href="/register">ثبت‌نام</a>
          <a className="px-4 py-2 rounded-lg bg-slate-200" href="/admin">پنل مدیر</a>
        </div>
        
        {/* دکمه شیشه‌ای گروه گزارش */}
        <div className="mt-4">
          <a 
            href="https://ble.ir/reportgroup" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/30 text-slate-700 hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m-2-4h4m-4 0l-3-3m3 3l-3 3M9 12H4m5 0L6 9m3 3l-3 3" />
            </svg>
            گروه گزارش
          </a>
        </div>
      </div>
    </div>
  );
}
