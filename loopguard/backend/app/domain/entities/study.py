"""
Study Entity

Represents a radiology study/exam (e.g., CT Chest, MRI Brain).
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from ..value_objects.modality import Modality
from ..value_objects.body_region import BodyRegion


@dataclass
class Study:
    """
    Radiology study entity.
    
    A study is a single imaging examination performed on a patient.
    Studies contain one or more series of images and result in reports.
    """
    
    id: UUID = field(default_factory=uuid4)
    patient_id: UUID = field(default_factory=uuid4)
    accession_number: str = ""  # Unique identifier from RIS/PACS
    modality: Optional[Modality] = None
    body_region: Optional[BodyRegion] = None
    study_date: Optional[datetime] = None
    study_description: str = ""
    referring_physician: str = ""
    
    # Audit fields
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def __post_init__(self) -> None:
        """Validate entity invariants."""
        if self.accession_number and not self.accession_number.strip():
            raise ValueError("Accession number cannot be empty whitespace")
    
    def __hash__(self) -> int:
        return hash(self.id)
    
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Study):
            return False
        return self.id == other.id
