# PRODUCT REQUIREMENT DOCUMENT (PRD)
## Platform Pengajuan & Manajemen Pembiayaan Digital ASN KORPRI x BSI Hasanah Card

* **Versi Dokumen**: 1.0
* **Target Sistem**: Vite (React) + Supabase + Integrasi API Perbankan BSI
* **Status**: Draft / Siap untuk Memulai Pengembangan (Vibe Coding)

---

### 1. 🎯 Tujuan Utama (Objective)
Membangun platform digital terpusat (Super-App / Web Portal) yang memfasilitasi jutaan anggota ASN KORPRI di seluruh Indonesia untuk:
1. Mengajukan kepemilikan BSI Hasanah Card secara online (*digital onboarding*) dengan memanfaatkan PKS yang sudah ada antara KORPRI dan BSI.
2. Melakukan verifikasi keaslian status ASN secara instan melalui validasi NIP (pola 8-6-1-3) dan NIK.
3. Menyediakan dashboard bagi pengurus KORPRI dan tim operasional untuk memantau status pengajuan, limit pembiayaan, hingga laporan transaksi ekosistem tertutup (*closed-loop ecosystem*).

---

### 2. 👥 Pengguna Target (Target Users)
* **Anggota ASN KORPRI**: Pengguna akhir (pemohon kartu/pembiayaan).
* **Tim Verifikator / Admin KORPRI & Platform**: Memeriksa kelengkapan berkas awal dan validasi data instansi.
* **Tim BSI (Bank Syariah Indonesia)**: Mitra perbankan yang melakukan Credit Scoring dan pencetakan/persetujuan akhir (*Approval*) Hasanah Card.
* **Superadmin (Pemilik Platform)**: Mengawasi seluruh sistem dan laporan transaksi.

---

### 3. 🛠️ Fitur Utama (Core Features)

#### A. Modul Pendaftaran & Autentikasi (Onboarding)
* Registrasi akun menggunakan nomor HP / Email aktif.
* Verifikasi OTP berbasis WhatsApp/SMS.

#### B. Modul Form Pengajuan BSI Hasanah Card (*Digital Application Form*)
Input data mandiri calon nasabah:
* **Data Diri**: Nama, NIK, Alamat, Foto KTP.
* **Data Kepegawaian & Verifikasi NIP**: Sistem otomatis memvalidasi pola NIP 18 digit (8 digit tgl lahir, 6 digit TMT CPNS, 1 digit gender, 3 digit nomor urut).
* Pilih Instansi / Kementerian / Pemda asal.
* Unggah dokumen pendukung (SK Pengangkatan PNS/ASN, Slip Gaji, Tanda Anggota KORPRI).

#### C. Modul Dashboard Pengguna (*User Portal*)
* **Status Tracking Pengajuan**: Submitted ➔ Verifikasi KORPRI ➔ Review BSI ➔ Approved/Rejected ➔ Kartu Dikirim.
* Informasi limit pembiayaan Hasanah Card yang disetujui.
* Riwayat transaksi dan tagihan bulanan berbasis syariah.

#### D. Modul Dashboard Admin & Partner (BSI & KORPRI)
* **Tabel Antrean Pengajuan (*Submission Queue*)**: Filter berdasarkan instansi, status, dan tanggal.
* **Aksi Verifikasi**: Tombol *Approve* / *Reject* dengan catatan alasan penolakan yang jelas.
* **Laporan & Ekspor Data**: Rekapitulasi jumlah pemohon untuk keperluan pelaporan berkala ke pimpinan KORPRI dan pihak BSI.

---

### 4. 🗄️ Arsitektur Database (Supabase Schema)
* **Tabel `users`**: Menyimpan profil pengguna, nomor HP, dan *role* (`admin`, `verifikator`, `user_asn`).
* **Tabel `asn_profiles`**: Menyimpan detail kepegawaian (NIP, instansi, jabatan, pangkat/golongan, unit kerja).
* **Tabel `card_applications`**: Menyimpan data pengajuan BSI Hasanah Card:
  * `id`, `user_id`, `application_status` (`pending`, `verified`, `bsi_review`, `approved`, `rejected`), `limit_requested`, `limit_approved`, `documents_url`, `created_at`.
* **Tabel `audit_logs`**: Mencatat seluruh rekam jejak aktivitas persetujuan admin demi keamanan sistem.

---

### 5. 🎨 Desain Antarmuka & Teknologi (UI/UX)
* **Frontend**: React + Vite + Tailwind CSS (tampilan elegan bernuansa *Islamic Banking & Professional Corporate* — dominasi warna Hijau Syariah, Putih bersih, dan aksen Emas/Navy).
* **Keamanan**: Enkripsi data sensitif (NIK, NIP, Slip Gaji) serta penerapan *Row Level Security (RLS)* di Supabase agar data ASN terjaga kerahasiaannya.
