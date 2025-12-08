"""
Follow-ups API Routes

Endpoints for managing follow-up recommendations.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.entities.user import UserRole
from ...domain.entities.followup import FollowUpStatus, FollowUpPriority
from ...infrastructure.db import get_db
from ...infrastructure.repositories import (
    SQLAlchemyFollowUpRepository,
    SQLAlchemyAuditRepository,
)
from ...infrastructure.audit import DatabaseAuditLogger
from ...application.services import (
    CreateFollowUpService,
    UpdateFollowUpStatusService,
    ListWorklistService,
)
from ...application.services.create_followup_service import CreateFollowUpInput
from ...application.services.update_followup_status_service import UpdateStatusInput
from ...application.services.list_worklist_service import WorklistFilters
from ..schemas.followup import (
    FollowUpCreate,
    FollowUpResponse,
    FollowUpStatusUpdate,
    WorklistResponse,
    WorklistItemResponse,
)
from .dependencies import CurrentUser, DbSession, get_client_ip, require_role

router = APIRouter(prefix="/followups", tags=["followups"])


class MockReportRepo:
    """Mock report repository for development."""
    async def get_by_id(self, report_id):
        from datetime import datetime
        from dataclasses import dataclass
        from uuid import UUID
        
        @dataclass
        class MockReport:
            id: any
            study_id: any
            finalized_at: any
        
        # Use the actual mock patient ID from our test data
        return MockReport(
            id=report_id,
            study_id=UUID("00000000-0000-0000-0000-000000000001"),  # Mock patient ID
            finalized_at=datetime.utcnow(),
        )


@router.post("", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
async def create_followup(
    request: Request,
    body: FollowUpCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Create a new follow-up recommendation.
    
    Accepts either report_id or study_id.
    """
    from datetime import datetime, timedelta
    from uuid import uuid4
    from sqlalchemy import text
    
    try:
        from uuid import UUID as PyUUID
        
        # Get patient_id and report_id from study if study_id provided
        patient_id = None
        report_id = body.report_id
        
        print(f"[FOLLOWUP] Creating followup with study_id={body.study_id}, report_id={body.report_id}")
        
        if body.study_id:
            # Convert string to UUID if needed
            study_uuid = PyUUID(str(body.study_id)) if body.study_id else None
            print(f"[FOLLOWUP] Looking up study: {study_uuid}")
            
            result = await db.execute(
                text("SELECT patient_id FROM studies WHERE id = :study_id"),
                {"study_id": study_uuid}
            )
            row = result.fetchone()
            print(f"[FOLLOWUP] Study lookup result: {row}")
            if row:
                patient_id = row[0]
                print(f"[FOLLOWUP] Found patient_id: {patient_id}")
            
            # Check if study has a report
            report_result = await db.execute(
                text("SELECT id FROM reports WHERE study_id = :study_id"),
                {"study_id": study_uuid}
            )
            report_row = report_result.fetchone()
            if report_row:
                report_id = report_row[0]
        
        if not patient_id and report_id:
            # Get patient_id from report's study
            result = await db.execute(
                text("""
                    SELECT s.patient_id FROM reports r
                    JOIN studies s ON r.study_id = s.id
                    WHERE r.id = :report_id
                """),
                {"report_id": report_id}
            )
            row = result.fetchone()
            if row:
                patient_id = row[0]
        
        if not patient_id:
            raise HTTPException(status_code=400, detail="Could not find patient for this study/report")
        
        # Create followup directly
        followup_id = uuid4()
        due_date = datetime.utcnow() + timedelta(days=body.interval_months * 30)
        
        await db.execute(
            text("""
                INSERT INTO followups (id, report_id, patient_id, recommended_modality, body_region,
                                       reason, interval_months, due_date, status, priority, created_by, created_at, updated_at)
                VALUES (:id, :report_id, :patient_id, :modality, :body_region,
                        :reason, :interval, :due_date, 'pending', :priority, :created_by, NOW(), NOW())
            """),
            {
                "id": followup_id,
                "report_id": report_id,
                "patient_id": patient_id,
                "modality": body.recommended_modality,
                "body_region": body.body_region,
                "reason": body.reason,
                "interval": body.interval_months,
                "due_date": due_date,
                "priority": body.priority,
                "created_by": current_user.id
            }
        )
        await db.commit()
        
        return FollowUpResponse(
            id=followup_id,
            report_id=report_id,
            patient_id=patient_id,
            recommended_modality=body.recommended_modality,
            body_region=body.body_region,
            reason=body.reason,
            interval_months=body.interval_months,
            due_date=due_date,
            status="pending",
            priority=body.priority,
            assigned_to=None,
            created_by=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/worklist", response_model=WorklistResponse)
async def get_worklist(
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
    status_filter: Optional[List[str]] = Query(None, alias="status"),
    modality: Optional[str] = None,
    assigned_to: Optional[UUID] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    Get follow-up worklist with filters.
    
    Coordinators see their site's follow-ups.
    Admins see all follow-ups.
    """
    # Build services
    followup_repo = SQLAlchemyFollowUpRepository(db)
    audit_repo = SQLAlchemyAuditRepository(db)
    audit_logger = DatabaseAuditLogger(audit_repo)
    
    service = ListWorklistService(followup_repo, audit_logger)
    
    # Parse status filter
    parsed_status = None
    if status_filter:
        try:
            parsed_status = [FollowUpStatus(s) for s in status_filter]
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status value: {e}",
            )
    
    result = await service.execute(
        filters=WorklistFilters(
            status=parsed_status,
            assigned_to=assigned_to,
            modality=modality,
            limit=limit,
            offset=offset,
        ),
        current_user=current_user,
        ip_address=get_client_ip(request),
    )
    
    return WorklistResponse(
        items=[
            WorklistItemResponse(
                followup=FollowUpResponse(
                    id=item.followup.id,
                    report_id=item.followup.report_id,
                    patient_id=item.followup.patient_id,
                    recommended_modality=item.followup.recommended_modality,
                    body_region=item.followup.body_region,
                    reason=item.followup.reason,
                    interval_months=item.followup.interval_months,
                    due_date=item.followup.due_date,
                    status=item.followup.status.value,
                    priority=item.followup.priority.value,
                    assigned_to=item.followup.assigned_to,
                    created_by=item.followup.created_by,
                    created_at=item.followup.created_at,
                    updated_at=item.followup.updated_at,
                    days_until_due=item.days_until_due,
                    is_overdue=item.is_overdue,
                ),
                patient_name=item.patient_name,
                patient_mrn=item.patient_mrn,
                days_until_due=item.days_until_due,
                is_overdue=item.is_overdue,
            )
            for item in result.items
        ],
        total_count=result.total_count,
        has_more=result.has_more,
    )


@router.patch("/{followup_id}/status", response_model=FollowUpResponse)
async def update_followup_status(
    followup_id: UUID,
    body: FollowUpStatusUpdate,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Update follow-up status.
    
    Only coordinators and admins can update status.
    """
    # Build services
    followup_repo = SQLAlchemyFollowUpRepository(db)
    audit_repo = SQLAlchemyAuditRepository(db)
    audit_logger = DatabaseAuditLogger(audit_repo)
    
    service = UpdateFollowUpStatusService(followup_repo, audit_logger)
    
    try:
        result = await service.execute(
            input_data=UpdateStatusInput(
                followup_id=followup_id,
                new_status=FollowUpStatus(body.status),
                note=body.note,
            ),
            current_user=current_user,
            ip_address=get_client_ip(request),
        )
        
        followup = result.followup
        return FollowUpResponse(
            id=followup.id,
            report_id=followup.report_id,
            patient_id=followup.patient_id,
            recommended_modality=followup.recommended_modality,
            body_region=followup.body_region,
            reason=followup.reason,
            interval_months=followup.interval_months,
            due_date=followup.due_date,
            status=followup.status.value,
            priority=followup.priority.value,
            assigned_to=followup.assigned_to,
            created_by=followup.created_by,
            created_at=followup.created_at,
            updated_at=followup.updated_at,
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/{followup_id}", response_model=FollowUpResponse)
async def get_followup(
    followup_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get a specific follow-up by ID."""
    followup_repo = SQLAlchemyFollowUpRepository(db)
    
    followup = await followup_repo.get_by_id(followup_id)
    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found",
        )
    
    return FollowUpResponse(
        id=followup.id,
        report_id=followup.report_id,
        patient_id=followup.patient_id,
        recommended_modality=followup.recommended_modality,
        body_region=followup.body_region,
        reason=followup.reason,
        interval_months=followup.interval_months,
        due_date=followup.due_date,
        status=followup.status.value,
        priority=followup.priority.value,
        assigned_to=followup.assigned_to,
        created_by=followup.created_by,
        created_at=followup.created_at,
        updated_at=followup.updated_at,
    )
