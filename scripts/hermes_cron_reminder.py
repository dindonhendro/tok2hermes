#!/usr/bin/env python3
"""
Hermes Automation Engine - Daily Morning Queue Reminder Cron
------------------------------------------------------------
Script ini dijadwalkan berjalan otomatis setiap hari pukul 09.00 pagi untuk:
1. Mengecek jumlah antrean pendaftaran 'pending' di Supabase.
2. Jika ada pendaftar pending (> 0), membuat pesan pengingat khusus.
3. Mengirimkan pesan pengingat secara otomatis ke Telegram Chat/Channel Admin Faskes.
"""

import os
import json
import urllib.request
import urllib.parse
from datetime import datetime

# Supabase Client Import
try:
    from supabase import create_client, Client
except ImportError:
    print("WARNING: Library 'supabase' belum terinstall. Jalankan 'pip install supabase python-dotenv'")
    create_client = None

# Optional dotenv loader
try:
    from dotenv import load_dotenv
    load_dotenv('.env.local')
    load_dotenv('.env')
except ImportError:
    pass

# Environment Configurations
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "https://jhpouxabojzvggoqwlju.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY") or 
    os.getenv("SUPABASE_SERVICE_ROLE") or 
    os.getenv("VITE_SUPABASE_SERVICE_ROLE") or 
    os.getenv("VITE_SUPABASE_DERVICE_ROLE") or 
    os.getenv("VITE_SUPABASE_ANON_KEY") or 
    ""
)

# Telegram Bot Credentials
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN") or "YOUR_TELEGRAM_BOT_TOKEN"
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID") or "YOUR_TELEGRAM_CHAT_ID"

def get_supabase_client() -> Client:
    if not create_client:
        raise RuntimeError("Pustaka 'supabase' belum terpasang. Jalankan 'pip install supabase'.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def send_telegram_message(bot_token: str, chat_id: str, message_html: str) -> bool:
    """Mengirimkan pesan ke Telegram Chat/Channel via HTTP Bot API (tanpa dependensi luar)."""
    if not bot_token or bot_token == "YOUR_TELEGRAM_BOT_TOKEN":
        print("⚠️ TELEGRAM_BOT_TOKEN belum dikonfigurasi. Pesan Telegram dicetak ke konsol saja.")
        return False
    if not chat_id or chat_id == "YOUR_TELEGRAM_CHAT_ID":
        print("⚠️ TELEGRAM_CHAT_ID belum dikonfigurasi.")
        return False

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message_html,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }

    headers = {"Content-Type": "application/json"}
    data_bytes = json.dumps(payload).encode("utf-8")

    try:
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            res_body = resp.read().decode("utf-8")
            res_json = json.loads(res_body)
            if res_json.get("ok"):
                print("✅ Pesan pengingat berhasil dikirim ke Telegram!")
                return True
            else:
                print(f"❌ Response Telegram Error: {res_json}")
                return False
    except Exception as e:
        print(f"❌ Gagal koneksi ke Telegram API: {e}")
        return False

def run_daily_queue_reminder():
    """Mengecek tabel registrations Supabase dan mengirim notifikasi jika antrean > 0."""
    print(f"⏰ [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Menjalankan Hermes Morning Cron Job...")
    
    supabase = get_supabase_client()

    # Query pendaftaran status pending
    res = supabase.table("registrations").select("*").eq("status", "pending").execute()
    pending_records = res.data or []
    total_pending = len(pending_records)

    print(f"📊 Ditemukan {total_pending} antrean pending di Supabase.")

    if total_pending == 0:
        print("🎉 Antrean kosong (0 pending). Tidak perlu mengirim pesan pengingat Telegram.")
        return {
            "status": "skipped",
            "message": "Antrean pending 0",
            "pending_count": 0
        }

    # Hitung rincian per jalur pendaftaran
    public_count = sum(1 for r in pending_records if r.get("registration_type") in ("perorangan_publik", "perorangan"))
    internal_count = sum(1 for r in pending_records if r.get("registration_type") == "perorangan_internal")
    group_count = sum(1 for r in pending_records if r.get("registration_type") == "kelompok")
    anomaly_count = sum(1 for r in pending_records if r.get("is_flagged_anomaly"))

    timestamp_now = datetime.now().strftime("%d %B %Y - %H:%M WIB")

    # Susun Pesan Telegram HTML
    telegram_message = (
        f"🔔 <b>[TOKTOK HEALTH - PENGINGAT ANTREAN FASKES]</b> 🔔\n\n"
        f"<i>Selamat Pagi Tim Operasional Faskes & Instansi,</i>\n\n"
        f"Terdapat <b>{total_pending} antrean baru</b> pendaftaran vaksinasi massal yang menunggu verifikasi Anda hari ini.\n\n"
        f"📊 <b>Ringkasan Antrean Pending ({timestamp_now}):</b>\n"
        f"• <b>Perorangan (Publik):</b> {public_count} Peserta\n"
        f"• <b>Perorangan (Internal ASN):</b> {internal_count} Peserta\n"
        f"• <b>Kelompok (Import Excel):</b> {group_count} Peserta\n"
    )

    if anomaly_count > 0:
        telegram_message += f"⚠️ <b>Perhatian Anomali (Hermes Alert):</b> {anomaly_count} Peserta terindikasi anomali!\n"

    telegram_message += (
        f"\n⚡ <i>Mohon dapat segera diproses melalui Dashboard Operasional:</i>\n"
        f"👉 <a href='https://toktok-health.app/admin'>Buka Dashboard Admin Toktok Health</a>"
    )

    # Kirim ke Telegram Channel
    sent = send_telegram_message(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, telegram_message)

    return {
        "status": "sent" if sent else "logged_to_console",
        "pending_count": total_pending,
        "details": {
            "public": public_count,
            "internal": internal_count,
            "group": group_count,
            "anomalies": anomaly_count
        },
        "message_preview": telegram_message
    }

if __name__ == "__main__":
    result = run_daily_queue_reminder()
    print("\n--- CRON EXECUTION RESULT ---")
    print(json.dumps(result, indent=2, ensure_ascii=False))
