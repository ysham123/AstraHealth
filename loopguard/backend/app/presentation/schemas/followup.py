"""Follow-up related Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class FollowUpCreate(BaseModel):
    """Request to create a follow-up recommendation."""
    report_id: Optional[UUID] = None
    study_id: Optional[UUID] = None  # Alternative to report_id
    recommended_modality: str = Field(..., min_length=1, max_length=20)
    body_region: str = Field(..., min_length=1, max_length=50)
    reason: str = Field(default="", max_length=500)
    interval_months: int = Field(..., ge=1, le=60)
    priority: str = Field(default="routine", pattern="^(routine|urgent|stat)$")


class FollowUpResponse(BaseModel):
    """Follow-up recommendation response."""
    id: UUID
    report_id: UUID
    patient_id: UUID
    recommended_modality: str
    body_region: str
    reason: str
    interval_months: int
    due_date: Optional[datetime] = None
    status: str
    priority: str
    assigned_to: Optional[UUID] = None
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Computed fields for display
    days_until_due: Optional[int] = None
    is_overdue: bool = False
    
    class Config:
        from_attributes = True


class FollowUpStatusUpdate(BaseModel):
    """Request to update follow-up status."""
    status: str = Field(..., pattern="^(pending|scheduled|completed|cancelled)$")
    note: Optional[str] = Field(default=None, max_length=500)


class WorklistFiltersRequest(BaseModel):
    """Filters for worklist query."""
    status: Optional[List[str]] = None
    assigned_to: Optional[UUID] = None
    due_before: Optional[datetime] = None
    due_after: Optional[datetime] = None
    modality: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class WorklistItemResponse(BaseModel):
    """Single worklist item response."""
    followup: FollowUpResponse
    patient_name: str = ""
    patient_mrn: str = ""
    days_until_due: Optional[int] = None
    is_overdue: bool = False


class WorklistResponse(BaseModel):
    """Worklist query response."""
    items: List[WorklistItemResponse]
    total_count: int
    has_more: bool
