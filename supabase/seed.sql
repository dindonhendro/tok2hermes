-- ====================================================================
-- SEED DATA: 20260906000002_seed_events.sql
-- DESCRIPTION: Data awal untuk tabel events Toktok Health
-- TARGET: Supabase PostgreSQL
-- ====================================================================

INSERT INTO public.events (
    id,
    event_number,
    event_code,
    title,
    vaccine_type,
    quota,
    reserved_quota,
    location,
    venue_address,
    operating_hours,
    event_date,
    status
)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    1,
    'EVT-001',
    'Program Vaksinasi HPV Subtipe 9 untuk ASN & Keluarga 2026',
    'Vaksin HPV Subtipe 9',
    500,
    0,
    'Auditorium Gedung KORPRI / Faskes Utama',
    'Jl. Lapangan Banteng Barat No. 34, Pasar Baru, Kec. Sawah Besar, Jakarta Pusat',
    '08:00 - 16:00 WIB',
    '2026-10-15',
    'active'
), (
    'e0000000-0000-0000-0000-000000000002',
    2,
    'EVT-002',
    'Program Vaksinasi Booster Influenza untuk Publik 2026',
    'Vaksin Influenza Quadrivalent',
    300,
    0,
    'Klinik Pratama Toktok Health Pusat',
    'Jl. Asia Afrika No. 12, Gelora, Kec. Tanah Abang, Jakarta Pusat',
    '08:00 - 16:00 WIB',
    '2026-11-01',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    event_number = EXCLUDED.event_number,
    event_code = EXCLUDED.event_code,
    venue_address = EXCLUDED.venue_address,
    operating_hours = EXCLUDED.operating_hours,
    status = EXCLUDED.status;
