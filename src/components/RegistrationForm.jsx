import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  FileText, 
  Mail, 
  Phone, 
  Calendar, 
  Building2, 
  Upload, 
  Loader2,
  Sparkles,
  Info,
  Lock,
  MapPin,
  Check,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { parseNIK, parseNIP, validateEmail } from '../utils/validation';

// Helper function for Indonesian date formatting (DD Month YYYY)
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

export default function RegistrationForm() {
  // Form State
  const [formData, setFormData] = useState({
    eventId: '',
    registrationType: 'perorangan_publik', // perorangan_publik | perorangan_internal | kelompok
    nik: '',
    nip: '',
    fullName: '',
    phone: '',
    gender: '',
    dob: '',
    address: '',
    email: '',
  });

  // PDP Consent state (UU No. 27/2022)
  const [pdpConsent, setPdpConsent] = useState(false);

  // Events list fetched from Supabase
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Validation Errors & Warnings
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [nikParsedInfo, setNikParsedInfo] = useState(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Default fallback events list to ensure cards always render even if Supabase table is empty or migrating
  const DEFAULT_EVENTS = [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      event_number: 1,
      event_code: 'EVT-001',
      title: 'Program Vaksinasi HPV Subtipe 9 untuk ASN & Keluarga 2026',
      vaccine_type: 'Vaksin HPV Subtipe 9',
      quota: 500,
      remaining_quota: 342,
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
      title: 'Program Vaksinasi Booster Influenza untuk Pegawai KORPRI',
      vaccine_type: 'Vaksin Influenza Kuadrivalen',
      quota: 300,
      remaining_quota: 185,
      location: 'Klinik Pratama Toktok Health Senayan',
      venue_address: 'Gedung Kemenpora Lt. 2, Jl. Gerbang Pemuda No. 3, Gelora, Jakarta Pusat',
      operating_hours: '08:00 - 16:00 WIB',
      event_date: '2026-10-22',
      status: 'active'
    },
    {
      id: 'e0000000-0000-0000-0000-000000000003',
      event_number: 3,
      event_code: 'EVT-003',
      title: 'Program Vaksinasi Hepatitis B & Skrining Kesehatan Faskes',
      vaccine_type: 'Vaksin Hepatitis B Rekombinan',
      quota: 250,
      remaining_quota: 98,
      location: 'Poliklinik Gedung Sekretariat Negara',
      venue_address: 'Jl. Veteran No. 17-18, Gambir, Jakarta Pusat',
      operating_hours: '08:00 - 16:00 WIB',
      event_date: '2026-11-05',
      status: 'active'
    }
  ];

  // Fetch Active Events from Supabase with robust fallback
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoadingEvents(true);
        let fetchedEvents = [];

        // Flexible select * to support databases with/without recent migration columns
        const { data, error } = await supabase
          .from('events')
          .select('*');

        if (!error && data && data.length > 0) {
          // Filter out inactive if status column exists, otherwise keep all
          const activeList = data.filter(e => !e.status || e.status === 'active');
          
          fetchedEvents = (activeList.length > 0 ? activeList : data).map((e, idx) => ({
            id: e.id || `evt-${idx + 1}`,
            event_number: e.event_number || (idx + 1),
            event_code: e.event_code || `EVT-00${(idx % 5) + 1}`,
            title: (e.title || 'Program Vaksinasi Toktok Health').replace(/massal/gi, '').trim(),
            vaccine_type: e.vaccine_type || 'Vaksin HPV Subtipe 9',
            quota: e.quota || 500,
            remaining_quota: e.remaining_quota !== undefined ? e.remaining_quota : Math.max(0, (e.quota || 500) - (e.reserved_quota || 0)),
            location: e.location || 'Auditorium Gedung KORPRI / Faskes Utama',
            venue_address: e.venue_address || 'Jl. Lapangan Banteng Barat No. 34, Pasar Baru, Jakarta Pusat',
            operating_hours: e.operating_hours || '08:00 - 16:00 WIB',
            event_date: e.event_date || '2026-10-15',
            status: e.status || 'active'
          }));
        }

        if (fetchedEvents.length === 0) {
          fetchedEvents = DEFAULT_EVENTS;
        }

        setEvents(fetchedEvents);
        setFormData((prev) => ({ 
          ...prev, 
          eventId: prev.eventId || fetchedEvents[0]?.id || DEFAULT_EVENTS[0].id 
        }));
      } catch (err) {
        console.error('Error fetching events:', err);
        setEvents(DEFAULT_EVENTS);
        setFormData((prev) => ({ ...prev, eventId: DEFAULT_EVENTS[0].id }));
      } finally {
        setLoadingEvents(false);
      }
    }

    fetchEvents();
  }, []);

  // Validate fields in real-time
  const validateField = (name, value, currentFormData = formData) => {
    let newErrors = { ...errors };
    let newWarnings = { ...warnings };

    if (name === 'nik') {
      const parsed = parseNIK(value);
      if (!value) {
        newErrors.nik = 'NIK wajib diisi.';
        setNikParsedInfo(null);
      } else if (!parsed.isValid) {
        newErrors.nik = parsed.error;
        setNikParsedInfo(null);
      } else {
        delete newErrors.nik;
        setNikParsedInfo(parsed);

        // Auto-sync DOB & Gender only if valid date string parsed from NIK
        if (parsed.dobString && (!currentFormData.dob || currentFormData.dob !== parsed.dobString)) {
          setFormData((prev) => ({
            ...prev,
            dob: parsed.dobString,
            gender: parsed.gender || prev.gender,
          }));
        }
      }
    }

    if (name === 'nip') {
      if (currentFormData.registrationType === 'perorangan_internal') {
        const parsedNip = parseNIP(value);
        if (!parsedNip.isValid) {
          newErrors.nip = parsedNip.error;
        } else {
          delete newErrors.nip;
        }
      } else {
        // Optional for public
        if (value && value.trim().length > 0) {
          const parsedNip = parseNIP(value);
          if (!parsedNip.isValid) {
            newErrors.nip = parsedNip.error;
          } else {
            delete newErrors.nip;
          }
        } else {
          delete newErrors.nip;
        }
      }
    }

    if (name === 'dob') {
      if (!value) {
        newErrors.dob = 'Tanggal lahir wajib diisi.';
      } else {
        delete newErrors.dob;
      }
    }

    if (name === 'gender') {
      if (!value) {
        newErrors.gender = 'Jenis kelamin wajib dipilih.';
      } else {
        delete newErrors.gender;
      }
    }

    if (name === 'email') {
      const emailRes = validateEmail(value);
      if (!emailRes.isValid) {
        newErrors.email = emailRes.error;
        delete newWarnings.email;
      } else {
        delete newErrors.email;
        if (emailRes.warning) {
          newWarnings.email = emailRes.warning;
        } else {
          delete newWarnings.email;
        }
      }
    }

    if (name === 'fullName') {
      if (!value || value.trim().length < 3) {
        newErrors.fullName = 'Nama lengkap minimal 3 karakter.';
      } else {
        delete newErrors.fullName;
      }
    }

    if (name === 'phone') {
      if (!value || !/^[0-9]{9,15}$/.test(value.replace(/[^0-9]/g, ''))) {
        newErrors.phone = 'Nomor HP / WhatsApp wajib diisi (9-15 digit angka).';
      } else {
        delete newErrors.phone;
      }
    }

    if (name === 'address') {
      if (!value || !value.trim()) {
        newErrors.address = 'Kota domisili wajib diisi (contoh: Jakarta Pusat, Surabaya...).';
      } else {
        delete newErrors.address;
      }
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    validateField(name, value, updated);
  };

  const handleRegistrationTypeChange = (type) => {
    const updated = { ...formData, registrationType: type };
    setFormData(updated);
    if (type === 'perorangan_publik') {
      const newErrors = { ...errors };
      delete newErrors.nip;
      setErrors(newErrors);
    } else if (type === 'perorangan_internal') {
      validateField('nip', formData.nip, updated);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // UU PDP Consent Check
    if (!pdpConsent) {
      setSubmitError('Anda wajib menyetujui Pemrosesan Data Pribadi (UU No. 27/2022) sebelum mengirimkan pendaftaran.');
      return;
    }

    // Run all validations
    validateField('fullName', formData.fullName);
    validateField('nik', formData.nik);
    validateField('nip', formData.nip);
    validateField('dob', formData.dob);
    validateField('gender', formData.gender);
    validateField('email', formData.email);
    validateField('phone', formData.phone);

    const hasErrors = Object.keys(errors).length > 0;

    if (hasErrors || !formData.nik || !formData.fullName || !formData.email || !formData.phone) {
      setSubmitError('Mohon periksa dan perbaiki kesalahan pada form sebelum mengirim.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        event_id: formData.eventId,
        registration_type: formData.registrationType,
        nik: formData.nik.trim(),
        nip: formData.nip ? formData.nip.trim() : null,
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        dob: formData.dob,
        address: formData.address.trim() || null,
        email: formData.email.trim(),
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('registrations')
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('NIK atau NIP ini sudah terdaftar pada event vaksinasi yang sama!');
        }
        throw error;
      }

      setSubmitSuccess(data);
      // Reset form
      setFormData({
        eventId: events[0]?.id || '',
        registrationType: 'perorangan_publik',
        nik: '',
        nip: '',
        fullName: '',
        phone: '',
        gender: '',
        dob: '',
        address: '',
        email: '',
      });
      setPdpConsent(false);
      setErrors({});
      setWarnings({});
      setNikParsedInfo(null);
    } catch (err) {
      setSubmitError(err.message || 'Terjadi kesalahan saat pendaftaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEvent = events.find((e) => e.id === formData.eventId);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 p-2 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-xl shadow-amber-500/10 flex items-center justify-center backdrop-blur-md">
          <img src="/toktok-health-logo.png" alt="Lambang Toktok Health KORPRI" className="w-full h-full object-contain" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          Toktok KORPRI Vaccination Portal
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Form Pendaftaran Vaksinasi
        </h1>
        <p className="mt-2 text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
          Sistem terintegrasi pendaftaran vaksinasi HPV untuk ASN, Keluarga, & Masyarakat Umum dengan validasi data real-time.
        </p>
      </div>

      {/* Success Modal / Ticket Box */}
      {submitSuccess && (
        <div className="mb-8 p-6 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">Pendaftaran Berhasil Dikirim!</h3>
              <p className="text-sm text-emerald-300 mt-1">
                Data pendaftaran Anda telah masuk ke dalam antrean sementara (*Temporary Registration*) untuk diverifikasi oleh Admin Faskes.
              </p>
              <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs font-mono grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                <div><span className="text-slate-500 block">ID TIKET:</span> <strong className="text-emerald-400">{submitSuccess.id}</strong></div>
                <div><span className="text-slate-500 block">NAMA:</span> {submitSuccess.full_name}</div>
                <div><span className="text-slate-500 block">NIK:</span> {submitSuccess.nik}</div>
                <div><span className="text-slate-500 block">STATUS:</span> <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase font-semibold text-[10px]">PENDING VERIFICATION</span></div>
              </div>
              <button
                onClick={() => setSubmitSuccess(null)}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all"
              >
                Daftarkan Peserta Lain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Type Tabs (Perorangan ASN / Internal Hidden as requested) */}
      <div className="mb-6 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => handleRegistrationTypeChange('perorangan_publik')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            formData.registrationType === 'perorangan_publik'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <User className="w-4 h-4" />
          Perorangan (Pendaftaran Standar)
        </button>

        <button
          type="button"
          onClick={() => handleRegistrationTypeChange('kelompok')}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            formData.registrationType === 'kelompok'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Upload className="w-4 h-4" />
          Kelompok (Import Excel)
        </button>
      </div>

      {/* Excel Upload Mode Info */}
      {formData.registrationType === 'kelompok' ? (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Pendaftaran Kolektif / Kelompok</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Unggah file format Excel (.xlsx / .csv) yang memuat daftar pendaftar instansi atau komunitas Anda.
          </p>
          <div className="mt-6 inline-flex flex-col sm:flex-row items-center gap-3">
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" id="excel-upload" />
            <label
              htmlFor="excel-upload"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold cursor-pointer transition-all shadow-lg shadow-emerald-600/20"
            >
              Pilih Berkas Excel
            </label>
            <button
              type="button"
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all"
            >
              Unduh Template Format Excel
            </button>
          </div>
        </div>
      ) : (
        /* Form Element */
        <form onSubmit={handleSubmit} className="space-y-8 p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl">
          
          {submitError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong>Gagal Mengirim Form:</strong> {submitError}
              </div>
            </div>
          )}

          {/* Section 1: Event Selection as Card Grid UI */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Pilih Kegiatan Vaksinasi *
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Silakan pilih jadwal dan lokasi faskes pelaksanaan vaksinasi yang tersedia.
                </p>
              </div>
              {loadingEvents && (
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> Memuat Event...
                </span>
              )}
            </div>

            {/* Event Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((event) => {
                const isSelected = formData.eventId === event.id;
                const isFull = event.remaining_quota <= 0;
                const quotaPercent = Math.min(100, Math.max(0, ((event.quota - event.remaining_quota) / event.quota) * 100));
                const formattedDate = formatIndonesianDate(event.event_date);

                return (
                  <div
                    key={event.id}
                    onClick={() => {
                      if (!isFull) {
                        setFormData((prev) => ({ ...prev, eventId: event.id }));
                      }
                    }}
                    className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isFull
                        ? 'opacity-60 bg-slate-950/50 border-slate-800/80 cursor-not-allowed'
                        : isSelected
                        ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-950/50 scale-[1.01]'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Top Row: Event Code Badge, Quota Status & Select Indicator */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        {event.event_code && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-amber-400 border border-slate-700 font-mono">
                            {event.event_code}
                          </span>
                        )}
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isFull
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : event.remaining_quota <= event.quota * 0.2
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {isFull ? '🔴 Kuota Penuh' : event.remaining_quota <= event.quota * 0.2 ? '🟡 Sisa Sedikit' : '🟢 Kuota Tersedia'}
                        </span>
                      </div>

                      {isSelected && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Terpilih
                        </span>
                      )}
                    </div>

                    {/* HERO HIGHLIGHT: Venue Faskes, Detail Alamat & Tanggal / Jam */}
                    <div className="space-y-2.5 mb-3">
                      {/* Venue & Detail Alamat Highlight */}
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">Lokasi Faskes / Venue</span>
                          <h4 className="text-base font-extrabold text-white leading-snug">
                            {event.location}
                          </h4>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            📍 {event.venue_address || 'Jl. Jenderal Sudirman No. 45, Jakarta Pusat'}
                          </p>
                        </div>
                      </div>

                      {/* Tanggal & Jam Pelaksanaan Highlight (Format: 15 Oktober 2026 • 08:00 - 16:00 WIB) */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-xs sm:text-sm">
                          <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 font-semibold text-xs sm:text-sm">
                          <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span>{event.operating_hours || '08:00 - 16:00 WIB'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Program Title & Vaccine Type (Secondary Info) */}
                    <div className="pt-2 border-t border-slate-800/60">
                      <p className="text-xs font-semibold text-slate-300 leading-normal line-clamp-2">
                        {event.title}
                      </p>
                      
                      {event.vaccine_type && (
                        <div className="mt-1.5 text-[11px] font-medium text-slate-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{event.vaccine_type}</span>
                        </div>
                      )}
                    </div>

                    {/* Quota Progress Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-slate-400">Sisa Kuota:</span>
                        <span className="font-extrabold text-white">
                          <strong className="text-emerald-400">{event.remaining_quota}</strong> / {event.quota} Dosis
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isFull ? 'bg-rose-500' : isSelected ? 'bg-emerald-400' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${quotaPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-800/80" />

          {/* Section 2: Personal Identity Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* NIK Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>NIK (16 Digit) *</span>
                {nikParsedInfo?.isValid && (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Termuat dari NIK
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="nik"
                  maxLength={16}
                  value={formData.nik}
                  onChange={handleChange}
                  placeholder="Contoh: 3171012508950001"
                  className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-white text-sm focus:outline-none transition-all ${
                    errors.nik
                      ? 'border-rose-500 focus:border-rose-500'
                      : nikParsedInfo?.isValid
                      ? 'border-emerald-500 focus:border-emerald-500'
                      : 'border-slate-800 focus:border-emerald-500'
                  }`}
                />
                {nikParsedInfo?.isValid && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 absolute right-3 top-3.5" />
                )}
              </div>
              {errors.nik && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.nik}
                </p>
              )}
            </div>

            {/* NIP Input (Mandatory if ASN, Optional for Public) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                NIP ASN (18 Digit) {formData.registrationType === 'perorangan_internal' ? '*' : '(Opsional)'}
              </label>
              <input
                type="text"
                name="nip"
                maxLength={18}
                value={formData.nip}
                onChange={handleChange}
                placeholder="Contoh: 199508252020121001"
                className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-white text-sm focus:outline-none transition-all ${
                  errors.nip ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                }`}
              />
              {errors.nip && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.nip}
                </p>
              )}
            </div>

            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Nama Lengkap (Sesuai KTP) *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Masukkan nama lengkap pendaftar"
                className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-white text-sm focus:outline-none transition-all ${
                  errors.fullName ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                }`}
              />
              {errors.fullName && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.fullName}
                </p>
              )}
            </div>

            {/* Date of Birth (DOB) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Tanggal Lahir *
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-white text-sm focus:outline-none transition-all ${
                  errors.dob ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                }`}
              />
              {errors.dob && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.dob}
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Jenis Kelamin *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-white text-sm focus:outline-none transition-all ${
                  errors.gender ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                }`}
              >
                <option value="">-- Pilih Jenis Kelamin --</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
              {errors.gender && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.gender}
                </p>
              )}
            </div>

            {/* Email with .con Typo Alert */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Alamat Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nama@domain.com"
                className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-white text-sm focus:outline-none transition-all ${
                  errors.email
                    ? 'border-rose-500'
                    : warnings.email
                    ? 'border-amber-500'
                    : 'border-slate-800 focus:border-emerald-500'
                }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.email}
                </p>
              )}
              {warnings.email && !errors.email && (
                <p className="mt-1.5 text-xs text-amber-400 flex items-center gap-1 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  {warnings.email}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                No. WhatsApp / Telepon *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Contoh: 081234567890"
                className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-white text-sm focus:outline-none transition-all ${
                  errors.phone ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                }`}
              />
              {errors.phone && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.phone}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Kota Domisili Saat Ini *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Contoh: Jakarta Pusat, Surabaya, Bandung, Medan..."
                className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-white text-sm focus:outline-none transition-all ${
                  errors.address ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                }`}
              />
              <div className="mt-2 text-xs text-amber-300/90 flex items-start gap-2 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 leading-relaxed">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-400 block mb-0.5">💡 Hint Kota Domisili:</strong>
                  Masukkan nama kota tempat Anda berdomisili saat ini (misal: <em>Jakarta Pusat, Surabaya, Bandung</em>). Kota domisili Anda akan dicocokkan otomatis oleh sistem Hermes dengan kota lokasi faskes event yang Anda pilih. Apabila kota domisili berbeda dengan lokasi event (misal: Domisili Jakarta tapi memilih Event Surabaya), pendaftaran akan ditandai (*flagged*) untuk konfirmasi verifikasi admin.
                </div>
              </div>
              {errors.address && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.address}
                </p>
              )}
            </div>
          </div>

          {/* Section 3: UU PDP (Perlindungan Data Pribadi No. 27/2022) Consent Banner */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Persetujuan Pemrosesan Data Pribadi (UU PDP No. 27 Tahun 2022)
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Berdasarkan UU Perlindungan Data Pribadi (UU PDP), identitas berupa <strong>NIK, NIP, Tanggal Lahir, Jenis Kelamin, serta Alamat Email</strong> Anda hanya diproses secara <em>strictly confidential</em> khusus untuk keperluan verifikasi antrean pendaftaran vaksinasi massal Toktok Health & mesin audit otomatis Hermes. Data Anda tidak akan dibagikan kepada pihak ketiga tanpa persetujuan tertulis.
                </p>

                <label className="mt-4 flex items-start gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={pdpConsent}
                    onChange={(e) => setPdpConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950 transition-all"
                  />
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors leading-snug">
                    Saya telah membaca, memahami, dan menyetujui pemrosesan data pribadi saya (NIK/NIP/Identitas) sesuai dengan ketentuan UU Perlindungan Data Pribadi No. 27 Tahun 2022. *
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              * Data pendaftaran akan diverifikasi otomatis oleh mesin audit Hermes.
            </p>
            <button
              type="submit"
              disabled={isSubmitting || !pdpConsent}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-white text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                !pdpConsent
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-600/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Kirim Pendaftaran
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

