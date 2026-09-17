import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Clean numeric values into number 0
 */
export function cleanCurrency(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let str = String(val).replace(/Rp|\s/gi, '').trim();
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',') && !str.includes('.')) {
    str = str.replace(',', '.');
  } else if (str.split('.').length > 2) {
    str = str.replace(/\./g, '');
  }
  
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format Date String into ISO / YYYY-MM-DD
 */
export function formatDate(val) {
  if (!val) return '-';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }

  const str = String(val).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return str;
}

/**
 * Flexible column picker with alias matching
 */
function getColValue(row, aliases) {
  for (const alias of aliases) {
    for (const key of Object.keys(row)) {
      if (key.trim().toLowerCase() === alias.toLowerCase()) {
        return row[key];
      }
    }
  }
  return null;
}

/**
 * Parse uploaded CSV or Excel File
 */
export async function parseStockFile(file) {
  return new Promise((resolve, reject) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (err) => {
          reject(new Error('Gagal membaca file CSV: ' + err.message));
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          resolve(jsonRows);
        } catch (err) {
          reject(new Error('Gagal membaca file Excel: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
      reader.readAsArrayBuffer(file);
    }
  });
}

/**
 * Calculate Stock Metrics, Groupings, Expiry & Alert System (Fisik Doses Focus)
 */
export function calculateStockMetrics(rawRows) {
  if (!rawRows || rawRows.length === 0) {
    return null;
  }

  const sanitizedRows = rawRows.map((row, idx) => {
    const gudang = String(getColValue(row, ['Gudang', 'Faskes', 'Lokasi Gudang', 'Klinik', 'Lokasi']) || 'Gudang Utama').trim();
    const kodeBarang = String(getColValue(row, ['Kode Barang', 'Kode', 'SKU']) || '-').trim();
    const namaBarang = String(getColValue(row, ['Nama', 'Nama Barang', 'Nama Vaksin', 'Deskripsi']) || 'Barang').trim();
    const noBatch = String(getColValue(row, ['No. Batch', 'No Batch', 'Batch', 'Lot']) || 'BATCH-UNK').trim();
    const tglKadaluarsa = formatDate(getColValue(row, ['Tgl Kadaluarsa', 'Tgl Expired', 'Expired', 'Kadaluarsa', 'Expiry Date']));
    const sku = String(getColValue(row, ['SKU', 'Kode SKU']) || kodeBarang).trim();
    const satuan = String(getColValue(row, ['Satuan', 'Unit', 'UOM']) || 'Dosis').trim();

    // Extract raw numerical values
    const rawStokSaatIni = getColValue(row, ['Stok Saat Ini', 'Stok Fisik', 'Stok', 'Current Stock']);
    const stokJual = cleanCurrency(getColValue(row, ['Stok Awal Jual', 'Stok Jual', 'Stok Alokasi', 'Alokasi']));
    const stokJualKasir = cleanCurrency(getColValue(row, ['Stok Terjual Kasir', 'Stok Jual Kasir', 'Stok Kasir', 'Terjual Kasir', 'Terjual']));
    const stokMasukTransfer = cleanCurrency(getColValue(row, ['Stok Masuk (Transfer)', 'Stok Masuk', 'Transfer Masuk']));
    const stokKeluarTransfer = cleanCurrency(getColValue(row, ['Stok Keluar (Transfer)', 'Stok Keluar', 'Transfer Keluar']));
    const stokRetur = cleanCurrency(getColValue(row, ['Stok Retur', 'Retur Keluar']));
    const stokReturMasuk = cleanCurrency(getColValue(row, ['Stok Retur Masuk', 'Retur Masuk']));
    const rawStokKonversiMasuk = getColValue(row, ['Stok Konversi Masuk', 'Konversi Masuk']);
    const stokKonversiKeluar = cleanCurrency(getColValue(row, ['Stok Konversi Keluar', 'Konversi Keluar']));
    const stokSO = cleanCurrency(getColValue(row, ['Stok SO', 'Selisih SO', 'Selisih Opname']));
    const stokSB = cleanCurrency(getColValue(row, ['Stok SB', 'Satuan Besar', 'Box']));
    const stokSM = cleanCurrency(getColValue(row, ['Stok SM', 'Satuan Sedang']));
    const rawStokSK = getColValue(row, ['Stok SK', 'Satuan Kecil', 'Vial']);

    // Formula 2: Packaging Unit Conversion (1 Box = 10 Vial)
    let stokSK = cleanCurrency(rawStokSK);
    if (stokSK === 0 && stokSB > 0) {
      stokSK = stokSB * 10;
    }

    let stokKonversiMasuk = cleanCurrency(rawStokKonversiMasuk);
    if (stokKonversiMasuk === 0 && stokKonversiKeluar > 0) {
      stokKonversiMasuk = stokKonversiKeluar * 10;
    }

    // Formula 1: Main Physical Stock Formula
    // Stok Saat Ini = Stok Masuk (Transfer) - Stok Keluar (Transfer) - Stok Terjual Kasir - Stok Retur + Stok SO
    let stokSaatIni = 0;
    if (rawStokSaatIni !== null && rawStokSaatIni !== undefined && rawStokSaatIni !== '') {
      stokSaatIni = cleanCurrency(rawStokSaatIni);
    } else {
      stokSaatIni = stokMasukTransfer - stokKeluarTransfer - stokJualKasir - stokRetur + stokSO;
    }

    // Formula 3: Supporting Calculations
    const netTransfer = stokMasukTransfer - stokKeluarTransfer;
    const netReturDistributor = stokReturMasuk - stokRetur;

    return {
      id: `row-${idx + 1}`,
      gudang,
      kodeBarang,
      namaBarang,
      noBatch,
      tglKadaluarsa,
      sku,
      satuan,
      stokSaatIni,
      stokJual,
      stokJualKasir,
      stokMasukTransfer,
      stokKeluarTransfer,
      stokRetur,
      stokReturMasuk,
      stokKonversiMasuk,
      stokKonversiKeluar,
      stokSO,
      stokSB,
      stokSM,
      stokSK,
      netTransfer,
      netReturDistributor
    };
  });

  // 1. GLOBAL KPI CARDS (Kuantitas Fisik)
  let totalStokFisik = 0;
  let totalPenjualanKasir = 0;
  let totalAlokasiStokJual = 0;
  const uniqueGudangSet = new Set();
  const uniqueBatchSet = new Set();

  sanitizedRows.forEach((r) => {
    totalStokFisik += r.stokSaatIni;
    totalPenjualanKasir += r.stokJualKasir;
    totalAlokasiStokJual += r.stokJual;
    if (r.gudang) uniqueGudangSet.add(r.gudang);
    if (r.noBatch) uniqueBatchSet.add(r.noBatch);
  });

  // 2. WAREHOUSE / FASKES GROUPING
  const gudangMap = {};
  sanitizedRows.forEach((r) => {
    if (!gudangMap[r.gudang]) {
      gudangMap[r.gudang] = {
        gudang: r.gudang,
        totalStok: 0,
        totalStokJual: 0,
        totalStokKasir: 0,
        stokMasuk: 0,
        stokKeluar: 0,
        netTransfer: 0,
        totalSelisihSO: 0,
        stokRetur: 0,
        stokSB: 0,
        stokSK: 0,
        batchSet: new Set()
      };
    }
    const g = gudangMap[r.gudang];
    g.totalStok += r.stokSaatIni;
    g.totalStokJual += r.stokJual;
    g.totalStokKasir += r.stokJualKasir;
    g.stokMasuk += r.stokMasukTransfer;
    g.stokKeluar += r.stokKeluarTransfer;
    g.netTransfer += (r.stokMasukTransfer - r.stokKeluarTransfer);
    g.totalSelisihSO += r.stokSO;
    g.stokRetur += r.stokRetur;
    g.stokSB += r.stokSB;
    g.stokSK += r.stokSK;
    g.batchSet.add(r.noBatch);
  });

  const gudangSummary = Object.values(gudangMap).map((g) => ({
    ...g,
    batchCount: g.batchSet.size
  }));

  // 3. BATCH & EXPIRY STATUS GROUPING
  const batchMap = {};
  const today = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(today.getMonth() + 6);

  sanitizedRows.forEach((r) => {
    const key = `${r.noBatch}_${r.tglKadaluarsa}`;
    if (!batchMap[key]) {
      let status = 'SAFE'; // 🟢 Safe
      if (r.tglKadaluarsa && r.tglKadaluarsa !== '-') {
        const expDate = new Date(r.tglKadaluarsa);
        if (!isNaN(expDate.getTime())) {
          if (expDate < today) {
            status = 'EXPIRED'; // 🔴 Expired
          } else if (expDate <= sixMonthsFromNow) {
            status = 'NEAR_EXPIRY'; // 🟡 Near Expiry
          }
        }
      }

      batchMap[key] = {
        noBatch: r.noBatch,
        namaBarang: r.namaBarang,
        tglKadaluarsa: r.tglKadaluarsa,
        totalStok: 0,
        totalStokJual: 0,
        status
      };
    }

    batchMap[key].totalStok += r.stokSaatIni;
    batchMap[key].totalStokJual += r.stokJual;
  });

  const batchSummary = Object.values(batchMap);

  // 4. ALERT SYSTEM (STOK MINUS, SELISIH SO, STOK PASIF)
  const stokMinus = sanitizedRows.filter((r) => r.stokSaatIni < 0);
  const selisihSO = sanitizedRows.filter((r) => r.stokSO !== 0);
  const stokPasif = sanitizedRows.filter((r) => r.stokJualKasir === 0 && r.stokSaatIni > 0);

  return {
    kpi: {
      totalStokFisik,
      totalPenjualanKasir,
      totalAlokasiStokJual,
      uniqueGudangCount: uniqueGudangSet.size,
      uniqueBatchCount: uniqueBatchSet.size
    },
    gudangSummary,
    batchSummary,
    alerts: {
      stokMinus,
      selisihSO,
      stokPasif
    },
    rawRows: sanitizedRows,
    sanitizedRows: sanitizedRows
  };
}

/**
 * Export Aggregated Stock Summary to Excel File (.xlsx) - Operational Focus
 */
export function exportStockSummaryToExcel(metrics, filename = 'Laporan_Ringkasan_Stok.xlsx') {
  if (!metrics) return;

  const wb = XLSX.utils.book_new();

  // Sheet 1: Ringkasan Faskes / Gudang
  const gudangData = metrics.gudangSummary.map((g, idx) => ({
    'No': idx + 1,
    'Faskes / Gudang': g.gudang,
    'Stok Saat Ini (Doses)': g.totalStok,
    'Stok Jual': g.totalStokJual,
    'Terjual Kasir': g.totalStokKasir,
    'Net Transfer': g.netTransfer,
    'Selisih SO': g.totalSelisihSO,
    'Varian Batch': g.batchCount
  }));
  const ws1 = XLSX.utils.json_to_sheet(gudangData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan Faskes');

  // Sheet 2: Analisis Batch & Expiry
  const batchData = metrics.batchSummary.map((b, idx) => ({
    'No': idx + 1,
    'No. Batch': b.noBatch,
    'Nama Barang': b.namaBarang,
    'Tgl Kadaluarsa': b.tglKadaluarsa,
    'Stok Fisik': b.totalStok,
    'Stok Jual': b.totalStokJual,
    'Status Kedaluwarsa': b.status === 'EXPIRED' ? '🔴 Expired' : b.status === 'NEAR_EXPIRY' ? '🟡 Near Expiry' : '🟢 Safe'
  }));
  const ws2 = XLSX.utils.json_to_sheet(batchData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Analisis Batch');

  // Write file & trigger download
  XLSX.writeFile(wb, filename);
}
