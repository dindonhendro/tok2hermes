import React from 'react';
import { 
  Building2, 
  CreditCard, 
  HeartPulse, 
  ShieldCheck, 
  Sparkles, 
  UserCheck, 
  ChevronRight,
  Boxes,
  Award
} from 'lucide-react';

export default function SuperAppHeader({ activeModule, setActiveModule }) {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-xl shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 py-3.5">
          
          {/* Super-App Identity Brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Award className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  KORPRI <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">SUPER-APP</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
                  Nasional ASN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Portal Layanan Terpadu Pegawai Negeri & Korps Pegawai Republik Indonesia
              </p>
            </div>
          </div>

          {/* Module Switcher Tabs */}
          <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
            
            {/* Module 1: BSI Hasanah Card */}
            <button
              onClick={() => setActiveModule('hasanah')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeModule === 'hasanah'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-300" />
              <span>BSI Hasanah Card</span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 text-[9px] font-mono border border-emerald-800">
                Finansial
              </span>
            </button>

            {/* Module 2: TokTok Health */}
            <button
              onClick={() => setActiveModule('health')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeModule === 'health'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <HeartPulse className="w-4 h-4 text-cyan-300" />
              <span>TokTok Health</span>
              <span className="px-1.5 py-0.5 rounded-md bg-cyan-950 text-cyan-300 text-[9px] font-mono border border-cyan-800">
                Kesehatan & Stok
              </span>
            </button>

          </div>

          {/* Status Indicator */}
          <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold leading-none">Status Autentikasi</span>
              <span className="text-white font-black text-[11px]">ASN KORPRI Terverifikasi</span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
