# PRODUCT REQUIREMENT DOCUMENT (PRD)
## Toktok Health - Automated Cronjob & Monitoring Dashboard

* **Versi Dokumen**: 1.0
* **Target Sistem**: Vite (React) + Tailwind CSS + Lucide Icons + Supabase Integration
* **Status**: Draft / Siap untuk Memulai Pengembangan

---

### Deskripsi Ringkas
Halaman Dashboard Web khusus untuk menampilkan **Log Output & Laporan Otomatis Cronjob** bagi platform Toktok Health. Dashboard ini dirancang dengan standar UI/UX tinggi khas *Medical & Tech Enterprise* untuk memfasilitasi tim operasional dan pimpinan dalam memantau kesehatan sistem, pemindaian stok vaksin Faskes secara berkala, dan penanganan insiden stok kritis secara real-time.

---

### 1. 🛠️ Fitur dan Komponen Utama Dashboard

#### A. Header & Status Bar
- **Judul**: `Toktok Health - Automated Cronjob & Monitoring Dashboard`
- **Indikator Status Live**: Badge indikator status aktif berkedip (pulsing green badge: `System Status: Active & Monitoring`).
- **Last Sync Timestamp**: Informasi tanggal & jam sinkronisasi/pemindaian terakhir (contoh: `18 September 2026 • 20:00:00 WIB`).

#### B. Kartu Metrik Ringkasan (*Metric Summary Cards*)
1. **Total Faskes Dipantau**: Jumlah seluruh lokasi Faskes/Gudang yang terhubung (contoh: `21 Faskes`).
2. **Faskes Status Aman**: Jumlah Faskes dengan persediaan persediaan fisik mencukupi (contoh: `18 Faskes`).
3. **Faskes Stok Kritis / Kosong**: Jumlah Faskes dengan stok habis atau di bawah batas minimum (contoh: `3 Faskes - Butuh Restock`).

#### C. Panel Terminal / Log Output (*Live Log Viewer*)
- **Terminal Console Box**: Kotak tampilan log bergaya terminal/developer console (latar belakang gelap `#0F172A`, font monospaced `JetBrains Mono / Fira Code`, teks warna hijau emerald/cyan/putih).
- Memuat riwayat pemindaian cronjob harian otomatis (misalnya pemindaian stok otomatis setiap jam 20:00 WIB).
- **Tombol Aksi Terminal**:
  - `Refresh Logs` (Memuat ulang log terbaru)
  - `Clear Logs` (Membersihkan konsol log sementara)
  - `Export Log to TXT` (Mendownload salinan berkas `.txt` hasil pemindaian log)

#### D. Tabel Status Faskes Terkini (*Faskes Inventory Status Table*)
Tabel ringkas dan intuitif untuk pemantauan cepat:
- **Nama Faskes** & Kode Faskes.
- **Kota / Lokasi**.
- **Total Sisa Dosis** persediaan fisik.
- **Badge Status**:
  - 🟢 **Aman** (Stok mencukupi > 100 Dosis)
  - 🟡 **Perlu Restock** (Stok menipis < 50 Dosis)
  - 🔴 **Kosong / Kritis** (Stok <= 0 Dosis)

---

### 2. 🎨 Desain & Estetika (UI/UX Guidelines)
- **Tema Warna**: *Medical & Tech Enterprise*
  - Warna Utama: Biru Laut / Deep Cyan (`#0284C7` / `#0EA5E9`), Slate Grey (`#0F172A`), Putih Bersih (`#F8FAFC`).
  - Terminal Accent: Emerald Green (`#10B981`) & Neon Cyan (`#06B6D4`).
- **Layout & Typography**: Responsive Grid, layout bersih, kontras tinggi, dan sangat mudah dibaca oleh tim operasional maupun pimpinan (*Executive-ready UI*).

---

### 3. 🗄️ Arsitektur Data & Integrasi
- Mengambil data real-time dari database Supabase (`faskes`, `faskes_inventory_ledger`, `laporan_stok`) dan mengunggah log hasil scan harian otomatis.
