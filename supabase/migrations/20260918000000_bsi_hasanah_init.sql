-- ====================================================================
-- MIGRATION: 20260918000000_bsi_hasanah_init.sql
-- DESCRIPTION: Schema Database Platform Pembiayaan BSI Hasanah Card ASN KORPRI
-- TARGET: Supabase PostgreSQL
-- ====================================================================

-- 1. TABEL: ASN_PROFILES (Master Profile Kepegawaian & Validasi NIP 18-Digit)
CREATE TABLE IF NOT EXISTS public.asn_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NULL, -- opsional relasi auth.users
    nip VARCHAR(18) UNIQUE NOT NULL,
    nik VARCHAR(16) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    birth_date DATE NULL,
    gender VARCHAR(10) NULL CHECK (gender IN ('male', 'female')),
    cpns_tmt_date DATE NULL,
    instansi VARCHAR(255) NOT NULL,
    unit_kerja VARCHAR(255) NULL,
    jabatan VARCHAR(255) NULL,
    pangkat_golongan VARCHAR(50) NULL,
    phone VARCHAR(25) NOT NULL,
    email VARCHAR(255) NULL,
    address TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at untuk asn_profiles
CREATE TRIGGER update_asn_profiles_updated_at
BEFORE UPDATE ON public.asn_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 2. TABEL: CARD_APPLICATIONS (Pengajuan BSI Hasanah Card & Tracking Status)
CREATE TABLE IF NOT EXISTS public.card_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_number VARCHAR(50) UNIQUE NOT NULL,
    asn_profile_id UUID NOT NULL REFERENCES public.asn_profiles(id) ON DELETE CASCADE,
    application_status VARCHAR(30) NOT NULL DEFAULT 'submitted' CHECK (
        application_status IN (
            'submitted',        -- Pengajuan baru dari ASN
            'verified_korpri',  -- Terverifikasi keabsahan ASN oleh KORPRI
            'bsi_review',       -- Sedang proses Credit Scoring & Review BSI
            'approved',         -- Disetujui BSI (Limit diterbitkan)
            'rejected',         -- Ditolak dengan alasan
            'card_shipped'      -- Kartu fisik sudah dikirimkan
        )
    ),
    monthly_income NUMERIC(15, 2) NOT NULL DEFAULT 0,
    limit_requested NUMERIC(15, 2) NOT NULL DEFAULT 0,
    limit_approved NUMERIC(15, 2) DEFAULT 0,
    ktp_url TEXT NULL,
    sk_pns_url TEXT NULL,
    slip_gaji_url TEXT NULL,
    kta_korpri_url TEXT NULL,
    rejection_notes TEXT NULL,
    verifier_name VARCHAR(255) NULL,
    bsi_officer_name VARCHAR(255) NULL,
    approved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at untuk card_applications
CREATE TRIGGER update_card_applications_updated_at
BEFORE UPDATE ON public.card_applications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 3. TABEL: AUDIT_LOGS (Rekam Jejak Persetujuan Admin KORPRI & BSI)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NULL REFERENCES public.card_applications(id) ON DELETE SET NULL,
    actor_role VARCHAR(50) NOT NULL, -- 'admin_korpri', 'bsi_reviewer', 'system'
    actor_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.asn_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access on asn_profiles" ON public.asn_profiles;
CREATE POLICY "Allow full access on asn_profiles" 
ON public.asn_profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access on card_applications" ON public.card_applications;
CREATE POLICY "Allow full access on card_applications" 
ON public.card_applications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow full access on audit_logs" 
ON public.audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'card_applications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.card_applications;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
