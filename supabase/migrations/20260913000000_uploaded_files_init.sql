-- ====================================================================
-- MIGRATION: 20260913000000_uploaded_files_init.sql
-- DESCRIPTION: Skema basis data metadata berkas Excel kolektif & audit Hermes Agent (Kabayan)
-- TARGET: Supabase PostgreSQL
-- ====================================================================

-- 1. TABEL: UPLOADED_FILES (Pencatatan Berkas Excel & Audit Hermes)
CREATE TABLE IF NOT EXISTS public.uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    uploaded_by VARCHAR(255) DEFAULT 'Admin Operasional',
    status VARCHAR(30) NOT NULL DEFAULT 'pending_audit' CHECK (status IN ('pending_audit', 'auditing', 'audited', 'error')),
    total_rows INT DEFAULT 0,
    valid_rows INT DEFAULT 0,
    anomaly_rows INT DEFAULT 0,
    file_data_json JSONB NULL, -- Data baris Excel hasil parsing
    audit_summary JSONB NULL,  -- Temuan audit NIK/NIP/Email Hermes Agent
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_uploaded_files_updated_at ON public.uploaded_files;
CREATE TRIGGER update_uploaded_files_updated_at
BEFORE UPDATE ON public.uploaded_files
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 2. RLS POLICIES (Allow Public/Anon & Authenticated for Admin Control Panel)
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on uploaded_files" ON public.uploaded_files;
DROP POLICY IF EXISTS "Allow admin full access on uploaded_files" ON public.uploaded_files;

CREATE POLICY "Allow public select on uploaded_files" 
ON public.uploaded_files FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow admin full access on uploaded_files" 
ON public.uploaded_files FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. SEED DUMMY SAMPLE EXCEL FILES UNTUK DEMO CONTROL PANEL
INSERT INTO public.uploaded_files (
    id, filename, file_path, file_size_bytes, uploaded_by, status, total_rows, valid_rows, anomaly_rows, file_data_json, audit_summary
) VALUES 
(
    'f0000000-0000-0000-0000-000000000001',
    'Pendaftaran_Kolektif_Kemenkeu_Batch1.xlsx',
    '~/.hermes/toktok_uploads/Pendaftaran_Kolektif_Kemenkeu_Batch1.xlsx',
    45820,
    'Ami (Kemenkeu PIC)',
    'audited',
    5,
    4,
    1,
    '[
        {"no": 1, "nama": "Budi Santoso", "nik": "3171012508950001", "nip": "199508252020121001", "instansi": "Kemenkeu RI", "email": "budi.santoso@kemenkeu.go.id", "phone": "081299887766", "status_audit": "VALID"},
        {"no": 2, "nama": "Siti Rahmawati", "nik": "3201026011960002", "nip": "199611202021012002", "instansi": "Kemenkeu RI", "email": "siti.rahma@kemenkeu.go.id", "phone": "081388776655", "status_audit": "VALID"},
        {"no": 3, "nama": "Ahmad Hidayat", "nik": "3171011504900003", "nip": "199004152018031003", "instansi": "Kemenkeu RI", "email": "ahmad.hidayat@gmai.com", "phone": "081577665544", "status_audit": "ANOMALY", "alasan": "Typo Email @gmai.com"},
        {"no": 4, "nama": "Dewi Lestari", "nik": "3578014509920004", "nip": "199209052019022004", "instansi": "Kemenkeu RI", "email": "dewi.lestari@kemenkeu.go.id", "phone": "081766554433", "status_audit": "VALID"},
        {"no": 5, "nama": "Eko Prasetyo", "nik": "3374011201880005", "nip": "198801122015041005", "instansi": "Kemenkeu RI", "email": "eko.prasetyo@kemenkeu.go.id", "phone": "081955443322", "status_audit": "VALID"}
    ]'::jsonb,
    '{"scanned_at": "2026-09-13T09:00:00Z", "total": 5, "valid": 4, "anomaly": 1, "remarks": "Ditemukan 1 email typo domain (@gmai.com)"}'::jsonb
),
(
    'f0000000-0000-0000-0000-000000000002',
    'Usulan_Vaksinasi_Korpri_Depok.xlsx',
    '~/.hermes/toktok_uploads/Usulan_Vaksinasi_Korpri_Depok.xlsx',
    28400,
    'Kharisma (Korpri Depok)',
    'pending_audit',
    3,
    0,
    0,
    '[
        {"no": 1, "nama": "Bambang Wijaya", "nik": "3276011406850001", "nip": "198506142012011001", "instansi": "Pemkot Depok", "email": "bambang@depok.go.id", "phone": "081211223344"},
        {"no": 2, "nama": "Rina Kartika", "nik": "3276015502930002", "nip": "199302152019032002", "instansi": "Pemkot Depok", "email": "rina@depok.go.id", "phone": "081322334455"},
        {"no": 3, "nama": "Doni Pratama", "nik": "3276010101900003", "nip": "199001012018011003", "instansi": "Pemkot Depok", "email": "doni@depok.go.id", "phone": "081433445566"}
    ]'::jsonb,
    NULL
) ON CONFLICT (id) DO UPDATE SET 
    filename = EXCLUDED.filename,
    file_path = EXCLUDED.file_path,
    status = EXCLUDED.status,
    file_data_json = EXCLUDED.file_data_json;
