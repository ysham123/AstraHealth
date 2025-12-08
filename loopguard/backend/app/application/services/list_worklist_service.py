"""
List Worklist Service

Use case for coordinators viewing and filtering the follow-up worklist.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from ...domain.entities.followup import FollowUpRecommendation, FollowUpStatus
from ...domain.entities.user import User, UserRole
from ...domain.entities.audit import AuditAction
from ...domain.interfaces.repositories import FollowUpRepository
from ...domain.interfaces.services import AuditLogger


@dataclass
class WorklistFilters:
    """Filters for worklist query."""
    status: Optional[List[FollowUpStatus]] = None
    site_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    due_before: Optional[datetime] = None
    due_after: Optional[datetime] = None
    modality: Optional[str] = None
    limit: int = 50
    offset: int = 0


@dataclass
class WorklistItem:
    """Enriched worklist item for display."""
    followup: FollowUpRecommendation
    patient_name: str = ""
    patient_mrn: str = ""
    days_until_due: Optional[int] = None
    is_overdue: bool = False


@dataclass
class WorklistOutput:
    """Output DTO for worklist query."""
    items: List[WorklistItem] = field(default_factory=list)
    total_count: int = 0
    has_more: bool = False


class ListWorklistService:
    """
    Service for listing and filtering the follow-up worklist.
    
    SOLID Principles:
    - Single Responsibility: Only handles worklist retrieval
    - Open/Closed: New filters can be added without modifying core logic
    
    Business Rules:
    - Coordinators see follow-ups for their site
    - Admins see all follow-ups
    - Results are paginated
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
        filters: WorklistFilters,
        current_user: User,
        ip_address: str = "",
    ) -> WorklistOutput:
        """
        Get filtered worklist of follow-ups.
        
        Args:
            filters: Query filters
            current_user: User requesting the worklist
            ip_address: Client IP for audit logging
            
        Returns:
            Paginated worklist with total count
        """
        # Apply site restriction for non-admins
        effective_site_id = filters.site_id
        if current_user.role != UserRole.ADMIN:
            effective_site_id = current_user.site_id
        
        # Query repository
        followups = await self._followup_repo.get_worklist(
            status=filters.status,
            site_id=effective_site_id,
            assigned_to=filters.assigned_to,
            due_before=filters.due_before,
            due_after=filters.due_after,
            modality=filters.modality,
            limit=filters.limit + 1,  # Fetch one extra to check has_more
            offset=filters.offset,
        )
        
        # Get total count
        total_count = await self._followup_repo.count_worklist(
            status=filters.status,
            site_id=effective_site_id,
        )
        
        # Check if there are more results
        has_more = len(followups) > filters.limit
        if has_more:
            followups = followups[:filters.limit]
        
        # Enrich with computed fields
        now = datetime.utcnow()
        items = []
        for followup in followups:
            days_until_due = None
            is_overdue = False
            
            if followup.due_date:
                delta = (followup.due_date - now).days
                days_until_due = delta
                is_overdue = delta < 0 and followup.status not in (
                    FollowUpStatus.COMPLETED,
                    FollowUpStatus.CANCELLED,
                )
            
            items.append(WorklistItem(
                followup=followup,
                days_until_due=days_until_due,
                is_overdue=is_overdue,
            ))
        
        # Audit log (bulk read)
        await self._audit_logger.log(
            action=AuditAction.READ,
            entity_type="FollowUpRecommendation",
            user_id=current_user.id,
            user_email=current_user.email,
            ip_address=ip_address,
            metadata={
                "query": "worklist",
                "count": len(items),
                "filters": {
                    "status": [s.value for s in filters.status] if filters.status else None,
                    "modality": filters.modality,
                },
            },
        )
        
        return WorklistOutput(
            items=items,
            total_count=total_count,
            has_more=has_more,
        )
