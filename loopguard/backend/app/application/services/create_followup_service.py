"""
Create Follow-Up Recommendation Service

Use case for radiologists creating follow-up recommendations.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from ...domain.entities.followup import (
    FollowUpRecommendation,
    FollowUpAction,
    FollowUpPriority,
    ActionType,
)
from ...domain.entities.user import User, UserRole
from ...domain.entities.audit import AuditAction
from ...domain.interfaces.repositories import (
    FollowUpRepository,
    ReportRepository,
)
from ...domain.interfaces.services import AuditLogger


class PermissionError(Exception):
    """User lacks permission for this action."""
    pass


class ReportNotFoundError(Exception):
    """Report not found."""
    pass


@dataclass
class CreateFollowUpInput:
    """Input DTO for creating a follow-up."""
    report_id: UUID
    recommended_modality: str
    body_region: str
    reason: str
    interval_months: int
    priority: FollowUpPriority = FollowUpPriority.ROUTINE


@dataclass
class CreateFollowUpOutput:
    """Output DTO for created follow-up."""
    followup: FollowUpRecommendation
    due_date: datetime


class CreateFollowUpService:
    """
    Service for creating follow-up recommendations.
    
    SOLID Principles:
    - Single Responsibility: Only handles follow-up creation
    - Dependency Inversion: Depends on repository interfaces, not implementations
    - Open/Closed: New validation rules can be added via composition
    
    Business Rules:
    - Only radiologists can create follow-ups
    - Follow-up must be linked to a finalized report
    - Due date is calculated from report finalization date + interval
    """
    
    def __init__(
        self,
        followup_repo: FollowUpRepository,
        report_repo: ReportRepository,
        audit_logger: AuditLogger,
    ) -> None:
        """
        Initialize service with dependencies.
        
        Dependency Injection: All dependencies are provided via constructor.
        """
        self._followup_repo = followup_repo
        self._report_repo = report_repo
        self._audit_logger = audit_logger
    
    async def execute(
        self,
        input_data: CreateFollowUpInput,
        current_user: User,
        ip_address: str = "",
    ) -> CreateFollowUpOutput:
        """
        Create a new follow-up recommendation.
        
        Args:
            input_data: Follow-up details
            current_user: User creating the follow-up
            ip_address: Client IP for audit logging
            
        Returns:
            Created follow-up with calculated due date
            
        Raises:
            PermissionError: User not authorized
            ReportNotFoundError: Report doesn't exist
        """
        # Authorization check
        if current_user.role not in (UserRole.RADIOLOGIST, UserRole.ADMIN):
            await self._audit_logger.log(
                action=AuditAction.CREATE,
                entity_type="FollowUpRecommendation",
                user_id=current_user.id,
                user_email=current_user.email,
                ip_address=ip_address,
                success=False,
                error_message="Permission denied",
            )
            raise PermissionError("Only radiologists can create follow-up recommendations")
        
        # Validate report exists
        report = await self._report_repo.get_by_id(input_data.report_id)
        if not report:
            raise ReportNotFoundError(f"Report {input_data.report_id} not found")
        
        # Create follow-up entity
        followup = FollowUpRecommendation(
            report_id=input_data.report_id,
            patient_id=report.study_id,  # Will be resolved from study
            recommended_modality=input_data.recommended_modality,
            body_region=input_data.body_region,
            reason=input_data.reason,
            interval_months=input_data.interval_months,
            priority=input_data.priority,
            created_by=current_user.id,
            created_at=datetime.utcnow(),
        )
        
        # Calculate due date based on report finalization or now
        reference_date = report.finalized_at or datetime.utcnow()
        due_date = followup.calculate_due_date(reference_date)
        
        # Persist
        saved_followup = await self._followup_repo.save(followup)
        
        # Create audit action
        action = FollowUpAction(
            recommendation_id=saved_followup.id,
            action_type=ActionType.CREATED,
            new_status=saved_followup.status,
            note=f"Created with {input_data.interval_months} month interval",
            created_by=current_user.id,
            ip_address=ip_address,
        )
        await self._followup_repo.add_action(action)
        
        # Audit log
        await self._audit_logger.log(
            action=AuditAction.CREATE,
            entity_type="FollowUpRecommendation",
            entity_id=saved_followup.id,
            user_id=current_user.id,
            user_email=current_user.email,
            ip_address=ip_address,
            metadata={
                "report_id": str(input_data.report_id),
                "modality": input_data.recommended_modality,
                "interval_months": input_data.interval_months,
            },
        )
        
        return CreateFollowUpOutput(
            followup=saved_followup,
            due_date=due_date,
        )
