import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Building2, 
  FileText, 
  UserCheck, 
  CreditCard, 
  DollarSign, 
  RefreshCw, 
  Eye, 
  X,
  Award,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

const MOCK_ADMIN_QUEUE = [
  {
    id: 'app-101',
    application_number: 'HSN-KORPRI-982103',
    full_name: 'Dra. Hj. Siti Aminah, M.Si',
    nip: '198507152010011002',
    instansi: 'Kementerian Kesehatan',
    jabatan: 'Analis Kepegawaian Ahli Muda',
    application_status: 'submitted',
    monthly_income: 15000000,
    limit_requested: 30000000,
    limit_approved: 0,
    created_at: '2026-09-18T04:00:00Z',
    ktp_url: '#',
    sk_pns_url: '#',
    slip_gaji_url: '#'
  },
  {
    id: 'app-102',
    application_number: 'HSN-KORPRI-741209',
    full_name: 'Budi Santoso, S.STP, M.AP',
    nip: '199003122014021001',
    instansi: 'Pemerintah Provinsi Jawa Barat',
    jabatan: 'Kepala Subbagian Protokol',
    application_status: 'verified_korpri',
    monthly_income: 20000000,
    limit_requested: 50000000,
    limit_approved: 0,
    created_at: '2026-09-17T11:20:00Z',
    ktp_url: '#',
    sk_pns_url: '#',
    slip_gaji_url: '#'
  }
];

export default function HasanahAdminPanel() {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [queue, setQueue] = useState([]);
  const [toast, setToast] = useState(null);

  // Modal Action State
  const [activeModalApp, setActiveModalApp] = useState(null);
  const [modalActionType, setModalActionType] = useState(null); // 'approve' | 'reject' | 'view'
  const [approvedLimitInput, setApprovedLimitInput] = useState(0);
  const [notesInput, setNotesInput] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('card_applications')
        .select(`
          id,
          application_number,
          application_status,
          monthly_income,
          limit_requested,
          limit_approved,
          rejection_notes,
          created_at,
          asn_profile:asn_profile_id ( full_name, nip, instansi, jabatan )
        `)
        .order('created_at', { ascending: false });

      let local = [];
      try {
        const raw = localStorage.getItem('hasanah_applications');
        if (raw && raw !== 'undefined' && raw !== 'null') local = JSON.parse(raw);
      } catch (e) {}

      if (error || !data || data.length === 0) {
        const formattedLocal = local.map((l, i) => ({
          id: `local-${i}`,
          application_number: l.application_number,
          full_name: l.full_name,
          nip: l.nip,
          instansi: l.instansi,
          jabatan: 'ASN KORPRI',
          application_status: l.application_status || 'submitted',
          monthly_income: l.monthly_income || 15000000,
          limit_requested: l.limit_requested || 30000000,
          limit_approved: l.limit_approved || 0,
          created_at: l.created_at || new Date().toISOString()
        }));
        setQueue([...formattedLocal, ...MOCK_ADMIN_QUEUE]);
      } else {
        const formatted = data.map(d => ({
          id: d.id,
          application_number: d.application_number,
          full_name: d.asn_profile?.full_name || 'ASN KORPRI',
          nip: d.asn_profile?.nip || '-',
          instansi: d.asn_profile?.instansi || '-',
          jabatan: d.asn_profile?.jabatan || '-',
          application_status: d.application_status,
          monthly_income: d.monthly_income || 0,
          limit_requested: d.limit_requested || 0,
          limit_approved: d.limit_approved || 0,
          created_at: d.created_at
        }));
        const formattedLocal = local.map((l, i) => ({
          id: `local-${i}`,
          application_number: l.application_number,
          full_name: l.full_name,
          nip: l.nip,
          instansi: l.instansi,
          jabatan: 'ASN KORPRI',
          application_status: l.application_status || 'submitted',
          monthly_income: l.monthly_income || 15000000,
          limit_requested: l.limit_requested || 30000000,
          limit_approved: l.limit_approved || 0,
          created_at: l.created_at || new Date().toISOString()
        }));
        setQueue([...formatted, ...formattedLocal]);
      }
    } catch (e) {
      setQueue(MOCK_ADMIN_QUEUE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleUpdateStatus = async (appId, newStatus, approvedLimit, notes) => {
    try {
      if (appId.startsWith('local-')) {
        // Update local state
        setQueue(prev => prev.map(item => {
          if (item.id === appId) {
            return {
              ...item,
              application_status: newStatus,
              limit_approved: newStatus === 'approved' ? approvedLimit : item.limit_approved,
              rejection_notes: notes
            };
          }
          return item;
        }));
      } else {
        const { error } = await supabase
          .from('card_applications')
          .update({
            application_status: newStatus,
            limit_approved: newStatus === 'approved' ? approvedLimit : 0,
            rejection_notes: notes,
            approved_at: newStatus === 'approved' ? new Date().toISOString() : null
          })
          .eq('id', appId);

        if (error) throw error;
        fetchQueue();
      }

      showToast(`✅ Status pengajuan ${activeModalApp.application_number} berhasil diperbarui menjadi ${newStatus.toUpperCase()}!`);
    } catch (err) {
      showToast('Gagal memperbarui status: ' + err.message, 'error');
    } finally {
      setActiveModalApp(null);
      setModalActionType(null);
    }
  };

  const filteredQueue = queue.filter(item => {
    const q = search.toLowerCase();
    const matchesSearch = (
      item.full_name?.toLowerCase().includes(q) ||
      item.nip?.toLowerCase().includes(q) ||
      item.instansi?.toLowerCase().includes(q) ||
      item.application_number?.toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === 'all' || item.application_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalSubmitted = queue.length;
  const totalApproved = queue.filter(q => q.application_status === 'approved').length;
  const totalLimitApproved = queue.reduce((sum, q) => sum + (q.limit_approved || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 transition-all ${
          toast.type === 'error'
            ? 'bg-rose-950 border-rose-500/50 text-rose-200'
            : 'bg-emerald-950 border-emerald-500/50 text-emerald-200'
        }`}>
          {toast.type === 'error' ? <XCircle className="w-4 h-4 text-rose-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Total Pengajuan Masuk</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white">{totalSubmitted} Pemohon</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Anggota ASN KORPRI</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Disetujui BSI (Approved)</span>
            <Award className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl font-black text-teal-300">{totalApproved} Pengajuan</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Telah terbit limit Hasanah</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Total Limit Pembiayaan Approved</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">
            Rp {totalLimitApproved.toLocaleString('id-ID')}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Ekosistem closed-loop</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari Pemohon / NIP / Instansi / No. Pengajuan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="submitted">Submitted (Baru)</option>
            <option value="verified_korpri">Verified KORPRI</option>
            <option value="bsi_review">BSI Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={fetchQueue}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Queue Table */}
      <div className="overflow-x-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Pemohon & NIP</th>
              <th className="py-3.5 px-4">Instansi & Jabatan</th>
              <th className="py-3.5 px-4 text-right">Permohonan Limit</th>
              <th className="py-3.5 px-4">Status Pengajuan</th>
              <th className="py-3.5 px-4 text-center">Aksi Verifikasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredQueue.map((r, i) => (
              <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-extrabold text-white">{r.full_name}</div>
                  <div className="text-[11px] text-cyan-300 font-mono">NIP: {r.nip}</div>
                  <span className="text-[10px] text-slate-500 block font-mono">{r.application_number}</span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-bold text-slate-200">{r.instansi}</div>
                  <div className="text-[11px] text-slate-400">{r.jabatan}</div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="font-black text-emerald-400">
                    Rp {r.limit_requested.toLocaleString('id-ID')}
                  </div>
                  {r.limit_approved > 0 && (
                    <span className="text-[10px] font-bold text-teal-300 block">
                      Approved: Rp {r.limit_approved.toLocaleString('id-ID')}
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase inline-block ${
                    r.application_status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    r.application_status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                    'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {r.application_status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    
                    <button
                      onClick={() => {
                        setActiveModalApp(r);
                        setApprovedLimitInput(r.limit_requested);
                        setModalActionType('approve');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-[11px] border border-emerald-500/30 transition-all flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>

                    <button
                      onClick={() => {
                        setActiveModalApp(r);
                        setNotesInput('');
                        setModalActionType('reject');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-[11px] border border-rose-500/30 transition-all flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>

                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* APPROVE / REJECT MODAL */}
      {activeModalApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative space-y-4">
            
            <button
              onClick={() => setActiveModalApp(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                modalActionType === 'approve'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                {modalActionType === 'approve' ? <Award className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {modalActionType === 'approve' ? 'Persetujuan BSI Hasanah Card' : 'Penolakan Pengajuan Card'}
                </h3>
                <p className="text-xs text-slate-400">{activeModalApp.full_name} • NIP: {activeModalApp.nip}</p>
              </div>
            </div>

            {modalActionType === 'approve' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Limit Pembiayaan Disetujui BSI (Rp)</label>
                  <input
                    type="number"
                    step={1000000}
                    value={approvedLimitInput}
                    onChange={(e) => setApprovedLimitInput(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-sm font-bold focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Permohonan Awal: Rp {activeModalApp.limit_requested.toLocaleString('id-ID')}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Catatan Pejabat BSI / KORPRI (Opsional)</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Disetujui dengan limit 25 juta berdasarkan Take Home Pay 15 juta/bulan."
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Alasan Penolakan Pengajuan</label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Masa kerja CPNS kurang dari 1 tahun atau dokumen SK tidak terbaca."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveModalApp(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Batal
              </button>

              <button
                onClick={() => {
                  const status = modalActionType === 'approve' ? 'approved' : 'rejected';
                  handleUpdateStatus(activeModalApp.id, status, approvedLimitInput, notesInput);
                }}
                className={`px-5 py-2 rounded-xl font-bold text-xs text-white shadow-lg transition-all ${
                  modalActionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                {modalActionType === 'approve' ? 'Konfirmasi Approval BSI' : 'Konfirmasi Reject'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
