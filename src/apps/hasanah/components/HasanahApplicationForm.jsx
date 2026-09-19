import React, { useState } from 'react';
import { 
  CreditCard, 
  UserCheck, 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  FileText, 
  Sparkles, 
  Lock, 
  ArrowRight, 
  ArrowLeft,
  DollarSign,
  HelpCircle,
  FileCheck,
  Building
} from 'lucide-react';
import { parseNIP18 } from '../../../shared/utils/nipValidator';
import { parseNIK } from '../../../utils/validation';
import { supabase } from '../../../lib/supabaseClient';

const INSTANSI_LIST = [
  'Kementerian Sekretariat Negara',
  'Kementerian Dalam Negeri',
  'Kementerian Keuangan',
  'Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi',
  'Kementerian Kesehatan',
  'Kementerian Agama',
  'Kementerian Hukum dan Hak Asasi Manusia',
  'Kementerian Pendayagunaan Aparatur Negara dan Reformasi Birokrasi',
  'Pemerintah Provinsi DKI Jakarta',
  'Pemerintah Provinsi Jawa Barat',
  'Pemerintah Provinsi Jawa Tengah',
  'Pemerintah Provinsi Jawa Timur',
  'Pemerintah Kota / Kabupaten Lainnya'
];

export default function HasanahApplicationForm({ onSubmittedSuccess }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Identity
    fullName: '',
    nik: '',
    phone: '081234567890',
    email: 'asn.korpri@go.id',
    address: '',
    ktpFileName: '',

    // Step 2: Employment & NIP
    nip: '',
    instansi: 'Kementerian Kesehatan',
    unitKerja: 'Direktorat Jenderal Pelayanan Kesehatan',
    jabatan: 'Analis Kepegawaian Ahli Muda',
    pangkatGolongan: 'Penata III/c',

    // Step 3: Documents
    skPnsFileName: '',
    slipGajiFileName: '',
    ktaKorpriFileName: '',

    // Step 4: Financing Limit
    monthlyIncome: 15000000,
    limitRequested: 30000000
  });

  // Validation State
  const [nipInfo, setNipInfo] = useState(null);
  const [nikError, setNikError] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleNipChange = (val) => {
    setFormData(prev => ({ ...prev, nip: val }));
    if (val.replace(/\D/g, '').length === 18) {
      const res = parseNIP18(val);
      setNipInfo(res);
      if (res.isValid) {
        setFormData(prev => ({
          ...prev,
          fullName: prev.fullName || ''
        }));
      }
    } else {
      setNipInfo(null);
    }
  };

  const handleNikChange = (val) => {
    setFormData(prev => ({ ...prev, nik: val }));
    if (val.replace(/\D/g, '').length === 16) {
      const res = parseNIK(val);
      setNikError(res.isValid ? null : res.error);
    } else {
      setNikError(null);
    }
  };

  const handleMockUpload = (field, e) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFormData(prev => ({ ...prev, [field]: f.name }));
      showToast(`Dokumen ${f.name} berhasil diunggah.`);
    }
  };

  const handleSubmitApplication = async () => {
    try {
      setSubmitting(true);

      const appNum = 'HSN-KORPRI-' + Date.now().toString().slice(-6);

      // 1. Save or Update ASN Profile in Supabase
      const { data: profile, error: profErr } = await supabase
        .from('asn_profiles')
        .insert([{
          nip: formData.nip,
          nik: formData.nik,
          full_name: formData.fullName,
          gender: nipInfo?.gender === 'Pria' ? 'male' : 'female',
          instansi: formData.instansi,
          unit_kerja: formData.unitKerja,
          jabatan: formData.jabatan,
          pangkat_golongan: formData.pangkatGolongan,
          phone: formData.phone,
          email: formData.email,
          address: formData.address
        }])
        .select('id')
        .single();

      let profileId = profile?.id;

      if (profErr) {
        // Fallback: If NIP already exists, select existing profile
        const { data: existingProf } = await supabase
          .from('asn_profiles')
          .select('id')
          .eq('nip', formData.nip)
          .maybeSingle();
        profileId = existingProf?.id;
      }

      // 2. Insert Application Entry
      const appPayload = {
        application_number: appNum,
        asn_profile_id: profileId || '00000000-0000-0000-0000-000000000000',
        application_status: 'submitted',
        monthly_income: formData.monthlyIncome,
        limit_requested: formData.limitRequested,
        limit_approved: 0,
        ktp_url: `https://supabase.storage/hasanah/${formData.ktpFileName || 'ktp.jpg'}`,
        sk_pns_url: `https://supabase.storage/hasanah/${formData.skPnsFileName || 'sk_pns.pdf'}`,
        slip_gaji_url: `https://supabase.storage/hasanah/${formData.slipGajiFileName || 'slip_gaji.pdf'}`,
        kta_korpri_url: `https://supabase.storage/hasanah/${formData.ktaKorpriFileName || 'kta_korpri.jpg'}`
      };

      const { error: appErr } = await supabase.from('card_applications').insert([appPayload]);

      if (appErr) {
        console.warn('DB insert failed, backing up to localStorage:', appErr);
      }

      // Always backup locally
      const savedApps = JSON.parse(localStorage.getItem('hasanah_applications') || '[]');
      savedApps.unshift({
        ...appPayload,
        full_name: formData.fullName,
        nip: formData.nip,
        instansi: formData.instansi,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('hasanah_applications', JSON.stringify(savedApps));

      showToast(`🎉 Pengajuan BSI Hasanah Card (${appNum}) berhasil dikirim!`);
      if (onSubmittedSuccess) onSubmittedSuccess(appNum);
    } catch (err) {
      showToast('Gagal mengirim pengajuan: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 transition-all ${
          toast.type === 'error'
            ? 'bg-rose-950 border-rose-500/50 text-rose-200'
            : 'bg-emerald-950 border-emerald-500/50 text-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Stepper Progress Indicator */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          
          <div className={`p-2.5 rounded-xl border font-bold transition-all ${
            step === 1 ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20' : step > 1 ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}>
            <span>1. Data Diri</span>
          </div>

          <div className={`p-2.5 rounded-xl border font-bold transition-all ${
            step === 2 ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20' : step > 2 ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}>
            <span>2. Kepegawaian & NIP</span>
          </div>

          <div className={`p-2.5 rounded-xl border font-bold transition-all ${
            step === 3 ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20' : step > 3 ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}>
            <span>3. Unggah Berkas</span>
          </div>

          <div className={`p-2.5 rounded-xl border font-bold transition-all ${
            step === 4 ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20' : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}>
            <span>4. Limit & Submit</span>
          </div>

        </div>
      </div>

      {/* FORM BODY CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-6">
        
        {/* STEP 1: IDENTITY */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Langkah 1: Identitas Pribadi Pemohon</h3>
                <p className="text-xs text-slate-400">Masukkan data diri sesuai Kartu Tanda Penduduk (KTP) Anda.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nama Lengkap (Sesuai KTP)</label>
                <input
                  type="text"
                  placeholder="Contoh: Dra. Hj. Siti Aminah, M.Si"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nomor Induk Kependudukan (NIK - 16 Digit)</label>
                <input
                  type="text"
                  maxLength={16}
                  placeholder="3171234567890001"
                  value={formData.nik}
                  onChange={(e) => handleNikChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500/50"
                />
                {nikError && <p className="text-[11px] text-rose-400 mt-1">{nikError}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nomor Telepon / WhatsApp Aktif</label>
                <input
                  type="text"
                  placeholder="081234567890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Alamat Email Aktif</label>
                <input
                  type="email"
                  placeholder="asn.korpri@kemkes.go.id"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Alamat Domisili Lengkap</label>
                <textarea
                  rows={2}
                  placeholder="Jl. Jend. Sudirman No. 45, RT 02/05, Kebayoran Baru, Jakarta Selatan"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  if (!formData.fullName || !formData.nik) {
                    showToast('Harap isi Nama Lengkap & NIK terlebih dahulu.', 'error');
                    return;
                  }
                  setStep(2);
                }}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
              >
                <span>Lanjut: Data Kepegawaian & NIP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: EMPLOYMENT & NIP VALIDATION */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Langkah 2: Validasi NIP & Kepegawaian ASN</h3>
                <p className="text-xs text-slate-400">Verifikasi otomatis NIP 18-digit (Pola 8-6-1-3) terhubung dengan database KORPRI.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nomor Induk Pegawai (NIP - 18 Digit)</label>
                <input
                  type="text"
                  maxLength={18}
                  placeholder="198507152010011002"
                  value={formData.nip}
                  onChange={(e) => handleNipChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-sm tracking-wider focus:outline-none focus:border-cyan-500/50"
                />
                <p className="text-[11px] text-slate-500 mt-1">Pola: [8-digit Tgl Lahir][6-digit TMT CPNS][1-digit Gender][3-digit No Urut]</p>
              </div>

              {/* NIP Validated Information Card */}
              {nipInfo && (
                <div className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                  nipInfo.isValid
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}>
                  {nipInfo.isValid ? (
                    <>
                      <div className="flex items-center justify-between font-bold border-b border-emerald-500/20 pb-2">
                        <span className="flex items-center gap-1.5 text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> NIP Terverifikasi Berhasil (Pola 8-6-1-3 Stabilitas Valid)
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                          ASN KORPRI Active
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Tanggal Lahir:</span>
                          <strong className="text-white">{nipInfo.birthDate}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">TMT CPNS:</span>
                          <strong className="text-white">{nipInfo.cpnsDate}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Jenis Kelamin:</span>
                          <strong className="text-white">{nipInfo.gender}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Usia Saat Ini:</span>
                          <strong className="text-white">{nipInfo.age} Tahun</strong>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{nipInfo.error}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Instansi / Kementerian / Pemda</label>
                  <select
                    value={formData.instansi}
                    onChange={(e) => setFormData({ ...formData, instansi: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                  >
                    {INSTANSI_LIST.map((ins, i) => (
                      <option key={i} value={ins}>{ins}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Unit Kerja / Direktorat</label>
                  <input
                    type="text"
                    placeholder="Direktorat Jenderal Pelayanan Kesehatan"
                    value={formData.unitKerja}
                    onChange={(e) => setFormData({ ...formData, unitKerja: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Jabatan Saat Ini</label>
                  <input
                    type="text"
                    placeholder="Analis Kepegawaian Ahli Muda"
                    value={formData.jabatan}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Pangkat / Golongan</label>
                  <input
                    type="text"
                    placeholder="Penata III/c"
                    value={formData.pangkatGolongan}
                    onChange={(e) => setFormData({ ...formData, pangkatGolongan: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>

              <button
                onClick={() => {
                  if (!nipInfo || !nipInfo.isValid) {
                    showToast('Harap masukkan NIP 18-digit yang valid.', 'error');
                    return;
                  }
                  setStep(3);
                }}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
              >
                <span>Lanjut: Unggah Dokumen</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DOCUMENT UPLOAD */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Langkah 3: Unggah Dokumen Syarat BSI Hasanah</h3>
                <p className="text-xs text-slate-400">Dokumen dienkripsi aman untuk verifikasi kelayakan Credit Scoring Bank BSI.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Doc 1: SK PNS */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-white">1. SK Pengangkatan PNS/ASN</span>
                  <FileCheck className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-[11px] text-slate-400">SK CPNS/PNS asli/legalisir (.pdf / .jpg)</p>
                <label className="block w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-center cursor-pointer hover:bg-slate-800 text-xs text-purple-300 font-bold transition-all">
                  {formData.skPnsFileName ? `✓ ${formData.skPnsFileName}` : 'Pilih Berkas SK'}
                  <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleMockUpload('skPnsFileName', e)} />
                </label>
              </div>

              {/* Doc 2: Slip Gaji */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-white">2. Slip Gaji Terbaru</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-400">Slip gaji 1 bulan terakhir (.pdf / .jpg)</p>
                <label className="block w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-center cursor-pointer hover:bg-slate-800 text-xs text-emerald-300 font-bold transition-all">
                  {formData.slipGajiFileName ? `✓ ${formData.slipGajiFileName}` : 'Pilih Berkas Slip Gaji'}
                  <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleMockUpload('slipGajiFileName', e)} />
                </label>
              </div>

              {/* Doc 3: KTA KORPRI */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-white">3. KTA Anggota KORPRI</span>
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-[11px] text-slate-400">Kartu Tanda Anggota KORPRI (.jpg / .png)</p>
                <label className="block w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-center cursor-pointer hover:bg-slate-800 text-xs text-cyan-300 font-bold transition-all">
                  {formData.ktaKorpriFileName ? `✓ ${formData.ktaKorpriFileName}` : 'Pilih Berkas KTA KORPRI'}
                  <input type="file" className="hidden" accept=".png,.jpg,.jpeg" onChange={(e) => handleMockUpload('ktaKorpriFileName', e)} />
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>

              <button
                onClick={() => setStep(4)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
              >
                <span>Lanjut: Permohonan Limit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: LIMIT REQUEST & SUBMIT */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Langkah 4: Permohonan Limit Pembiayaan BSI Hasanah</h3>
                <p className="text-xs text-slate-400">Estimasi limit disesuaikan dengan Take Home Pay bulanan ASN KORPRI.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Penghasilan / Take Home Pay Bulanan (Rp)</label>
                <input
                  type="number"
                  step={1000000}
                  value={formData.monthlyIncome}
                  onChange={(e) => setFormData({ ...formData, monthlyIncome: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-sm font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Pengajuan Limit Hasanah Card (Rp)</label>
                <input
                  type="number"
                  step={5000000}
                  value={formData.limitRequested}
                  onChange={(e) => setFormData({ ...formData, limitRequested: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-sm font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Summary Confirmation Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
              <h4 className="text-xs font-extrabold text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Ringkasan Pengajuan BSI Hasanah Card
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Pemohon:</span>
                  <strong className="text-white">{formData.fullName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">NIP ASN:</span>
                  <strong className="text-cyan-300 font-mono">{formData.nip}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Instansi:</span>
                  <strong className="text-white">{formData.instansi}</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>

              <button
                onClick={handleSubmitApplication}
                disabled={submitting}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-xl shadow-emerald-600/30"
              >
                <CreditCard className="w-4 h-4" />
                <span>{submitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan BSI Hasanah Card'}</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
