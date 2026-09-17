# PRODUCT REQUIREMENT DOCUMENT (PRD)
## Dashboard Stok Vaksin & Analisis Persediaan Faskes

* **Dokumen Versi**: 1.0
* **Target Sistem**: Vite + React + TypeScript + Tailwind CSS + Supabase Integration
* **Status**: Draft / Siap untuk Implementasi

---

### Deskripsi Ringkas
Buatkan dashboard stok untuk melakukan analisis, pembuatan ringkasan (summary), dan visualisasi data stok dari file CSV/Excel yang diunggah pengguna.

---

### 1. 🛠️ Teknologi & Pustaka Utama
- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Icon & UI Component**: Lucide React + Shadcn UI (atau komponen Tailwind)
- **CSV/Excel Parser**: `xlsx` (SheetJS) dan `papaparse` untuk pemrosesan file secara langsung di client-side
- **Charting**: `recharts` atau `chart.js`
- **Backend / Persistensi (Opsional)**: Supabase Storage (untuk simpan file) & Supabase Database (jika data ingin disimpan ke tabel `stok_summary`)

---

### 2. 📊 Struktur Data Input (File CSV/Excel)
Aplikasi harus memetakan kolom-kolom berikut dari file stok:
- `Gudang` (Faskes/Lokasi Gudang)
- `Kode Barang`, `Nama`, `No. Batch`, `Tgl Kadaluarsa`, `SKU`, `Satuan`
- `Stok Saat Ini`, `Stok Jual`, `Stok Jual Kasir`, `Stok Masuk (Transfer)`, `Stok Keluar (Transfer)`, `Stok SO`, `Stok SK`
- `Harga Beli`, `Harga Pokok`

---

### 3. ⚙️ Logika Pemrosesan Data (Client-Side Utility)

#### A. Data Sanitization & Parsing
1. Konversi nilai string/NULL pada kolom numerik menjadi number `0`.
2. Bersihkan karakter format mata uang (misal: "Rp", titik/koma) pada `Harga Beli` dan `Harga Pokok`.
3. Format kolom `Tgl Kadaluarsa` menjadi format ISO/Date standar.

#### B. Ringkasan Total (Global KPI Cards Component)
Tampilkan KPI Summary Card di bagian atas Dashboard:
- Total Stok Fisik Saat Ini (`sum(Stok Saat Ini)`)
- Total Valuasi Persediaan (`sum(Stok Saat Ini * Harga Beli)`)
- Total Penjualan Kasir (`sum(Stok Jual Kasir)`)
- Total Alokasi Stok Jual (`sum(Stok Jual)`)
- Jumlah Faskes/Gudang Aktif (`count unique Gudang`)
- Jumlah Batch Unik (`count unique No. Batch`)

#### C. Tabel Ringkasan per Faskes / Gudang (Warehouse Table Component)
Gunakan komponen tabel interaktif yang mengelompokkan data berdasarkan `Gudang`:
- Total Stok Saat Ini per Gudang
- Total Stok Jual per Gudang
- Total Stok Jual Kasir per Gudang
- Net Transfer (`Stok Masuk Transfer` - `Stok Keluar Transfer`)
- Total Selisih SO (`sum(Stok SO)`)
- Varian Batch (`count unique No. Batch`)
- Total Valuasi Stok per Gudang (Rp)
Fitur wajib: **Client-side Search** (Filter nama Faskes) & **Column Sorting** (Urutkan dari stok terbanyak/paling sedikit).

#### D. Analisis Batch & Status Kedaluwarsa (Batch Analysis Component)
Grouping berdasarkan `No. Batch` dan `Tgl Kadaluarsa`:
- Total Stok Fisik dan Stok Jual per Batch.
- Status Badge:
  - 🔴 **Expired** (Tanggal < Hari Ini)
  - 🟡 **Near Expiry** (Kedaluwarsa < 6 Bulan)
  - 🟢 **Safe** (Kedaluwarsa > 6 Bulan)

#### E. Alert System (Anomali & Selisih)
Tampilkan Tab/Card khusus untuk mendeteksi:
- **Stok Minus** (`Stok Saat Ini < 0`)
- **Selisih Stok Opname** (`Stok SO != 0`)
- **Stok Pasif** (`Stok Jual Kasir == 0`)

---

### 4. 🗄️ Integrasi Supabase (Opsional/Secondary)
- Sediakan tombol "Simpan Laporan ke Supabase" untuk mengunggah file mentah ke **Supabase Storage** (bucket `stok-reports`) dan menyimpan metadata ringkasan faskes ke tabel database Supabase `laporan_stok`.

---

### 5. 📤 Fitur Export Data
- Fitur ekspor hasil ringkasan per faskes dan per batch kembali ke file `.xlsx` atau `.csv` menggunakan SheetJS.

---

### 6. 📁 Output Kode
Berikan struktur project Vite yang rapi:
1. `src/utils/excelParser.ts` (Fungsi parsing & agregasi data)
2. `src/components/Dashboard.tsx` (Layout utama & KPI Cards)
3. `src/components/FaskesTable.tsx` (Tabel ringkasan faskes dengan search & sort)
4. `src/components/BatchChart.tsx` (Visualisasi Recharts)
