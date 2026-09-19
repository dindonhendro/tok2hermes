import React, { useState } from 'react';
import { 
  CreditCard, 
  UserCheck, 
  Clock, 
  ShieldCheck, 
  Building2, 
  Sparkles, 
  Award,
  FileText,
  DollarSign,
  HelpCircle,
  Boxes
} from 'lucide-react';
import HasanahApplicationForm from './components/HasanahApplicationForm';
import HasanahStatusTracker from './components/HasanahStatusTracker';
import HasanahAdminPanel from './components/HasanahAdminPanel';

export default function HasanahDashboard() {
  const [activeSubTab, setActiveSubTab] = useState('form'); // 'form' | 'tracking' | 'admin'
  const [submittedAppNum, setSubmittedAppNum] = useState(null);

  const handleFormSubmittedSuccess = (appNumber) => {
    setSubmittedAppNum(appNumber);
    setActiveSubTab('tracking');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Top Banner Hero Header (Islamic Banking Aesthetic) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase">
              <Award className="w-3.5 h-3.5" /> Kerjasama Resmi KORPRI x Bank Syariah Indonesia (BSI)
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              BSI Hasanah Card <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Digital ASN Portal</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Platform pengajuan pembiayaan berbasis Syariah tanpa riba khusus untuk juta-an Anggota ASN KORPRI se-Indonesia. Fitur verifikasi otomatis NIP 18-digit (`8-6-1-3`) dan approval cepat.
            </p>
          </div>

          {/* Quick Highlight Box */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 shadow-inner shrink-0 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Manfaat Hasanah Card KORPRI</span>
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Bebas Biaya Tahunan & Tanpa Riba
            </div>
            <div className="flex items-center gap-2 text-xs font-extrabold text-cyan-300">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Limit Hingga Rp 100 Juta
            </div>
          </div>

        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="p-1.5 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs">
        <button
          onClick={() => setActiveSubTab('form')}
          className={`py-3 px-4 rounded-xl font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'form'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-300" />
          Form Pengajuan Digital (*Onboarding*)
        </button>

        <button
          onClick={() => setActiveSubTab('tracking')}
          className={`py-3 px-4 rounded-xl font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'tracking'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Clock className="w-4 h-4 text-cyan-300" />
          Status Tracking Pengajuan (*User Portal*)
        </button>

        <button
          onClick={() => setActiveSubTab('admin')}
          className={`py-3 px-4 rounded-xl font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'admin'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <UserCheck className="w-4 h-4 text-amber-300" />
          Queue Admin & Approval (*BSI x KORPRI*)
        </button>
      </div>

      {/* ACTIVE SUB-TAB CONTENT */}
      {activeSubTab === 'form' && (
        <HasanahApplicationForm onSubmittedSuccess={handleFormSubmittedSuccess} />
      )}

      {activeSubTab === 'tracking' && (
        <HasanahStatusTracker defaultAppNumber={submittedAppNum} />
      )}

      {activeSubTab === 'admin' && (
        <HasanahAdminPanel />
      )}

    </div>
  );
}
