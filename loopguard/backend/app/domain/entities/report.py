"""
Radiology Report Entity

Represents a finalized radiology report containing findings and impressions.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4


@dataclass
class RadiologyReport:
    """
    Radiology report entity.
    
    A report is the clinical interpretation of a study, created by a radiologist.
    Reports may contain follow-up recommendations that need tracking.
    """
    
    id: UUID = field(default_factory=uuid4)
    study_id: UUID = field(default_factory=uuid4)
    radiologist_id: UUID = field(default_factory=uuid4)
    
    # Report content
    report_text: str = ""
    findings: str = ""
    impression: str = ""
    
    # Status
    is_finalized: bool = False
    finalized_at: Optional[datetime] = None
    
    # Audit fields
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def finalize(self) -> None:
        """
        Mark report as finalized.
        
        Domain Rule: Reports can only be finalized once.
        """
        if self.is_finalized:
            raise ValueError("Report is already finalized")
        self.is_finalized = True
        self.finalized_at = datetime.utcnow()
    
    def __post_init__(self) -> None:
        """Validate entity invariants."""
        pass  # Add validation as needed
    
    def __hash__(self) -> int:
        return hash(self.id)
    
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, RadiologyReport):
            return False
        return self.id == other.id
