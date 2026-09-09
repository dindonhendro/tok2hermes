-- ====================================================================
-- MIGRATION: 20260907000001_disable_nik_nip_constraints.sql
-- DESCRIPTION: Nonaktifkan constraint ketat chk_nik_format & chk_nip_format
-- REASON: Memungkinkan penyimpanan data testing anomali untuk audit Hermes Engine
-- ====================================================================

ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS chk_nik_format;
ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS chk_nip_format;
