"""
Seed Test Data to Supabase

Populates Supabase with realistic test data for all features.
Run: python seed_supabase.py
Remove: python seed_supabase.py --remove
"""

import sys
from datetime import datetime, timedelta
from uuid import uuid4
import random

from supabase import create_client

# Supabase config
SUPABASE_URL = "https://txawgocdjonmfahepynv.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4YXdnb2Nkam9ubWZhaGVweW52Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk4NjMzNiwiZXhwIjoyMDgwNTYyMzM2fQ.Pv5MpoSDVt0mwaOAs1sAp4hAqPe2qPTq2UMitP-4RJQ"

# Test data
FIRST_NAMES = ["James", "Maria", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Susan"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
MODALITIES = ["CT", "MRI", "US", "XR", "NM"]
BODY_REGIONS = ["Chest", "Abdomen", "Brain", "Pelvis", "Spine", "Neck", "Extremity"]
PRIORITIES = ["routine", "urgent", "stat"]
STATUSES = ["pending", "scheduled", "completed", "overdue"]

# Test User
TEST_USER_EMAIL = "test@astrahealth.com"
TEST_SUPABASE_ID = "test-supabase-user-id-12345"


def seed_data():
    """Insert test data into Supabase."""
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Check if test user exists
    result = supabase.table("users").select("id").eq("email", TEST_USER_EMAIL).execute()
    
    if result.data:
        user_id = result.data[0]["id"]
        print(f"✓ Using existing user: {user_id}")
    else:
        user_id = str(uuid4())
        supabase.table("users").insert({
            "id": user_id,
            "supabase_user_id": TEST_SUPABASE_ID,
            "email": TEST_USER_EMAIL,
            "display_name": "Dr. Test User",
            "role": "radiologist",
            "is_active": True
        }).execute()
        print(f"✓ Created test user: {user_id}")
    
    # Create 15 patients
    patient_ids = []
    patients_data = []
    for i in range(15):
        patient_id = str(uuid4())
        mrn = f"MRN{100000 + i}"
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        dob = (datetime.now() - timedelta(days=random.randint(20*365, 80*365))).strftime("%Y-%m-%d")
        sex = random.choice(["M", "F"])
        
        patients_data.append({
            "id": patient_id,
            "mrn": mrn,
            "first_name": first,
            "last_name": last,
            "date_of_birth": dob,
            "sex": sex
        })
        patient_ids.append((patient_id, f"{last}, {first[0]}.", mrn))
    
    supabase.table("patients").upsert(patients_data, on_conflict="mrn").execute()
    print(f"✓ Created {len(patient_ids)} patients")
    
    # Create studies
    study_ids = []
    studies_data = []
    for i, (patient_id, patient_name, mrn) in enumerate(patient_ids):
        study_id = str(uuid4())
        accession = f"ACC{200000 + i}"
        modality = random.choice(MODALITIES)
        body_region = random.choice(BODY_REGIONS)
        study_date = (datetime.now() - timedelta(hours=random.randint(1, 48))).isoformat()
        referring = f"Dr. {random.choice(LAST_NAMES)}"
        
        studies_data.append({
            "id": study_id,
            "patient_id": patient_id,
            "accession_number": accession,
            "modality": modality,
            "body_region": body_region,
            "study_date": study_date,
            "study_description": f"{modality} {body_region}",
            "referring_physician": referring
        })
        study_ids.append((study_id, patient_id, patient_name, modality))
    
    supabase.table("studies").upsert(studies_data, on_conflict="accession_number").execute()
    print(f"✓ Created {len(study_ids)} studies")
    
    # Create reports for first 10 studies
    report_ids = []
    reports_data = []
    for study_id, patient_id, patient_name, modality in study_ids[:10]:
        report_id = str(uuid4())
        reports_data.append({
            "id": report_id,
            "study_id": study_id,
            "radiologist_id": user_id,
            "findings": "Normal examination with no acute findings.",
            "impression": "No acute abnormality identified.",
            "is_finalized": True
        })
        report_ids.append((report_id, patient_id, patient_name))
    
    supabase.table("reports").upsert(reports_data, on_conflict="study_id").execute()
    print(f"✓ Created {len(report_ids)} reports")
    
    # Create follow-ups
    followups_data = []
    for i, (report_id, patient_id, patient_name) in enumerate(report_ids[:6]):
        due_date = (datetime.now() + timedelta(days=random.randint(-30, 90))).isoformat()
        followups_data.append({
            "id": str(uuid4()),
            "report_id": report_id,
            "patient_id": patient_id,
            "recommended_modality": random.choice(MODALITIES),
            "body_region": random.choice(BODY_REGIONS),
            "reason": "Follow-up recommended for interval evaluation",
            "interval_months": random.choice([3, 6, 12]),
            "due_date": due_date,
            "status": random.choice(STATUSES),
            "priority": random.choice(PRIORITIES),
            "created_by": user_id
        })
    
    supabase.table("followups").insert(followups_data).execute()
    print("✓ Created follow-ups")
    
    # Create critical findings
    critical_data = [
        {"patient_id": patient_ids[0][0], "study_id": study_ids[0][0], "finding": "Pulmonary embolism identified in right lower lobe", "severity": "stat"},
        {"patient_id": patient_ids[1][0], "study_id": study_ids[1][0], "finding": "New liver lesions concerning for metastases", "severity": "urgent"},
        {"patient_id": patient_ids[2][0], "study_id": study_ids[2][0], "finding": "Aortic dissection - Stanford Type B", "severity": "stat"},
        {"patient_id": patient_ids[3][0], "study_id": study_ids[3][0], "finding": "Large pleural effusion with mediastinal shift", "severity": "urgent"},
    ]
    
    supabase.table("critical_findings").insert(critical_data).execute()
    print("✓ Created critical findings")
    
    # Create QA alerts
    qa_data = [
        {"study_id": study_ids[0][0], "alert_type": "laterality", "message": "Report mentions 'right kidney' but prior noted finding on left"},
        {"study_id": study_ids[1][0], "alert_type": "recommendation", "message": "TI-RADS 4 nodule described without follow-up recommendation"},
        {"study_id": study_ids[2][0], "alert_type": "measurement", "message": "Nodule measured 8mm but prior was 12mm - verify measurement"},
    ]
    
    supabase.table("qa_alerts").insert(qa_data).execute()
    print("✓ Created QA alerts")
    
    # Create tumor board cases
    for i in range(3):
        patient_id = patient_ids[i][0]
        case_id = str(uuid4())
        scheduled = (datetime.now() + timedelta(days=i*7)).isoformat()
        
        supabase.table("tumor_board_cases").insert({
            "id": case_id,
            "patient_id": patient_id,
            "status": ["preparing", "scheduled", "completed"][i],
            "scheduled_date": scheduled,
            "stage_t": random.choice(["T1", "T2", "T3"]),
            "stage_n": random.choice(["N0", "N1", "N2"]),
            "stage_m": random.choice(["M0", "M1"]),
            "stage_overall": random.choice(["IIA", "IIB", "IIIA", "IV"])
        }).execute()
        
        # Add measurements
        measurements = []
        for j in range(random.randint(2, 4)):
            measurements.append({
                "id": str(uuid4()),
                "case_id": case_id,
                "lesion_id": f"L{j+1}",
                "location": random.choice(["Right lung", "Left lung", "Liver", "Lymph node"]),
                "measurement_date": datetime.now().strftime("%Y-%m-%d"),
                "long_axis": random.randint(10, 50),
                "short_axis": random.randint(8, 40),
                "measurement_type": "target" if j < 2 else "non-target"
            })
        supabase.table("tumor_board_measurements").insert(measurements).execute()
        
        # Add team members
        team = [
            {"id": str(uuid4()), "case_id": case_id, "member_name": "Dr. Smith", "role": "radiology"},
            {"id": str(uuid4()), "case_id": case_id, "member_name": "Dr. Jones", "role": "oncology"},
            {"id": str(uuid4()), "case_id": case_id, "member_name": "Dr. Wilson", "role": "surgery"},
            {"id": str(uuid4()), "case_id": case_id, "member_name": "Dr. Brown", "role": "pathology"},
        ]
        supabase.table("tumor_board_team").insert(team).execute()
    
    print("✓ Created tumor board cases")
    print("\n✅ All test data seeded to Supabase successfully!")


def remove_data():
    """Remove all test data from Supabase."""
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Delete in reverse order
    supabase.table("tumor_board_team").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("tumor_board_measurements").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("tumor_board_cases").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("qa_alerts").delete().neq("id", 0).execute()
    supabase.table("critical_findings").delete().neq("id", 0).execute()
    supabase.table("followups").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("reports").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("studies").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("patients").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    
    print("✅ All test data removed from Supabase!")


if __name__ == "__main__":
    if "--remove" in sys.argv:
        remove_data()
    else:
        seed_data()
