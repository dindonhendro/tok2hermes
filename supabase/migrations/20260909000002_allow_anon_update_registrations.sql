-- ====================================================================
-- MIGRATION: ALLOW FULL UPDATE & DELETE ACCESS FOR REGISTRATIONS
-- TARGET: Supabase PostgreSQL
-- ====================================================================

-- Grant UPDATE & DELETE RLS policies for registrations & registrations_fix
DROP POLICY IF EXISTS "Allow update registrations for all" ON public.registrations;
CREATE POLICY "Allow update registrations for all" 
ON public.registrations FOR UPDATE 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete registrations for all" ON public.registrations;
CREATE POLICY "Allow delete registrations for all" 
ON public.registrations FOR DELETE 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow all for registrations_fix" ON public.registrations_fix;
CREATE POLICY "Allow all for registrations_fix" 
ON public.registrations_fix FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);
