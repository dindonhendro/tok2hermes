import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Database, 
  Search, 
  RefreshCw, 
  X, 
  Clock, 
  Boxes, 
  FileText, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  Layers,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function SupabaseStockHistoryModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [faskesGrouped, setFaskesGrouped] = useState([]);
  const [selectedFaskes, setSelectedFaskes] = useState(null);
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' | 'history'

  const fetchSupabaseData = async () => {
    try {
      setLoading(true);

      // Fetch Faskes, Ledger, and Batches
      const { data: ledgerData, error: ledgerErr } = await supabase
        .from('faskes_inventory_ledger')
        .select(`
          id,
          transaction_type,
          quantity_doses,
          notes,
          created_at,
          faskes:faskes_id ( id, name, code, city, status ),
          vaccine_batches:batch_id ( id, batch_number, expiration_date )
        `)
        .order('created_at', { ascending: false });

      if (ledgerErr) throw ledgerErr;

      // Also fetch all Faskes even if they don't have ledger entries yet
      const { data: allFaskes, error: fskErr } = await supabase
        .from('faskes')
        .select('*')
        .order('name', { ascending: true });

      if (fskErr) throw fskErr;

      // Group ledger by Faskes
      const map = {};

      (allFaskes || []).forEach(f => {
        map[f.id] = {
          faskes: f,
          totalStok: 0,
          batchesMap: {},
          history: []
        };
      });

      (ledgerData || []).forEach(item => {
        const fskId = item.faskes?.id;
        if (!fskId) return;

        if (!map[fskId]) {
          map[fskId] = {
            faskes: item.faskes,
            totalStok: 0,
            batchesMap: {},
            history: []
          };
        }

        const g = map[fskId];
        g.totalStok += item.quantity_doses || 0;
        g.history.push(item);

        const bthNumber = item.vaccine_batches?.batch_number || 'UNKNOWN';
        const expDate = item.vaccine_batches?.expiration_date || '-';

        if (!g.batchesMap[bthNumber]) {
          g.batchesMap[bthNumber] = {
            batchNumber: bthNumber,
            expirationDate: expDate,
            totalStok: 0
          };
        }
        g.batchesMap[bthNumber].totalStok += item.quantity_doses || 0;
      });

      const groupedArray = Object.values(map).map(g => ({
        ...g,
        batchesList: Object.values(g.batchesMap)
      }));

      setFaskesGrouped(groupedArray);
    } catch (err) {
      console.error('Error fetching Supabase stock history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSupabaseData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredFaskes = faskesGrouped.filter(item => {
    const query = search.toLowerCase();
    const name = item.faskes?.name?.toLowerCase() || '';
    const code = item.faskes?.code?.toLowerCase() || '';
    const city = item.faskes?.city?.toLowerCase() || '';
    return name.includes(query) || code.includes(query) || city.includes(query);
  });

  const today = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(today.getMonth() + 6);

  const getExpiryStatus = (expStr) => {
    if (!expStr || expStr === '-') return { label: 'Aman', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    const expDate = new Date(expStr);
    if (isNaN(expDate.getTime())) return { label: 'Aman', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };

    if (expDate < today) {
      return { label: 'Kedaluwarsa (Expired)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    }
    if (expDate <= sixMonthsFromNow) {
      return { label: 'Mendekati Expired (<6 Bulan)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
    return { label: 'Aman', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="max-w-5xl w-full rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Database Persediaan Stok Faskes Supabase</h2>
              <p className="text-xs text-slate-400">
                Data real-time faskes, stok fisik aktif, dan audit trail histori mutasi dari database Supabase remote.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={fetchSupabaseData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Search Bar */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari Faskes / Kode / Kota di Supabase..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800">
            Total {filteredFaskes.length} Faskes
          </span>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Memuat data faskes dan histori stok dari Supabase...</p>
            </div>
          ) : filteredFaskes.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-white">Tidak ada data Faskes ditemukan di Supabase</p>
              <p className="text-xs text-slate-500">Unggah berkas stok Excel/CSV dan klik tombol "Simpan Supabase" untuk mengisi data.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFaskes.map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-cyan-500/40 transition-all flex flex-col justify-between gap-4 shadow-lg group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        <h3 className="text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                          {item.faskes?.name}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md bg-slate-900 text-cyan-400 border border-slate-800 shrink-0">
                        {item.faskes?.code}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Total Dosis Fisik</span>
                        <span className="text-base font-black text-cyan-300">
                          {item.totalStok.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Total Batch Unik</span>
                        <span className="text-base font-black text-indigo-300">
                          {item.batchesList.length} Lot
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedFaskes(item);
                      setActiveTab('batches');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-cyan-600 text-slate-300 hover:text-white font-extrabold text-xs flex items-center justify-center gap-1.5 border border-slate-800 hover:border-cyan-500 transition-all"
                  >
                    <span>Lihat Detail Stok & Histori Mutasi</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* DETAIL FASEKES & HISTORI MUTASI MODAL */}
      {selectedFaskes && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-3xl w-full rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative space-y-4 max-h-[85vh] flex flex-col">
            
            <button
              onClick={() => setSelectedFaskes(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">{selectedFaskes.faskes?.name}</h3>
                <p className="text-xs text-slate-400">
                  Kode Faskes: <strong className="text-cyan-300 font-mono">{selectedFaskes.faskes?.code}</strong> • Total Dosis: <strong className="text-emerald-400">{selectedFaskes.totalStok.toLocaleString('id-ID')}</strong>
                </p>
              </div>
            </div>

            {/* Sub-tabs inside Faskes detail */}
            <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs">
              <button
                onClick={() => setActiveTab('batches')}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'batches'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" /> Stok per Batch ({selectedFaskes.batchesList.length})
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'history'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Histori Mutasi Transaksi ({selectedFaskes.history.length})
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3">
              {activeTab === 'batches' && (
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">No. Batch</th>
                        <th className="py-3 px-4">Tgl Kedaluarsa</th>
                        <th className="py-3 px-4">Status Expired</th>
                        <th className="py-3 px-4 text-right">Stok Dosis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {selectedFaskes.batchesList.map((b, i) => {
                        const expStatus = getExpiryStatus(b.expirationDate);
                        return (
                          <tr key={i}>
                            <td className="py-3 px-4 font-bold text-white font-mono">{b.batchNumber}</td>
                            <td className="py-3 px-4">{b.expirationDate}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${expStatus.color}`}>
                                {expStatus.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-black text-cyan-300">
                              {b.totalStok.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-2">
                  {selectedFaskes.history.map((h, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <ArrowDownLeft className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white uppercase">{h.transaction_type}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Batch: {h.vaccine_batches?.batch_number || '-'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{h.notes || 'Impor Persediaan Stok'}</p>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {new Date(h.created_at).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-emerald-400">
                          +{h.quantity_doses.toLocaleString('id-ID')} Dosis
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedFaskes(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
              >
                Tutup Detail
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
