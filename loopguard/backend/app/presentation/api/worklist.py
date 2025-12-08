"""
Worklist API Routes

Endpoints for radiologist reading room worklist.
"""

from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from .dependencies import CurrentUser, DbSession

router = APIRouter(prefix="/worklist", tags=["worklist"])


class Study(BaseModel):
    id: str
    patient_name: str
    patient_mrn: str
    patient_age: str
    patient_sex: str
    study_type: str
    modality: str
    study_date: str
    ordering_physician: str
    clinical_history: str
    priority: str
    prior_studies: int
    body_part: str


class StudiesResponse(BaseModel):
    studies: List[Study]


class SignReportRequest(BaseModel):
    study_id: str
    report_text: str
    findings: Optional[str] = ""
    impression: Optional[str] = ""


class SignReportResponse(BaseModel):
    status: str
    report_id: str


def calculate_age(dob: Optional[date]) -> str:
    if not dob:
        return "Unknown"
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return f"{age}Y"


def get_clinical_history(body_region: str, modality: str) -> str:
    """Generate realistic clinical history based on body region."""
    histories = {
        "Chest": [
            "Shortness of breath, rule out pneumonia",
            "Chronic cough, evaluate for lung nodules",
            "Chest pain, rule out PE",
            "Follow-up lung nodule",
            "Staging workup for known malignancy"
        ],
        "Abdomen": [
            "Abdominal pain, rule out appendicitis",
            "Elevated LFTs, evaluate liver",
            "Follow-up renal lesion",
            "Weight loss, staging workup",
            "Hematuria, evaluate kidneys"
        ],
        "Brain": [
            "Headache, rule out intracranial pathology",
            "New onset seizure",
            "Stroke workup",
            "Follow-up brain lesion",
            "Memory loss, evaluate for dementia"
        ],
        "Pelvis": [
            "Pelvic pain, evaluate for mass",
            "Elevated PSA, staging",
            "Follow-up ovarian cyst",
            "Hematuria workup"
        ],
        "Spine": [
            "Back pain with radiculopathy",
            "Evaluate for compression fracture",
            "Post-operative evaluation",
            "Known metastatic disease"
        ]
    }
    import random
    region_histories = histories.get(body_region, histories.get("Chest", []))
    return random.choice(region_histories) if region_histories else "Clinical correlation recommended"


@router.get("/studies", response_model=StudiesResponse)
async def get_studies(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get worklist studies for the reading room."""
    result = await db.execute(text("""
        SELECT 
            s.id, s.accession_number, s.modality, s.body_region, s.study_date, 
            s.study_description, s.referring_physician,
            p.mrn, p.first_name, p.last_name, p.date_of_birth, p.sex
        FROM studies s
        JOIN patients p ON s.patient_id = p.id
        LEFT JOIN reports r ON r.study_id = s.id
        WHERE r.id IS NULL
        ORDER BY s.study_date DESC
        LIMIT 50
    """))
    rows = result.fetchall()
    
    studies = []
    for row in rows:
        # Row indices: 0=id, 1=accession, 2=modality, 3=body_region, 4=study_date,
        # 5=study_description, 6=referring_physician, 7=mrn, 8=first_name, 9=last_name, 10=dob, 11=sex
        dob = row[10]
        studies.append(Study(
            id=str(row[0]),
            patient_name=f"{row[9]}, {row[8]}",
            patient_mrn=row[7] or "",
            patient_age=calculate_age(dob if isinstance(dob, date) else None),
            patient_sex=row[11] or "U",
            study_type=row[5] or f"{row[2]} {row[3]}",
            modality=row[2] or "",
            study_date=row[4].isoformat() if row[4] else "",
            ordering_physician=row[6] or "",
            clinical_history=get_clinical_history(row[3] or "Chest", row[2] or "CT"),
            priority="routine",
            prior_studies=0,
            body_part=row[3] or ""
        ))
    
    return StudiesResponse(studies=studies)


@router.post("/sign", response_model=SignReportResponse)
async def sign_report(
    body: SignReportRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """Sign and finalize a radiology report."""
    from uuid import uuid4
    
    report_id = uuid4()
    
    from uuid import UUID as PyUUID
    study_uuid = PyUUID(body.study_id) if isinstance(body.study_id, str) else body.study_id
    
    await db.execute(text("""
        INSERT INTO reports (id, study_id, radiologist_id, report_text, findings, impression, is_finalized, finalized_at, created_at, updated_at)
        VALUES (:id, :study_id, :radiologist_id, :report_text, :findings, :impression, true, NOW(), NOW(), NOW())
    """), {
        "id": report_id,
        "study_id": study_uuid,
        "radiologist_id": current_user.id,
        "report_text": body.report_text,
        "findings": body.findings or "",
        "impression": body.impression or ""
    })
    await db.commit()
    
    return SignReportResponse(status="signed", report_id=str(report_id))
