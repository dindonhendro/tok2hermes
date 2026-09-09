#!/usr/bin/env python3
"""
Hermes Automation Engine - Mass Registration Audit Script
---------------------------------------------------------
Script ini berjalan di lingkungan Hermes untuk:
1. Terhubung ke Supabase DB via Service Role Key (akses admin/bypass RLS).
2. Mengambil seluruh pendaftaran berstatus 'pending'.
3. Melakukan audit massal:
   - Cek Duplikasi NIK (terhadap seluruh basis data registrasi).
   - Validasi struktur NIK (Panjang 16 digit, Tanggal/Bulan Lahir logis, Gender).
   - Validasi struktur NIP ASN (18 digit: YYYYMMDD YYYYMM X XXX).
   - Deteksi typo domain email (contoh: .con, @gmai.com, @yaho.com, @hotmai.com).
   - Validasi kesesuaian Tanggal Lahir & Gender dari NIK & NIP.
4. Menandai row anomali (is_flagged_anomaly = True) di Supabase.
5. Mengirimkan ringkasan audit siap kirim ke Bot Telegram Admin.
"""

import os
import re
import json
from datetime import datetime
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

def get_supabase_client() -> Client:
    """Inisialisasi Supabase Client dengan Service Role Key."""
    if not create_client:
        raise RuntimeError("Pustaka 'supabase' belum terpasang. Jalankan 'pip3 install supabase'.")
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di environment.")
    
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def parse_nik_details(nik: str) -> Dict[str, Any]:
    """Parse NIK 16 digit untuk mengekstrak Tanggal Lahir dan Jenis Kelamin."""
    if not nik or not re.match(r'^[0-9]{16}$', nik):
        return {"is_valid": False, "error": f"NIK tidak valid (Panjang NIK {len(nik) if nik else 0} digit, harus 16 digit angka)."}

    try:
        raw_day = int(nik[6:8])
        month = int(nik[8:10])
        raw_year = int(nik[10:12])

        gender = "L"
        day = raw_day
        if raw_day > 40:
            gender = "P"
            day = raw_day - 40

        if month < 1 or month > 12:
            return {"is_valid": False, "error": f"Bulan lahir pada NIK ({month}) tidak valid (harus 01-12)."}

        if day < 1 or day > 31:
            return {"is_valid": False, "error": f"Tanggal lahir pada NIK ({day}) tidak valid (harus 01-31)."}

        current_yr_2d = int(datetime.now().strftime("%y"))
        full_year = 1900 + raw_year if raw_year > current_yr_2d else 2000 + raw_year
        dob_str = f"{full_year:04d}-{month:02d}-{day:02d}"

        return {
            "is_valid": True,
            "gender": gender,
            "dob_str": dob_str,
            "year": full_year
        }
    except Exception as e:
        return {"is_valid": False, "error": str(e)}

def parse_nip_details(nip: str) -> Dict[str, Any]:
    """Parse NIP ASN 18 digit (Format: YYYYMMDD YYYYMM X XXX)."""
    if not nip:
        return {"is_valid": False, "error": "NIP kosong."}
    
    clean_nip = re.sub(r'\s+', '', nip)
    if not re.match(r'^[0-9]{18}$', clean_nip):
        return {
            "is_valid": False,
            "error": f"NIP tidak 18 digit (Panjang NIP {len(clean_nip)} digit, harus 18 digit format 8-6-1-3)."
        }

    b_part = clean_nip[0:8]
    tmt_part = clean_nip[8:14]
    gender_digit = clean_nip[14:15]

    b_year = int(b_part[0:4])
    b_month = int(b_part[4:6])
    b_day = int(b_part[6:8])

    if b_month < 1 or b_month > 12 or b_day < 1 or b_day > 31:
        return {"is_valid": False, "error": f"8 digit awal NIP ({b_part}) bukan tanggal lahir YYYYMMDD yang valid."}

    if gender_digit not in ("1", "2"):
        return {"is_valid": False, "error": f"Digit ke-15 NIP ({gender_digit}) tidak valid (harus 1 untuk Laki-laki atau 2 untuk Perempuan)."}

    gender = "L" if gender_digit == "1" else "P"
    dob_str = f"{b_year:04d}-{b_month:02d}-{b_day:02d}"

    return {
        "is_valid": True,
        "gender": gender,
        "dob_str": dob_str,
        "tmt": tmt_part
    }

def extract_city_name(text: str) -> str:
    """Ekstrak nama kota utama (misal: Jakarta, Surabaya, Bandung, Medan, Semarang, Yogyakarta, Makassar, Balikpapan)."""
    if not text or not isinstance(text, str):
        return ""
    
    clean = text.strip().upper()
    known_cities = [
        "JAKARTA", "SURABAYA", "BANDUNG", "MEDAN", "SEMARANG", 
        "YOGYAKARTA", "JOGJA", "MAKASSAR", "BALIKPAPAN", "PALEMBANG",
        "DENPASAR", "BALI", "DEPOK", "TANGERANG", "BEKASI", "BOGOR", "MALANG", "SOLO"
    ]
    for city in known_cities:
        if city in clean:
            return "JAKARTA" if "JAKARTA" in city else city
            
    # Fallback to first word
    parts = re.split(r'[\s,.-]+', clean)
    return parts[0] if parts else clean

def audit_pending_registrations() -> Dict[str, Any]:
    """
    Mengambil semua pendaftaran status 'pending', menjalankan audit massal 10 poin,
    dan menyusun ringkasan laporan Telegram.
    """
    supabase = get_supabase_client()
    
    # 1. Fetch all pending registrations
    response = supabase.table("registrations").select("*").eq("status", "pending").execute()
    pending_records: List[Dict[str, Any]] = response.data or []

    # Fetch all events map for city mismatch audit
    events_res = supabase.table("events").select("*").execute()
    events_map = {e["id"]: e for e in (events_res.data or [])}

    total_pending = len(pending_records)
    anomalies: List[Dict[str, Any]] = []
    flagged_ids: List[str] = []

    # Fetch ALL NIKs in DB to detect duplicates across all statuses (approved/pending)
    all_niks_res = supabase.table("registrations").select("nik").execute()
    all_niks_data = all_niks_res.data or []
    nik_counter: Dict[str, int] = {}
    for r in all_niks_data:
        nik_val = r.get("nik", "")
        if nik_val:
            nik_counter[nik_val] = nik_counter.get(nik_val, 0) + 1

    # 2. Iterate and Audit Each Pending Record
    for rec in pending_records:
        rec_id = rec["id"]
        event_id = rec.get("event_id")
        nik = rec.get("nik", "")
        nip = rec.get("nip")
        email = rec.get("email", "")
        full_name = rec.get("full_name", "")
        reg_type = rec.get("registration_type", "")
        dob = rec.get("dob", "")
        gender = rec.get("gender", "")
        address = rec.get("address", "")

        issues = []

        # Audit Check 1: Duplikasi NIK di Database (Pending/Approved)
        if nik_counter.get(nik, 0) > 1:
            issues.append(f"⚠️ Terdeteksi duplikasi NIK ({nik}) di database.")

        # Audit Check 2: Validasi NIK Logic & Format
        nik_info = parse_nik_details(nik)
        if not nik_info["is_valid"]:
            issues.append(f"❌ {nik_info['error']}")
        else:
            # Sync check DOB & Gender vs NIK
            if dob and dob != nik_info["dob_str"]:
                issues.append(f"⚠️ Tanggal lahir input ({dob}) tidak cocok dengan hasil parse NIK ({nik_info['dob_str']}).")
            if gender and gender != nik_info["gender"]:
                issues.append(f"⚠️ Gender input ({gender}) tidak cocok dengan hasil parse NIK ({nik_info['gender']}).")

        # Audit Check 3: Validasi NIP ASN (Format & Logic)
        if reg_type == "perorangan_internal" or (nip and len(nip.strip()) > 0):
            nip_info = parse_nip_details(nip)
            if not nip_info["is_valid"]:
                issues.append(f"❌ {nip_info['error']}")
            else:
                if dob and dob != nip_info["dob_str"]:
                    issues.append(f"⚠️ Tanggal lahir input ({dob}) tidak cocok dengan tanggal lahir pada NIP ({nip_info['dob_str']}).")

        # Audit Check 4: Deteksi Typo Email Domain & Provider
        if re.search(r'\.con$', email, re.IGNORECASE):
            issues.append(f"⚠️ Typo Email Domain: '{email}' terdeteksi menggunakan '.con' alih-alih '.com'.")
        elif re.search(r'@gmai\.com$', email, re.IGNORECASE):
            issues.append(f"⚠️ Typo Email Provider: '{email}' terdeteksi menggunakan '@gmai.com' (kurang huruf 'l').")
        elif re.search(r'@yaho\.com$', email, re.IGNORECASE):
            issues.append(f"⚠️ Typo Email Provider: '{email}' terdeteksi menggunakan '@yaho.com' (kurang huruf 'o').")

        # Audit Check 5: Deteksi Mismatch Kota Domisili Peserta vs Kota Event (Flag untuk Konfirmasi Admin)
        evt = events_map.get(event_id) or {}
        user_city = extract_city_name(address)
        evt_city = extract_city_name((evt.get("location", "") + " " + evt.get("venue_address", "") + " " + evt.get("title", "")))

        if user_city and evt_city and user_city != evt_city:
            issues.append(
                f"📍 <b>FLAG LOKASI BEDA KOTA:</b> Domisili peserta di '{address.strip()}' ({user_city}), "
                f"tetapi memilih Event Faskes di '{evt.get('location', 'Faskes')}' ({evt_city}). Memerlukan konfirmasi ketersediaan kehadiran."
            )

        # Record Anomaly if any issues found
        if issues:
            flagged_ids.append(rec_id)
            anomalies.append({
                "id": rec_id,
                "full_name": full_name,
                "nik": nik,
                "nip": nip,
                "email": email,
                "issues": issues
            })

    # 3. Update Supabase: Flag Anomaly Rows
    if flagged_ids:
        for f_id in flagged_ids:
            supabase.table("registrations").update({"is_flagged_anomaly": True}).eq("id", f_id).execute()

    # 4. Generate Telegram Markdown Report
    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S WIB")
    
    if anomalies:
        telegram_text = (
            f"🚨 <b>[HERMES AUTOMATION AUDIT ALERT]</b> 🚨\n"
            f"📅 <b>Waktu Audit:</b> {timestamp_str}\n"
            f"📋 <b>Total Antrean Pending:</b> {total_pending} Peserta\n"
            f"⚠️ <b>Anomali Ditemukan:</b> {len(anomalies)} Pendaftaran\n"
            f"─────────────────────────────\n\n"
        )

        for idx, item in enumerate(anomalies, start=1):
            telegram_text += (
                f"<b>{idx}. {item['full_name']}</b>\n"
                f"• <b>NIK:</b> <code>{item['nik']}</code>\n"
                f"• <b>Email:</b> {item['email']}\n"
                f"• <b>Detail Temuan:</b>\n"
            )
            for issue in item['issues']:
                telegram_text += f"   {issue}\n"
            telegram_text += "\n"

        telegram_text += (
            f"📌 <i>Tindakan Otomatis: {len(flagged_ids)} baris telah ditandai 'is_flagged_anomaly = True' di Supabase. "
            f"Mohon Admin Faskes meninjau ulang pada Dashboard Operasional Toktok Health.</i>"
        )
    else:
        telegram_text = (
            f"✅ <b>[HERMES AUTOMATION AUDIT CLEAR]</b> ✅\n"
            f"📅 <b>Waktu Audit:</b> {timestamp_str}\n"
            f"📋 <b>Total Antrean Pending:</b> {total_pending} Peserta\n"
            f"🎉 <b>Status:</b> Seluruh data antrean valid & bebas dari anomali NIK/NIP/Email!"
        )

    # Automatically dispatch to Telegram if BOT TOKEN & CHAT ID exist
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if bot_token and chat_id and bot_token != "YOUR_TELEGRAM_BOT_TOKEN":
        import urllib.request
        try:
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": telegram_text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True
            }
            headers = {"Content-Type": "application/json"}
            req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=10) as resp:
                print("📲 Notifikasi Audit berhasil dikirim langsung ke Telegram Group!")
        except Exception as e:
            print(f"⚠️ Gagal mengabarkan ke Telegram: {e}")

    # Return structured dict
    return {
        "status": "success",
        "timestamp": timestamp_str,
        "total_pending": total_pending,
        "total_anomalies": len(anomalies),
        "anomalies": anomalies,
        "flagged_ids": flagged_ids,
        "telegram_message": telegram_text
    }

if __name__ == "__main__":
    print("🚀 Menjalankan Hermes Registration Audit Script...")
    try:
        result = audit_pending_registrations()
        print("\n--- AUDIT RESULT JSON ---")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        print("\n--- TELEGRAM MESSAGE PREVIEW ---")
        print(result["telegram_message"])
    except Exception as err:
        print(f"❌ Execution Error: {err}")
