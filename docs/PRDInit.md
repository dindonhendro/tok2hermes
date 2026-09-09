# Product Requirements Document (PRD)
## Aplikasi Pendaftaran & Manajemen Vaksinasi "Toktok Health"

---

## 1. Gambaran Umum Produk (Overview)

**Toktok Health** adalah aplikasi web berbasis **Vite (React / Tailwind CSS)** dan **Supabase** yang dirancang khusus untuk mengelola seluruh alur pendaftaran dan operasional program vaksinasi massal (contohnya Program Vaksinasi HPV untuk ASN dan Keluarga). 

Aplikasi ini hadir dengan dua fokus utama:
1. **User Experience Publik yang Ramah & Responsif**: Memudahkan calon peserta dari kalangan umum maupun ASN untuk melakukan pendaftaran secara mandiri maupun kolektif dengan validasi instan di sisi klien.
2. **Panel Operasional & Audit Ketat**: Memberikan antarmuka manajemen antrean real-time bagi Admin Faskes/Instansi untuk memverifikasi data pendaftar, mencegah duplikasi/manipulasi data NIK/NIP, serta menjaga transparansi kuota dan stok vaksin.

---

## 2. Target Pengguna (User Roles & Access Control)

| Role | Deskripsi Utama | Hak Akses & Tanggung Jawab |
| :--- | :--- | :--- |
| **Peserta (Publik / ASN)** | Masyarakat umum, Pegawai ASN, atau perwakilan kelompok. | • Akses form pendaftaran mandiri (Public/Internal) & kelompok (Excel Upload).<br>• Mengisi data diri dan kontak.<br>• Memantau status pendaftaran secara real-time via kode tiket/NIK. |
| **Admin Instansi / Faskes** | Petugas verifikasi di faskes atau penanggung jawab instansi. | • Memeriksa antrean pendaftaran sementara (*Temporary Registration*).<br>• Memvalidasi kesesuaian NIK/NIP dan dokumen pendukung.<br>• Mengubah status pendaftaran (*Approve* / *Reject*).<br>• Memantau kuota dan penggunaan stok vaksin di lapangan. |
| **Super Admin** | Pengelola pusat/Sistem Administrator Toktok Health. | • Membuat dan mengonfigurasi event vaksinasi baru (lokasi, tanggal, kuota, jenis vaksin).<br>• Mengatur peranan pengguna (Role-Based Access Control).<br>• Menarik laporan rekapitulasi data lengkap dalam format Excel/PDF. |

---

## 3. Fitur Utama (Core Features)

### 3.1. Pendaftaran Berdasarkan Jalur (Multi-Channel Registration)
* **Perorangan (Publik)**: Form pendaftaran bagi masyarakat umum dengan input NIK, nama lengkap, tanggal lahir, jenis kelamin, dan nomor WhatsApp/Email.
* **Perorangan (Internal / ASN)**: Form khusus pegawai ASN & keluarga ASN. Wajib menyertakan **NIP (18 Digit)** dan **NIK (16 Digit)** untuk sinkronisasi data internal.
* **Kelompok (Upload Excel)**: Penanggung jawab instansi/komunitas dapat mengunggah file template `.xlsx` / `.csv` berisi daftar pendaftar massal sekaligus dengan validasi baris otomatis.

### 3.2. Validasi Otomatis (Client & Server Side)
* **Validasi NIK (16 Digit)**:
  * Memastikan panjang tepat 16 digit angka.
  * *Parsing Logic*: Mengekstrak Kode Wilayah (6 digit awal), Tanggal Lahir (6 digit tengah, termasuk penambahan +40 untuk wanita), dan Nomor Urut.
  * Memverifikasi kesesuaian data input (Tanggal Lahir & Jenis Kelamin) dengan hasil *parse* NIK.
* **Validasi NIP ASN (18 Digit)**:
  * Memastikan format tepat 18 digit dengan struktur **`YYYYMMDD YYYYMM X XXX`** (8 digit tanggal lahir, 6 digit TMT Pengangkatan, 1 digit jenis kelamin, 3 digit nomor urut).
  * Validasi logis kecocokan tanggal lahir di NIP terhadap tanggal lahir di NIK.
* **Pengecekan Duplikasi (Anti-Double Registration)**:
  * Sistem memblokir pendaftaran jika NIK atau NIP yang sama telah terdaftar pada *Event Vaksinasi* yang sama.
* **Validasi Email & Kontak**:
  * RegEx ketat untuk format email.
  * *Typo Detection*: Otomatis mendeteksi dan memberi peringatan untuk kesalahan umum penulisan domain (contoh: `.con` alih-alih `.com`, `gmai.com` -> `gmail.com`).

### 3.3. Sistem Antrean Sementara (*Temporary Registration*)
* Pendaftar yang telah menyelesaikan pengisian form **tidak langsung menjadi peserta resmi**, melainkan masuk ke dalam tabel antrean sementara (*Waiting Room / Temporary Registration*).
* Status awal: `PENDING_VERIFICATION`.
* Admin Faskes melakukan peninjauan sebelum mengubah status menjadi `APPROVED` (diterbitkan e-tiket) atau `REJECTED` (beserta alasan penolakan).

### 3.4. Dashboard Admin / Faskes
* **Manajemen Antrean Peserta**: Tabel interaktif dengan pencarian cepat, filter status, dan sorting berdasarkan waktu daftar.
* **Aksi Cepat**: Tombol *Approve* & *Reject* massal maupun individual.
* **Monitoring Real-Time**: Bar indikator sisa kuota event dan stok fisik vaksin yang terhubung langsung via Supabase Realtime Subscription.

---

## 4. Tech Stack & Arsitektur

```
[ Frontend: Vite + React + Tailwind CSS ]
                   │
                   │ (Supabase Client SDK / RLS)
                   ▼
  [ Backend / Database: Supabase PostgreSQL ]
  ├── Auth & Row Level Security (RLS)
  └── Database Webhooks (HTTP POST)
                   │
                   │ (Webhook Event Trigger)
                   ▼
  [ Automation Engine: Hermes Framework ]
  ├── Real-time Anomaly Detection & Tele-Bot Alerting
  ├── Daily Cron Reminders (09.00 WIB)
  └── PDF Report Auto-Generator (16.00 WIB)
```

* **Frontend**: 
  * **Framework**: Vite + React.js
  * **Styling**: Tailwind CSS (Dark/Light mode ready, accessible UI components)
  * **Icons**: Lucide Icons
* **Backend & Database (Supabase)**:
  * **PostgreSQL**: Penyimpanan data utama relasional.
  * **Supabase Auth**: Autentikasi Admin & Super Admin via JWT & RLS Policies.
  * **Row Level Security (RLS)**: Enforce hak akses data di level basis data.
  * **Database Webhooks**: Memicu panggilan HTTP external saat ada baris baru pada tabel pendaftaran.

---

## 5. Integrasi Backend & Hermes Automation

### 5.1. Tujuan Integrasi
Menghubungkan event di basis data aplikasi web Toktok Health secara otomatis dengan skrip otomatisasi **Hermes Engine**. Integrasi ini menghilangkan proses audit manual, mempercepat koordinasi tim operasional melalui bot notifikasi Telegram, serta menyajikan laporan harian secara otomatis.

### 5.2. Skenario Integrasi (Use Cases)

```
Use Case 1: Real-time Webhook Anomaly Detection
[ Peserta Submit ] ──> [ Supabase registrations Table ] ──Webhook──> [ Hermes Engine ]
                                                                             │ (Audit Check)
                                                                             ▼
                                                                  [ Alert Telegram Group ]

Use Case 2 & 3: Scheduled Cron Tasks
[ Hermes Cron 09.00 ] ──> [ Query Supabase Pending ] ──> [ Telegram Alert: X Pending Queues ]
[ Hermes Cron 16.00 ] ──> [ Query Daily Summary ]   ──> [ Generate PDF Report & Send to Leader ]
```

#### Use Case 1: Real-Time Auto-Validation & Anomaly Alert
* **Pemicu (Trigger)**: Peserta berhasil menekan tombol submit pendaftaran di web Vite.
* **Alur Supabase**: Row baru tersimpan di tabel `registrations` dengan status `PENDING_VERIFICATION`. Supabase Database Webhook mengirimkan payload JSON `INSERT` ke HTTP Endpoint Hermes.
* **Aksi Hermes**:
  1. Hermes menerima payload webhook.
  2. Menjalankan skrip audit tingkat lanjut (deteksi kesamaan pola IP, penulisan NIK/NIP anomali, email temporary/disposable).
  3. Apabila ditemukan indikasi data anomali atau data palsu, Hermes secara instan mendistribusikan notifikasi *Alert Anomali* ke **Grup Telegram Admin Operasional**.

#### Use Case 2: Cron Job Pagi (Pengingat Antrean Operasional)
* **Jadwal Execution**: Setiap hari kerja pukul **09.00 WIB**.
* **Aksi Hermes**:
  1. Hermes mengecek tabel `registrations` di Supabase untuk menghitung total antrean pendaftar berstatus `PENDING_VERIFICATION`.
  2. Hermes mengirimkan pesan pengingat otomatis ke Telegram Admin Faskes:
     > 🔔 **[Toktok Health Reminder]**  
     > *Selamat pagi Tim Faskes, terdapat **15 antrean baru** yang menunggu verifikasi Anda hari ini. Mohon segera diproses.*

#### Use Case 3: Auto-Generate Laporan Harian (Rekap Sore Hari)
* **Jadwal Execution**: Setiap hari kerja pukul **16.00 WIB**.
* **Aksi Hermes**:
  1. Hermes melakukan agregasi data pendaftaran hari berjalan dari Supabase (Total Pendaftar, Total Disetujui, Total Ditolak, Sisa Kuota Event).
  2. Memproses data menjadi berkas dokumen PDF Laporan Rekapitulasi Harian.
  3. Mengirimkan file PDF laporan tersebut ke pimpinan / supervisor melalui kanal Telegram / Email terintegrasi.

---

## 6. Desain Skema Basis Data (Database Schema Blueprint)

### 6.1. Tabel `events`
| Field Name | Type | Constraints | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Default `gen_random_uuid()` | Identifikasi unik event |
| `title` | `TEXT` | NOT NULL | Nama kegiatan vaksinasi |
| `vaccine_type` | `TEXT` | NOT NULL | Contoh: "Vaksin HPV Subtipe 9" |
| `quota` | `INTEGER` | NOT NULL | Total batas kuota pendaftar |
| `remaining_quota` | `INTEGER` | NOT NULL | Sisa kuota real-time |
| `event_date` | `DATE` | NOT NULL | Tanggal pelaksanaan |
| `location` | `TEXT` | NOT NULL | Lokasi faskes / instansi |
| `is_active` | `BOOLEAN` | Default `TRUE` | Status keaktifan pendaftaran |
| `created_at` | `TIMESTAMPTZ`| Default `NOW()` | Waktu pembuatan |

### 6.2. Tabel `registrations`
| Field Name | Type | Constraints | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Default `gen_random_uuid()` | ID Pendaftaran |
| `event_id` | `UUID` | Foreign Key (`events.id`) | Event yang diikuti |
| `registration_channel` | `TEXT` | Check `('PUBLIC', 'INTERNAL', 'GROUP')` | Jalur pendaftaran |
| `nik` | `VARCHAR(16)`| NOT NULL | NIK 16 digit |
| `nip` | `VARCHAR(18)`| NULLABLE | NIP ASN 18 digit (jika jalur internal) |
| `full_name` | `TEXT` | NOT NULL | Nama lengkap pendaftar |
| `gender` | `VARCHAR(1)` | Check `('L', 'P')` | Jenis kelamin |
| `birth_date` | `DATE` | NOT NULL | Tanggal lahir |
| `email` | `TEXT` | NOT NULL | Alamat email pendaftar |
| `phone_number` | `TEXT` | NOT NULL | Nomor WhatsApp / Telepon |
| `status` | `TEXT` | Default `'PENDING_VERIFICATION'` | Status: `PENDING_VERIFICATION`, `APPROVED`, `REJECTED` |
| `rejection_reason` | `TEXT` | NULLABLE | Catatan jika ditolak |
| `is_flagged_anomaly` | `BOOLEAN` | Default `FALSE` | Flag anomali dari Hermes |
| `created_at` | `TIMESTAMPTZ`| Default `NOW()` | Timestamp pendaftaran |

---

## 7. Indikator Keberhasilan (Key Performance Indicators / KPIs)

1. **Akurasi Data Pendaftaran (99.5%)**: Bebas dari kesalahan input NIK/NIP tidak valid berkat validasi ketat client & server side.
2. **Efisiensi Waktu Verifikasi (< 2 Menit/Peserta)**: Admin Faskes dapat memproses antrean dengan cepat melalui UI dashboard intuitif.
3. **Respon Otomatisasi Hermes (< 5 Detik)**: Webhook real-time mampu mendeteksi anomali pendaftaran dan mengirimkan notifikasi ke Telegram kurang dari 5 detik setelah submit.
4. **Zero Duplicate Registration**: Tidak ada duplikasi pendaftar tunggal pada event yang sama.
