"""Metrics-related Pydantic schemas."""

from datetime import datetime
from typing import Dict, List
from pydantic import BaseModel


class StatusBreakdownResponse(BaseModel):
    """Status breakdown response."""
    pending: int = 0
    scheduled: int = 0
    completed: int = 0
    cancelled: int = 0
    overdue: int = 0


class ModalityBreakdownResponse(BaseModel):
    """Modality breakdown response."""
    modality: str
    count: int
    completed_on_time: int
    completed_late: int


class MetricsResponse(BaseModel):
    """Metrics dashboard response."""
    time_range_start: datetime
    time_range_end: datetime
    
    total_followups: int
    total_completed: int
    total_overdue: int
    
    completion_rate: float  # Percentage
    overdue_rate: float  # Percentage
    
    status_breakdown: StatusBreakdownResponse
    modality_breakdown: List[ModalityBreakdownResponse]
