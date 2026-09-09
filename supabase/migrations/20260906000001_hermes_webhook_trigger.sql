-- ====================================================================
-- MIGRATION: 20260906000001_hermes_webhook_trigger.sql
-- DESCRIPTION: Supabase Database Webhook untuk Otomatisasi Hermes Engine
-- AUTHOR: Backend & Database Engineer
-- TARGET: Supabase PostgreSQL (pg_net extension)
-- ====================================================================

-- 1. MENGAKTIFKAN EKSTENSI PG_NET (Asynchronous HTTP Requests di Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. FUNGSI TRIGGER UNTUK MENGIRIM PAYLOAD KE HERMES WEBHOOK ENDPOINT
CREATE OR REPLACE FUNCTION public.notify_hermes_on_registration()
RETURNS TRIGGER AS $$
DECLARE
    -- Ganti URL berikut dengan Endpoint Webhook Hermes Engine Anda
    hermes_endpoint TEXT := 'https://your-hermes-engine.domain.com/api/webhooks/supabase-registration';
    
    -- Secret Token untuk autentikasi keamanan webhook (opsional namun sangat disarankan)
    secret_token TEXT := 'Bearer HERMES_SECRET_TOKEN_2026_TOKTOK';
    
    -- Payload JSON yang dikirimkan
    payload JSONB;
BEGIN
    -- Membangun struktur JSON payload
    payload := jsonb_build_object(
        'event_type', TG_OP,                     -- 'INSERT'
        'table', TG_TABLE_NAME,                  -- 'registrations'
        'timestamp', NOW(),
        'record', jsonb_build_object(
            'id', NEW.id,
            'event_id', NEW.event_id,
            'registration_type', NEW.registration_type,
            'nik', NEW.nik,
            'nip', NEW.nip,
            'full_name', NEW.full_name,
            'email', NEW.email,
            'phone', NEW.phone,
            'gender', NEW.gender,
            'dob', NEW.dob,
            'status', NEW.status,
            'created_at', NEW.created_at
        )
    );

    -- Eksekusi panggilan HTTP POST Asinkron via net.http_post
    PERFORM net.http_post(
        url := hermes_endpoint,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', secret_token,
            'X-Source', 'Supabase-ToktokHealth'
        ),
        body := payload
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Menangkap exception agar transaksi registrasi tidak terbatalkan jika endpoint Hermes offline
    RAISE WARNING 'Gagal mengirim webhook ke Hermes: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. MEMBUAT TRIGGER AFTER INSERT PADA TABEL REGISTRATIONS
DROP TRIGGER IF EXISTS trg_notify_hermes_registration ON public.registrations;

CREATE TRIGGER trg_notify_hermes_registration
AFTER INSERT ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.notify_hermes_on_registration();
