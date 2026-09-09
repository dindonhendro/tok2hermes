-- ====================================================================
-- MIGRATION: REGISTRATIONS_FIX, VACCINATION_SCHEDULES & APPROVAL FUNCTION
-- ====================================================================

-- 1. TABEL PENDAFTARAN TETAP (REGISTRATIONS FIX)
CREATE TABLE IF NOT EXISTS public.registrations_fix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    
    -- Nomor & Kode Antrean Tiket
    queue_number INT NOT NULL, -- Contoh: 1, 2, 3...
    queue_code VARCHAR(20) NOT NULL, -- Contoh: A-001, A-002
    participant_code VARCHAR(30) UNIQUE NOT NULL, -- Contoh: TH-HPV-2026-0001
    
    -- Data Peserta Terverifikasi
    registration_type VARCHAR(30) NOT NULL,
    nik VARCHAR(16) NOT NULL,
    nip VARCHAR(18),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    gender VARCHAR(1) NOT NULL,
    dob DATE NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT,
    
    -- Status Pembayaran
    payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'waived' (Gratis ASN)
    payment_amount DECIMAL(12,2) DEFAULT 0.00,
    payment_date TIMESTAMPTZ,
    payment_receipt_url TEXT,
    
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL JADWAL MULTI-DOSIS (VACCINATION SCHEDULES)
CREATE TABLE IF NOT EXISTS public.vaccination_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_fix_id UUID REFERENCES public.registrations_fix(id) ON DELETE CASCADE,
    dose_number INT NOT NULL, -- 1, 2, atau 3
    scheduled_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'missed', 'rescheduled'
    
    -- Nomor Antrean & Info Sesi Dosis
    session_queue_code VARCHAR(20), -- Contoh: D2-A-015
    administered_date TIMESTAMPTZ,
    administered_by VARCHAR(255),
    vaccine_batch_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS & Add Public Policies
ALTER TABLE public.registrations_fix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Full Access Registrations Fix" ON public.registrations_fix;
CREATE POLICY "Public Full Access Registrations Fix" ON public.registrations_fix
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Vaccination Schedules" ON public.vaccination_schedules;
CREATE POLICY "Public Full Access Vaccination Schedules" ON public.vaccination_schedules
    FOR ALL USING (true) WITH CHECK (true);


-- 3. STORED PROCEDURE: APPROVE REGISTRATION & GENERATE QUEUE & SCHEDULES
CREATE OR REPLACE FUNCTION public.approve_registration(target_registration_id UUID)
RETURNS JSON AS $$
DECLARE
    v_reg RECORD;
    v_event RECORD;
    v_next_queue INT;
    v_queue_prefix VARCHAR(5);
    v_queue_code VARCHAR(20);
    v_participant_code VARCHAR(30);
    v_payment_status VARCHAR(20);
    v_payment_amount DECIMAL(12,2);
    v_fix_id UUID;
    v_d1_date DATE;
    v_d2_date DATE;
    v_d3_date DATE;
    v_res_schedules JSONB := '[]'::jsonb;
BEGIN
    -- 1. Fetch Target Registration
    SELECT * INTO v_reg FROM public.registrations WHERE id = target_registration_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Data pendaftaran dengan ID % tidak ditemukan.', target_registration_id;
    END IF;

    -- 2. Fetch Event Info
    SELECT * INTO v_event FROM public.events WHERE id = v_reg.event_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event dengan ID % tidak ditemukan.', v_reg.event_id;
    END IF;

    -- 3. Calculate Next Queue Number & Code per Event
    SELECT COALESCE(MAX(queue_number), 0) + 1 INTO v_next_queue 
    FROM public.registrations_fix 
    WHERE event_id = v_reg.event_id;

    IF v_next_queue <= 250 THEN
        v_queue_prefix := 'A';
        v_queue_code := 'A-' || LPAD(v_next_queue::TEXT, 3, '0');
    ELSE
        v_queue_prefix := 'B';
        v_queue_code := 'B-' || LPAD((v_next_queue - 250)::TEXT, 3, '0');
    END IF;

    -- Participant Code (e.g. TH-HPV-2026-0001)
    v_participant_code := 'TH-' || UPPER(SUBSTRING(v_reg.registration_type FROM 1 FOR 3)) || '-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(v_next_queue::TEXT, 4, '0');

    -- Payment Logic: Internal ASN is waived, Public is unpaid (e.g. Rp 950.000)
    IF v_reg.registration_type = 'perorangan_internal' THEN
        v_payment_status := 'waived';
        v_payment_amount := 0.00;
    ELSE
        v_payment_status := 'unpaid';
        v_payment_amount := 950000.00;
    END IF;

    -- 4. Insert into registrations_fix
    INSERT INTO public.registrations_fix (
        original_registration_id,
        event_id,
        queue_number,
        queue_code,
        participant_code,
        registration_type,
        nik,
        nip,
        full_name,
        phone,
        gender,
        dob,
        email,
        address,
        payment_status,
        payment_amount,
        approved_at
    ) VALUES (
        v_reg.id,
        v_reg.event_id,
        v_next_queue,
        v_queue_code,
        v_participant_code,
        v_reg.registration_type,
        v_reg.nik,
        v_reg.nip,
        v_reg.full_name,
        v_reg.phone,
        v_reg.gender,
        v_reg.dob,
        v_reg.email,
        v_reg.address,
        v_payment_status,
        v_payment_amount,
        NOW()
    ) RETURNING id INTO v_fix_id;

    -- 5. Calculate Schedules Based on Vaccine Type
    v_d1_date := v_event.event_date;

    IF v_event.vaccine_type ILIKE '%HPV%' OR v_event.title ILIKE '%HPV%' THEN
        -- HPV: 3 Doses (Bulan 0, Bulan 2, Bulan 6)
        v_d2_date := v_d1_date + INTERVAL '2 months';
        v_d3_date := v_d1_date + INTERVAL '6 months';

        INSERT INTO public.vaccination_schedules (registration_fix_id, dose_number, scheduled_date, status, session_queue_code)
        VALUES 
        (v_fix_id, 1, v_d1_date, 'scheduled', 'D1-' || v_queue_code),
        (v_fix_id, 2, v_d2_date, 'scheduled', 'D2-' || v_queue_code),
        (v_fix_id, 3, v_d3_date, 'scheduled', 'D3-' || v_queue_code);

    ELSIF v_event.vaccine_type ILIKE '%Hepatitis%' THEN
        -- Hepatitis B: 3 Doses (Bulan 0, Bulan 1, Bulan 6)
        v_d2_date := v_d1_date + INTERVAL '1 month';
        v_d3_date := v_d1_date + INTERVAL '6 months';

        INSERT INTO public.vaccination_schedules (registration_fix_id, dose_number, scheduled_date, status, session_queue_code)
        VALUES 
        (v_fix_id, 1, v_d1_date, 'scheduled', 'D1-' || v_queue_code),
        (v_fix_id, 2, v_d2_date, 'scheduled', 'D2-' || v_queue_code),
        (v_fix_id, 3, v_d3_date, 'scheduled', 'D3-' || v_queue_code);

    ELSIF v_event.vaccine_type ILIKE '%Dengue%' THEN
        -- Dengue: 2 Doses (Bulan 0, Bulan 3)
        v_d2_date := v_d1_date + INTERVAL '3 months';

        INSERT INTO public.vaccination_schedules (registration_fix_id, dose_number, scheduled_date, status, session_queue_code)
        VALUES 
        (v_fix_id, 1, v_d1_date, 'scheduled', 'D1-' || v_queue_code),
        (v_fix_id, 2, v_d2_date, 'scheduled', 'D2-' || v_queue_code);

    ELSE
        -- Default Single Dose (e.g. Booster Influenza)
        INSERT INTO public.vaccination_schedules (registration_fix_id, dose_number, scheduled_date, status, session_queue_code)
        VALUES 
        (v_fix_id, 1, v_d1_date, 'scheduled', 'D1-' || v_queue_code);
    END IF;

    -- 6. Update Original Registration Status to 'approved'
    UPDATE public.registrations 
    SET status = 'approved', rejection_reason = NULL 
    WHERE id = target_registration_id;

    -- Return JSON Result
    RETURN json_build_object(
        'status', 'success',
        'registration_fix_id', v_fix_id,
        'queue_number', v_next_queue,
        'queue_code', v_queue_code,
        'participant_code', v_participant_code,
        'payment_status', v_payment_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. AUTOMATIC BACKFILL FOR EXISTING APPROVED REGISTRATIONS
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.registrations WHERE status = 'approved' LOOP
        IF NOT EXISTS (SELECT 1 FROM public.registrations_fix WHERE original_registration_id = r.id) THEN
            PERFORM public.approve_registration(r.id);
        END IF;
    END LOOP;
END;
$$;

