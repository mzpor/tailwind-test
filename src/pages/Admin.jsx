import { useMemo } from "react";

function toCSV(rows){
  const head = Object.keys(rows[0]).join(',');
  const body = rows.map(r=>Object.values(r).join(',')).join('\n');
  return head+'\n'+body;
}

export default function Admin(){
  const rows = useMemo(()=>[
    { name:'علی رضایی', phone:'09120000000', status:'paid' },
    { name:'سارا محمدی', phone:'09121111111', status:'pending' },
    { name:'حسین احمدی', phone:'09123333333', status:'paid' },
  ],[]);

  function exportCSV(){
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'enrollments.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">پنل مدیر (نمونه)</h1>
          <button onClick={exportCSV} className="px-4 py-2 rounded-lg bg-emerald-600 text-white">Export CSV</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-slate-600">
              <th className="py-2">نام</th>
              <th className="py-2">موبایل</th>
              <th className="py-2">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} className="border-t">
                <td className="py-2">{r.name}</td>
                <td className="py-2 ltr">{r.phone}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 rounded ${r.status==='paid'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
