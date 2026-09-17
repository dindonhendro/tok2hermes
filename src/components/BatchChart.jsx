import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { AlertOctagon, CheckCircle2, Clock, Calendar } from 'lucide-react';

export default function BatchChart({ batchSummary }) {
  if (!batchSummary || batchSummary.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 text-xs">
        Belum ada data batch untuk divisualisasikan.
      </div>
    );
  }

  // 1. Data for Bar Chart (Top 10 Batches by Stock)
  const sortedBatchForBar = [...batchSummary]
    .sort((a, b) => b.totalStok - a.totalStok)
    .slice(0, 10)
    .map((b) => ({
      name: b.noBatch,
      stok: b.totalStok,
      jual: b.totalStokJual
    }));

  // 2. Data for Donut Chart Expiry Breakdown
  const expiredCount = batchSummary.filter((b) => b.status === 'EXPIRED').length;
  const nearExpiryCount = batchSummary.filter((b) => b.status === 'NEAR_EXPIRY').length;
  const safeCount = batchSummary.filter((b) => b.status === 'SAFE').length;

  const pieData = [
    { name: '🔴 Expired', value: expiredCount, color: '#f43f5e' },
    { name: '🟡 Near Expiry (<6 Bln)', value: nearExpiryCount, color: '#f59e0b' },
    { name: '🟢 Safe (>6 Bln)', value: safeCount, color: '#10b981' }
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart: Stok per Batch */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Distribusi Stok Fisik per Nomor Batch (Top 10 Batch)
            </h4>
            <span className="text-[10px] text-slate-400">Satuan: Dosis</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedBatchForBar} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} angle={-25} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Bar dataKey="stok" fill="#38bdf8" radius={[6, 6, 0, 0]} name="Stok Fisik Saat Ini" />
                <Bar dataKey="jual" fill="#10b981" radius={[6, 6, 0, 0]} name="Stok Alokasi Jual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Expiry Status */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-3 flex flex-col justify-between">
          <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Proporsi Status Kedaluwarsa
          </h4>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-800">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-[10px] text-rose-400 block font-bold">Expired</span>
              <strong className="text-rose-300 text-sm">{expiredCount}</strong>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[10px] text-amber-400 block font-bold">&lt; 6 Bulan</span>
              <strong className="text-amber-300 text-sm">{nearExpiryCount}</strong>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-400 block font-bold">Aman (&gt;6B)</span>
              <strong className="text-emerald-300 text-sm">{safeCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Table List */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-3">
        <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          Rincian Seluruh Batch & Tanggal Kedaluwarsa ({batchSummary.length} Batch)
        </h4>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-cyan-300 font-semibold border-b border-slate-800 uppercase">
              <tr>
                <th className="py-3 px-4">No. Batch</th>
                <th className="py-3 px-4">Nama Vaksin / Barang</th>
                <th className="py-3 px-4">Tanggal Kadaluarsa</th>
                <th className="py-3 px-4 text-right">Stok Fisik Saat Ini</th>
                <th className="py-3 px-4 text-right">Stok Alokasi Jual</th>
                <th className="py-3 px-4 text-center">Status Kedaluwarsa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {batchSummary.map((b, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-all">
                  <td className="py-3 px-4 font-mono font-bold text-amber-300">{b.noBatch}</td>
                  <td className="py-3 px-4 font-bold text-white">{b.namaBarang}</td>
                  <td className="py-3 px-4 font-mono text-slate-200">{b.tglKadaluarsa}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-cyan-300">{b.totalStok.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-300">{b.totalStokJual.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 text-center">
                    {b.status === 'EXPIRED' ? (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-extrabold inline-flex items-center gap-1">
                        🔴 Expired
                      </span>
                    ) : b.status === 'NEAR_EXPIRY' ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold inline-flex items-center gap-1">
                        🟡 Near Expiry (&lt; 6 Bln)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-extrabold inline-flex items-center gap-1">
                        🟢 Safe (&gt; 6 Bln)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
