import React, { useState } from 'react';
import RegistrationForm from './components/RegistrationForm';
import AdminDashboard from './components/AdminDashboard';
import { Syringe, LayoutDashboard, UserPlus, FileCode, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'admin'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header / Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 p-1 flex items-center justify-center shadow-lg shadow-amber-500/10 backdrop-blur-sm shrink-0">
              <img src="/toktok-health-logo.png" alt="Toktok Health KORPRI Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5 leading-none">
                TOKTOK <span className="text-amber-400">HEALTH</span>
              </span>
              <span className="text-[10px] text-amber-200/70 block mt-0.5 font-medium">TokTok KORPRI Super-App • Hermes Engine</span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Pendaftaran Peserta
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard Admin
            </button>

            <a
              href="/docs/PRDInit.md"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all flex items-center gap-1.5 hidden sm:flex"
            >
              <FileCode className="w-4 h-4 text-slate-400" />
              PRD Dokumen
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="py-6 flex-1">
        {activeTab === 'register' ? (
          <RegistrationForm />
        ) : (
          <AdminDashboard />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Toktok Health - TokTok KORPRI Super-App System. Powered by Vite, Supabase & Hermes Framework.</p>
        </div>
      </footer>
    </div>
  );
}
