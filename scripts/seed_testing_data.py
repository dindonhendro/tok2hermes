#!/usr/bin/env python3
"""
Toktok Health - Supabase Seed Test Data Generator
-------------------------------------------------
Memasukkan 5 data Event dan 20 data Registrasi Dummy (10 Valid & 10 Anomali)
secara langsung ke Supabase untuk pengujian otomatisasi Hermes Engine.
"""

import os
import json
from supabase import create_client

# Load environment
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

events_data = [
    {
        "id": "e0000000-0000-0000-0000-000000000001",
        "title": "Program Vaksinasi Massal HPV Subtipe 9 untuk ASN & Keluarga 2026",
        "vaccine_type": "Vaksin HPV Subtipe 9",
        "quota": 500,
        "reserved_quota": 2,
        "location": "Auditorium Gedung KORPRI / Faskes Utama",
        "event_date": "2026-10-15",
        "status": "active"
    },
    {
        "id": "e0000000-0000-0000-0000-000000000002",
        "title": "Program Vaksinasi Booster Influenza Publik 2026",
        "vaccine_type": "Vaksin Influenza Quadrivalent",
        "quota": 300,
        "reserved_quota": 0,
        "location": "Klinik Pratama Toktok Health Pusat",
        "event_date": "2026-11-01",
        "status": "active"
    },
    {
        "id": "e0000000-0000-0000-0000-000000000003",
        "title": "Vaksinasi Dengue Massal Dinas Kesehatan 2026",
        "vaccine_type": "Vaksin Dengue Qdenga",
        "quota": 250,
        "reserved_quota": 0,
        "location": "Gedung Serbaguna Balai Kota Jakarta",
        "event_date": "2026-11-15",
        "status": "active"
    },
    {
        "id": "e0000000-0000-0000-0000-000000000004",
        "title": "Vaksinasi Hepatitis B untuk Tenaga Kesehatan & ASN 2026",
        "vaccine_type": "Vaksin Hepatitis B Recombinant",
        "quota": 400,
        "reserved_quota": 0,
        "location": "RSUD Matraman / Faskes Regional",
        "event_date": "2026-12-05",
        "status": "active"
    },
    {
        "id": "e0000000-0000-0000-0000-000000000005",
        "title": "Program Vaksinasi Pneumokokus Lansia & Purnabakti KORPRI",
        "vaccine_type": "Vaksin PCV13 Pneumococcal",
        "quota": 150,
        "reserved_quota": 0,
        "location": "Pusat Pelayanan Purnabakti Toktok KORPRI",
        "event_date": "2026-12-20",
        "status": "active"
    }
]

registrations_data = [
    # 10 Valid Registrations
    {"id": "f0000000-0000-0000-0000-000000000001", "event_id": "e0000000-0000-0000-0000-000000000001", "registration_type": "perorangan_internal", "nik": "3171012508950001", "nip": "199508252020121001", "full_name": "Dr. Budi Santoso, M.Si", "phone": "081234567890", "gender": "L", "dob": "1995-08-25", "address": "Jl. Sudirman No. 45", "email": "budi.santoso@instansi.go.id", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000002", "event_id": "e0000000-0000-0000-0000-000000000001", "registration_type": "perorangan_publik", "nik": "3273026510920003", "nip": None, "full_name": "Siti Aminah, S.Pd", "phone": "081398765432", "gender": "P", "dob": "1992-10-25", "address": "Jl. Asia Afrika No. 12", "email": "siti.aminah@gmail.com", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000003", "event_id": "e0000000-0000-0000-0000-000000000001", "registration_type": "perorangan_internal", "nik": "3578011204880005", "nip": "198804122015032002", "full_name": "Dewi Lestari, S.E.", "phone": "081122334455", "gender": "P", "dob": "1988-04-12", "address": "Jl. Pemuda No. 88", "email": "dewi.lestari@kemenkeu.go.id", "status": "approved", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000004", "event_id": "e0000000-0000-0000-0000-000000000002", "registration_type": "perorangan_publik", "nik": "3374031501900007", "nip": None, "full_name": "Andri Wijaya", "phone": "085678901234", "gender": "L", "dob": "1990-01-15", "address": "Jl. Gajah Mada No. 101", "email": "andri.wijaya@yahoo.com", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000005", "event_id": "e0000000-0000-0000-0000-000000000002", "registration_type": "perorangan_internal", "nik": "3471015006940002", "nip": "199406102019022003", "full_name": "Ratna Sari, M.T.", "phone": "081765432109", "gender": "P", "dob": "1994-06-10", "address": "Jl. Malioboro No. 50", "email": "ratna.sari@dpr.go.id", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000006", "event_id": "e0000000-0000-0000-0000-000000000003", "registration_type": "kelompok", "nik": "5171010107930008", "nip": None, "full_name": "Hendra Kurniawan", "phone": "082143658709", "gender": "L", "dob": "1993-07-01", "address": "Jl. Teuku Umar No. 77", "email": "hendra.kurniawan@komunitas.org", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000007", "event_id": "e0000000-0000-0000-0000-000000000003", "registration_type": "perorangan_publik", "nik": "1271014505960004", "nip": None, "full_name": "Tri Wahyuni", "phone": "081987654321", "gender": "P", "dob": "1996-05-05", "address": "Jl. Diponegoro No. 23", "email": "tri.wahyuni@hotmail.com", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000008", "event_id": "e0000000-0000-0000-0000-000000000004", "registration_type": "perorangan_internal", "nik": "7371011811910009", "nip": "199111182018011004", "full_name": "Agung Pratama, S.H.", "phone": "085211223344", "gender": "L", "dob": "1991-11-18", "address": "Jl. AP Pettarani No. 99", "email": "agung.pratama@bkn.go.id", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000009", "event_id": "e0000000-0000-0000-0000-000000000005", "registration_type": "perorangan_publik", "nik": "6471016203970006", "nip": None, "full_name": "Maya Indriani", "phone": "081355667788", "gender": "P", "dob": "1997-03-22", "address": "Jl. Mulawarman No. 14", "email": "maya.indriani@gmail.com", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000010", "event_id": "e0000000-0000-0000-0000-000000000005", "registration_type": "perorangan_publik", "nik": "1371010909850001", "nip": None, "full_name": "Bambang Hermawan", "phone": "081299887766", "gender": "L", "dob": "1985-09-09", "address": "Jl. Rasuna Said No. 5", "email": "bambang.hermawan@yahoo.co.id", "status": "approved", "is_flagged_anomaly": False},

    # 10 Anomaly / Invalid Registrations (Hermes Audit Testing)
    {"id": "f0000000-0000-0000-0000-000000000011", "event_id": "e0000000-0000-0000-0000-000000000002", "registration_type": "perorangan_publik", "nik": "3171012508950001", "nip": None, "full_name": "Budi Santoso (Clone Duplikasi NIK)", "phone": "081234567899", "gender": "L", "dob": "1995-08-25", "address": "Jl. Gatot Subroto No. 1", "email": "budi.clone@gmail.com", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000012", "event_id": "e0000000-0000-0000-0000-000000000001", "registration_type": "perorangan_publik", "nik": "31710125089500", "nip": None, "full_name": "Eko Prasetyo (NIK 14 Digit)", "phone": "081311112222", "gender": "L", "dob": "1995-08-25", "address": "Jl. Kemang Raya No. 10", "email": "eko.prasetyo@gmail.com", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000013", "event_id": "e0000000-0000-0000-0000-000000000001", "registration_type": "perorangan_internal", "nik": "3171011402920005", "nip": "199508252020121", "full_name": "Fajar Nugroho (NIP 15 Digit)", "phone": "081233334444", "gender": "L", "dob": "1992-02-14", "address": "Jl. Palmerah No. 7", "email": "fajar.nugroho@instansi.go.id", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000014", "event_id": "e0000000-0000-0000-0000-000000000001", "registration_type": "perorangan_publik", "nik": "3171011010900002", "nip": None, "full_name": "Rudi Hermawan (Email .con)", "phone": "081555556666", "gender": "L", "dob": "1990-10-10", "address": "Jl. Senopati No. 8", "email": "rudi.hermawan@perusahaan.con", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000015", "event_id": "e0000000-0000-0000-0000-000000000002", "registration_type": "perorangan_publik", "nik": "3273024806930004", "nip": None, "full_name": "Anita Wijaya (Email @gmai.com)", "phone": "081777778888", "gender": "P", "dob": "1993-06-08", "address": "Jl. Dago No. 100", "email": "anita.wijaya@gmai.com", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000016", "event_id": "e0000000-0000-0000-0000-000000000003", "registration_type": "perorangan_publik", "nik": "3171014806930004", "nip": None, "full_name": "Siska Putri (Mismatch Gender NIK)", "phone": "081888889999", "gender": "L", "dob": "1993-06-08", "address": "Jl. Fatmawati No. 15", "email": "siska.putri@gmail.com", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000017", "event_id": "e0000000-0000-0000-0000-000000000004", "registration_type": "perorangan_internal", "nik": "3171011212950009", "nip": "199508252020125001", "full_name": "Dedi Kurnia (NIP Digit Gender 5)", "phone": "081999990000", "gender": "L", "dob": "1995-12-12", "address": "Jl. Mampang No. 20", "email": "dedi.kurnia@kemenkes.go.id", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000018", "event_id": "e0000000-0000-0000-0000-000000000004", "registration_type": "perorangan_internal", "nik": "3171012508950099", "nip": "198801012015011001", "full_name": "Hafiz Syahputra (Mismatch DOB NIP)", "phone": "081200001111", "gender": "L", "dob": "1995-08-25", "address": "Jl. Cikini No. 30", "email": "hafiz.syahputra@bkn.go.id", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000019", "event_id": "e0000000-0000-0000-0000-000000000005", "registration_type": "perorangan_publik", "nik": "3171012515950001", "nip": None, "full_name": "Tomi Setiawan (Bulan NIK 15)", "phone": "081322223333", "gender": "L", "dob": "1995-05-25", "address": "Jl. Tomang No. 40", "email": "tomi.setiawan@gmail.com", "status": "pending", "is_flagged_anomaly": False},
    {"id": "f0000000-0000-0000-0000-000000000020", "event_id": "e0000000-0000-0000-0000-000000000005", "registration_type": "perorangan_internal", "nik": "3171010505900008", "nip": "199005052019", "full_name": "Irwan Setiawan (Combo Anomaly)", "phone": "081444445555", "gender": "L", "dob": "1990-05-05", "address": "Jl. Kramat No. 50", "email": "irwan.setiawan@instansi.con", "status": "pending", "is_flagged_anomaly": False}
]

def seed_database():
    print("🌱 Memulai Seeding Dummy Data (5 Events & 20 Registrations)...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # 1. Upsert Events
    res_evt = supabase.table("events").upsert(events_data).execute()
    print(f"✅ Berhasil memasukkan {len(events_data)} Data Events!")

    # 2. Upsert Registrations
    res_reg = supabase.table("registrations").upsert(registrations_data).execute()
    print(f"✅ Berhasil memasukkan {len(registrations_data)} Data Registrasi (10 Valid & 10 Anomali)!")

    print("\n🎉 Seed Data Selesai! Siap digunakan untuk testing Hermes Engine & Telegram Bot.")

if __name__ == "__main__":
    seed_database()
