import React, { useState } from 'react';
import SuperAppHeader from './shared/components/SuperAppHeader';
import HasanahDashboard from './apps/hasanah/HasanahDashboard';
import RegistrationForm from './components/RegistrationForm';
import AdminDashboard from './components/AdminDashboard';
import ExcelAdminControlPanel from './components/ExcelAdminControlPanel';
import StockDashboard from './components/StockDashboard';
import MonitoringDashboard from './components/MonitoringDashboard';
import { UserPlus, LayoutDashboard, FileSpreadsheet, BarChart3, Terminal, FileCode } from 'lucide-react';

class SuperAppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SuperApp Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Terminal className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Sinkronisasi Aplikasi KORPRI Super-App</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'Memuat ulang preferensi tampilan lokal.'}
            </p>
            <button
              onClick={() => {
                try { localStorage.clear(); } catch(e){}
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all w-full shadow-lg shadow-emerald-600/20"
            >
              Reset Cache & Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeModule, setActiveModule] = useState('health'); // 'hasanah' | 'health'
  const [activeHealthTab, setActiveHealthTab] = useState('monitoring'); // 'register' | 'admin' | 'excel_control' | 'stock_dashboard' | 'monitoring'

  return (
    <SuperAppErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      
      {/* KORPRI Super-App Global Header */}
      <SuperAppHeader activeModule={activeModule} setActiveModule={setActiveModule} />

      {/* Module Content */}
      {activeModule === 'hasanah' ? (
        <main className="py-6 flex-1">
          <HasanahDashboard />
        </main>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* TokTok Health Sub-Navigation Bar */}
          <div className="bg-slate-900 border-b border-slate-800 py-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  🏥 TokTok Health Module Navigation:
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setActiveHealthTab('monitoring')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeHealthTab === 'monitoring'
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25 ring-2 ring-sky-500/30 font-bold'
                      : 'bg-sky-950/40 border border-sky-500/30 text-sky-300 hover:bg-sky-900/60'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  Cronjob & Monitoring
                </button>

                <button
                  onClick={() => setActiveHealthTab('register')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeHealthTab === 'register'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Pendaftaran Peserta
                </button>

                <button
                  onClick={() => setActiveHealthTab('admin')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeHealthTab === 'admin'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard Admin
                </button>

                <button
                  onClick={() => setActiveHealthTab('excel_control')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeHealthTab === 'excel_control'
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                      : 'bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                  Control Panel Excel
                </button>

                <button
                  onClick={() => setActiveHealthTab('stock_dashboard')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeHealthTab === 'stock_dashboard'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                      : 'bg-purple-950/40 border border-purple-500/30 text-purple-300 hover:bg-purple-900/60'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                  Dashboard Stok
                </button>

                <a
                  href="/docs/PRDMonitoring.md"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all flex items-center gap-1.5 hidden md:flex"
                >
                  <FileCode className="w-3.5 h-3.5 text-sky-400" />
                  PRD Monitoring
                </a>
              </div>

            </div>
          </div>

          <main className="py-6 flex-1">
            {activeHealthTab === 'monitoring' ? (
              <MonitoringDashboard />
            ) : activeHealthTab === 'register' ? (
              <RegistrationForm />
            ) : activeHealthTab === 'admin' ? (
              <AdminDashboard />
            ) : activeHealthTab === 'excel_control' ? (
              <ExcelAdminControlPanel />
            ) : (
              <StockDashboard />
            )}
          </main>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>© 2026 KORPRI Super-App System • Integrasi BSI Hasanah Card & TokTok Health Engine.</p>
          <p className="text-[10px] text-slate-600">Powered by Vite, React, Supabase PostgreSQL, & Hermes Framework.</p>
        </div>
      </footer>
    </div>
    </SuperAppErrorBoundary>
  );
}
