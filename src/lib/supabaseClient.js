import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jhpouxabojzvggoqwlju.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocG91eGFib2p6dmdnb3F3bGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzk3ODAsImV4cCI6MjEwMjcxNTc4MH0.qEtjOTdsP61GTaBs1LzyX4h7OzD13do7-bOwbEpYnB8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
