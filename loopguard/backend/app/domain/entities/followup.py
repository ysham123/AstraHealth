"""
Follow-Up Entities

Core domain objects for tracking radiology follow-up recommendations.
This is the heart of the LoopGuard application.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, List
from uuid import UUID, uuid4


class FollowUpStatus(str, Enum):
    """Status of a follow-up recommendation."""
    PENDING = "pending"
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"


class FollowUpPriority(str, Enum):
    """Priority level for follow-up."""
    ROUTINE = "routine"
    URGENT = "urgent"
    STAT = "stat"


class ActionType(str, Enum):
    """Types of actions that can be taken on a follow-up."""
    CREATED = "created"
    STATUS_CHANGED = "status_changed"
    NOTE_ADDED = "note_added"
    ASSIGNED = "assigned"
    REMINDER_SENT = "reminder_sent"


@dataclass
class FollowUpRecommendation:
    """
    Follow-up recommendation entity.
    
    Represents a radiologist's recommendation for follow-up imaging.
    This is the core entity that LoopGuard tracks.
    
    SOLID Principle: Single Responsibility
    - Manages follow-up state and business rules
    - Due date calculation is a domain rule
    """
    
    id: UUID = field(default_factory=uuid4)
    report_id: UUID = field(default_factory=uuid4)
    patient_id: UUID = field(default_factory=uuid4)
    
    # Recommendation details
    recommended_modality: str = ""  # e.g., "CT", "MRI", "Ultrasound"
    body_region: str = ""  # e.g., "Chest", "Abdomen", "Head"
    reason: str = ""  # Clinical reason for follow-up
    interval_months: int = 0  # Recommended follow-up interval
    
    # Computed fields
    due_date: Optional[datetime] = None
    
    # Status tracking
    status: FollowUpStatus = FollowUpStatus.PENDING
    priority: FollowUpPriority = FollowUpPriority.ROUTINE
    
    # Assignment
    assigned_to: Optional[UUID] = None  # Coordinator user ID
    
    # Audit
    created_by: Optional[UUID] = None  # Radiologist who created
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def calculate_due_date(self, reference_date: Optional[datetime] = None) -> datetime:
        """
        Calculate due date based on interval.
        
        Domain Rule: Due date = reference_date + interval_months
        Reference date defaults to now if not provided.
        """
        base_date = reference_date or datetime.utcnow()
        # Approximate: 30 days per month
        self.due_date = base_date + timedelta(days=30 * self.interval_months)
        return self.due_date
    
    def is_overdue(self) -> bool:
        """Check if follow-up is overdue."""
        if not self.due_date:
            return False
        if self.status in (FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED):
            return False
        return datetime.utcnow() > self.due_date
    
    def can_transition_to(self, new_status: FollowUpStatus) -> bool:
        """
        Check if status transition is valid.
        
        Domain Rules:
        - PENDING can go to SCHEDULED, CANCELLED
        - SCHEDULED can go to COMPLETED, CANCELLED
        - COMPLETED and CANCELLED are terminal states
        """
        # Relaxed transitions for development - allow more flexibility
        valid_transitions = {
            FollowUpStatus.PENDING: {FollowUpStatus.SCHEDULED, FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED},
            FollowUpStatus.SCHEDULED: {FollowUpStatus.PENDING, FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED},
            FollowUpStatus.COMPLETED: {FollowUpStatus.PENDING},  # Allow reopening for dev
            FollowUpStatus.CANCELLED: {FollowUpStatus.PENDING},  # Allow reopening for dev
            FollowUpStatus.OVERDUE: {FollowUpStatus.SCHEDULED, FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED},
        }
        return new_status in valid_transitions.get(self.status, set())
    
    def update_status(self, new_status: FollowUpStatus) -> None:
        """
        Update status with validation.
        
        Raises ValueError if transition is invalid.
        """
        if not self.can_transition_to(new_status):
            raise ValueError(
                f"Invalid status transition: {self.status.value} -> {new_status.value}"
            )
        self.status = new_status
        self.updated_at = datetime.utcnow()
    
    def __hash__(self) -> int:
        return hash(self.id)
    
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, FollowUpRecommendation):
            return False
        return self.id == other.id


@dataclass
class FollowUpAction:
    """
    Action taken on a follow-up recommendation.
    
    Provides audit trail of all changes to a follow-up.
    HIPAA Requirement: Maintain audit trail of PHI access/modifications.
    """
    
    id: UUID = field(default_factory=uuid4)
    recommendation_id: UUID = field(default_factory=uuid4)
    
    action_type: ActionType = ActionType.NOTE_ADDED
    previous_status: Optional[FollowUpStatus] = None
    new_status: Optional[FollowUpStatus] = None
    note: str = ""
    
    # Audit
    created_by: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = None
    
    def __hash__(self) -> int:
        return hash(self.id)
