/**
 * Helper Validation & Parser for Indonesian ASN NIP (18 Digits Standard: 8-6-1-3)
 *
 * Structure Breakdown:
 * - Digits 1-8   : Tanggal Lahir (YYYYMMDD)
 * - Digits 9-14  : TMT CPNS (YYYYMM)
 * - Digit 15     : Jenis Kelamin (1 = Pria / Male, 2 = Wanita / Female)
 * - Digits 16-18 : Nomor Urut Pengangkatan (001 - 999)
 */

export function parseNIP18(nipString) {
  if (!nipString) {
    return { isValid: false, error: 'NIP wajib diisi.' };
  }

  // Clean non-digit characters
  const cleanNip = String(nipString).replace(/\D/g, '').trim();

  if (cleanNip.length !== 18) {
    return {
      isValid: false,
      error: `Format NIP harus tepat 18 digit (saat ini ${cleanNip.length} digit).`
    };
  }

  // Extract segments
  const yyyy = parseInt(cleanNip.substring(0, 4), 10);
  const mm = parseInt(cleanNip.substring(4, 6), 10);
  const dd = parseInt(cleanNip.substring(6, 8), 10);

  const cpnsYyyy = parseInt(cleanNip.substring(8, 12), 10);
  const cpnsMm = parseInt(cleanNip.substring(12, 14), 10);

  const genderDigit = cleanNip.substring(14, 15);
  const sequenceNum = cleanNip.substring(15, 18);

  // Validate Birth Date
  if (mm < 1 || mm > 12) {
    return { isValid: false, error: 'Bulan lahir pada NIP (digit 5-6) tidak valid.' };
  }
  if (dd < 1 || dd > 31) {
    return { isValid: false, error: 'Tanggal lahir pada NIP (digit 7-8) tidak valid.' };
  }

  const birthDateObj = new Date(yyyy, mm - 1, dd);
  if (isNaN(birthDateObj.getTime())) {
    return { isValid: false, error: 'Tanggal lahir pada NIP tidak dapat dikonversi.' };
  }

  // Validate CPNS Date
  if (cpnsMm < 1 || cpnsMm > 12) {
    return { isValid: false, error: 'Bulan TMT CPNS pada NIP (digit 13-14) tidak valid.' };
  }
  if (cpnsYyyy < yyyy + 17) {
    return { isValid: false, error: 'Tahun TMT CPNS tidak logis terhadap tahun lahir.' };
  }

  // Validate Gender Digit
  if (genderDigit !== '1' && genderDigit !== '2') {
    return { isValid: false, error: 'Digit jenis kelamin (digit 15) harus 1 (Pria) atau 2 (Wanita).' };
  }

  const genderText = genderDigit === '1' ? 'Pria' : 'Wanita';

  // Calculate Age
  const today = new Date();
  let age = today.getFullYear() - yyyy;
  const mDiff = today.getMonth() - (mm - 1);
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < dd)) {
    age--;
  }

  const monthsName = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const formattedBirthDate = `${dd} ${monthsName[mm - 1]} ${yyyy}`;
  const formattedCpnsDate = `${monthsName[cpnsMm - 1]} ${cpnsYyyy}`;

  return {
    isValid: true,
    error: null,
    cleanNip,
    birthDate: formattedBirthDate,
    birthDateIso: `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
    cpnsDate: formattedCpnsDate,
    gender: genderText,
    age,
    sequenceNumber: sequenceNum
  };
}
