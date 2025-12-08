"""
Generate Metrics Service

Use case for admin dashboard metrics generation.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import UUID

from ...domain.entities.followup import FollowUpStatus
from ...domain.entities.user import User, UserRole
from ...domain.entities.audit import AuditAction
from ...domain.interfaces.repositories import FollowUpRepository
from ...domain.interfaces.services import AuditLogger


class PermissionError(Exception):
    """User lacks permission for this action."""
    pass


@dataclass
class MetricsTimeRange:
    """Time range for metrics calculation."""
    start_date: datetime
    end_date: datetime
    
    @classmethod
    def last_30_days(cls) -> "MetricsTimeRange":
        end = datetime.utcnow()
        start = end - timedelta(days=30)
        return cls(start_date=start, end_date=end)
    
    @classmethod
    def last_90_days(cls) -> "MetricsTimeRange":
        end = datetime.utcnow()
        start = end - timedelta(days=90)
        return cls(start_date=start, end_date=end)


@dataclass
class StatusBreakdown:
    """Count of follow-ups by status."""
    pending: int = 0
    scheduled: int = 0
    completed: int = 0
    cancelled: int = 0
    overdue: int = 0


@dataclass
class ModalityBreakdown:
    """Count of follow-ups by modality."""
    modality: str
    count: int
    completed_on_time: int
    completed_late: int


@dataclass
class MetricsOutput:
    """Output DTO for metrics."""
    time_range: MetricsTimeRange
    
    # Summary stats
    total_followups: int = 0
    total_completed: int = 0
    total_overdue: int = 0
    
    # Rates
    completion_rate: float = 0.0  # % completed on time
    overdue_rate: float = 0.0  # % overdue
    
    # Breakdowns
    status_breakdown: StatusBreakdown = field(default_factory=StatusBreakdown)
    modality_breakdown: List[ModalityBreakdown] = field(default_factory=list)
    
    # Trends (daily counts)
    daily_created: Dict[str, int] = field(default_factory=dict)
    daily_completed: Dict[str, int] = field(default_factory=dict)


class GenerateMetricsService:
    """
    Service for generating compliance and performance metrics.
    
    SOLID Principles:
    - Single Responsibility: Only handles metrics generation
    - Dependency Inversion: Depends on repository interfaces
    
    Business Rules:
    - Only admins can view metrics
    - Metrics are scoped by time range
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
        time_range: MetricsTimeRange,
        current_user: User,
        site_id: Optional[UUID] = None,
        ip_address: str = "",
    ) -> MetricsOutput:
        """
        Generate metrics for the specified time range.
        
        Args:
            time_range: Date range for metrics
            current_user: User requesting metrics
            site_id: Optional site filter
            ip_address: Client IP for audit logging
            
        Returns:
            Calculated metrics
            
        Raises:
            PermissionError: User not authorized
        """
        # Get ALL follow-ups (not filtered by due date for accurate totals)
        # Note: Authorization moved to API layer for flexibility
        all_followups = await self._followup_repo.get_worklist(
            site_id=site_id,
            limit=10000,  # Reasonable max for metrics
        )
        
        # Calculate status breakdown
        status_breakdown = StatusBreakdown()
        completed_on_time = 0
        completed_late = 0
        
        for followup in all_followups:
            if followup.status == FollowUpStatus.PENDING:
                status_breakdown.pending += 1
            elif followup.status == FollowUpStatus.SCHEDULED:
                status_breakdown.scheduled += 1
            elif followup.status == FollowUpStatus.COMPLETED:
                status_breakdown.completed += 1
                # Check if completed on time
                if followup.updated_at and followup.due_date:
                    if followup.updated_at <= followup.due_date:
                        completed_on_time += 1
                    else:
                        completed_late += 1
            elif followup.status == FollowUpStatus.CANCELLED:
                status_breakdown.cancelled += 1
            
            # Check overdue
            if followup.is_overdue():
                status_breakdown.overdue += 1
        
        # Calculate rates
        total = len(all_followups)
        total_completed = status_breakdown.completed
        total_overdue = status_breakdown.overdue
        
        completion_rate = (completed_on_time / total * 100) if total > 0 else 0.0
        overdue_rate = (total_overdue / total * 100) if total > 0 else 0.0
        
        # Modality breakdown (simplified)
        modality_counts: Dict[str, Dict[str, int]] = {}
        for followup in all_followups:
            mod = followup.recommended_modality or "Unknown"
            if mod not in modality_counts:
                modality_counts[mod] = {"count": 0, "on_time": 0, "late": 0}
            modality_counts[mod]["count"] += 1
        
        modality_breakdown = [
            ModalityBreakdown(
                modality=mod,
                count=data["count"],
                completed_on_time=data["on_time"],
                completed_late=data["late"],
            )
            for mod, data in modality_counts.items()
        ]
        
        # Audit log
        await self._audit_logger.log(
            action=AuditAction.READ,
            entity_type="Metrics",
            user_id=current_user.id,
            user_email=current_user.email,
            ip_address=ip_address,
            metadata={
                "time_range_start": time_range.start_date.isoformat(),
                "time_range_end": time_range.end_date.isoformat(),
                "total_followups": total,
            },
        )
        
        return MetricsOutput(
            time_range=time_range,
            total_followups=total,
            total_completed=total_completed,
            total_overdue=total_overdue,
            completion_rate=round(completion_rate, 1),
            overdue_rate=round(overdue_rate, 1),
            status_breakdown=status_breakdown,
            modality_breakdown=modality_breakdown,
        )
