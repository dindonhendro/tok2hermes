# PRODUCT REQUIREMENT DOCUMENT (PRD)
## Dashboard Stok Vaksin & Analisis Persediaan Faskes

* **Dokumen Versi**: 1.1
* **Target Sistem**: Vite + React + TypeScript + Tailwind CSS + Supabase Integration
* **Status**: Siap untuk Implementasi / Production Refined

---

### Deskripsi Ringkas
Buatkan dashboard stok untuk melakukan analisis, pembuatan ringkasan (summary), dan visualisasi data stok dari file CSV/Excel yang diunggah pengguna.

---

### 1. 🛠️ Teknologi & Pustaka Utama
- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Icon & UI Component**: Lucide React + Tailwind CSS Components
- **CSV/Excel Parser**: `xlsx` (SheetJS) dan `papaparse` untuk pemrosesan file secara langsung di client-side
- **Charting**: `recharts`
- **Backend / Persistensi**: Supabase Database (`faskes`, `vaccine_batches`, `faskes_inventory_ledger`, `laporan_stok`) & localStorage backup

---

### 2. 📊 Kamus Data & Definisi Kolom Stok TokTok Health
Aplikasi memetakan dan menghitung kolom-kolom berikut dari file stok:
1. **Gudang**: Faskes / Lokasi Gudang penyimpanan persediaan.
2. **Kode Barang**, **Nama**, **No. Batch**, **Tgl Kadaluarsa**, **SKU**, **Satuan**.
3. **Stok Saat Ini**: Jumlah stok fisik aktual yang tersedia dan siap digunakan saat ini.
4. **Stok Awal Jual / Stok Jual**: Jumlah stok alokasi awal saat data stok diinput secara manual.
5. **Stok Terjual Kasir**: Jumlah stok yang terpotong/keluar setelah rekam medis pasien difinalkan.
6. **Stok Keluar (Transfer)**: Stok yang dikirim/dipindahkan ke gudang lain (misalnya mutasi antar-faskes atau dari distributor).
7. **Stok Masuk (Transfer)**: Stok yang diterima dari distributor atau faskes/gudang lain.
8. **Stok Retur**: Stok yang dikembalikan dari faskes ke distributor.
9. **Stok Retur Masuk**: Stok retur yang diterima kembali oleh pihak distributor.
10. **Stok Konversi Masuk (Lanjutan)**: Jumlah penambahan stok dalam Satuan Kecil (Vial) yang dihasilkan dari proses pemecahan/konversi kemasan besar (Box).
11. **Stok Konversi Keluar (Lanjutan)**: Jumlah pengurangan stok dalam Satuan Besar (Box) yang dikeluarkan untuk dipecah/dikonversi menjadi Satuan Kecil.
12. **Stok SO**: Nilai penyesuaian (plus/minus) hasil Stok Opname agar jumlah di sistem sesuai dengan hitungan fisik.
13. **Stok SB (Lanjutan)**: Stok Satuan Besar — Jumlah stok dalam kemasan tingkat pertama/terbesar (misalnya Box / Dus).
14. **Stok SM (Lanjutan)**: Stok Satuan Sedang — Jumlah stok dalam kemasan menengah/sedang (jika faskes/distributor menggunakan tingkatan kemasan perantara).
15. **Stok SK**: Stok Satuan Kecil — Jumlah stok dalam unit eceran/medis terkecil (dalam hal ini Vial, di mana $1\text{ Box} = 10\text{ Vial}$).

---

### 3. 📐 Formula Hubungan Antar-Kolom & Alur Mutasi Stok

#### A. Formula Utama Stok Fisik Aktual (Stok Saat Ini)
$$\text{Stok Saat Ini} = \text{Stok Masuk (Transfer)} - \text{Stok Keluar (Transfer)} - \text{Stok Terjual Kasir} - \text{Stok Retur} + \text{Stok SO}$$
* **Nilai Positif (Penambahan)**: `Stok Masuk (Transfer)` dan `Stok SO` (jika ada hasil Opname positif/kelebihan fisik).
* **Nilai Negatif (Pengurangan)**: `Stok Keluar (Transfer)`, `Stok Terjual Kasir`, `Stok Retur`, dan `Stok SO` (jika ada penyesuaian Opname minus/selisih fisik).

#### B. Formula Konversi Satuan Kemasan (Stok SB ke Stok SK)
Untuk konversi dari kemasan besar ke unit eceran/medis terkecil ($1\text{ Box} = 10\text{ Vial}$):
$$\text{Stok SK (Satuan Kecil / Vial)} = \text{Stok SB (Satuan Besar / Box)} \times 10$$
$$\text{Stok Konversi Masuk (Vial)} = \text{Stok Konversi Keluar (Box)} \times 10$$

#### C. Formula Mutasi & Rekonsiliasi Pendukung
* **Net Transfer Gudang**:
  $$\text{Net Transfer} = \text{Stok Masuk (Transfer)} - \text{Stok Keluar (Transfer)}$$
* **Net Retur Distributor**:
  $$\text{Net Retur Distributor} = \text{Stok Retur Masuk} - \text{Stok Retur}$$
* **Rekonsiliasi Stok Opname (SO)**:
  $$\text{Stok Sistem Akhir} = \text{Stok Sistem Sebelum SO} + \text{Stok SO}$$

---

### 4. ⚙️ Logika Pemrosesan Data & UI Components

#### A. Data Sanitization & Parsing
1. Konversi nilai string/NULL pada kolom numerik menjadi number `0`.
2. Format kolom `Tgl Kadaluarsa` menjadi format ISO/Date standar (`YYYY-MM-DD`).
3. Terapkan otomatis formula hubungan antar-kolom di atas apabila ada data turunan yang perlu dihitung secara dinamis.

#### B. Ringkasan Total (Global KPI Cards Component)
- Total Stok Fisik Saat Ini (`sum(Stok Saat Ini)`)
- Total Penjualan Kasir (`sum(Stok Terjual Kasir)`)
- Total Alokasi Stok Jual (`sum(Stok Jual)`)
- Jumlah Faskes/Gudang Aktif (`count unique Gudang`)
- Jumlah Batch Unik (`count unique No. Batch`)

#### C. Tabel Ringkasan per Faskes / Gudang (Warehouse Table Component)
- Total Stok Saat Ini per Gudang
- Total Stok Jual per Gudang
- Total Stok Terjual Kasir per Gudang
- Net Transfer (`Stok Masuk Transfer` - `Stok Keluar Transfer`)
- Total Selisih SO (`sum(Stok SO)`)
- Varian Batch (`count unique No. Batch`)
- **Client-side Search** (Filter nama Faskes) & **Column Sorting**.

#### D. Analisis Batch & Status Kedaluwarsa (Batch Analysis Component)
- Total Stok Fisik dan Stok Jual per Batch.
- Status Badge:
  - 🔴 **Expired** (Tanggal < Hari Ini)
  - 🟡 **Near Expiry** (Kedaluwarsa < 6 Bulan)
  - 🟢 **Safe** (Kedaluwarsa > 6 Bulan)

#### E. Alert System (Anomali & Selisih)
- **Stok Minus** (`Stok Saat Ini < 0`)
- **Selisih Stok Opname** (`Stok SO != 0`)
- **Stok Pasif** (`Stok Terjual Kasir == 0`)

---

### 5. 🗄️ Integrasi Supabase & Export
- Tombol **Simpan Supabase**: Pendaftaran otomatis Faskes baru ke tabel `faskes`, Batch baru ke `vaccine_batches`, serta entri ledger mutasi ke `faskes_inventory_ledger`.
- Tombol **Ekspor Excel**: Download ringkasan gudang & batch ke berkas `.xlsx`.
