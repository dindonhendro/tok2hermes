-- ====================================================================
-- MIGRATION: 20260910000000_faskes_vaccine_inventory.sql
-- DESCRIPTION: Schema database Faskes, Batch Vaksin, dan Ledger Stok (Doses) untuk Enquiry Hermes AI
-- TARGET: Supabase PostgreSQL
-- ====================================================================

-- 1. TABEL: FASKES (Fasilitas Kesehatan / Klinik)
CREATE TABLE IF NOT EXISTS public.faskes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NULL,
    phone VARCHAR(20) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at untuk faskes
CREATE TRIGGER update_faskes_updated_at
BEFORE UPDATE ON public.faskes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 2. TABEL: VACCINES (Master Jenis Vaksin)
CREATE TABLE IF NOT EXISTS public.vaccines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255) NOT NULL,
    target_disease VARCHAR(255) DEFAULT 'HPV',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABEL: VACCINE BATCHES (Nomor Batch & Expiry Date)
CREATE TABLE IF NOT EXISTS public.vaccine_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vaccine_id UUID NOT NULL REFERENCES public.vaccines(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100) NOT NULL UNIQUE,
    expiration_date DATE NOT NULL,
    is_verified_distribution BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABEL: FASKES INVENTORY LEDGER (Transaksional Stok Dosis)
-- Perubahan stok SELALU berupa row baru (Append-only)
CREATE TABLE IF NOT EXISTS public.faskes_inventory_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faskes_id UUID NOT NULL REFERENCES public.faskes(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES public.vaccine_batches(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(30) NOT NULL CHECK (
        transaction_type IN (
            'SHIPMENT_IN',        -- Kiriman barang masuk
            'VACCINATION_OUT',    -- Pemakaian vaksinasi (doses)
            'TRANSFER_OUT',       -- Dipinjamkan/dikirim ke faskes lain
            'TRANSFER_IN',        -- Menerima pinjaman dari faskes lain
            'OPNAME_ADJUSTMENT',  -- Penyesuaian stok opname
            'DISCARD_OUT'         -- Rusak / Kadalwarsa
        )
    ),
    quantity_doses INT NOT NULL, -- Positif (+) untuk MASUK, Negatif (-) untuk KELUAR
    reference_number VARCHAR(100) NULL, -- No Berita Acara / No Kiriman / No Rekam Medis
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABEL: INTER FASKES TRANSFERS (Pinjaman / Mutasi Antar Faskes)
CREATE TABLE IF NOT EXISTS public.inter_faskes_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_faskes_id UUID NOT NULL REFERENCES public.faskes(id),
    receiver_faskes_id UUID NOT NULL REFERENCES public.faskes(id),
    batch_id UUID NOT NULL REFERENCES public.vaccine_batches(id),
    quantity_doses INT NOT NULL CHECK (quantity_doses > 0),
    berita_acara_number VARCHAR(100) NOT NULL,
    berita_acara_url TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABEL: STOCK OPNAMES & ITEMS (Opname Fisik & Rekonsiliasi)
CREATE TABLE IF NOT EXISTS public.stock_opnames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faskes_id UUID NOT NULL REFERENCES public.faskes(id),
    opname_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed')),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_opname_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opname_id UUID NOT NULL REFERENCES public.stock_opnames(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.vaccine_batches(id),
    system_qty_doses INT NOT NULL,
    physical_qty_doses INT NOT NULL,
    difference_qty_doses INT NOT NULL,
    notes TEXT NULL
);

-- 7. VIEW REKAP STOK REAL-TIME PER FASKES & BATCH (Untuk Hermes AI Enquiry)
CREATE OR REPLACE VIEW public.v_faskes_stock_summary AS
SELECT 
    f.id AS faskes_id,
    f.code AS faskes_code,
    f.name AS faskes_name,
    f.city AS faskes_city,
    v.id AS vaccine_id,
    v.name AS vaccine_name,
    v.manufacturer,
    vb.id AS batch_id,
    vb.batch_number,
    vb.expiration_date,
    vb.is_verified_distribution,
    COALESCE(SUM(l.quantity_doses), 0) AS current_stock_doses
FROM public.faskes f
CROSS JOIN public.vaccine_batches vb
JOIN public.vaccines v ON v.id = vb.vaccine_id
LEFT JOIN public.faskes_inventory_ledger l 
    ON l.faskes_id = f.id AND l.batch_id = vb.id
WHERE f.status = 'active'
GROUP BY 
    f.id, f.code, f.name, f.city,
    v.id, v.name, v.manufacturer,
    vb.id, vb.batch_number, vb.expiration_date, vb.is_verified_distribution;

-- VIEW REKAP TOTAL STOK PER FASKES ACROSS ALL BATCHES
CREATE OR REPLACE VIEW public.v_faskes_stock_total AS
SELECT 
    f.id AS faskes_id,
    f.code AS faskes_code,
    f.name AS faskes_name,
    f.city AS faskes_city,
    COALESCE(SUM(l.quantity_doses), 0) AS total_stock_doses
FROM public.faskes f
LEFT JOIN public.faskes_inventory_ledger l ON l.faskes_id = f.id
WHERE f.status = 'active'
GROUP BY f.id, f.code, f.name, f.city;

-- 8. INDEXES UNTUK PERFORMA ENQUIRY HERMES AI
CREATE INDEX IF NOT EXISTS idx_ledger_faskes_batch ON public.faskes_inventory_ledger(faskes_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction_type ON public.faskes_inventory_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_batch_number ON public.vaccine_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_faskes_code ON public.faskes(code);

-- 9. RLS POLICIES (Mendukung Akses Hermes AI & Public/Anon Demo)
ALTER TABLE public.faskes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faskes_inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inter_faskes_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opnames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on faskes" ON public.faskes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow admin full access on faskes" ON public.faskes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public select on vaccines" ON public.vaccines FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow admin full access on vaccines" ON public.vaccines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public select on vaccine_batches" ON public.vaccine_batches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow admin full access on vaccine_batches" ON public.vaccine_batches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public select on faskes_inventory_ledger" ON public.faskes_inventory_ledger FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow admin full access on faskes_inventory_ledger" ON public.faskes_inventory_ledger FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public select on inter_faskes_transfers" ON public.inter_faskes_transfers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public select on stock_opnames" ON public.stock_opnames FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public select on stock_opname_items" ON public.stock_opname_items FOR SELECT TO anon, authenticated USING (true);

-- Enable Realtime for Hermes AI DB triggers/webhooks
ALTER PUBLICATION supabase_realtime ADD TABLE public.faskes_inventory_ledger;

-- ====================================================================
-- SEED DATA DEMO (Berdasarkan Dokumen Evaluasi Stok TokTok Health 8 Sept 2026)
-- ====================================================================

DO $$
DECLARE
    v_vaccine_id UUID;
    v_batch_126_id UUID;
    v_batch_226_id UUID;
    
    f_optima_id UUID;
    f_glams_tabalong_id UUID;
    f_depok_id UUID;
    f_rsud_sultan_id UUID;
    f_rindam_id UUID;
    f_flora_lampung_id UUID;
    f_banjarbaru_selatan_id UUID;
BEGIN
    -- 1. Insert Master Vaccine
    INSERT INTO public.vaccines (code, name, manufacturer, target_disease)
    VALUES ('VAC-BIOGEN-HPV', 'Vaksin Biogen HPV Quadrivalent', 'Biogen', 'HPV / Kanker Serviks')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_vaccine_id;

    -- 2. Insert Vaccine Batches
    INSERT INTO public.vaccine_batches (vaccine_id, batch_number, expiration_date, is_verified_distribution)
    VALUES (v_vaccine_id, '40100126', '2027-12-31', FALSE) -- Batch khusus/unverified dari PDF
    ON CONFLICT (batch_number) DO UPDATE SET expiration_date = EXCLUDED.expiration_date
    RETURNING id INTO v_batch_126_id;

    INSERT INTO public.vaccine_batches (vaccine_id, batch_number, expiration_date, is_verified_distribution)
    VALUES (v_vaccine_id, '40100226', '2027-06-30', TRUE)
    ON CONFLICT (batch_number) DO UPDATE SET expiration_date = EXCLUDED.expiration_date
    RETURNING id INTO v_batch_226_id;

    -- 3. Insert Master Faskes / Klinik
    INSERT INTO public.faskes (code, name, city, address, phone)
    VALUES ('FSK-OPTIMA-01', 'Optima Medica Clinic', 'Jakarta', 'Jl. Rasuna Said No. 12', '021-5551234')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO f_optima_id;

    INSERT INTO public.faskes (code, name, city, address, phone)
    VALUES ('FSK-TBAL-01', 'Glams Klinik Tabalong', 'Tabalong', 'Jl. Ahmad Yani No. 45', '0526-202123')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO f_glams_tabalong_id;

    INSERT INTO public.faskes (code, name, city, address, phone)
    VALUES ('FSK-DEPOK-01', 'Klinik Abadi Jaya Depok', 'Depok', 'Jl. Margonda Raya No. 88', '021-7778899')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO f_depok_id;

    INSERT INTO public.faskes (code, name, city, address, phone)
    VALUES ('FSK-RSUD-SULTAN', 'RSUD Sultan Suriansyah', 'Banjarmasin', 'Jl. R.K. Ilir No. 10', '0511-333444')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO f_rsud_sultan_id;

    INSERT INTO public.faskes (code, name, city, address, phone)
    VALUES ('FSK-RINDAM-01', 'Klinik Rindam Hasanuddin', 'Banjarbaru', 'Jl. A. Yani Km 33', '0511-444555')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO f_rindam_id;

    INSERT INTO public.faskes (code, name, city, address, phone)
    VALUES ('FSK-FLORA-LMP', 'Klinik Flora Lampung', 'Bandar Lampung', 'Jl. Raden Intan No. 12', '0721-222333')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO f_flora_lampung_id;

    INSERT INTO public.faskes (code, name, city, address, phone)
    VALUES ('FSK-BJBS-01', 'Puskesmas Banjarbaru Selatan', 'Banjarbaru', 'Jl. Vektor Utama No. 5', '0511-999888')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO f_banjarbaru_selatan_id;

    -- 4. Seed Ledger Entries (Stok Bersih Pasca Merapikan 8 September 2026)
    -- Reset ledger demo sebelumnya untuk faskes ini
    DELETE FROM public.faskes_inventory_ledger WHERE faskes_id IN (
        f_optima_id, f_glams_tabalong_id, f_depok_id, f_rsud_sultan_id, f_rindam_id
    );

    -- Optima Medica Clinic: Batch 40100126 = 201 dosis, Batch 40100226 = 95 dosis
    INSERT INTO public.faskes_inventory_ledger (faskes_id, batch_id, transaction_type, quantity_doses, reference_number, notes)
    VALUES 
    (f_optima_id, v_batch_126_id, 'OPNAME_ADJUSTMENT', 201, 'BA-OPTIMA-0809', 'Hasil Rekonsiliasi 8 Sept 2026'),
    (f_optima_id, v_batch_226_id, 'OPNAME_ADJUSTMENT', 95, 'BA-OPTIMA-0809', 'Hasil Rekonsiliasi 8 Sept 2026');

    -- Glams Klinik Tabalong: Batch 40100126 = 336 dosis, Batch 40100226 = 49 dosis
    INSERT INTO public.faskes_inventory_ledger (faskes_id, batch_id, transaction_type, quantity_doses, reference_number, notes)
    VALUES 
    (f_glams_tabalong_id, v_batch_126_id, 'OPNAME_ADJUSTMENT', 336, 'BA-TABALONG-0809', 'Hasil Serah Terima & Rekonsiliasi 8 Sept 2026'),
    (f_glams_tabalong_id, v_batch_226_id, 'OPNAME_ADJUSTMENT', 49, 'BA-TABALONG-0809', 'Hasil Serah Terima & Rekonsiliasi 8 Sept 2026');

    -- Klinik Abadi Jaya Depok: Batch 40100126 = 124 dosis, Batch 40100226 = 546 dosis
    INSERT INTO public.faskes_inventory_ledger (faskes_id, batch_id, transaction_type, quantity_doses, reference_number, notes)
    VALUES 
    (f_depok_id, v_batch_126_id, 'OPNAME_ADJUSTMENT', 124, 'BA-DEPOK-0809', 'Laporan faskes + Keterangan Biogen'),
    (f_depok_id, v_batch_226_id, 'OPNAME_ADJUSTMENT', 546, 'BA-DEPOK-0809', 'Stok Alokasi Vaksinasi Massal Depok');

    -- RSUD Sultan Suriansyah: Batch 40100226 = 0 dosis (Dibatalkan)
    INSERT INTO public.faskes_inventory_ledger (faskes_id, batch_id, transaction_type, quantity_doses, reference_number, notes)
    VALUES 
    (f_rsud_sultan_id, v_batch_226_id, 'DISCARD_OUT', 0, 'CANC-450-SULTAN', 'Pengiriman 450 vial dibatalkan, saldo 0');

    -- Klinik Rindam Hasanuddin: Batch 40100226 = 11 dosis
    INSERT INTO public.faskes_inventory_ledger (faskes_id, batch_id, transaction_type, quantity_doses, reference_number, notes)
    VALUES 
    (f_rindam_id, v_batch_226_id, 'OPNAME_ADJUSTMENT', 11, 'BA-RINDAM-0809', 'Baris rusak dinolkan, tersisa 11 dosis');

END $$;
