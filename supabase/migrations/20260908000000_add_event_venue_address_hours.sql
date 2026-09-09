-- ====================================================================
-- MIGRATION: ADD VENUE ADDRESS & OPERATING HOURS TO EVENTS TABLE
-- ====================================================================

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS venue_address TEXT DEFAULT 'Jl. Lapangan Banteng Barat No. 34, Pasar Baru, Jakarta Pusat',
ADD COLUMN IF NOT EXISTS operating_hours TEXT DEFAULT '08:00 - 16:00 WIB';

-- Update existing default events with detailed addresses & hours
UPDATE public.events 
SET 
  venue_address = 'Jl. Lapangan Banteng Barat No. 34, Pasar Baru, Kec. Sawah Besar, Jakarta Pusat',
  operating_hours = '08:00 - 16:00 WIB'
WHERE id = 'e0000000-0000-0000-0000-000000000001';

UPDATE public.events 
SET 
  venue_address = 'Jl. Asia Afrika No. 12, Gelora, Kec. Tanah Abang, Jakarta Pusat',
  operating_hours = '08:00 - 16:00 WIB'
WHERE id = 'e0000000-0000-0000-0000-000000000002';

UPDATE public.events 
SET 
  venue_address = 'Jl. Medan Merdeka Selatan No. 8-9, Gambir, Jakarta Pusat',
  operating_hours = '08:00 - 16:00 WIB'
WHERE id = 'e0000000-0000-0000-0000-000000000003';

UPDATE public.events 
SET 
  venue_address = 'Jl. Matraman Raya No. 220, Kampung Melayu, Jatinegara, Jakarta Timur',
  operating_hours = '08:00 - 16:00 WIB'
WHERE id = 'e0000000-0000-0000-0000-000000000004';

UPDATE public.events 
SET 
  venue_address = 'Jl. Raden Patah I No. 1, Selong, Kebayoran Baru, Jakarta Selatan',
  operating_hours = '08:00 - 16:00 WIB'
WHERE id = 'e0000000-0000-0000-0000-000000000005';
