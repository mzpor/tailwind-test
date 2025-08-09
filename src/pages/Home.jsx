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
      </div>
    </div>
  );
}
