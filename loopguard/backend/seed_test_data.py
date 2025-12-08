"""
Seed Test Data Script

Populates the database with realistic test data for all features.
Run: python seed_test_data.py
Remove: python seed_test_data.py --remove
"""

import asyncio
import sys
from datetime import datetime, timedelta
from uuid import uuid4
import random

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Database URL
DATABASE_URL = "postgresql+asyncpg://yosefshammout@localhost:5432/loopguard"

# Test data
FIRST_NAMES = ["James", "Maria", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Susan"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
MODALITIES = ["CT", "MRI", "US", "XR", "NM"]
BODY_REGIONS = ["Chest", "Abdomen", "Brain", "Pelvis", "Spine", "Neck", "Extremity"]
PRIORITIES = ["routine", "urgent", "stat"]
STATUSES = ["pending", "scheduled", "completed", "overdue"]

# Test User ID (will be created or matched)
TEST_USER_EMAIL = "test@astrahealth.com"
TEST_SUPABASE_ID = "test-supabase-user-id-12345"


async def create_tables(engine):
    """Create tables if they don't exist."""
    async with engine.begin() as conn:
        # Create tables in order
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                supabase_user_id VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                display_name VARCHAR(100),
                role VARCHAR(20) DEFAULT 'radiologist',
                site_id UUID,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                last_login_at TIMESTAMP
            )
        """))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS patients (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                mrn VARCHAR(50) UNIQUE NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                date_of_birth DATE,
                sex VARCHAR(1),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS studies (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID NOT NULL REFERENCES patients(id),
                accession_number VARCHAR(50) UNIQUE NOT NULL,
                modality VARCHAR(10),
                body_region VARCHAR(50),
                study_date TIMESTAMP,
                study_description VARCHAR(255),
                referring_physician VARCHAR(100),
                clinical_history TEXT,
                priority VARCHAR(20) DEFAULT 'routine',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                study_id UUID UNIQUE NOT NULL REFERENCES studies(id),
                radiologist_id UUID NOT NULL REFERENCES users(id),
                report_text TEXT,
                findings TEXT,
                impression TEXT,
                is_finalized BOOLEAN DEFAULT false,
                finalized_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS followups (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                report_id UUID NOT NULL REFERENCES reports(id),
                patient_id UUID NOT NULL REFERENCES patients(id),
                recommended_modality VARCHAR(20) NOT NULL,
                body_region VARCHAR(50) NOT NULL,
                reason TEXT,
                interval_months INTEGER NOT NULL,
                due_date TIMESTAMP,
                status VARCHAR(20) DEFAULT 'pending',
                priority VARCHAR(20) DEFAULT 'routine',
                assigned_to UUID REFERENCES users(id),
                created_by UUID NOT NULL REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS critical_findings (
                id SERIAL PRIMARY KEY,
                patient_id UUID NOT NULL REFERENCES patients(id),
                study_id UUID NOT NULL REFERENCES studies(id),
                finding TEXT NOT NULL,
                severity VARCHAR(20) NOT NULL,
                communicated BOOLEAN DEFAULT false,
                communicated_at TIMESTAMP,
                communicated_to VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS qa_alerts (
                id SERIAL PRIMARY KEY,
                study_id UUID NOT NULL REFERENCES studies(id),
                alert_type VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                dismissed BOOLEAN DEFAULT false,
                dismissed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tumor_board_cases (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID NOT NULL REFERENCES patients(id),
                status VARCHAR(20) DEFAULT 'preparing',
                scheduled_date TIMESTAMP,
                stage_t VARCHAR(10),
                stage_n VARCHAR(10),
                stage_m VARCHAR(10),
                stage_overall VARCHAR(20),
                consensus TEXT,
                action_items JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tumor_board_measurements (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                case_id UUID NOT NULL REFERENCES tumor_board_cases(id),
                lesion_id VARCHAR(50) NOT NULL,
                location VARCHAR(100) NOT NULL,
                measurement_date DATE NOT NULL,
                long_axis INTEGER NOT NULL,
                short_axis INTEGER NOT NULL,
                measurement_type VARCHAR(20) DEFAULT 'target',
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tumor_board_team (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                case_id UUID NOT NULL REFERENCES tumor_board_cases(id),
                member_name VARCHAR(100) NOT NULL,
                role VARCHAR(50) NOT NULL,
                recommendation TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        
        print("✓ Tables created/verified")


async def seed_data(engine):
    """Insert test data."""
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Create test user
        result = await session.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": TEST_USER_EMAIL}
        )
        user_row = result.fetchone()
        
        if user_row:
            user_id = user_row[0]
            print(f"✓ Using existing user: {user_id}")
        else:
            user_id = uuid4()
            await session.execute(
                text("""
                    INSERT INTO users (id, supabase_user_id, email, display_name, role, is_active, created_at, updated_at)
                    VALUES (:id, :supabase_id, :email, :name, 'radiologist', true, NOW(), NOW())
                """),
                {"id": user_id, "supabase_id": TEST_SUPABASE_ID, "email": TEST_USER_EMAIL, "name": "Dr. Test User"}
            )
            print(f"✓ Created test user: {user_id}")
        
        # Create 15 patients
        patient_ids = []
        for i in range(15):
            patient_id = uuid4()
            mrn = f"MRN{100000 + i}"
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            dob = datetime.now() - timedelta(days=random.randint(20*365, 80*365))
            sex = random.choice(["M", "F"])
            
            await session.execute(
                text("""
                    INSERT INTO patients (id, mrn, first_name, last_name, date_of_birth, sex, created_at, updated_at)
                    VALUES (:id, :mrn, :first, :last, :dob, :sex, NOW(), NOW())
                    ON CONFLICT (mrn) DO NOTHING
                """),
                {"id": patient_id, "mrn": mrn, "first": first, "last": last, "dob": dob.date(), "sex": sex}
            )
            patient_ids.append((patient_id, f"{last}, {first[0]}.", mrn))
        
        print(f"✓ Created {len(patient_ids)} patients")
        
        # Create studies for worklist
        study_ids = []
        for i, (patient_id, patient_name, mrn) in enumerate(patient_ids):
            study_id = uuid4()
            accession = f"ACC{200000 + i}"
            modality = random.choice(MODALITIES)
            body_region = random.choice(BODY_REGIONS)
            study_date = datetime.now() - timedelta(hours=random.randint(1, 48))
            priority = random.choice(PRIORITIES)
            referring = f"Dr. {random.choice(LAST_NAMES)}"
            history = random.choice([
                "Chest pain, rule out PE",
                "Abdominal pain, evaluate for appendicitis",
                "Headache, rule out mass",
                "Follow-up known lung nodule",
                "Staging workup for malignancy",
                "Trauma evaluation",
                "Chronic cough, smoker",
                "Flank pain, hematuria"
            ])
            
            await session.execute(
                text("""
                    INSERT INTO studies (id, patient_id, accession_number, modality, body_region, 
                                         study_date, study_description, referring_physician, created_at, updated_at)
                    VALUES (:id, :patient_id, :accession, :modality, :body_region, 
                            :study_date, :description, :referring, NOW(), NOW())
                    ON CONFLICT (accession_number) DO NOTHING
                """),
                {
                    "id": study_id, "patient_id": patient_id, "accession": accession,
                    "modality": modality, "body_region": body_region, "study_date": study_date,
                    "description": f"{modality} {body_region}", "referring": referring
                }
            )
            study_ids.append((study_id, patient_id, patient_name, modality))
        
        print(f"✓ Created {len(study_ids)} studies")
        
        # Create reports for some studies
        report_ids = []
        for study_id, patient_id, patient_name, modality in study_ids[:10]:
            report_id = uuid4()
            await session.execute(
                text("""
                    INSERT INTO reports (id, study_id, radiologist_id, findings, impression, is_finalized, created_at, updated_at)
                    VALUES (:id, :study_id, :user_id, :findings, :impression, true, NOW(), NOW())
                    ON CONFLICT (study_id) DO NOTHING
                """),
                {
                    "id": report_id, "study_id": study_id, "user_id": user_id,
                    "findings": "Exam findings documented.",
                    "impression": "See findings above."
                }
            )
            report_ids.append((report_id, patient_id, patient_name))
        
        print(f"✓ Created {len(report_ids)} reports")
        
        # Create follow-ups
        for i, (report_id, patient_id, patient_name) in enumerate(report_ids[:6]):
            await session.execute(
                text("""
                    INSERT INTO followups (id, report_id, patient_id, recommended_modality, body_region,
                                          reason, interval_months, due_date, status, priority, created_by, created_at, updated_at)
                    VALUES (:id, :report_id, :patient_id, :modality, :region, :reason, :interval,
                            :due_date, :status, :priority, :created_by, NOW(), NOW())
                """),
                {
                    "id": uuid4(), "report_id": report_id, "patient_id": patient_id,
                    "modality": random.choice(MODALITIES), "region": random.choice(BODY_REGIONS),
                    "reason": "Follow-up recommended finding",
                    "interval": random.choice([3, 6, 12]),
                    "due_date": datetime.now() + timedelta(days=random.randint(-30, 90)),
                    "status": random.choice(STATUSES),
                    "priority": random.choice(PRIORITIES),
                    "created_by": user_id
                }
            )
        
        print("✓ Created follow-ups")
        
        # Create critical findings
        critical_findings = [
            ("Pulmonary embolism identified", "stat"),
            ("New liver lesions concerning for metastases", "urgent"),
            ("Aortic dissection", "stat"),
            ("Large pleural effusion with mass effect", "urgent"),
        ]
        
        for i, (finding, severity) in enumerate(critical_findings):
            if i < len(study_ids):
                study_id, patient_id, _, _ = study_ids[i]
                await session.execute(
                    text("""
                        INSERT INTO critical_findings (patient_id, study_id, finding, severity)
                        VALUES (:patient_id, :study_id, :finding, :severity)
                    """),
                    {"patient_id": patient_id, "study_id": study_id, "finding": finding, "severity": severity}
                )
        
        print("✓ Created critical findings")
        
        # Create QA alerts
        qa_alerts = [
            ("laterality", "Report mentions 'right kidney' but prior noted finding on left"),
            ("recommendation", "TI-RADS 4 nodule described without follow-up recommendation"),
            ("measurement", "Nodule measured 8mm but prior was 12mm - verify measurement"),
        ]
        
        for i, (alert_type, message) in enumerate(qa_alerts):
            if i < len(study_ids):
                study_id, _, _, _ = study_ids[i]
                await session.execute(
                    text("""
                        INSERT INTO qa_alerts (study_id, alert_type, message)
                        VALUES (:study_id, :type, :message)
                    """),
                    {"study_id": study_id, "type": alert_type, "message": message}
                )
        
        print("✓ Created QA alerts")
        
        # Create tumor board cases
        for i in range(3):
            patient_id, patient_name, mrn = patient_ids[i]
            case_id = uuid4()
            
            await session.execute(
                text("""
                    INSERT INTO tumor_board_cases (id, patient_id, status, scheduled_date,
                                                   stage_t, stage_n, stage_m, stage_overall)
                    VALUES (:id, :patient_id, :status, :scheduled_date, :t, :n, :m, :overall)
                """),
                {
                    "id": case_id, "patient_id": patient_id,
                    "status": ["preparing", "scheduled", "completed"][i],
                    "scheduled_date": datetime.now() + timedelta(days=i*7),
                    "t": random.choice(["T1", "T2", "T3"]),
                    "n": random.choice(["N0", "N1", "N2"]),
                    "m": random.choice(["M0", "M1"]),
                    "overall": random.choice(["IIA", "IIB", "IIIA", "IV"])
                }
            )
            
            # Add measurements
            for j in range(random.randint(2, 4)):
                await session.execute(
                    text("""
                        INSERT INTO tumor_board_measurements (id, case_id, lesion_id, location,
                                                              measurement_date, long_axis, short_axis, measurement_type)
                        VALUES (:id, :case_id, :lesion_id, :location, :date, :long, :short, :type)
                    """),
                    {
                        "id": uuid4(), "case_id": case_id,
                        "lesion_id": f"L{j+1}",
                        "location": random.choice(["Right lung", "Left lung", "Liver", "Lymph node"]),
                        "date": datetime.now().date(),
                        "long": random.randint(10, 50),
                        "short": random.randint(8, 40),
                        "type": "target" if j < 2 else "non-target"
                    }
                )
            
            # Add team members
            team = [
                ("Dr. Smith", "radiology"),
                ("Dr. Jones", "oncology"),
                ("Dr. Wilson", "surgery"),
                ("Dr. Brown", "pathology"),
            ]
            for name, role in team:
                await session.execute(
                    text("""
                        INSERT INTO tumor_board_team (id, case_id, member_name, role)
                        VALUES (:id, :case_id, :name, :role)
                    """),
                    {"id": uuid4(), "case_id": case_id, "name": name, "role": role}
                )
        
        print("✓ Created tumor board cases")
        
        await session.commit()
        print("\n✅ All test data seeded successfully!")


async def remove_data(engine):
    """Remove all test data."""
    async with engine.begin() as conn:
        # Delete in reverse order of dependencies
        await conn.execute(text("DELETE FROM tumor_board_team"))
        await conn.execute(text("DELETE FROM tumor_board_measurements"))
        await conn.execute(text("DELETE FROM tumor_board_cases"))
        await conn.execute(text("DELETE FROM qa_alerts"))
        await conn.execute(text("DELETE FROM critical_findings"))
        await conn.execute(text("DELETE FROM followups"))
        await conn.execute(text("DELETE FROM reports"))
        await conn.execute(text("DELETE FROM studies"))
        await conn.execute(text("DELETE FROM patients"))
        # Keep users for now
        print("✅ All test data removed!")


async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    if "--remove" in sys.argv:
        await remove_data(engine)
    else:
        await create_tables(engine)
        await seed_data(engine)
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
