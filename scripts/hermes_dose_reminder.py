#!/usr/bin/env python3
"""
Hermes Automation Engine - Next Dose Reminder Script
---------------------------------------------------
Script ini berjalan di lingkungan Hermes VPS untuk:
1. Membaca jadwal vaksinasi multi-dosis di tabel `vaccination_schedules` (Supabase DB).
2. Mencari dosis yang terjadwal (status = 'scheduled') untuk H-7 dan H-1 dari tanggal hari ini.
3. Mengirimkan notifikasi pengingat dosis otomatis ke Telegram Admin / Peserta.
"""

import os
import json
import urllib.request
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Supabase Client Import
try:
    from supabase import create_client, Client
except ImportError:
    print("WARNING: Library 'supabase' belum terinstall. Install via 'pip3 install supabase python-dotenv'")
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

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "https://jhpouxabojzvggoqwlju.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY") or 
    os.getenv("SUPABASE_SERVICE_ROLE") or 
    os.getenv("VITE_SUPABASE_SERVICE_ROLE") or 
    os.getenv("VITE_SUPABASE_DERVICE_ROLE") or 
    os.getenv("VITE_SUPABASE_ANON_KEY") or 
    ""
)

def get_supabase_client() -> Client:
    if not create_client:
        raise RuntimeError("Pustaka 'supabase' belum terpasang.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def run_dose_reminder_check():
    print("🚀 Menjalankan Hermes Next Dose Reminder Engine...")
    supabase = get_supabase_client()

    today = datetime.now().date()
    target_7d = today + timedelta(days=7)
    target_1d = today + timedelta(days=1)

    # Fetch scheduled doses
    res = supabase.table("vaccination_schedules") \
        .select("*, registrations_fix(*, events(*))") \
        .eq("status", "scheduled") \
        .execute()

    schedules = res.data or []
    
    upcoming_7d = []
    upcoming_1d = []

    for sch in schedules:
        sch_date_str = sch.get("scheduled_date")
        if not sch_date_str:
            continue
        try:
            sch_date = datetime.strptime(sch_date_str, "%Y-%m-%d").date()
            if sch_date == target_7d:
                upcoming_7d.append(sch)
            elif sch_date == target_1d:
                upcoming_1d.append(sch)
        except Exception:
            pass

    print(f"📋 Dosis Terjadwal H-7: {len(upcoming_7d)} Peserta | H-1: {len(upcoming_1d)} Peserta")

    # Format Telegram Message
    if upcoming_7d or upcoming_1d:
        msg = (
            f"🔔 <b>[HERMES AUTOMATION - PENGINGAT DOSIS SELANJUTNYA]</b> 🔔\n"
            f"📅 <b>Tanggal Audit:</b> {datetime.now().strftime('%d-%m-%Y %H:%M WIB')}\n"
            f"─────────────────────────────\n\n"
        )

        if upcoming_7d:
            msg += f"📌 <b>H-7 REMINDER (Jadwal: {target_7d.strftime('%d-%m-%Y')}):</b>\n"
            for item in upcoming_7d:
                reg = item.get("registrations_fix") or {}
                evt = reg.get("events") or {}
                msg += (
                    f"• <b>{reg.get('full_name')}</b> (Tiket: <code>{reg.get('queue_code')}</code>)\n"
                    f"  💉 Dosis ke-{item.get('dose_number')} • Event: {evt.get('event_code', 'EVT')} - {evt.get('location', '')}\n"
                    f"  📲 WA: <code>{reg.get('phone')}</code>\n\n"
                )

        if upcoming_1d:
            msg += f"⚠️ <b>H-1 REMINDER (Jadwal: {target_1d.strftime('%d-%m-%Y')}):</b>\n"
            for item in upcoming_1d:
                reg = item.get("registrations_fix") or {}
                evt = reg.get("events") or {}
                msg += (
                    f"• <b>{reg.get('full_name')}</b> (Tiket: <code>{reg.get('queue_code')}</code>)\n"
                    f"  💉 Dosis ke-{item.get('dose_number')} • Event: {evt.get('event_code', 'EVT')} - {evt.get('location', '')}\n"
                    f"  📲 WA: <code>{reg.get('phone')}</code>\n\n"
                )

        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        chat_id = os.getenv("TELEGRAM_CHAT_ID")
        if bot_token and chat_id and bot_token != "YOUR_TELEGRAM_BOT_TOKEN":
            try:
                url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                payload = {
                    "chat_id": chat_id,
                    "text": msg,
                    "parse_mode": "HTML"
                }
                headers = {"Content-Type": "application/json"}
                req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=10) as resp:
                    print("📲 Notifikasi Reminder Dosis berhasil dikirim ke Telegram!")
            except Exception as e:
                print(f"⚠️ Gagal mengirim ke Telegram: {e}")
    else:
        print("✅ Tidak ada jadwal dosis yang jatuh tempo H-7 atau H-1 hari ini.")

if __name__ == "__main__":
    run_dose_reminder_check()
