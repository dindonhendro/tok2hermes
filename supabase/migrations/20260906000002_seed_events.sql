-- ====================================================================
-- MIGRATION: 20260906000002_seed_events.sql
-- DESCRIPTION: Insert Data Awal Events Vaksinasi
-- ====================================================================

INSERT INTO public.events (
    id,
    title,
    vaccine_type,
    quota,
    reserved_quota,
    location,
    event_date,
    status
)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'Program Vaksinasi Massal HPV Subtipe 9 untuk ASN & Keluarga 2026',
    'Vaksin HPV Subtipe 9',
    500,
    0,
    'Auditorium Gedung KORPRI / Faskes Utama',
    '2026-10-15',
    'active'
), (
    'e0000000-0000-0000-0000-000000000002',
    'Program Vaksinasi Massal Booster Influenza untuk Publik 2026',
    'Vaksin Influenza Quadrivalent',
    300,
    0,
    'Klinik Pratama Toktok Health Pusat',
    '2026-11-01',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    status = EXCLUDED.status;
