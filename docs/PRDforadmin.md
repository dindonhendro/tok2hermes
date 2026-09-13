# PRODUCT REQUIREMENT DOCUMENT (PRD)
## Modul Admin Control Panel: File Browser & Excel Uploader (Toktok Health)

* **Dokumen Versi**: 1.0
* **Target Sistem**: Vite (React) + Supabase + Local VPS Storage + Hermes Agent Integration
* **Status**: Draft / Siap untuk Vibe Coding

---

### 1. 🎯 Tujuan Utama (Objective)
Menyediakan antarmuka web khusus bagi admin dan tim operasional Toktok Health untuk:
1. Mengunggah (*upload*) file Excel pendaftaran kolektif secara mandiri tanpa akses terminal VPS.
2. Meramban (*browse*), melihat daftar, dan mengelola file Excel yang tersimpan di direktori khusus server.
3. Menghubungkan file unggahan tersebut agar dapat langsung dipindai, diaudit, dan diproses secara otomatis oleh Hermes Agent ke dalam database Supabase.

---

### 2. 👥 Pengguna Target (Target Users)
* **Superadmin / Pimpinan** (Pak Antono / Anda): Akses penuh ke seluruh fitur panel.
* **Tim Operasional** (Ami, Kharisma, dkk.): Mengunggah file Excel kolektif dari instansi daerah/K/L.
* **Hermes Agent (Kabayan)**: Agen AI yang bertindak sebagai mesin otomatisasi di latar belakang untuk mengaudit file Excel yang diunggah.

---

### 3. 🛠️ Fitur Utama (Core Features)

#### A. Autentikasi & Keamanan Akses
* Halaman login khusus admin (terintegrasi dengan tabel `admins` / Supabase Auth atau *whitelist*).
* Pembatasan akses agar halaman Control Panel tidak bisa diakses oleh peserta umum/publik.

#### B. Modul Uploader File Excel
* Area *Drag-and-Drop* atau tombol *Browse File* khusus format `.xlsx` / `.xls`.
* Validasi otomatis di sisi *frontend* (memastikan hanya file Excel yang bisa diunggah).
* Sistem penamaan file yang aman (mencegah duplikasi nama file di server).
* Direktori penyimpanan fisik di server (misal: `/root/.hermes/toktok_uploads/` atau `~/.hermes/toktok_uploads/`).

#### C. Modul File Browser (Daftar Berkas)
* Menampilkan daftar tabel file Excel yang sudah pernah diunggah.
* Informasi file mencakup: Nama File, Ukuran File, Tanggal Unggah, dan Status Audit (*Sudah Diaudit / Belum*).
* Aksi cepat untuk setiap file: 
  * 👁️ **Lihat / Preview Ringkas** (menampilkan beberapa baris data pertama).
  * 🤖 **Jalankan Audit Hermes** (memanggil skrip audit untuk memindai NIK, NIP, dan email).
  * 🗑️ **Hapus File** (jika data salah/batal).

#### D. Integrasi Otomatisasi dengan Hermes
* Tombol aksi **"Audit dengan Kabayan"**. Saat diklik, sistem memicu API backend/skrip Python untuk membaca file di folder *uploads*, menjalankan validasi NIK/NIP ketat, dan melaporkan hasilnya langsung ke layar admin.

---

### 4. 🗄️ Arsitektur Data & Penyimpanan
* **Penyimpanan File Fisik**: Disimpan di direktori VPS lokal yang dapat diakses oleh Hermes:
  `~/.hermes/toktok_uploads/`
* **Pencatatan Metadata (Supabase)**: Tabel opsional `uploaded_files` untuk mencatat riwayat unggahan:
  * `id` (UUID)
  * `filename` (TEXT)
  * `file_path` (TEXT)
  * `uploaded_by` (TEXT)
  * `status` (TEXT: `'pending_audit'`, `'audited'`, `'error'`)
  * `created_at` (TIMESTAMP)

---

### 5. 🎨 Desain Antarmuka & Teknologi (UI/UX)
* **Framework**: React + Vite + Tailwind CSS (konsisten dengan arsitektur web Toktok Health saat ini).
* **Komponen Pendukung**: Lucide Icons, Shadcn UI / Tailwind Components yang bersih dan modern.
* **Tema Warna**: Nuansa *Medical/Enterprise Blue* (profesional, bersih, mudah dibaca oleh tim operasional).
