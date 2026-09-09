/**
 * Validation utilities for Toktok Health Registration Form
 */

// Parse NIK (16 Digits only validation)
export function parseNIK(nik) {
  if (!nik || typeof nik !== 'string') {
    return { isValid: false, error: 'NIK wajib diisi.' };
  }

  const cleanNik = nik.trim();

  if (!/^[0-9]{16}$/.test(cleanNik)) {
    return { isValid: false, error: 'NIK harus tepat 16 digit angka.' };
  }

  // Best effort parsing for DOB & Gender if valid date pattern exists
  let gender = 'L';
  let dobString = null;
  try {
    let rawDay = parseInt(cleanNik.substring(6, 8), 10);
    const month = parseInt(cleanNik.substring(8, 10), 10);
    const rawYear = parseInt(cleanNik.substring(10, 12), 10);
    
    if (rawDay > 40) {
      gender = 'P';
      rawDay -= 40;
    }
    
    if (month >= 1 && month <= 12 && rawDay >= 1 && rawDay <= 31) {
      const currentYear2Digit = parseInt(new Date().getFullYear().toString().substring(2), 10);
      const fullYear = rawYear > currentYear2Digit ? 1900 + rawYear : 2000 + rawYear;
      dobString = `${fullYear}-${String(month).padStart(2, '0')}-${String(rawDay).padStart(2, '0')}`;
    }
  } catch (e) {
    // Ignore date parsing failure since complex validation is disabled
  }

  return {
    isValid: true,
    nik: cleanNik,
    gender,
    dobString,
  };
}

// Validate NIP (18 Digits only validation)
export function parseNIP(nip) {
  if (!nip || typeof nip !== 'string') {
    return { isValid: false, error: 'NIP wajib diisi untuk jalur pendaftaran ASN.' };
  }

  const cleanNip = nip.replace(/\s+/g, '');

  if (!/^[0-9]{18}$/.test(cleanNip)) {
    return { 
      isValid: false, 
      error: 'NIP harus tepat 18 digit angka.' 
    };
  }

  // Best effort parsing for gender if digit 15 is 1 or 2
  let gender = 'L';
  let dobString = null;
  try {
    const bYear = parseInt(cleanNip.substring(0, 4), 10);
    const bMonth = parseInt(cleanNip.substring(4, 6), 10);
    const bDay = parseInt(cleanNip.substring(6, 8), 10);
    const genderDigit = cleanNip.substring(14, 15);
    
    if (genderDigit === '2') gender = 'P';
    if (bMonth >= 1 && bMonth <= 12 && bDay >= 1 && bDay <= 31) {
      dobString = `${bYear}-${String(bMonth).padStart(2, '0')}-${String(bDay).padStart(2, '0')}`;
    }
  } catch (e) {
    // Ignore date parsing failure
  }

  return {
    isValid: true,
    nip: cleanNip,
    gender,
    dobString,
  };
}

// Validate Email & Typo check
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
