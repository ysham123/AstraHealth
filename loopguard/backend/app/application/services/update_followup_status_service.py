"""
Update Follow-Up Status Service

Use case for coordinators updating follow-up statuses.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from ...domain.entities.followup import (
    FollowUpRecommendation,
    FollowUpAction,
    FollowUpStatus,
    ActionType,
)
from ...domain.entities.user import User, UserRole
from ...domain.entities.audit import AuditAction
from ...domain.interfaces.repositories import FollowUpRepository
from ...domain.interfaces.services import AuditLogger


class PermissionError(Exception):
    """User lacks permission for this action."""
    pass


class FollowUpNotFoundError(Exception):
    """Follow-up not found."""
    pass


class InvalidStatusTransitionError(Exception):
    """Invalid status transition."""
    pass


@dataclass
class UpdateStatusInput:
    """Input DTO for updating status."""
    followup_id: UUID
    new_status: FollowUpStatus
    note: Optional[str] = None


@dataclass
class UpdateStatusOutput:
    """Output DTO for status update."""
    followup: FollowUpRecommendation
    previous_status: FollowUpStatus
    action: FollowUpAction


class UpdateFollowUpStatusService:
    """
    Service for updating follow-up recommendation status.
    
    SOLID Principles:
    - Single Responsibility: Only handles status updates
    - Dependency Inversion: Depends on interfaces
    
    Business Rules:
    - Coordinators and admins can update status
    - Status transitions must be valid (defined in domain entity)
    - All changes are audited
    """
    
    def __init__(
        self,
        followup_repo: FollowUpRepository,
        audit_logger: AuditLogger,
    ) -> None:
        self._followup_repo = followup_repo
        self._audit_logger = audit_logger
    
    async def execute(
        self,
        input_data: UpdateStatusInput,
        current_user: User,
        ip_address: str = "",
    ) -> UpdateStatusOutput:
        """
        Update follow-up status.
        
        Args:
            input_data: Status update details
            current_user: User performing the update
            ip_address: Client IP for audit logging
            
        Returns:
            Updated follow-up with action record
            
        Raises:
            PermissionError: User not authorized
            FollowUpNotFoundError: Follow-up doesn't exist
            InvalidStatusTransitionError: Invalid status transition
        """
        # Authorization check
        if current_user.role not in (UserRole.COORDINATOR, UserRole.ADMIN):
            await self._audit_logger.log(
                action=AuditAction.UPDATE,
                entity_type="FollowUpRecommendation",
                entity_id=input_data.followup_id,
                user_id=current_user.id,
                user_email=current_user.email,
                ip_address=ip_address,
                success=False,
                error_message="Permission denied",
            )
            raise PermissionError("Only coordinators can update follow-up status")
        
        # Load follow-up
        followup = await self._followup_repo.get_by_id(input_data.followup_id)
        if not followup:
            raise FollowUpNotFoundError(f"Follow-up {input_data.followup_id} not found")
        
        # Validate transition
        if not followup.can_transition_to(input_data.new_status):
            raise InvalidStatusTransitionError(
                f"Cannot transition from {followup.status.value} to {input_data.new_status.value}"
            )
        
        # Capture previous state
        previous_status = followup.status
        
        # Update status (domain method handles validation)
        followup.update_status(input_data.new_status)
        
        # Persist
        updated_followup = await self._followup_repo.save(followup)
        
        # Create action record
        action = FollowUpAction(
            recommendation_id=followup.id,
            action_type=ActionType.STATUS_CHANGED,
            previous_status=previous_status,
            new_status=input_data.new_status,
            note=input_data.note or "",
            created_by=current_user.id,
            ip_address=ip_address,
        )
        saved_action = await self._followup_repo.add_action(action)
        
        # Audit log
        await self._audit_logger.log(
            action=AuditAction.UPDATE,
            entity_type="FollowUpRecommendation",
            entity_id=followup.id,
            user_id=current_user.id,
            user_email=current_user.email,
            ip_address=ip_address,
            metadata={
                "previous_status": previous_status.value,
                "new_status": input_data.new_status.value,
                "note": input_data.note,
            },
        )
        
        return UpdateStatusOutput(
            followup=updated_followup,
            previous_status=previous_status,
            action=saved_action,
        )
