#!/usr/bin/env python3
"""
Hermes Automation Engine - Interactive Telegram Bot Listener
-------------------------------------------------------------
Script ini menjalankan Telegram Bot Listener interaktif untuk membuktikan 
bahwa Hermes dapat membaca data Supabase secara live via perintah Telegram:

Perintah Telegram yang Didukung:
  /status  - Cek ringkasan live data Supabase (Total Pending, Approved, Sisa Kuota)
  /pending - Tampilkan daftar nama & NIK pendaftar pending dari Supabase
  /audit   - Jalankan audit otomatis dan tampilkan hasilnya di Telegram
"""

import os
import re
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime

# Supabase Client Import
try:
    from supabase import create_client, Client
except ImportError:
    print("WARNING: Library 'supabase' belum terinstall. Jalankan 'pip3 install supabase python-dotenv'")
    create_client = None

# Optional dotenv loader
try:
    from dotenv import load_dotenv
    load_dotenv('../.env.local')
    load_dotenv('../.env')
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

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN") or ""
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID") or ""

def get_supabase_client() -> Client:
    if not create_client:
        raise RuntimeError("Pustaka 'supabase' belum terpasang. Jalankan 'pip3 install supabase'.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def send_telegram_reply(chat_id: str, message_html: str):
    """Kirim balasan ke Telegram User/Group."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message_html,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }
    headers = {"Content-Type": "application/json"}
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"❌ Error sending Telegram reply: {e}")

def handle_status_command(chat_id: str):
    """Perintah /status: Membaca statistik live dari Supabase DB."""
    supabase = get_supabase_client()
    
    # 1. Fetch Registrations Count
    res_reg = supabase.table("registrations").select("status, is_flagged_anomaly").execute()
    records = res_reg.data or []

    pending_cnt = sum(1 for r in records if r.get("status") == "pending")
    approved_cnt = sum(1 for r in records if r.get("status") == "approved")
    rejected_cnt = sum(1 for r in records if r.get("status") == "rejected")
    anomaly_cnt = sum(1 for r in records if r.get("is_flagged_anomaly"))

    # 2. Fetch Events Quota
    res_evt = supabase.table("events").select("title, quota, remaining_quota").eq("status", "active").execute()
    events = res_evt.data or []

    event_info = ""
    if events:
        evt = events[0]
        event_info = (
            f"📌 <b>Event Aktif:</b> {evt.get('title')}\n"
            f"🎯 <b>Sisa Kuota Real-time:</b> <code>{evt.get('remaining_quota')}</code> / {evt.get('quota')} Dosis\n"
        )
    else:
        event_info = "📌 <b>Event Aktif:</b> Belum ada event aktif\n"

    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S WIB")

    reply_msg = (
        f"📊 <b>[TOKTOK HEALTH - LIVE SUPABASE STATUS]</b> 📊\n"
        f"<i>Koneksi Hermes ⚡ Supabase DB Active</i>\n\n"
        f"{event_info}\n"
        f"📈 <b>Statistik Registrasi:</b>\n"
        f"• ⏳ <b>Pending Verification:</b> {pending_cnt} Peserta\n"
        f"• ✅ <b>Disetujui (Approved):</b> {approved_cnt} Peserta\n"
        f"• ❌ <b>Ditolak (Rejected):</b> {rejected_cnt} Peserta\n"
        f"• ⚠️ <b>Anomali Flagged:</b> {anomaly_cnt} Peserta\n\n"
        f"🕒 <i>Waktu Query: {timestamp_str}</i>"
    )

    send_telegram_reply(chat_id, reply_msg)

def handle_pending_command(chat_id: str):
    """Perintah /pending: Membaca daftar pendaftar pending dari Supabase."""
    supabase = get_supabase_client()
    res = supabase.table("registrations").select("full_name, nik, email, registration_type, created_at").eq("status", "pending").order("created_at", desc=True).limit(5).execute()
    records = res.data or []

    if not records:
        reply_msg = "🎉 <b>[SUPABASE QUEUE CLEAR]</b>\nTidak ada pendaftar berstatus pending saat ini."
    else:
        reply_msg = f"📋 <b>[DAFTAR ANTREAN PENDING SUPABASE]</b> (Top {len(records)})\n\n"
        for idx, r in enumerate(records, start=1):
            reply_msg += (
                f"<b>{idx}. {r.get('full_name')}</b>\n"
                f"• <b>NIK:</b> <code>{r.get('nik')}</code>\n"
                f"• <b>Email:</b> {r.get('email')}\n"
                f"• <b>Jalur:</b> <code>{r.get('registration_type')}</code>\n\n"
            )
        reply_msg += "👉 <i>Buka Dashboard Admin Toktok Health untuk verifikasi.</i>"

    send_telegram_reply(chat_id, reply_msg)

def start_telegram_bot_polling():
    """Bot Polling Loop sederhanan tanpa pustaka tambahan."""
    if not TELEGRAM_BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN belum diset di .env.local!")
        return

    print("🤖 Hermes Telegram Bot Listener Aktif!")
    print("👉 Silakan buka Telegram dan ketik /status atau /pending ke Bot Anda...")

    offset = 0
    while True:
        try:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates?offset={offset}&timeout=20"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=25) as resp:
                res_json = json.loads(resp.read().decode())
                for update in res_json.get("result", []):
                    offset = update["update_id"] + 1
                    message = update.get("message", {})
                    text = message.get("text", "")
                    chat_id = str(message.get("chat", {}).get("id", ""))

                    if not text or not chat_id:
                        continue

                    print(f"📩 Telegram Command Diterima: '{text}' dari Chat ID: {chat_id}")

                    if text.startswith("/status") or text.startswith("/cek"):
                        handle_status_command(chat_id)
                    elif text.startswith("/pending") or text.startswith("/antrean"):
                        handle_pending_command(chat_id)
                    elif text.startswith("/start") or text.startswith("/help"):
                        help_msg = (
                            "🤖 <b>[HERMES TELEGRAM BOT COMMANDS]</b>\n\n"
                            "/status - Cek statistik live Supabase (Quota, Pending, Approved)\n"
                            "/pending - Lihat daftar nama & NIK pendaftar pending\n"
                        )
                        send_telegram_reply(chat_id, help_msg)

        except Exception as e:
            time.sleep(2)

if __name__ == "__main__":
    start_telegram_bot_polling()
