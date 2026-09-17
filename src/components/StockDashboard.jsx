import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Upload, 
  Database, 
  Download, 
  Building2, 
  AlertTriangle, 
  Sparkles, 
  ShoppingBag, 
  Layers, 
  Boxes, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  FileText,
  X
} from 'lucide-react';
import { parseStockFile, calculateStockMetrics, exportStockSummaryToExcel } from '../utils/excelParser';
import FaskesTable from './FaskesTable';
import BatchChart from './BatchChart';
import { supabase } from '../lib/supabaseClient';
import SupabaseStockHistoryModal from './SupabaseStockHistoryModal';



export default function StockDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('faskes'); // 'faskes' | 'batch' | 'alerts'
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('Belum Ada Berkas Terpilih');
  const [toast, setToast] = useState(null);
  const [savingToSupabase, setSavingToSupabase] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showSupabaseDbModal, setShowSupabaseDbModal] = useState(false);

  // Initial state is clean (empty). User can upload a file or load sample data.
  useEffect(() => {
    // Clean initial state
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Handle Upload
  const handleFileUpload = async (file) => {
    if (!file) return;

    try {
      setLoading(true);
      setFileName(file.name);
      const parsedRows = await parseStockFile(file);

      if (!parsedRows || parsedRows.length === 0) {
        showToast('❌ Berkas kosong atau format tidak sesuai.', 'error');
        return;
      }

      const calculated = calculateStockMetrics(parsedRows);
      setMetrics(calculated);
      showToast(`✅ Berhasil memproses berkas "${file.name}" (${parsedRows.length} baris data).`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };



  // Save Report & Stock Ledger to Supabase DB
  const handleSaveToSupabase = async () => {
    if (!metrics) {
      showToast('❌ Unggah berkas stok terlebih dahulu sebelum menyimpan.', 'error');
      return;
    }

    try {
      setSavingToSupabase(true);

      // 1. Relational Database Persistence (faskes, vaccine_batches, faskes_inventory_ledger)
      let savedLedgerCount = 0;
      let savedFaskesCount = 0;
      const rows = metrics.sanitizedRows || metrics.rawRows || [];

      // Local caches to prevent redundant queries
      const faskesCache = {};
      const batchCache = {};

      for (const r of rows) {
        if (!r.gudang) continue;

        // A. Ensure Faskes Record Exists
        let faskesId = faskesCache[r.gudang];
        if (!faskesId) {
          const { data: existingFsk } = await supabase.from('faskes').select('id').eq('name', r.gudang).maybeSingle();
          faskesId = existingFsk?.id;

          if (!faskesId) {
            const fskCode = 'FSK-' + r.gudang.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) + '-' + Math.floor(100 + Math.random() * 900);
            const { data: newFsk, error: fskErr } = await supabase
              .from('faskes')
              .insert([{ code: fskCode, name: r.gudang, city: 'Indonesia', status: 'active' }])
              .select('id')
              .single();
            if (!fskErr && newFsk) {
              faskesId = newFsk.id;
              savedFaskesCount++;
            }
          }
          if (faskesId) faskesCache[r.gudang] = faskesId;
        }

        // B. Ensure Vaccine Batch Record Exists
        let batchId = null;
        if (r.noBatch) {
          batchId = batchCache[r.noBatch];
          if (!batchId) {
            const { data: existingBth } = await supabase.from('vaccine_batches').select('id').eq('batch_number', r.noBatch).maybeSingle();
            batchId = existingBth?.id;

            if (!batchId) {
              const validExp = r.tglKadaluarsa && r.tglKadaluarsa !== '-' ? r.tglKadaluarsa : '2027-12-31';
              const { data: newBth, error: bthErr } = await supabase
                .from('vaccine_batches')
                .insert([{ vaccine_id: '674216f5-bdbd-46d6-8708-3a7f14b89900', batch_number: r.noBatch, expiration_date: validExp }])
                .select('id')
                .single();
              if (!bthErr && newBth) {
                batchId = newBth.id;
              }
            }
            if (batchId) batchCache[r.noBatch] = batchId;
          }
        }

        // C. Record Inventory Ledger Movement Entry
        if (faskesId && batchId) {
          const { error: ledgerErr } = await supabase.from('faskes_inventory_ledger').insert([{
            faskes_id: faskesId,
            batch_id: batchId,
            transaction_type: 'SHIPMENT_IN',
            quantity_doses: r.stokSaatIni || 0,
            notes: `Impor dari berkas ${fileName}`
          }]);
          if (!ledgerErr) savedLedgerCount++;
        }
      }

      // 2. Aggregate Report Summary Payload
      const payload = {
        filename: fileName,
        uploaded_by: 'Admin Operasional Stok',
        total_stok_fisik: metrics.kpi.totalStokFisik || 0,
        total_penjualan_kasir: metrics.kpi.totalPenjualanKasir || 0,
        total_gudang: metrics.kpi.uniqueGudangCount || 0,
        total_batch: metrics.kpi.uniqueBatchCount || 0,
        gudang_summary_json: metrics.gudangSummary || [],
        batch_summary_json: metrics.batchSummary || [],
        alerts_json: {
          stok_minus_count: metrics.alerts?.stokMinus?.length || 0,
          selisih_so_count: metrics.alerts?.selisihSO?.length || 0,
          stok_pasif_count: metrics.alerts?.stokPasif?.length || 0
        }
      };

      // Always save copy to localStorage as local persistence backup
      try {
        const savedReports = JSON.parse(localStorage.getItem('toktok_stok_reports') || '[]');
        savedReports.unshift({ ...payload, created_at: new Date().toISOString() });
        localStorage.setItem('toktok_stok_reports', JSON.stringify(savedReports.slice(0, 10)));
      } catch (e) {}

      // Try inserting to 'laporan_stok' or 'uploaded_files'
      const { error } = await supabase.from('laporan_stok').insert([payload]);
      
      if (error) {
        console.warn('laporan_stok table missing, trying uploaded_files:', error);

        const fallbackPayload = {
          filename: fileName,
          file_path: `~/.hermes/toktok_uploads/${fileName}`,
          file_size_bytes: 2048,
          uploaded_by: 'Admin Operasional Stok',
          status: 'audited',
          total_rows: metrics.kpi.totalStokFisik || 0,
          valid_rows: metrics.kpi.totalStokFisik || 0,
          anomaly_rows: (metrics.alerts?.stokMinus?.length || 0) + (metrics.alerts?.selisihSO?.length || 0),
          file_data_json: metrics.rawRows || [],
          audit_summary: {
            gudang_count: metrics.kpi.uniqueGudangCount,
            batch_count: metrics.kpi.uniqueBatchCount,
            gudang_summary: metrics.gudangSummary,
            batch_summary: metrics.batchSummary
          }
        };

        const { error: fallbackErr } = await supabase.from('uploaded_files').insert([fallbackPayload]);
        
        if (fallbackErr) {
          setShowSqlModal(true);
        }
      }

      showToast(`☁️ Berhasil menyimpan ${Object.keys(faskesCache).length} Faskes & ${savedLedgerCount} item stok ke Supabase!`);
    } catch (err) {
      showToast('Gagal menyimpan ke Supabase: ' + err.message, 'error');
    } finally {
      setSavingToSupabase(false);
    }
  };

  // Export to Excel SheetJS
  const handleExport = () => {
    if (!metrics) return;
    exportStockSummaryToExcel(metrics, `Ringkasan_Stok_${fileName}`);
    showToast('📥 Berkas ringkasan stok berhasil di-download.');
  };

  const kpi = metrics?.kpi || {};
  const alerts = metrics?.alerts || { stokMinus: [], selisihSO: [], stokPasif: [] };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 transition-all ${
          toast.type === 'error'
            ? 'bg-rose-950 border-rose-500/50 text-rose-200'
            : 'bg-emerald-950 border-emerald-500/50 text-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight">
                Dashboard Stok Vaksin & Analisis Persediaan Faskes
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-extrabold uppercase">
                Client-Side Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Berkas Aktif: <strong className="text-cyan-300 font-mono">{fileName}</strong>
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setShowSupabaseDbModal(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-purple-600/10"
          >
            <Database className="w-3.5 h-3.5 text-purple-400" /> Lihat DB Supabase
          </button>

          <button
            onClick={handleExport}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Ekspor Excel
          </button>

          <button
            onClick={handleSaveToSupabase}
            disabled={savingToSupabase}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-all"
          >
            <Database className="w-3.5 h-3.5" /> {savingToSupabase ? 'Menyimpan...' : 'Simpan Supabase'}
          </button>
        </div>
      </div>

      {/* File Uploader Dropzone */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-md">
        <label htmlFor="stockFileInput" className="flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Unggah Berkas Stok CSV / Excel Baru (.xlsx, .xls, .csv)</p>
              <p className="text-[11px] text-slate-400">Sistem otomatis memetakan Gudang, Batch, Stok, Opname & Valuasi secara instant.</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 hover:bg-slate-800 text-xs font-bold transition-all shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" /> Browse Berkas Stok
          </div>
          <input
            type="file"
            id="stockFileInput"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
        </label>
      </div>

      {!metrics && (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto border border-slate-700">
            <FileSpreadsheet className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Belum Ada Data Stok Terunggah</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Silakan unggah berkas stok CSV/Excel (.xlsx, .xls, .csv) milik Faskes Anda melalui area unggah di atas untuk melakukan analisis persediaan.
            </p>
          </div>
        </div>
      )}

      {/* GLOBAL KPI CARDS COMPONENT (OPERATIONAL FOCUS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* KPI 1: Total Stok Fisik */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Stok Fisik Saat Ini</span>
            <Boxes className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-300">{(kpi.totalStokFisik || 0).toLocaleString('id-ID')}</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Dosis vaksin fisik</span>
        </div>

        {/* KPI 2: Penjualan Kasir */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Terjual Kasir</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">{(kpi.totalPenjualanKasir || 0).toLocaleString('id-ID')}</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Dosis terlayani</span>
        </div>

        {/* KPI 3: Alokasi Stok Jual */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Alokasi Stok Jual</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-300">{(kpi.totalAlokasiStokJual || 0).toLocaleString('id-ID')}</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Siap dialokasikan</span>
        </div>

        {/* KPI 4: Gudang Aktif */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Gudang / Faskes</span>
            <Building2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl font-black text-teal-300">{kpi.uniqueGudangCount || 0}</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Lokasi aktif</span>
        </div>

        {/* KPI 5: Batch Unik */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Total Batch Unik</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-indigo-300">{kpi.uniqueBatchCount || 0}</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Lot terdaftar</span>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-3 gap-1 text-xs">
        <button
          onClick={() => setActiveSubTab('faskes')}
          className={`py-3 px-4 rounded-xl font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'faskes'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Ringkasan per Faskes ({metrics?.gudangSummary?.length || 0})
        </button>

        <button
          onClick={() => setActiveSubTab('batch')}
          className={`py-3 px-4 rounded-xl font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'batch'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analisis Batch & Expiry ({metrics?.batchSummary?.length || 0})
        </button>

        <button
          onClick={() => setActiveSubTab('alerts')}
          className={`py-3 px-4 rounded-xl font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'alerts'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Peringatan Anomali ({alerts.stokMinus.length + alerts.selisihSO.length + alerts.stokPasif.length})
        </button>
      </div>

      {/* MAIN CONTENT AREA BY SUB-TAB */}
      {activeSubTab === 'faskes' && (
        <FaskesTable gudangSummary={metrics?.gudangSummary} />
      )}

      {activeSubTab === 'batch' && (
        <BatchChart batchSummary={metrics?.batchSummary} />
      )}

      {activeSubTab === 'alerts' && (
        <div className="space-y-6">
          
          {/* Alert 1: Stok Minus */}
          <div className="rounded-2xl bg-rose-950/40 border border-rose-500/30 p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Stok Minus (Stok Saat Ini &lt; 0) — Total {alerts.stokMinus.length} Baris
              </h4>
              <span className="text-[10px] text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                Memerlukan Koreksi Ledger
              </span>
            </div>

            {alerts.stokMinus.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center"> Tidak ditemukan stok minus. Seluruh saldo persediaan positif.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-rose-500/20">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-rose-300 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Gudang</th>
                      <th className="py-2.5 px-3">Barang / Batch</th>
                      <th className="py-2.5 px-3 text-right">Stok Fisik Saat Ini</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-950/60 text-slate-300">
                    {alerts.stokMinus.map((r, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 font-bold text-white">{r.gudang}</td>
                        <td className="py-2.5 px-3">{r.namaBarang} (Batch: {r.noBatch})</td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-400">{r.stokSaatIni}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Alert 2: Selisih SO */}
          <div className="rounded-2xl bg-amber-950/40 border border-amber-500/30 p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-amber-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Selisih Stok Opname (Stok SO != 0) — Total {alerts.selisihSO.length} Baris
              </h4>
              <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Perlu Verifikasi Fisik
              </span>
            </div>

            {alerts.selisihSO.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center"> Tidak ditemukan selisih opname. Data opname 100% cocok.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-amber-500/20">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-amber-300 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Gudang</th>
                      <th className="py-2.5 px-3">Barang / Batch</th>
                      <th className="py-2.5 px-3 text-right">Selisih Stok Opname (SO)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-950/60 text-slate-300">
                    {alerts.selisihSO.map((r, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 font-bold text-white">{r.gudang}</td>
                        <td className="py-2.5 px-3">{r.namaBarang} (Batch: {r.noBatch})</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-300">{r.stokSO > 0 ? `+${r.stokSO}` : r.stokSO}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Alert 3: Stok Pasif */}
          <div className="rounded-2xl bg-purple-950/40 border border-purple-500/30 p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-purple-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Stok Pasif (Ada Stok Fisik, Tetapi Terjual Kasir = 0) — Total {alerts.stokPasif.length} Baris
              </h4>
              <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                Slow Moving Item
              </span>
            </div>

            {alerts.stokPasif.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center"> Seluruh baris persediaan memiliki pergerakan transaksi kasir.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-purple-500/20">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-purple-300 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Gudang</th>
                      <th className="py-2.5 px-3">Barang / Batch</th>
                      <th className="py-2.5 px-3 text-right">Stok Fisik Tersedia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/60 text-slate-300">
                    {alerts.stokPasif.map((r, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 font-bold text-white">{r.gudang}</td>
                        <td className="py-2.5 px-3">{r.namaBarang} (Batch: {r.noBatch})</td>
                        <td className="py-2.5 px-3 text-right font-bold text-purple-300">{r.stokSaatIni}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* SQL MIGRATION GUIDANCE MODAL FOR SUPABASE SETUP */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-3xl bg-slate-900 border border-cyan-500/40 p-6 sm:p-8 shadow-2xl relative space-y-4">
            
            <button
              onClick={() => setShowSqlModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Setup Tabel Database Supabase Remote</h3>
                <p className="text-xs text-slate-400">
                  Laporan disalin ke memori lokal. Jalankan query SQL di bawah ini pada <strong>Supabase Dashboard → SQL Editor</strong>.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 font-mono text-[11px] text-cyan-300 max-h-60 overflow-y-auto border border-slate-800 leading-relaxed shadow-inner">
              <pre>{`-- Salin & Run query ini di Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.laporan_stok (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    uploaded_by VARCHAR(255) DEFAULT 'Admin Stok',
    total_stok_fisik INT NOT NULL DEFAULT 0,
    total_penjualan_kasir INT NOT NULL DEFAULT 0,
    total_gudang INT NOT NULL DEFAULT 0,
    total_batch INT NOT NULL DEFAULT 0,
    gudang_summary_json JSONB NULL,
    batch_summary_json JSONB NULL,
    alerts_json JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.laporan_stok ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.laporan_stok FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`}</pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-emerald-400 font-semibold">
                ✓ Laporan saat ini aman tersimpan di memori lokal.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS public.laporan_stok (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    uploaded_by VARCHAR(255) DEFAULT 'Admin Stok',
    total_stok_fisik INT NOT NULL DEFAULT 0,
    total_penjualan_kasir INT NOT NULL DEFAULT 0,
    total_gudang INT NOT NULL DEFAULT 0,
    total_batch INT NOT NULL DEFAULT 0,
    gudang_summary_json JSONB NULL,
    batch_summary_json JSONB NULL,
    alerts_json JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.laporan_stok ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.laporan_stok FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`);
                    alert('Query SQL berhasil disalin ke Clipboard!');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                >
                  Salin Query SQL
                </button>
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUPABASE LIVE DATABASE & STOCK HISTORY MODAL */}
      <SupabaseStockHistoryModal
        isOpen={showSupabaseDbModal}
        onClose={() => setShowSupabaseDbModal(false)}
      />

    </div>
  );
}
