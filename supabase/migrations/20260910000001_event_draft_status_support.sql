-- ====================================================================
-- MIGRATION: 20260910000001_event_draft_status_support.sql
-- DESCRIPTION: Mendukung status 'draft' pada tabel events (menunggu approval sebelum ditayangkan 'active')
-- TARGET: Supabase PostgreSQL
-- ====================================================================

-- 1. UPDATE CHECK CONSTRAINT ON PUBLIC.EVENTS(STATUS)
ALTER TABLE public.events 
DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE public.events 
ADD CONSTRAINT events_status_check 
CHECK (status IN ('draft', 'active', 'completed', 'cancelled'));

-- 2. DRAFT BY DEFAULT UNTUK EVENT BARU (Opsional jika ingin default draft)
-- ALTER TABLE public.events ALTER COLUMN status SET DEFAULT 'draft';

-- 3. UPDATED RLS POLICY FOR PUBLIC PUBLICATED EVENTS
-- Hanya event dengan status 'active' yang tampil untuk publik (pendaftaran)
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON public.events;

CREATE POLICY "Public events are viewable by everyone" 
ON public.events FOR SELECT 
TO anon, authenticated
USING (status = 'active');

-- 4. FUNCTION FOR HERMES / ADMIN TO APPROVE DRAFT EVENT TO ACTIVE
CREATE OR REPLACE FUNCTION public.approve_event_to_active(p_event_id UUID)
RETURNS public.events AS $$
DECLARE
    v_updated_event public.events;
BEGIN
    UPDATE public.events
    SET status = 'active',
        updated_at = NOW()
    WHERE id = p_event_id AND status = 'draft'
    RETURNING * INTO v_updated_event;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event tidak ditemukan atau status bukan draft!';
    END IF;

    RETURN v_updated_event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. SEED DRAFT EVENT UNTUK TESTING HERMES AI & ADMIN DASHBOARD
INSERT INTO public.events (
    id, event_number, event_code, title, vaccine_type, quota, reserved_quota, location, venue_address, operating_hours, event_date, status
) VALUES (
    'e0000000-0000-0000-0000-000000000006', 
    6, 
    'EVT-006', 
    'Vaksinasi Booster HPV - Klinik Abadi Jaya Depok (Draft)', 
    'Vaksin Biogen HPV', 
    300, 
    0, 
    'Klinik Abadi Jaya Depok', 
    'Jl. Margonda Raya No. 88, Depok', 
    '09:00 - 15:00 WIB', 
    '2026-10-15', 
    'draft'
) ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    status = EXCLUDED.status;
