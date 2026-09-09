-- ====================================================================
-- MIGRATION: ADD EVENT NUMBER, EVENT CODE & EVENT COMPLETION CONTROL
-- ====================================================================

-- 1. ADD EVENT_NUMBER & EVENT_CODE COLUMNS
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS event_number INT,
ADD COLUMN IF NOT EXISTS event_code VARCHAR(20);

-- Populate existing 5 events with sequential numbers & codes
UPDATE public.events 
SET event_number = 1, event_code = 'EVT-001'
WHERE id = 'e0000000-0000-0000-0000-000000000001';

UPDATE public.events 
SET event_number = 2, event_code = 'EVT-002'
WHERE id = 'e0000000-0000-0000-0000-000000000002';

UPDATE public.events 
SET event_number = 3, event_code = 'EVT-003'
WHERE id = 'e0000000-0000-0000-0000-000000000003';

UPDATE public.events 
SET event_number = 4, event_code = 'EVT-004'
WHERE id = 'e0000000-0000-0000-0000-000000000004';

UPDATE public.events 
SET event_number = 5, event_code = 'EVT-005'
WHERE id = 'e0000000-0000-0000-0000-000000000005';

-- Default fallback for any unassigned event codes
UPDATE public.events
SET 
  event_number = 1,
  event_code = 'EVT-001'
WHERE event_code IS NULL;

-- 2. TRIGGER BEFORE INSERT TO AUTO-ASSIGN EVENT_NUMBER & EVENT_CODE
CREATE OR REPLACE FUNCTION set_event_code_and_number()
RETURNS TRIGGER AS $$
DECLARE
    v_max INT;
BEGIN
    IF NEW.event_number IS NULL THEN
        SELECT COALESCE(MAX(event_number), 0) + 1 INTO v_max FROM public.events;
        NEW.event_number := v_max;
    END IF;

    IF NEW.event_code IS NULL THEN
        NEW.event_code := 'EVT-' || LPAD(NEW.event_number::TEXT, 3, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_event_code ON public.events;
CREATE TRIGGER trg_set_event_code
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION set_event_code_and_number();
