-- ====================================================================
-- MIGRATION: 20260917000000_stok_reports_init.sql
-- DESCRIPTION: Skema basis data pencatatan laporan stok & metadata ringkasan per gudang
-- TARGET: Supabase PostgreSQL
-- ====================================================================

-- 1. TABEL: LAPORAN_STOK (Pencatatan Riwayat Laporan Stok & Agregasi Faskes)
CREATE TABLE IF NOT EXISTS public.laporan_stok (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    uploaded_by VARCHAR(255) DEFAULT 'Admin Stok',
    total_stok_fisik INT NOT NULL DEFAULT 0,
    total_valuasi_rp NUMERIC NOT NULL DEFAULT 0,
    total_penjualan_kasir INT NOT NULL DEFAULT 0,
    total_gudang INT NOT NULL DEFAULT 0,
    total_batch INT NOT NULL DEFAULT 0,
    gudang_summary_json JSONB NULL,
    batch_summary_json JSONB NULL,
    alerts_json JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_laporan_stok_updated_at ON public.laporan_stok;
CREATE TRIGGER update_laporan_stok_updated_at
BEFORE UPDATE ON public.laporan_stok
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 2. RLS POLICIES
ALTER TABLE public.laporan_stok ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on laporan_stok" ON public.laporan_stok;
DROP POLICY IF EXISTS "Allow admin full access on laporan_stok" ON public.laporan_stok;

CREATE POLICY "Allow public select on laporan_stok" 
ON public.laporan_stok FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow admin full access on laporan_stok" 
ON public.laporan_stok FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable Realtime for Hermes AI DB listeners
ALTER PUBLICATION supabase_realtime ADD TABLE public.laporan_stok;
