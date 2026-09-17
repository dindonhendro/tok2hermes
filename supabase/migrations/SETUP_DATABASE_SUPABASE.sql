-- ====================================================================
-- SUPABASE REMOTE DATABASE FULL SETUP SCRIPT (SQL EDITOR COPY-PASTE)
-- Salin seluruh isi skrip ini dan tempel ke:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. EXTENSION UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. HELPER FUNCTION UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TABEL: LAPORAN_STOK (Pencatatan Ringkasan Laporan Stok Faskes)
CREATE TABLE IF NOT EXISTS public.laporan_stok (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    uploaded_by VARCHAR(255) DEFAULT 'Admin Stok',
    total_stok_fisik INT NOT NULL DEFAULT 0,
    total_penjualan_kasir INT NOT NULL DEFAULT 0,
    total_gudang INT NOT NULL DEFAULT 0,
    total_batch INT NOT NULL DEFAULT 0,
    gudang_summary_json JSONB NULL,
    batch_summary_json JSONB NULL,
    alerts_json JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies untuk laporan_stok
ALTER TABLE public.laporan_stok ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access on laporan_stok" ON public.laporan_stok;
CREATE POLICY "Allow full access on laporan_stok" 
ON public.laporan_stok FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. TABEL: UPLOADED_FILES (Pencatatan Metadata File Excel & Hermes Audit)
CREATE TABLE IF NOT EXISTS public.uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    uploaded_by VARCHAR(255) DEFAULT 'Admin Operasional',
    status VARCHAR(30) NOT NULL DEFAULT 'pending_audit',
    total_rows INT DEFAULT 0,
    valid_rows INT DEFAULT 0,
    anomaly_rows INT DEFAULT 0,
    file_data_json JSONB NULL,
    audit_summary JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies untuk uploaded_files
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access on uploaded_files" ON public.uploaded_files;
CREATE POLICY "Allow full access on uploaded_files" 
ON public.uploaded_files FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. AKTIFKAN REALTIME PUBLICATION
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'laporan_stok') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.laporan_stok;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'uploaded_files') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.uploaded_files;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
