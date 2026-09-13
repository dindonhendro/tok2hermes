-- ====================================================================
-- MIGRATION: 20260911000000_enable_full_nik_nip_validation.sql
-- DESCRIPTION: Aktifkan kembali constraint validasi NIK (16 digit) & NIP (18 digit) secara penuh
-- TARGET: Supabase PostgreSQL
-- ====================================================================

-- 1. APUS CONSTRAINT LAMA JIKA ADA
ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS chk_nik_format;
ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS chk_nip_format;
ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS chk_internal_requires_nip;

-- 2. TAMBAH CONSTRAINT FORMAT KETAT NIK (Harus 16 Digit Angka)
ALTER TABLE public.registrations 
ADD CONSTRAINT chk_nik_format 
CHECK (nik ~ '^[0-9]{16}$');

-- 3. TAMBAH CONSTRAINT FORMAT KETAT NIP (Jika terisi, Harus 18 Digit Angka)
ALTER TABLE public.registrations 
ADD CONSTRAINT chk_nip_format 
CHECK (nip IS NULL OR length(trim(nip)) = 0 OR nip ~ '^[0-9]{18}$');

-- 4. TAMBAH CONSTRAINT PENDAFTARAN INTERNAL ASN WAJIB NIP 18 DIGIT
ALTER TABLE public.registrations 
ADD CONSTRAINT chk_internal_requires_nip 
CHECK (
    registration_type != 'perorangan_internal' OR 
    (registration_type = 'perorangan_internal' AND nip IS NOT NULL AND length(trim(nip)) = 18)
);

-- 5. FUNCTION VALIDASI ANATOMI NIK & NIP PADA DATABASE (PL/pgSQL Trigger)
CREATE OR REPLACE FUNCTION validate_nik_nip_anatomy()
RETURNS TRIGGER AS $$
DECLARE
    v_nik_day INT;
    v_nik_month INT;
    v_nik_year INT;
    v_nip_byear INT;
    v_nip_bmonth INT;
    v_nip_bday INT;
    v_nip_cyear INT;
    v_nip_cmonth INT;
    v_nip_gender CHAR(1);
BEGIN
    -- Validasi 1: NIK 16 Digit Angka
    IF NEW.nik IS NULL OR NOT (NEW.nik ~ '^[0-9]{16}$') THEN
        RAISE EXCEPTION 'Format NIK tidak valid! NIK wajib 16 digit angka.';
    END IF;

    -- Validasi Anatomi Tanggal Lahir & Bulan NIK
    v_nik_day := (SUBSTRING(NEW.nik FROM 7 FOR 2))::INT;
    IF v_nik_day > 40 THEN
        v_nik_day := v_nik_day - 40;
    END IF;
    v_nik_month := (SUBSTRING(NEW.nik FROM 9 FOR 2))::INT;

    IF v_nik_day < 1 OR v_nik_day > 31 OR v_nik_month < 1 OR v_nik_month > 12 THEN
        RAISE EXCEPTION 'Anatomi NIK tidak valid! Tanggal/Bulan lahir pada NIK (%) di luar batas logis.', NEW.nik;
    END IF;

    -- Validasi 2: NIP (jika terisi)
    IF NEW.nip IS NOT NULL AND length(trim(NEW.nip)) > 0 THEN
        IF NOT (NEW.nip ~ '^[0-9]{18}$') THEN
            RAISE EXCEPTION 'Format NIP tidak valid! NIP wajib 18 digit angka.';
        END IF;

        v_nip_byear  := (SUBSTRING(NEW.nip FROM 1 FOR 4))::INT;
        v_nip_bmonth := (SUBSTRING(NEW.nip FROM 5 FOR 2))::INT;
        v_nip_bday   := (SUBSTRING(NEW.nip FROM 7 FOR 2))::INT;
        v_nip_cyear  := (SUBSTRING(NEW.nip FROM 9 FOR 4))::INT;
        v_nip_cmonth := (SUBSTRING(NEW.nip FROM 13 FOR 2))::INT;
        v_nip_gender := SUBSTRING(NEW.nip FROM 15 FOR 1);

        -- Validasi Tanggal Lahir NIP
        IF v_nip_bmonth < 1 OR v_nip_bmonth > 12 OR v_nip_bday < 1 OR v_nip_bday > 31 THEN
            RAISE EXCEPTION 'Anatomi NIP tidak valid! Tanggal lahir pada NIP (%) tidak logis.', NEW.nip;
        END IF;

        -- Validasi TMT CPNS
        IF v_nip_cmonth < 1 OR v_nip_cmonth > 12 OR v_nip_cyear <= v_nip_byear THEN
            RAISE EXCEPTION 'Anatomi NIP tidak valid! Tahun pengangkatan CPNS pada NIP (%) tidak logis.', NEW.nip;
        END IF;

        -- Validasi Kode Gender NIP (1 = Laki-laki, 2 = Perempuan)
        IF v_nip_gender NOT IN ('1', '2') THEN
            RAISE EXCEPTION 'Anatomi NIP tidak valid! Kode jenis kelamin NIP (%) digit ke-15 harus 1 atau 2.', NEW.nip;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sebelum insert/update pada registrations
DROP TRIGGER IF EXISTS trg_validate_nik_nip ON public.registrations;
CREATE TRIGGER trg_validate_nik_nip
BEFORE INSERT OR UPDATE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION validate_nik_nip_anatomy();
