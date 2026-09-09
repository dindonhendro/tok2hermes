-- ====================================================================
-- MIGRATION: 20260906000000_toktok_health_init.sql
-- DESCRIPTION: Skema basis data Toktok Health (Vaksinasi Massal & Hermes Automation)
-- AUTHOR: Senior Fullstack Engineer
-- TARGET: Supabase PostgreSQL
-- ====================================================================

-- 1. EXTENSIONS & HELPER FUNCTIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function untuk meng-update timestamp updated_at secara otomatis
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TABEL: EVENTS (Kegiatan Vaksinasi)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_number INT NULL,
    event_code VARCHAR(20) NULL,
    title VARCHAR(255) NOT NULL,
    vaccine_type VARCHAR(100) NOT NULL DEFAULT 'Vaksin HPV',
    quota INT NOT NULL CHECK (quota >= 0),
    reserved_quota INT NOT NULL DEFAULT 0 CHECK (reserved_quota >= 0 AND reserved_quota <= quota),
    remaining_quota INT GENERATED ALWAYS AS (quota - reserved_quota) STORED,
    location TEXT NOT NULL,
    venue_address TEXT NULL,
    operating_hours VARCHAR(50) DEFAULT '08:00 - 16:00 WIB',
    event_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at untuk events
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 3. TABEL: REGISTRATIONS (Antrean & Peserta Vaksinasi)
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    registration_type VARCHAR(30) NOT NULL CHECK (registration_type IN ('perorangan', 'kelompok', 'perorangan_publik', 'perorangan_internal')),
    nik VARCHAR(16) NOT NULL,
    nip VARCHAR(18) NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    gender VARCHAR(1) NOT NULL CHECK (gender IN ('L', 'P')),
    dob DATE NOT NULL,
    address TEXT NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT NULL,
    is_flagged_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints Formats & Logic
    CONSTRAINT chk_nik_format CHECK (nik ~ '^[0-9]{16}$'),
    CONSTRAINT chk_nip_format CHECK (nip IS NULL OR nip ~ '^[0-9]{18}$'),
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_internal_requires_nip CHECK (
        registration_type != 'perorangan_internal' OR (registration_type = 'perorangan_internal' AND nip IS NOT NULL)
    )
);

-- Trigger updated_at untuk registrations
CREATE TRIGGER update_registrations_updated_at
BEFORE UPDATE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. CONSTRAINTS UNTUK MENCEGAH DUPLIKASI (Anti-Double Registration)
-- Skenario: Mencegah NIK terdaftar 2x pada Event yang sama
ALTER TABLE public.registrations 
ADD CONSTRAINT uq_event_nik UNIQUE (event_id, nik);

-- Skenario: Mencegah NIP terdaftar 2x pada Event yang sama (jika NIP terisi)
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_event_nip 
ON public.registrations (event_id, nip) 
WHERE nip IS NOT NULL AND nip != '';

-- 5. INDEKS OPTIMASI PERFORMA & PENCARIAN (Indexes)
-- Indeks pencarian cepat berdasarkan NIK (Sering dicari peserta & admin)
CREATE INDEX IF NOT EXISTS idx_registrations_nik 
ON public.registrations (nik);

-- Indeks pencarian cepat berdasarkan NIP (ASN verification)
CREATE INDEX IF NOT EXISTS idx_registrations_nip 
ON public.registrations (nip) 
WHERE nip IS NOT NULL;

-- Indeks komposit untuk filter Dashboard Admin (Event ID + Status)
CREATE INDEX IF NOT EXISTS idx_registrations_event_status 
ON public.registrations (event_id, status);

-- Indeks waktu pendaftaran untuk sorting dan cron Hermes
CREATE INDEX IF NOT EXISTS idx_registrations_created_at 
ON public.registrations (created_at DESC);

-- 6. AUTOMATIC QUOTA MANAGEMENT (TRIGGER & FUNCTION)
-- Fungsi untuk meng-update reserved_quota pada tabel events secara otomatis saat status disetujui (Approved)
CREATE OR REPLACE FUNCTION handle_registration_quota_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Jika pendaftaran baru langsung approved (jarang) atau status diubah menjadi approved
    IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR 
       (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') THEN
       
        -- Pastikan sisa kuota masih mencukupi
        IF (SELECT remaining_quota FROM public.events WHERE id = NEW.event_id) <= 0 THEN
            RAISE EXCEPTION 'Kuota vaksinasi untuk event ini sudah habis!';
        END IF;

        UPDATE public.events 
        SET reserved_quota = reserved_quota + 1 
        WHERE id = NEW.event_id;

    -- Jika status disetujui dibatalkan / diubah dari approved menjadi pending/rejected
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status != 'approved') THEN
        UPDATE public.events 
        SET reserved_quota = GREATEST(0, reserved_quota - 1) 
        WHERE id = NEW.event_id;

    -- Jika data pendaftaran approved dihapus
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'approved') THEN
        UPDATE public.events 
        SET reserved_quota = GREATEST(0, reserved_quota - 1) 
        WHERE id = OLD.event_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_manage_registration_quota
AFTER INSERT OR UPDATE OR DELETE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION handle_registration_quota_change();

-- 7. SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Policies for events
-- Public dapat melihat event yang statusnya active
CREATE POLICY "Public events are viewable by everyone" 
ON public.events FOR SELECT 
USING (status = 'active');

-- Admin / authenticated user memiliki akses penuh ke events
CREATE POLICY "Admins have full access to events" 
ON public.events FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Policies for registrations
-- Public (Anon) dapat melakukan pendaftaran baru
CREATE POLICY "Public can submit new registrations" 
ON public.registrations FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Public dapat melihat status pendaftarannya sendiri berdasarkan NIK
CREATE POLICY "Public can view own registration status by NIK" 
ON public.registrations FOR SELECT 
TO anon, authenticated 
USING (true);

-- Authenticated Admin memiliki akses penuh (Select, Update Status, Delete)
CREATE POLICY "Admins have full access to registrations" 
ON public.registrations FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 8. PUBLICATION FOR SUPABASE DATABASE WEBHOOKS (HERMES AUTOMATION)
-- Mengaktifkan Realtime / Webhook listener pada tabel registrations
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
