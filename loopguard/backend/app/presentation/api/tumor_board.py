"""
Tumor Board API Routes

Endpoints for multidisciplinary tumor board case management.
"""

from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

from .dependencies import CurrentUser, DbSession

router = APIRouter(prefix="/tumor-board", tags=["tumor-board"])


class Patient(BaseModel):
    id: str
    name: str
    age: int
    sex: str
    mrn: str
    diagnosis: str
    primary_site: str
    histology: str
    referring_md: str


class Measurement(BaseModel):
    id: str
    lesion_id: str
    location: str
    date: str
    long_axis: int
    short_axis: int
    type: str


class TeamMember(BaseModel):
    id: str
    name: str
    role: str
    recommendation: Optional[str] = None


class Stage(BaseModel):
    t: str
    n: str
    m: str
    overall: str


class TumorCase(BaseModel):
    id: str
    patient: Patient
    status: str
    scheduled_date: Optional[str] = None
    stage: Optional[Stage] = None
    measurements: List[Measurement]
    team: List[TeamMember]
    consensus: Optional[str] = None
    action_items: List[str]


class CasesResponse(BaseModel):
    cases: List[TumorCase]


class UpdateCaseRequest(BaseModel):
    consensus: Optional[str] = None
    status: Optional[str] = None
    stage_t: Optional[str] = None
    stage_n: Optional[str] = None
    stage_m: Optional[str] = None
    stage_overall: Optional[str] = None


@router.get("/cases", response_model=CasesResponse)
async def get_cases(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get tumor board cases."""
    from sqlalchemy import text
    
    # Get cases with patient info
    result = await db.execute(text("""
        SELECT 
            tc.id, tc.status, tc.scheduled_date, tc.stage_t, tc.stage_n, tc.stage_m, tc.stage_overall,
            tc.consensus, tc.action_items,
            p.id as patient_id, p.mrn, p.first_name, p.last_name, p.sex, p.date_of_birth
        FROM tumor_board_cases tc
        JOIN patients p ON tc.patient_id = p.id
        ORDER BY tc.scheduled_date DESC
    """))
    case_rows = result.fetchall()
    
    cases = []
    for row in case_rows:
        case_id = row[0]
        
        # Calculate age
        from datetime import date
        dob = row[14]
        age = 0
        if dob:
            today = date.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        
        # Get measurements for this case
        meas_result = await db.execute(text("""
            SELECT id, lesion_id, location, measurement_date, long_axis, short_axis, measurement_type
            FROM tumor_board_measurements
            WHERE case_id = :case_id
        """), {"case_id": case_id})
        meas_rows = meas_result.fetchall()
        
        measurements = [
            Measurement(
                id=str(m[0]), lesion_id=m[1], location=m[2],
                date=m[3].isoformat() if m[3] else "",
                long_axis=m[4], short_axis=m[5], type=m[6]
            )
            for m in meas_rows
        ]
        
        # Get team for this case
        team_result = await db.execute(text("""
            SELECT id, member_name, role, recommendation
            FROM tumor_board_team
            WHERE case_id = :case_id
        """), {"case_id": case_id})
        team_rows = team_result.fetchall()
        
        team = [
            TeamMember(id=str(t[0]), name=t[1], role=t[2], recommendation=t[3])
            for t in team_rows
        ]
        
        stage = None
        if row[3]:
            stage = Stage(t=row[3], n=row[4] or "", m=row[5] or "", overall=row[6] or "")
        
        cases.append(TumorCase(
            id=str(case_id),
            patient=Patient(
                id=str(row[9]),
                name=f"{row[12]}, {row[11]}",
                age=age,
                sex=row[13] or "U",
                mrn=row[10] or "",
                diagnosis="",
                primary_site="",
                histology="",
                referring_md=""
            ),
            status=row[1] or "preparing",
            scheduled_date=row[2].isoformat() if row[2] else None,
            stage=stage,
            measurements=measurements,
            team=team,
            consensus=row[7],
            action_items=row[8] if row[8] else []
        ))
    
    return CasesResponse(cases=cases)


@router.patch("/cases/{case_id}")
async def update_case(
    case_id: str,
    data: UpdateCaseRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """Update a tumor board case (consensus, status, staging)."""
    from sqlalchemy import text
    
    updates = []
    params = {"case_id": case_id}
    
    if data.consensus is not None:
        updates.append("consensus = :consensus")
        params["consensus"] = data.consensus
    
    if data.status is not None:
        updates.append("status = :status")
        params["status"] = data.status
    
    if data.stage_t is not None:
        updates.append("stage_t = :stage_t")
        params["stage_t"] = data.stage_t
    
    if data.stage_n is not None:
        updates.append("stage_n = :stage_n")
        params["stage_n"] = data.stage_n
    
    if data.stage_m is not None:
        updates.append("stage_m = :stage_m")
        params["stage_m"] = data.stage_m
    
    if data.stage_overall is not None:
        updates.append("stage_overall = :stage_overall")
        params["stage_overall"] = data.stage_overall
    
    if updates:
        updates.append("updated_at = NOW()")
        query = f"UPDATE tumor_board_cases SET {', '.join(updates)} WHERE id = :case_id"
        await db.execute(text(query), params)
        await db.commit()
    
    return {"status": "ok", "case_id": case_id}
