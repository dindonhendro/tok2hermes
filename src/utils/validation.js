/**
 * Validation utilities for Toktok Health Registration Form
 * Full NIK (16 Digits) & NIP (18 Digits) Anatomical Validation
 */

const PROVINCE_CODES = {
  '11': 'Aceh',
  '12': 'Sumatera Utara',
  '13': 'Sumatera Barat',
  '14': 'Riau',
  '15': 'Jambi',
  '16': 'Sumatera Selatan',
  '17': 'Bengkulu',
  '18': 'Lampung',
  '19': 'Kepulauan Bangka Belitung',
  '21': 'Kepulauan Riau',
  '31': 'DKI Jakarta',
  '32': 'Jawa Barat',
  '33': 'Jawa Tengah',
  '34': 'DI Yogyakarta',
  '35': 'Jawa Timur',
  '36': 'Banten',
  '51': 'Bali',
  '52': 'Nusa Tenggara Barat',
  '53': 'Nusa Tenggara Timur',
  '61': 'Kalimantan Barat',
  '62': 'Kalimantan Tengah',
  '63': 'Kalimantan Selatan',
  '64': 'Kalimantan Timur',
  '65': 'Kalimantan Utara',
  '71': 'Sulawesi Utara',
  '72': 'Sulawesi Tengah',
  '73': 'Sulawesi Selatan',
  '74': 'Sulawesi Tenggara',
  '75': 'Gorontalo',
  '76': 'Sulawesi Barat',
  '81': 'Maluku',
  '82': 'Maluku Utara',
  '91': 'Papua',
  '92': 'Papua Barat',
  '93': 'Papua Selatan',
  '94': 'Papua Tengah',
  '95': 'Papua Pegunungan',
};

/**
 * Validates Indonesian NIK (Nomor Induk Kependudukan - 16 Digits)
 * Structure: [2-digit Prov][2-digit KabKota][2-digit Kec][2-digit Tgl][2-digit Bln][2-digit Thn][4-digit Sequence]
 */
export function parseNIK(nik) {
  if (!nik || typeof nik !== 'string') {
    return { isValid: false, error: 'NIK wajib diisi.' };
  }

  const cleanNik = nik.trim();

  if (!/^[0-9]{16}$/.test(cleanNik)) {
    return { 
      isValid: false, 
      error: `NIK harus tepat 16 digit angka (saat ini ${cleanNik.length} digit).` 
    };
  }

  // 1. Validate Province Code
  const provCode = cleanNik.substring(0, 2);
  const provName = PROVINCE_CODES[provCode];
  if (!provName) {
    return { 
      isValid: false, 
      error: `Kode Provinsi '${provCode}' pada NIK tidak valid. Mohon periksa kembali NIK KTP Anda.` 
    };
  }

  // 2. Extract & Validate Date of Birth & Gender
  let rawDay = parseInt(cleanNik.substring(6, 8), 10);
  const month = parseInt(cleanNik.substring(8, 10), 10);
  const rawYear = parseInt(cleanNik.substring(10, 12), 10);
  
  let gender = 'L';
  let isFemale = false;
  if (rawDay > 40) {
    gender = 'P';
    isFemale = true;
    rawDay -= 40;
  }

  // Validate Month (1-12) and Day (1-31)
  if (month < 1 || month > 12) {
    return { isValid: false, error: `Bulan lahir '${cleanNik.substring(8, 10)}' pada NIK tidak valid (harus 01-12).` };
  }
  if (rawDay < 1 || rawDay > 31) {
    return { isValid: false, error: `Tanggal lahir '${rawDay}' pada NIK tidak valid.` };
  }

  // Determine full 4-digit year
  const currentYear2Digit = parseInt(new Date().getFullYear().toString().substring(2), 10);
  const fullYear = rawYear > currentYear2Digit ? 1900 + rawYear : 2000 + rawYear;
  
  // Validate real calendar date (e.g. Feb 30 check)
  const dateObj = new Date(fullYear, month - 1, rawDay);
  if (dateObj.getFullYear() !== fullYear || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== rawDay) {
    return { isValid: false, error: `Tanggal lahir ${rawDay}/${month}/${fullYear} pada NIK tidak valid dalam kalender.` };
  }

  const dobString = `${fullYear}-${String(month).padStart(2, '0')}-${String(rawDay).padStart(2, '0')}`;

  return {
    isValid: true,
    nik: cleanNik,
    gender,
    genderLabel: isFemale ? 'Perempuan' : 'Laki-laki',
    dobString,
    provCode,
    provName,
    sequence: cleanNik.substring(12, 16),
    infoText: `Terverifikasi NIK KTP: ${provName} • ${isFemale ? 'Perempuan' : 'Laki-laki'} (${rawDay}/${month}/${fullYear})`
  };
}

/**
 * Validates Indonesian NIP (Nomor Induk Pegawai ASN - 18 Digits)
 * Structure: [8-digit YYYYMMDD Lahir][6-digit YYYYMM CPNS][1-digit Gender 1/2][3-digit Sequence]
 */
export function parseNIP(nip) {
  if (!nip || typeof nip !== 'string' || !nip.trim()) {
    return { isValid: false, error: 'NIP wajib diisi untuk pendaftaran jalur Pegawai ASN.' };
  }

  const cleanNip = nip.replace(/\s+/g, '');

  if (!/^[0-9]{18}$/.test(cleanNip)) {
    return { 
      isValid: false, 
      error: `NIP harus tepat 18 digit angka (saat ini ${cleanNip.length} digit).` 
    };
  }

  // 1. Parse Date of Birth (Digit 1-8)
  const bYear = parseInt(cleanNip.substring(0, 4), 10);
  const bMonth = parseInt(cleanNip.substring(4, 6), 10);
  const bDay = parseInt(cleanNip.substring(6, 8), 10);

  if (bYear < 1940 || bYear > new Date().getFullYear()) {
    return { isValid: false, error: `Tahun lahir '${bYear}' pada NIP di luar rentang logis.` };
  }
  if (bMonth < 1 || bMonth > 12 || bDay < 1 || bDay > 31) {
    return { isValid: false, error: `Tanggal/Bulan lahir pada NIP (${bDay}/${bMonth}/${bYear}) tidak valid.` };
  }

  const dobObj = new Date(bYear, bMonth - 1, bDay);
  if (dobObj.getFullYear() !== bYear || dobObj.getMonth() !== bMonth - 1 || dobObj.getDate() !== bDay) {
    return { isValid: false, error: `Tanggal lahir NIP (${bDay}/${bMonth}/${bYear}) tidak ada di kalender.` };
  }

  // 2. Parse Appointment / CPNS Date (Digit 9-14)
  const cYear = parseInt(cleanNip.substring(8, 12), 10);
  const cMonth = parseInt(cleanNip.substring(12, 14), 10);

  if (cMonth < 1 || cMonth > 12) {
    return { isValid: false, error: `Bulan pengangkatan CPNS '${cMonth}' pada NIP tidak valid.` };
  }
  if (cYear <= bYear || (cYear - bYear) < 17) {
    return { 
      isValid: false, 
      error: `TMT Pengangkatan CPNS (${cYear}) tidak logis dibandingkan Tahun Lahir (${bYear}). Minimal usia CPNS 17+ tahun.` 
    };
  }

  // 3. Parse Gender Digit (Digit 15: 1 = Laki-laki, 2 = Perempuan)
  const genderDigit = cleanNip.substring(14, 15);
  if (genderDigit !== '1' && genderDigit !== '2') {
    return { isValid: false, error: `Digit gender NIP (digit ke-15: '${genderDigit}') tidak valid! Harus 1 (Pria) atau 2 (Wanita).` };
  }

  const gender = genderDigit === '2' ? 'P' : 'L';
  const genderLabel = genderDigit === '2' ? 'Perempuan' : 'Laki-laki';
  const dobString = `${bYear}-${String(bMonth).padStart(2, '0')}-${String(bDay).padStart(2, '0')}`;
  const cpnsString = `${String(cMonth).padStart(2, '0')}/${cYear}`;

  return {
    isValid: true,
    nip: cleanNip,
    gender,
    genderLabel,
    dobString,
    cpnsString,
    sequence: cleanNip.substring(15, 18),
    infoText: `Terverifikasi NIP ASN: ${genderLabel} • Lahir: ${bDay}/${bMonth}/${bYear} • TMT CPNS: ${cpnsString}`
  };
}

/**
 * Validates Email Address with Domain Typo Detection
 */
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email wajib diisi.', warning: null };
  }

  const trimmed = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Format email tidak valid (contoh: nama@domain.com).', warning: null };
  }

  let warning = null;
  if (/\.con$/i.test(trimmed)) {
    warning = "⚠️ Apakah maksud Anda '.com'? Terdeteksi akhiran domain '.con'.";
  } else if (/@gmai\.com$/i.test(trimmed)) {
    warning = "⚠️ Apakah maksud Anda '@gmail.com'? Terdeteksi typo '@gmai.com'.";
  } else if (/@yaho\.com$/i.test(trimmed)) {
    warning = "⚠️ Apakah maksud Anda '@yahoo.com'? Terdeteksi typo '@yaho.com'.";
  }

  return { isValid: true, error: null, warning };
}
