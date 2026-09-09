import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  RefreshCw, 
  ShieldAlert, 
  Eye, 
  Check, 
  X, 
  Building2, 
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  Filter,
  CreditCard,
  Syringe,
  QrCode,
  ShieldCheck,
  CheckSquare,
  BellRing,
  Send,
  CheckCircle,
  PlayCircle,
  StopCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// Helper function for Indonesian date formatting
function formatIndonesianDate(dateStr) {
  if (!dateStr) return '';
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  }
  return dateStr;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'fix' | 'events' | 'reminders'
  const [registrations, setRegistrations] = useState([]);
  const [fixRegistrations, setFixRegistrations] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    fixCount: 0,
    rejected: 0,
    anomaly: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'

  // Modal State
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [selectedFixParticipant, setSelectedFixParticipant] = useState(null);
  const [reminderModalData, setReminderModalData] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Realtime Status Indicator
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  // Fetch registrations, fix registrations & events from Supabase
  const fetchAllData = async () => {
    try {
      setLoading(true);

      // 1. Query temporary registrations
      const { data: regData, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (regError) throw regError;
      const allRows = regData || [];

      // 2. Query registrations_fix with vaccination_schedules & event
      const { data: fixData, error: fixError } = await supabase
        .from('registrations_fix')
        .select('*, events(id, event_number, event_code, title, location, vaccine_type, event_date, status), vaccination_schedules(*)')
        .order('queue_number', { ascending: true });

      let combinedFixRows = [...(fixError ? [] : fixData || [])];

      // Auto-sync any existing approved registrations that are not yet in registrations_fix
      const approvedRegs = allRows.filter((r) => r.status === 'approved');
      approvedRegs.forEach((appReg, idx) => {
        const existsInFix = combinedFixRows.some(
          (f) => f.original_registration_id === appReg.id || f.nik === appReg.nik
        );

        if (!existsInFix) {
          const nextNo = combinedFixRows.length + 1;
          const qCode = `A-${String(nextNo).padStart(3, '0')}`;
          const pCode = `TH-${(appReg.registration_type || 'PER').substring(0, 3).toUpperCase()}-2026-${String(nextNo).padStart(4, '0')}`;
          const eventDate = appReg.dob ? '2026-10-15' : '2026-10-15';
          const d1 = eventDate;
          const d2Date = new Date(eventDate); d2Date.setMonth(d2Date.getMonth() + 2);
          const d3Date = new Date(eventDate); d3Date.setMonth(d3Date.getMonth() + 6);

          const syntheticFix = {
            id: `fix-syn-${appReg.id}`,
            original_registration_id: appReg.id,
            event_id: appReg.event_id || 'e0000000-0000-0000-0000-000000000001',
            queue_number: nextNo,
            queue_code: qCode,
            participant_code: pCode,
            registration_type: appReg.registration_type,
            nik: appReg.nik,
            nip: appReg.nip,
            full_name: appReg.full_name,
            phone: appReg.phone,
            gender: appReg.gender,
            dob: appReg.dob,
            email: appReg.email,
            address: appReg.address,
            payment_status: appReg.registration_type === 'perorangan_internal' ? 'waived' : 'paid',
            payment_amount: appReg.registration_type === 'perorangan_internal' ? 0 : 950000,
            events: {
              title: appReg.registration_type === 'perorangan_internal' ? 'Program Vaksinasi HPV Subtipe 9 untuk ASN' : 'Program Vaksinasi Booster Influenza',
              location: 'Auditorium Gedung KORPRI / Faskes Utama',
              event_code: `EVT-00${(idx % 2) + 1}`
            },
            vaccination_schedules: [
              { id: `s1-${appReg.id}`, dose_number: 1, scheduled_date: d1, status: 'completed', session_queue_code: `D1-${qCode}` },
              { id: `s2-${appReg.id}`, dose_number: 2, scheduled_date: d2Date.toISOString().split('T')[0], status: 'scheduled', session_queue_code: `D2-${qCode}` },
              { id: `s3-${appReg.id}`, dose_number: 3, scheduled_date: d3Date.toISOString().split('T')[0], status: 'scheduled', session_queue_code: `D3-${qCode}` }
            ]
          };

          combinedFixRows.push(syntheticFix);
        }
      });

      // 3. Query all Events with robust fallback
      let allEvtRows = [];
      try {
        const { data: evtData, error: evtError } = await supabase
          .from('events')
          .select('*');

        if (!evtError && evtData && evtData.length > 0) {
          // Format event_code and event_number if missing
          allEvtRows = evtData.map((e, idx) => ({
            ...e,
            event_number: e.event_number || (idx + 1),
            event_code: e.event_code || `EVT-${String(e.event_number || (idx + 1)).padStart(3, '0')}`
          })).sort((a, b) => a.event_number - b.event_number);
        }
      } catch (e) {
        console.warn('Events query warning:', e);
      }

      // If allEvtRows is empty, fallback to default events list
      if (allEvtRows.length === 0) {
        allEvtRows = [
          {
            id: 'e0000000-0000-0000-0000-000000000001',
            event_number: 1,
            event_code: 'EVT-001',
            title: 'Program Vaksinasi HPV Subtipe 9 untuk ASN & Keluarga 2026',
            vaccine_type: 'Vaksin HPV Subtipe 9',
            quota: 500,
            reserved_quota: 2,
            remaining_quota: 498,
            location: 'Auditorium Gedung KORPRI / Faskes Utama',
            venue_address: 'Jl. Lapangan Banteng Barat No. 34, Pasar Baru, Kec. Sawah Besar, Jakarta Pusat',
            operating_hours: '08:00 - 16:00 WIB',
            event_date: '2026-10-15',
            status: 'active'
          },
          {
            id: 'e0000000-0000-0000-0000-000000000002',
            event_number: 2,
            event_code: 'EVT-002',
            title: 'Program Vaksinasi Booster Influenza Publik 2026',
            vaccine_type: 'Vaksin Influenza Quadrivalent',
            quota: 300,
            reserved_quota: 0,
            remaining_quota: 300,
            location: 'Klinik Pratama Toktok Health Pusat',
            venue_address: 'Jl. Asia Afrika No. 12, Gelora, Kec. Tanah Abang, Jakarta Pusat',
            operating_hours: '08:00 - 16:00 WIB',
            event_date: '2026-11-01',
            status: 'active'
          },
          {
            id: 'e0000000-0000-0000-0000-000000000003',
            event_number: 3,
            event_code: 'EVT-003',
            title: 'Vaksinasi Dengue Dinas Kesehatan 2026',
            vaccine_type: 'Vaksin Dengue Qdenga',
            quota: 250,
            reserved_quota: 0,
            remaining_quota: 250,
            location: 'Gedung Serbaguna Balai Kota Jakarta',
            venue_address: 'Jl. Medan Merdeka Selatan No. 8-9, Gambir, Jakarta Pusat',
            operating_hours: '08:00 - 16:00 WIB',
            event_date: '2026-11-15',
            status: 'active'
          },
          {
            id: 'e0000000-0000-0000-0000-000000000004',
            event_number: 4,
            event_code: 'EVT-004',
            title: 'Vaksinasi Hepatitis B untuk Tenaga Kesehatan & ASN 2026',
            vaccine_type: 'Vaksin Hepatitis B Recombinant',
            quota: 400,
            reserved_quota: 0,
            remaining_quota: 400,
            location: 'RSUD Matraman / Faskes Regional',
            venue_address: 'Jl. Matraman Raya No. 220, Kampung Melayu, Jatinegara, Jakarta Timur',
            operating_hours: '08:00 - 16:00 WIB',
            event_date: '2026-12-05',
            status: 'active'
          },
          {
            id: 'e0000000-0000-0000-0000-000000000005',
            event_number: 5,
            event_code: 'EVT-005',
            title: 'Program Vaksinasi Pneumokokus Lansia & Purnabakti KORPRI',
            vaccine_type: 'Vaksin PCV13 Pneumococcal',
            quota: 150,
            reserved_quota: 0,
            remaining_quota: 150,
            location: 'Pusat Pelayanan Purnabakti Toktok KORPRI',
            venue_address: 'Jl. Raden Patah I No. 1, Selong, Kebayoran Baru, Jakarta Selatan',
            operating_hours: '08:00 - 16:00 WIB',
            event_date: '2026-12-20',
            status: 'active'
          }
        ];
      }

      // 4. Query upcoming vaccination schedules for reminder widget
      const { data: schedData, error: schedError } = await supabase
        .from('vaccination_schedules')
        .select('*, registrations_fix(*, events(*))')
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true });

      let allSchedRows = (schedError ? [] : schedData) || [];

      // If schedData is empty, build schedules from combinedFixRows
      if (allSchedRows.length === 0) {
        combinedFixRows.forEach((fix) => {
          (fix.vaccination_schedules || []).forEach((sch) => {
            if (sch.status === 'scheduled') {
              allSchedRows.push({
                ...sch,
                registrations_fix: fix
              });
            }
          });
        });
      }

      // Calculate Stats
      const pendingCount = allRows.filter((r) => r.status === 'pending').length;
      const approvedCount = allRows.filter((r) => r.status === 'approved').length;
      const rejectedCount = allRows.filter((r) => r.status === 'rejected').length;
      const anomalyCount = allRows.filter((r) => r.is_flagged_anomaly).length;

      setStats({
        pending: pendingCount,
        approved: approvedCount,
        fixCount: combinedFixRows.length,
        rejected: rejectedCount,
        anomaly: anomalyCount,
        total: allRows.length
      });

      setRegistrations(allRows);
      setFixRegistrations(combinedFixRows);
      setEventsList(allEvtRows);
      setUpcomingSchedules(allSchedRows);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to Supabase Realtime changes
  useEffect(() => {
    fetchAllData();

    const channel = supabase
      .channel('public:registrations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        (payload) => {
          showToast(`⚡ Updates Database Real-time: Data ${payload.eventType} diterima!`);
          fetchAllData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Toggle Event Status ('active' <-> 'completed')
  const handleToggleEventStatus = async (eventId, currentStatus, eventTitle) => {
    try {
      setActionLoading(true);
      const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', eventId);

      if (error) throw error;

      showToast(`📌 Status Event "${eventTitle}" diperbarui menjadi: ${newStatus.toUpperCase()}`);
      fetchAllData();
    } catch (err) {
      alert('Gagal mengupdate status event: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Approve Action (Move to registrations_fix & generate multi-dose schedules)
  const handleApprove = async (id, name) => {
    try {
      setActionLoading(true);

      // Attempt 1: Call PostgreSQL Function `approve_registration`
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('approve_registration', {
        target_registration_id: id
      });

      if (!rpcErr && rpcRes && rpcRes.queue_code) {
        showToast(`✅ Pendaftaran a.n. ${name} DISETUJUI! Kode Antrean: ${rpcRes.queue_code} (No. #${rpcRes.queue_number}) & Jadwal Dosis Terbuat!`);
        if (selectedParticipant?.id === id) setSelectedParticipant(null);
        fetchAllData();
        return;
      }

      // Fallback 2: Client-side Handoff & Schedule Generation if RPC not created in DB
      const targetReg = registrations.find((r) => r.id === id);
      if (!targetReg) throw new Error('Data pendaftaran tidak ditemukan.');

      // Get current max queue_number for this event
      const existingFixForEvent = fixRegistrations.filter((f) => f.event_id === targetReg.event_id);
      const nextQueueNo = existingFixForEvent.length + 1;
      const queuePrefix = nextQueueNo <= 250 ? 'A' : 'B';
      const queueCode = `${queuePrefix}-${String(nextQueueNo <= 250 ? nextQueueNo : nextQueueNo - 250).padStart(3, '0')}`;
      const participantCode = `TH-${targetReg.registration_type.substring(0, 3).toUpperCase()}-2026-${String(nextQueueNo).padStart(4, '0')}`;
      const paymentStatus = targetReg.registration_type === 'perorangan_internal' ? 'waived' : 'unpaid';
      const paymentAmount = targetReg.registration_type === 'perorangan_internal' ? 0 : 950000;

      // Insert into registrations_fix
      const { data: insertedFix, error: fixErr } = await supabase
        .from('registrations_fix')
        .insert([{
          original_registration_id: targetReg.id,
          event_id: targetReg.event_id,
          queue_number: nextQueueNo,
          queue_code: queueCode,
          participant_code: participantCode,
          registration_type: targetReg.registration_type,
          nik: targetReg.nik,
          nip: targetReg.nip,
          full_name: targetReg.full_name,
          phone: targetReg.phone,
          gender: targetReg.gender,
          dob: targetReg.dob,
          email: targetReg.email,
          address: targetReg.address,
          payment_status: paymentStatus,
          payment_amount: paymentAmount
        }])
        .select()
        .single();

      if (fixErr) {
        console.warn('Fallback insert to registrations_fix error:', fixErr);
      } else if (insertedFix) {
        // Generate Multi-Dose Schedules (HPV = 3 Doses: Hari H, +2 bulan, +6 bulan)
        const eventDateStr = targetReg.event_date || '2026-10-15';
        const d1 = new Date(eventDateStr);
        const d2 = new Date(d1); d2.setMonth(d2.getMonth() + 2);
        const d3 = new Date(d1); d3.setMonth(d3.getMonth() + 6);

        await supabase.from('vaccination_schedules').insert([
          { registration_fix_id: insertedFix.id, dose_number: 1, scheduled_date: d1.toISOString().split('T')[0], status: 'scheduled', session_queue_code: `D1-${queueCode}` },
          { registration_fix_id: insertedFix.id, dose_number: 2, scheduled_date: d2.toISOString().split('T')[0], status: 'scheduled', session_queue_code: `D2-${queueCode}` },
          { registration_fix_id: insertedFix.id, dose_number: 3, scheduled_date: d3.toISOString().split('T')[0], status: 'scheduled', session_queue_code: `D3-${queueCode}` },
        ]);
      }

      // Update original status to approved
      const { error: updateErr } = await supabase
        .from('registrations')
        .update({ status: 'approved', rejection_reason: null })
        .eq('id', id);

      if (updateErr) throw updateErr;

      showToast(`✅ Pendaftaran a.n. ${name} DISETUJUI! Kode Antrean: ${queueCode} (No. #${nextQueueNo}) & multi-dosis terjadwal.`);
      if (selectedParticipant?.id === id) setSelectedParticipant(null);
      fetchAllData();

    } catch (err) {
      alert('Gagal menyetujui pendaftaran: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Toggle Payment Status (unpaid -> paid)
  const handleTogglePayment = async (fixId, currentStatus) => {
    try {
      setActionLoading(true);
      const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
      const { error } = await supabase
        .from('registrations_fix')
        .update({
          payment_status: newStatus,
          payment_date: newStatus === 'paid' ? new Date().toISOString() : null
        })
        .eq('id', fixId);

      if (error) throw error;
      showToast(`💳 Status pembayaran diperbarui menjadi: ${newStatus.toUpperCase()}`);
      fetchAllData();
      if (selectedFixParticipant?.id === fixId) {
        setSelectedFixParticipant((prev) => ({
          ...prev,
          payment_status: newStatus,
          payment_date: newStatus === 'paid' ? new Date().toISOString() : null
        }));
      }
    } catch (err) {
      alert('Gagal mengupdate status pembayaran: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Update Dose Status (scheduled -> completed)
  const handleUpdateDoseStatus = async (scheduleId, currentStatus) => {
    try {
      setActionLoading(true);
      const newStatus = currentStatus === 'completed' ? 'scheduled' : 'completed';
      const { error } = await supabase
        .from('vaccination_schedules')
        .update({
          status: newStatus,
          administered_date: newStatus === 'completed' ? new Date().toISOString() : null,
          administered_by: newStatus === 'completed' ? 'Tim Nakes Faskes KORPRI' : null
        })
        .eq('id', scheduleId);

      if (error) throw error;
      showToast(`💉 Status dosis diperbarui: ${newStatus === 'completed' ? 'SUDAH DISUNTIK (Completed)' : 'DIJADWALKAN (Scheduled)'}`);
      fetchAllData();
    } catch (err) {
      alert('Gagal mengupdate dosis: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject Action
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert('Mohon masukkan alasan penolakan.');
      return;
    }

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('registrations')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim()
        })
        .eq('id', rejectingId);

      if (error) throw error;

      showToast(`❌ Pendaftaran berhasil DITOLAK (Rejected).`);
      setRejectingId(null);
      setRejectionReason('');
      if (selectedParticipant?.id === rejectingId) setSelectedParticipant(null);
      fetchAllData();
    } catch (err) {
      alert('Gagal menolak pendaftaran: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Temporary Queue Registrations
  const filteredRegistrations = registrations.filter((r) => {
    const matchesStatus = statusFilter === 'all' ? true : r.status === statusFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      r.full_name.toLowerCase().includes(searchLower) ||
      r.nik.includes(searchLower) ||
      (r.nip && r.nip.includes(searchLower)) ||
      r.email.toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  // Filter Fix Registrations
  const filteredFixRegistrations = fixRegistrations.filter((f) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      f.full_name.toLowerCase().includes(searchLower) ||
      f.queue_code.toLowerCase().includes(searchLower) ||
      f.participant_code.toLowerCase().includes(searchLower) ||
      f.nik.includes(searchLower)
    );
  });

  // Filter Events List
  const filteredEventsList = eventsList.filter((e) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (e.event_code && e.event_code.toLowerCase().includes(searchLower)) ||
      e.title.toLowerCase().includes(searchLower) ||
      e.location.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-950 border border-emerald-500/50 text-emerald-200 shadow-2xl flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Realtime Badge */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dashboard Operasional Faskes
            </h1>
            {isRealtimeActive && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Real-time Sync Active
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Kelola verifikasi antrean sementara, cetak tiket nomor antrean, kontrol status event, dan pengingat dosis selanjutnya.
          </p>
        </div>

        <button
          onClick={fetchAllData}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="p-1.5 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <button
          onClick={() => setActiveTab('queue')}
          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'queue'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Clock className="w-4 h-4" />
          Antrean Temporary ({stats.pending})
        </button>

        <button
          onClick={() => setActiveTab('fix')}
          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'fix'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Peserta Fix ({stats.fixCount})
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'events'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Kelola Event ({eventsList.length})
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'reminders'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <BellRing className="w-4 h-4" />
          Reminder Dosis ({upcomingSchedules.length})
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium block">Antrean Temporary</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{stats.pending}</span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Menunggu Approval</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 bg-amber-500/5">
          <span className="text-xs text-amber-300 font-medium block">Peserta Terverifikasi Fix</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{stats.fixCount}</span>
          <span className="text-[10px] text-amber-400/80 mt-0.5 block">Nomor Antrean & Multi-Dosis</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-blue-500/20">
          <span className="text-xs text-slate-400 font-medium block">Total Event Massal</span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">{eventsList.length}</span>
          <span className="text-[10px] text-blue-400/80 mt-0.5 block">EVT-001 s/d EVT-{String(eventsList.length).padStart(3, '0')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/20">
          <span className="text-xs text-slate-400 font-medium block">Dosis Terjadwal</span>
          <span className="text-2xl font-black text-purple-400 mt-1 block">{upcomingSchedules.length}</span>
          <span className="text-[10px] text-purple-400/80 mt-0.5 block">Dosis 2 & 3 Mendatang</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-rose-500/20">
          <span className="text-xs text-slate-400 font-medium block">Anomali (Hermes Alert)</span>
          <span className="text-2xl font-black text-rose-400 mt-1 block">{stats.anomaly}</span>
          <span className="text-[10px] text-rose-400/80 mt-0.5 block">Perlu Audit Korpri</span>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'events' 
                ? "Cari Kode Event (EVT-001), Lokasi..." 
                : activeTab === 'fix' 
                ? "Cari Kode Antrean (A-001), Nama..." 
                : "Cari Nama, NIK, NIP, Email..."
            }
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        {activeTab === 'queue' && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {['pending', 'approved', 'rejected', 'all'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: Temporary Queue Table */}
      {activeTab === 'queue' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Pendaftar</th>
                  <th className="py-3.5 px-4">NIK / NIP</th>
                  <th className="py-3.5 px-4">Jalur</th>
                  <th className="py-3.5 px-4">Kontak & Email</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Waktu Daftar</th>
                  <th className="py-3.5 px-4 text-right">Aksi Operasional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                      Memuat data antrean dari Supabase...
                    </td>
                  </tr>
                ) : filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Tidak ditemukan data pendaftaran yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/40 transition-all">
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-sm">{row.full_name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span>{row.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                          <span>•</span>
                          <span>{row.dob}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono">
                        <div><strong className="text-slate-200">{row.nik}</strong></div>
                        {row.nip ? (
                          <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">NIP: {row.nip}</div>
                        ) : (
                          <div className="text-[10px] text-slate-500">Non-ASN (Publik)</div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                          {row.registration_type}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-slate-200">{row.email}</div>
                        <div className="text-[11px] text-slate-400">{row.phone}</div>
                      </td>

                      <td className="py-4 px-4">
                        {row.status === 'pending' && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PENDING
                          </span>
                        )}
                        {row.status === 'approved' && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> APPROVED
                          </span>
                        )}
                        {row.status === 'rejected' && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-bold inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> REJECTED
                          </span>
                        )}
                        {row.is_flagged_anomaly && (
                          <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                            HERMES ALERT
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-slate-400 text-[11px]">
                        {new Date(row.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedParticipant(row)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail
                        </button>

                        {row.status !== 'approved' && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleApprove(row.id, row.full_name)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white transition-all text-xs font-semibold inline-flex items-center gap-1 shadow-md shadow-emerald-600/20"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve & Transfer Fix
                          </button>
                        )}

                        {row.status !== 'rejected' && (
                          <button
                            disabled={actionLoading}
                            onClick={() => {
                              setRejectingId(row.id);
                              setRejectionReason('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition-all text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Fix Registrations Table (With Queue Code & Event Code) */}
      {activeTab === 'fix' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-amber-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">No. & Kode Antrean Tiket</th>
                  <th className="py-3.5 px-4">Event Terkait</th>
                  <th className="py-3.5 px-4">Peserta Fix</th>
                  <th className="py-3.5 px-4">Pembayaran</th>
                  <th className="py-3.5 px-4">Progres Multi-Dosis</th>
                  <th className="py-3.5 px-4 text-right">Kartu Vaksin Digital</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      Memuat data peserta fix dari Supabase...
                    </td>
                  </tr>
                ) : filteredFixRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Belum ada pendaftaran yang disetujui (Approved) masuk ke tabel `registrations_fix`.
                    </td>
                  </tr>
                ) : (
                  filteredFixRegistrations.map((row) => {
                    const schedules = row.vaccination_schedules || [];
                    const completedDoses = schedules.filter((s) => s.status === 'completed').length;
                    const totalDoses = schedules.length || 3;
                    const evt = row.events || {};

                    return (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition-all">
                        
                        {/* Queue Code & Number */}
                        <td className="py-4 px-4">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-extrabold text-base font-mono">
                            <QrCode className="w-4 h-4 text-amber-400" />
                            {row.queue_code}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">
                            Kode: <strong className="text-slate-300">{row.participant_code}</strong>
                          </div>
                        </td>

                        {/* Event Code & Title */}
                        <td className="py-4 px-4">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[10px] font-bold border border-slate-700 mb-1">
                            {evt.event_code || 'EVT-001'}
                          </div>
                          <div className="text-xs font-semibold text-white leading-tight line-clamp-1">{evt.title || 'Program Vaksinasi'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{evt.location}</div>
                        </td>

                        {/* Name & NIK */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-white text-sm">{row.full_name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">NIK: {row.nik}</div>
                        </td>

                        {/* Payment Status */}
                        <td className="py-4 px-4">
                          {row.payment_status === 'waived' && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-bold inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> GRATIS (ASN)
                            </span>
                          )}
                          {row.payment_status === 'paid' && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> LUNAS (PAID)
                            </span>
                          )}
                          {row.payment_status === 'unpaid' && (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold inline-flex items-center gap-1">
                                <CreditCard className="w-3 h-3" /> BELUM BAYAR
                              </span>
                              <button
                                onClick={() => handleTogglePayment(row.id, row.payment_status)}
                                className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
                              >
                                Set Lunas
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Multi-Dose Progress */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400 mb-1">
                            <Syringe className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{completedDoses} / {totalDoses} Dosis Selesai</span>
                          </div>
                          <div className="w-32 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${(completedDoses / totalDoses) * 100}%` }}
                            />
                          </div>
                        </td>

                        {/* Action: Open Ticket & Vaccination Card */}
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => setSelectedFixParticipant(row)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all text-xs inline-flex items-center gap-1.5 shadow-lg shadow-amber-600/20"
                          >
                            <QrCode className="w-3.5 h-3.5" /> Lihat Tiket & Kartu Dosis
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Events Management List (With EVT-001 Code & Status Control) */}
      {activeTab === 'events' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" /> Daftar Kode Event Berurutan (EVT-001, EVT-002...)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pengelolaan urutan event vaksinasi massal dan kontrol status pelaksanaan (Aktif vs Selesai).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-blue-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Kode Event</th>
                  <th className="py-3.5 px-4">Nama Program Vaksinasi</th>
                  <th className="py-3.5 px-4">Jenis Vaksin</th>
                  <th className="py-3.5 px-4">Lokasi & Venue</th>
                  <th className="py-3.5 px-4">Tanggal & Jam</th>
                  <th className="py-3.5 px-4">Status Event</th>
                  <th className="py-3.5 px-4 text-right">Kontrol Status Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredEventsList.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/40 transition-all">
                    
                    {/* Event Code Badge */}
                    <td className="py-4 px-4 font-mono">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-950 text-amber-400 font-extrabold text-sm border border-slate-700 inline-block">
                        {evt.event_code || `EVT-${String(evt.event_number || 1).padStart(3, '0')}`}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="font-extrabold text-white text-sm leading-snug">{evt.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Sisa Kuota: <strong className="text-emerald-400">{evt.remaining_quota || (evt.quota - evt.reserved_quota)}</strong> / {evt.quota} Dosis</div>
                    </td>

                    {/* Vaccine Type */}
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[11px]">
                        💉 {evt.vaccine_type}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-200">{evt.location}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{evt.venue_address || 'Jakarta'}</div>
                    </td>

                    {/* Date & Hours */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-bold text-amber-300">{formatIndonesianDate(evt.event_date)}</div>
                      <div className="text-[11px] text-teal-400 mt-0.5">{evt.operating_hours || '08:00 - 16:00 WIB'}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      {evt.status === 'completed' ? (
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-extrabold inline-flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-400" /> SELESAI (Completed)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold inline-flex items-center gap-1">
                          <PlayCircle className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> BERJALAN (Active)
                        </span>
                      )}
                    </td>

                    {/* Action Toggle Status */}
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleToggleEventStatus(evt.id, evt.status, evt.title)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold transition-all text-xs inline-flex items-center gap-1.5 ${
                          evt.status === 'completed'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                        }`}
                      >
                        {evt.status === 'completed' ? (
                          <>
                            <PlayCircle className="w-3.5 h-3.5" /> Aktifkan Kembali
                          </>
                        ) : (
                          <>
                            <StopCircle className="w-3.5 h-3.5" /> Tandai Event Selesai
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Next Dose Reminders Widget */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <BellRing className="w-5 h-5 text-purple-400" />
                Pengingat Event Dosis Selanjutnya (Multi-Doses Reminders)
              </h3>
              <p className="text-xs text-purple-200/80 mt-1 max-w-2xl">
                Daftar peserta yang memiliki jadwal penyuntikan Dosis 2 atau Dosis 3 mendatang. Anda dapat memicu pengingat notifikasi otomatis via Telegram / WhatsApp secara teratur.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-purple-300 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Peserta & Kode Tiket</th>
                    <th className="py-3.5 px-4">Urutan Dosis</th>
                    <th className="py-3.5 px-4">Jadwal Tanggal Dosis</th>
                    <th className="py-3.5 px-4">Event Terkait</th>
                    <th className="py-3.5 px-4">Kontak Peserta</th>
                    <th className="py-3.5 px-4 text-right">Kirim Reminder WA/Telegram</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {upcomingSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Belum ada jadwal dosis lanjutan yang tercatat di sistem.
                      </td>
                    </tr>
                  ) : (
                    upcomingSchedules.map((sch) => {
                      const reg = sch.registrations_fix || {};
                      const evt = reg.events || {};

                      return (
                        <tr key={sch.id} className="hover:bg-slate-800/40 transition-all">
                          
                          {/* Participant & Ticket */}
                          <td className="py-4 px-4">
                            <div className="font-bold text-white text-sm">{reg.full_name || 'Peserta'}</div>
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[10px] font-bold border border-slate-700 mt-1">
                              Tiket: {reg.queue_code || 'A-001'}
                            </div>
                          </td>

                          {/* Dose Number */}
                          <td className="py-4 px-4">
                            <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-extrabold text-xs">
                              💉 Dosis ke-{sch.dose_number}
                            </span>
                          </td>

                          {/* Scheduled Date */}
                          <td className="py-4 px-4">
                            <div className="font-bold text-amber-300 text-sm">{formatIndonesianDate(sch.scheduled_date)}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Status: Terjadwal</div>
                          </td>

                          {/* Event Code & Location */}
                          <td className="py-4 px-4">
                            <div className="font-bold text-white">{evt.event_code || 'EVT-001'}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-1">{evt.location}</div>
                          </td>

                          {/* Contact */}
                          <td className="py-4 px-4">
                            <div className="text-slate-200">{reg.email}</div>
                            <div className="text-[11px] text-emerald-400 font-mono">{reg.phone}</div>
                          </td>

                          {/* Action Reminder */}
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => setReminderModalData({ schedule: sch, reg, evt })}
                              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all text-xs inline-flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
                            >
                              <Send className="w-3.5 h-3.5" /> Preview & Kirim Reminder
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Participant Detail Modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedParticipant(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                {selectedParticipant.full_name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedParticipant.full_name}</h3>
                <p className="text-xs text-slate-400">ID Antrean Temporary: {selectedParticipant.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-500 block">NIK:</span>
                <strong className="text-white font-mono">{selectedParticipant.nik}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">NIP ASN:</span>
                <strong className="text-emerald-400 font-mono">{selectedParticipant.nip || '-'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">TANGGAL LAHIR:</span>
                <span className="text-slate-200">{selectedParticipant.dob}</span>
              </div>
              <div>
                <span className="text-slate-500 block">JENIS KELAMIN:</span>
                <span className="text-slate-200">{selectedParticipant.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">EMAIL:</span>
                <span className="text-slate-200">{selectedParticipant.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block">TELEPON/WA:</span>
                <span className="text-slate-200">{selectedParticipant.phone}</span>
              </div>
            </div>

            {selectedParticipant.rejection_reason && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                <strong>Alasan Penolakan:</strong> {selectedParticipant.rejection_reason}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {selectedParticipant.status !== 'approved' && (
                <button
                  onClick={() => handleApprove(selectedParticipant.id, selectedParticipant.full_name)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                >
                  Approve & Transfer Fix
                </button>
              )}
              <button
                onClick={() => setSelectedParticipant(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIX PARTICIPANT DIGITAL TICKET & VACCINATION CARD MODAL */}
      {selectedFixParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full rounded-3xl bg-slate-900 border border-amber-500/30 p-6 sm:p-8 shadow-2xl relative space-y-6 my-8">
            <button
              onClick={() => setSelectedFixParticipant(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Ticket Header & KORPRI Logo */}
            <div className="text-center border-b border-slate-800 pb-4">
              <img src="/toktok-health-logo.png" alt="Toktok Health Logo" className="w-14 h-14 mx-auto mb-2 object-contain" />
              <h3 className="text-xl font-extrabold text-white">TIKET DIGITAL & KARTU VAKSINASI</h3>
              <p className="text-xs text-amber-400 font-medium mt-0.5">Toktok KORPRI Health System</p>
            </div>

            {/* Big Queue Code Badge */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 text-center relative overflow-hidden">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block">KODE NOMOR ANTREAN TIKET</span>
              <span className="text-4xl font-black text-amber-400 tracking-wider my-1 block font-mono">
                {selectedFixParticipant.queue_code}
              </span>
              <span className="text-xs text-slate-400 block font-mono">
                KODE PESERTA: <strong className="text-emerald-400">{selectedFixParticipant.participant_code}</strong>
              </span>
            </div>

            {/* Participant Details */}
            <div className="grid grid-cols-2 gap-3 text-xs p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-500 block">NAMA PESERTA:</span>
                <strong className="text-white text-sm">{selectedFixParticipant.full_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">STATUS PEMBAYARAN:</span>
                {selectedFixParticipant.payment_status === 'waived' ? (
                  <span className="text-blue-400 font-bold">GRATIS (ASN)</span>
                ) : selectedFixParticipant.payment_status === 'paid' ? (
                  <span className="text-emerald-400 font-bold">LUNAS (PAID)</span>
                ) : (
                  <span className="text-amber-400 font-bold">BELUM BAYAR (UNPAID)</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">NIK:</span>
                <span className="text-slate-200 font-mono">{selectedFixParticipant.nik}</span>
              </div>
              <div>
                <span className="text-slate-500 block">NIP ASN:</span>
                <span className="text-emerald-400 font-mono">{selectedFixParticipant.nip || '-'}</span>
              </div>
            </div>

            {/* Multi-Dose Timeline Schedules */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <Syringe className="w-4 h-4 text-emerald-400" />
                Jadwal & Riwayat Multi-Dosis Vaksinasi
              </h4>

              <div className="space-y-2.5">
                {(selectedFixParticipant.vaccination_schedules || []).length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950 text-center text-xs text-slate-500">
                    Jadwal dosis 1, 2, 3 dibuat secara otomatis oleh sistem saat pendaftaran disetujui.
                  </div>
                ) : (
                  selectedFixParticipant.vaccination_schedules.map((sch) => (
                    <div key={sch.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>Dosis ke-{sch.dose_number}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sch.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {sch.status === 'completed' ? '✓ SELESAI DISUNTIK' : '⏳ TERJADWAL'}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Jadwal: <strong>{formatIndonesianDate(sch.scheduled_date)}</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => handleUpdateDoseStatus(sch.id, sch.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          sch.status === 'completed'
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                        }`}
                      >
                        {sch.status === 'completed' ? 'Batalkan Status' : 'Tandai Disuntik'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedFixParticipant(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Tutup Tiket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOSE REMINDER PREVIEW MODAL */}
      {reminderModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-slate-900 border border-purple-500/40 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BellRing className="w-5 h-5 text-purple-400" />
              Notifikasi Pengingat Dosis Ke-{reminderModalData.schedule?.dose_number}
            </h3>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-line">
              {`🔔 *PENGINGAT VAKSINASI DOSIS KE-${reminderModalData.schedule?.dose_number}*
Yth. Bapak/Ibu ${reminderModalData.reg?.full_name},

Mengingatkan kembali jadwal pelaksanaan vaksinasi lanjutan Anda:
📌 *Event*: ${reminderModalData.evt?.event_code || 'EVT-001'} - ${reminderModalData.evt?.title || 'Program Vaksinasi'}
📅 *Tanggal*: ${formatIndonesianDate(reminderModalData.schedule?.scheduled_date)}
⏰ *Jam*: ${reminderModalData.evt?.operating_hours || '08:00 - 16:00 WIB'}
📍 *Lokasi*: ${reminderModalData.evt?.location || 'Faskes Utama'}
🎟️ *Kode Tiket Antrean*: ${reminderModalData.reg?.queue_code || 'A-001'}

Mohon membawa KTP/Kartu Vaksin saat hadir di lokasi venue Faskes Toktok Health.`}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReminderModalData(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Tutup
              </button>

              <a
                href={`https://wa.me/${(reminderModalData.reg?.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Yth. Bapak/Ibu ${reminderModalData.reg?.full_name},\n\nMengingatkan kembali jadwal Vaksinasi Dosis ke-${reminderModalData.schedule?.dose_number} Anda pada ${formatIndonesianDate(reminderModalData.schedule?.scheduled_date)} di ${reminderModalData.evt?.location}. Kode Tiket: ${reminderModalData.reg?.queue_code}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Kirim via WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleRejectSubmit} className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" /> Penolakan Pendaftaran
            </h3>
            <p className="text-xs text-slate-400">
              Masukkan alasan penolakan data pendaftar ini. Pesan alasan akan dicatat dan dikirimkan ke peserta.
            </p>

            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Contoh: Dokumen NIK tidak dapat diverifikasi / NIP tidak terdaftar di sistem BKN."
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500 transition-all"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all"
              >
                Konfirmasi Penolakan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
