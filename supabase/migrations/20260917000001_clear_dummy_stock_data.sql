-- ====================================================================
-- MIGRATION: 20260917000001_clear_dummy_stock_data.sql
-- DESCRIPTION: Pengosongan seluruh data dummy stok, faskes, dan laporan unggahan untuk persiapan data rilis
-- TARGET: Supabase PostgreSQL
-- ====================================================================

-- 1. BERSIHKAN LEDGER STOK, MUTASI & OPNAME
TRUNCATE TABLE public.faskes_inventory_ledger CASCADE;
TRUNCATE TABLE public.inter_faskes_transfers CASCADE;
TRUNCATE TABLE public.stock_opname_items CASCADE;
TRUNCATE TABLE public.stock_opnames CASCADE;

-- 2. BERSIHKAN MASTER BATCH & FASKES DUMMY
TRUNCATE TABLE public.vaccine_batches CASCADE;
TRUNCATE TABLE public.faskes CASCADE;

-- 3. BERSIHKAN HISTORI UNGGAHAN FILE EXCEL & LAPORAN STOK DUMMY
TRUNCATE TABLE public.uploaded_files CASCADE;
TRUNCATE TABLE public.laporan_stok CASCADE;
