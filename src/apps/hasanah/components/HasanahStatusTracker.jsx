import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Truck, 
  ShieldCheck, 
  Search, 
  Building2, 
  DollarSign, 
  FileText,
  RefreshCw,
  Award
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

const MOCK_APPLICATIONS = [
  {
    application_number: 'HSN-KORPRI-982103',
    full_name: 'Dra. Hj. Siti Aminah, M.Si',
    nip: '198507152010011002',
    instansi: 'Kementerian Kesehatan',
    application_status: 'approved',
    limit_requested: 30000000,
    limit_approved: 25000000,
    created_at: '2026-09-15T08:30:00Z',
    rejection_notes: null
  },
  {
    application_number: 'HSN-KORPRI-741209',
    full_name: 'Budi Santoso, S.STP, M.AP',
    nip: '199003122014021001',
    instansi: 'Pemerintah Provinsi Jawa Barat',
    application_status: 'bsi_review',
    limit_requested: 50000000,
    limit_approved: 0,
    created_at: '2026-09-17T10:15:00Z',
    rejection_notes: null
  }
];

export default function HasanahStatusTracker({ defaultAppNumber }) {
  const [searchQuery, setSearchQuery] = useState(defaultAppNumber || '');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  const fetchApplications = async () => {
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

      if (error || !data || data.length === 0) {
        let local = [];
        try {
          const raw = localStorage.getItem('hasanah_applications');
          if (raw && raw !== 'undefined' && raw !== 'null') local = JSON.parse(raw);
        } catch (e) {}
        const combined = [...local, ...MOCK_APPLICATIONS];
        setApplications(combined);
        setSelectedApp(combined[0]);
      } else {
        const formatted = data.map(d => ({
          application_number: d.application_number,
          full_name: d.asn_profile?.full_name || 'ASN KORPRI',
          nip: d.asn_profile?.nip || '-',
          instansi: d.asn_profile?.instansi || '-',
          application_status: d.application_status,
          limit_requested: d.limit_requested,
          limit_approved: d.limit_approved,
          created_at: d.created_at,
          rejection_notes: d.rejection_notes
        }));
        let local = [];
        try {
          const raw = localStorage.getItem('hasanah_applications');
          if (raw && raw !== 'undefined' && raw !== 'null') local = JSON.parse(raw);
        } catch (e) {}
        const combined = [...formatted, ...local];
        setApplications(combined);
        setSelectedApp(combined[0]);
      }
    } catch (e) {
      let local = [];
      try {
        const raw = localStorage.getItem('hasanah_applications');
        if (raw && raw !== 'undefined' && raw !== 'null') local = JSON.parse(raw);
      } catch (err) {}
      const combined = [...local, ...MOCK_APPLICATIONS];
      setApplications(combined);
      setSelectedApp(combined[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const getStepState = (appStatus, stepKey) => {
    const sequence = ['submitted', 'verified_korpri', 'bsi_review', 'approved', 'card_shipped'];
    const currentIdx = sequence.indexOf(appStatus);
    const stepIdx = sequence.indexOf(stepKey);

    if (appStatus === 'rejected') {
      return stepKey === 'submitted' ? 'completed' : stepKey === 'verified_korpri' ? 'rejected' : 'upcoming';
    }

    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'upcoming';
  };

  const filtered = applications.filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      a.application_number?.toLowerCase().includes(q) ||
      a.nip?.toLowerCase().includes(q) ||
      a.full_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header Search & Filter */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari berdasarkan No. Pengajuan (HSN-KORPRI-...), NIP, atau Nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <button
          onClick={fetchApplications}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left List of Applications */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
            Daftar Pengajuan Anda ({filtered.length})
          </h3>

          {filtered.map((app, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedApp(app)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                selectedApp?.application_number === app.application_number
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-300">{app.application_number}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  app.application_status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                  app.application_status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                  'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {app.application_status.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-extrabold text-white">{app.full_name}</h4>
                <p className="text-[11px] text-slate-400">NIP: {app.nip} • {app.instansi}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Right Detail & Visual Stepper */}
        {selectedApp ? (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status Stepper Card */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Detail Pengajuan BSI Hasanah Card</span>
                  <h3 className="text-lg font-black text-white">{selectedApp.full_name}</h3>
                  <p className="text-xs text-slate-400">NIP: <strong className="text-cyan-300 font-mono">{selectedApp.nip}</strong> • {selectedApp.instansi}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">No. Registrasi:</span>
                  <span className="text-xs font-mono font-black text-emerald-300">{selectedApp.application_number}</span>
                </div>
              </div>

              {/* Visual Stepper */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-slate-300">Alur Tracking Status Pengajuan:</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs">
                  
                  {/* Step 1: Submitted */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 text-emerald-300 font-bold space-y-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                    <span className="block text-[11px]">1. Submitted</span>
                    <span className="text-[9px] text-slate-500 block">Form Terkirim</span>
                  </div>

                  {/* Step 2: KORPRI Verification */}
                  <div className={`p-3 rounded-2xl border font-bold space-y-1 ${
                    getStepState(selectedApp.application_status, 'verified_korpri') === 'completed' || getStepState(selectedApp.application_status, 'verified_korpri') === 'active'
                      ? 'bg-slate-950 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}>
                    <ShieldCheck className="w-5 h-5 mx-auto" />
                    <span className="block text-[11px]">2. Verifikasi KORPRI</span>
                    <span className="text-[9px] text-slate-500 block">Keabsahan ASN</span>
                  </div>

                  {/* Step 3: BSI Credit Scoring */}
                  <div className={`p-3 rounded-2xl border font-bold space-y-1 ${
                    getStepState(selectedApp.application_status, 'bsi_review') === 'completed' || getStepState(selectedApp.application_status, 'bsi_review') === 'active'
                      ? 'bg-slate-950 border-amber-500/30 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}>
                    <Clock className="w-5 h-5 mx-auto" />
                    <span className="block text-[11px]">3. Review BSI</span>
                    <span className="text-[9px] text-slate-500 block">Credit Scoring</span>
                  </div>

                  {/* Step 4: Approved / Rejected */}
                  <div className={`p-3 rounded-2xl border font-bold space-y-1 ${
                    selectedApp.application_status === 'approved'
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : selectedApp.application_status === 'rejected'
                      ? 'bg-rose-950 border-rose-500 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}>
                    <Award className="w-5 h-5 mx-auto" />
                    <span className="block text-[11px]">4. {selectedApp.application_status === 'rejected' ? 'Rejected' : 'Approved'}</span>
                    <span className="text-[9px] text-slate-500 block">Persetujuan BSI</span>
                  </div>

                  {/* Step 5: Card Shipped */}
                  <div className={`p-3 rounded-2xl border font-bold space-y-1 ${
                    selectedApp.application_status === 'card_shipped'
                      ? 'bg-slate-950 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}>
                    <Truck className="w-5 h-5 mx-auto" />
                    <span className="block text-[11px]">5. Pengiriman</span>
                    <span className="text-[9px] text-slate-500 block">Kartu Fisik</span>
                  </div>

                </div>
              </div>

              {/* Limit Information Box */}
              {selectedApp.application_status === 'approved' && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-400" /> Limit BSI Hasanah Card Disetujui
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Akad Syariah Approved
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white">
                    Rp {(selectedApp.limit_approved || selectedApp.limit_requested).toLocaleString('id-ID')}
                  </div>
                  <p className="text-[11px] text-emerald-200/80">
                    Kartu BSI Hasanah Card Anda siap diproduksi dan dikirimkan ke alamat domisili instansi Anda.
                  </p>
                </div>
              )}

            </div>

          </div>
        ) : (
          <div className="lg:col-span-2 p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <CreditCard className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-white">Pilih salah satu pengajuan untuk melihat status tracking</p>
          </div>
        )}

      </div>

    </div>
  );
}
