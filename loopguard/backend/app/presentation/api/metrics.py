"""
Metrics API Routes

Endpoints for compliance and performance metrics.
"""

from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import BaseModel

from ...domain.entities.user import UserRole
from ...infrastructure.repositories import (
    SQLAlchemyFollowUpRepository,
    SQLAlchemyAuditRepository,
)
from ...infrastructure.audit import DatabaseAuditLogger
from ...application.services import GenerateMetricsService
from ...application.services.generate_metrics_service import MetricsTimeRange
from ..schemas.metrics import (
    MetricsResponse,
    StatusBreakdownResponse,
    ModalityBreakdownResponse,
)
from .dependencies import CurrentUser, DbSession, get_client_ip, require_role

router = APIRouter(prefix="/metrics", tags=["metrics"])


# Dashboard Analytics Models
class OutcomesData(BaseModel):
    malignant: int = 0
    benign: int = 0
    indeterminate: int = 0
    lost_to_followup: int = 0


class ModalityStat(BaseModel):
    modality: str
    count: int
    avg_time: float


class WeeklyData(BaseModel):
    week: str
    studies: int
    avg_time: float


class AnalyticsResponse(BaseModel):
    total_studies: int
    studies_this_week: int
    week_over_week_change: int
    avg_read_time: float
    critical_findings_count: int
    pending_followups: int
    overdue_followups: int
    completed_followups: int
    total_followups: int
    compliance_rate: int
    outcomes: OutcomesData
    modality_stats: List[ModalityStat]
    weekly_data: List[WeeklyData]
    impact_score: int


class CriticalFinding(BaseModel):
    id: int
    patient_name: str
    finding: str
    study_type: str
    timestamp: str
    severity: str
    communicated: bool


class QAAlert(BaseModel):
    id: int
    type: str
    message: str
    study: str
    dismissed: bool


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get dashboard analytics data."""
    from sqlalchemy import text
    
    # Get study counts
    total_result = await db.execute(text("SELECT COUNT(*) FROM studies"))
    total_studies = total_result.scalar() or 0
    
    week_result = await db.execute(text("""
        SELECT COUNT(*) FROM studies 
        WHERE study_date > NOW() - INTERVAL '7 days'
    """))
    studies_this_week = week_result.scalar() or 0
    
    # Get critical findings count
    critical_result = await db.execute(text("""
        SELECT COUNT(*) FROM critical_findings WHERE NOT communicated
    """))
    critical_count = critical_result.scalar() or 0
    
    # Get followup stats
    followup_result = await db.execute(text("""
        SELECT 
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'overdue') as overdue,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) as total
        FROM followups
    """))
    fu_row = followup_result.fetchone()
    pending = fu_row[0] or 0
    overdue = fu_row[1] or 0
    completed = fu_row[2] or 0
    total_fu = fu_row[3] or 0
    
    compliance = int((completed / total_fu * 100) if total_fu > 0 else 0)
    
    # Modality stats
    modality_result = await db.execute(text("""
        SELECT modality, COUNT(*) as count
        FROM studies
        WHERE modality IS NOT NULL
        GROUP BY modality
    """))
    modality_rows = modality_result.fetchall()
    modality_stats = [ModalityStat(modality=r[0], count=r[1], avg_time=5.0) for r in modality_rows]
    
    return AnalyticsResponse(
        total_studies=total_studies,
        studies_this_week=studies_this_week,
        week_over_week_change=0,
        avg_read_time=5.2,
        critical_findings_count=critical_count,
        pending_followups=pending,
        overdue_followups=overdue,
        completed_followups=completed,
        total_followups=total_fu,
        compliance_rate=compliance,
        outcomes=OutcomesData(),
        modality_stats=modality_stats,
        weekly_data=[],
        impact_score=total_studies + (critical_count * 10),
    )


@router.get("/critical-findings")
async def get_critical_findings(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get critical findings requiring communication."""
    from sqlalchemy import text
    
    result = await db.execute(text("""
        SELECT cf.id, p.first_name, p.last_name, cf.finding, s.study_description, 
               cf.severity, cf.communicated, cf.created_at
        FROM critical_findings cf
        JOIN patients p ON cf.patient_id = p.id
        JOIN studies s ON cf.study_id = s.id
        WHERE NOT cf.communicated
        ORDER BY cf.created_at DESC
    """))
    rows = result.fetchall()
    
    findings = []
    for row in rows:
        findings.append({
            "id": row[0],
            "patient_name": f"{row[2]}, {row[1][0]}.",
            "finding": row[3],
            "study_type": row[4] or "Study",
            "timestamp": row[7].isoformat() if row[7] else "",
            "severity": row[5],
            "communicated": row[6]
        })
    
    return {"findings": findings}


@router.get("/qa-alerts")
async def get_qa_alerts(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get QA alerts for report review."""
    from sqlalchemy import text
    
    result = await db.execute(text("""
        SELECT qa.id, qa.alert_type, qa.message, s.study_description, qa.dismissed
        FROM qa_alerts qa
        JOIN studies s ON qa.study_id = s.id
        WHERE NOT qa.dismissed
        ORDER BY qa.created_at DESC
    """))
    rows = result.fetchall()
    
    alerts = []
    for row in rows:
        alerts.append({
            "id": row[0],
            "type": row[1],
            "message": row[2],
            "study": row[3] or "Study",
            "dismissed": row[4]
        })
    
    return {"alerts": alerts}


@router.patch("/critical-findings/{finding_id}/communicate")
async def mark_communicated(
    finding_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """Mark a critical finding as communicated."""
    from sqlalchemy import text
    from datetime import datetime
    
    await db.execute(
        text("""
            UPDATE critical_findings 
            SET communicated = true, communicated_at = :now
            WHERE id = :id
        """),
        {"id": finding_id, "now": datetime.utcnow()}
    )
    await db.commit()
    return {"status": "ok", "id": finding_id}


@router.patch("/qa-alerts/{alert_id}/dismiss")
async def dismiss_alert(
    alert_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """Dismiss a QA alert."""
    from sqlalchemy import text
    from datetime import datetime
    
    await db.execute(
        text("""
            UPDATE qa_alerts 
            SET dismissed = true, dismissed_at = :now
            WHERE id = :id
        """),
        {"id": alert_id, "now": datetime.utcnow()}
    )
    await db.commit()
    return {"status": "ok", "id": alert_id}


@router.get("/followups", response_model=MetricsResponse)
async def get_followup_metrics(
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
    days: int = Query(30, ge=1, le=365),
    site_id: Optional[UUID] = None,
):
    """
    Get follow-up compliance metrics.
    
    Available to all authenticated users for dashboard display.
    Detailed analytics require admin role.
    """
    # All authenticated users can view basic metrics
    # (For production, you might want stricter access)
    
    # Build services
    followup_repo = SQLAlchemyFollowUpRepository(db)
    audit_repo = SQLAlchemyAuditRepository(db)
    audit_logger = DatabaseAuditLogger(audit_repo)
    
    service = GenerateMetricsService(followup_repo, audit_logger)
    
    # Calculate time range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    try:
        result = await service.execute(
            time_range=MetricsTimeRange(
                start_date=start_date,
                end_date=end_date,
            ),
            current_user=current_user,
            site_id=site_id,
            ip_address=get_client_ip(request),
        )
        
        return MetricsResponse(
            time_range_start=result.time_range.start_date,
            time_range_end=result.time_range.end_date,
            total_followups=result.total_followups,
            total_completed=result.total_completed,
            total_overdue=result.total_overdue,
            completion_rate=result.completion_rate,
            overdue_rate=result.overdue_rate,
            status_breakdown=StatusBreakdownResponse(
                pending=result.status_breakdown.pending,
                scheduled=result.status_breakdown.scheduled,
                completed=result.status_breakdown.completed,
                cancelled=result.status_breakdown.cancelled,
                overdue=result.status_breakdown.overdue,
            ),
            modality_breakdown=[
                ModalityBreakdownResponse(
                    modality=m.modality,
                    count=m.count,
                    completed_on_time=m.completed_on_time,
                    completed_late=m.completed_late,
                )
                for m in result.modality_breakdown
            ],
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
