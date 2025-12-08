"""
Patient Entity

Represents a patient in the radiology system.
HIPAA Note: In production, PHI fields would require encryption at rest.
"""

from dataclasses import dataclass, field
from datetime import date
from typing import Optional
from uuid import UUID, uuid4

from ..value_objects.demographics import Sex


@dataclass
class Patient:
    """
    Patient entity with demographic information.
    
    SOLID Principle: Single Responsibility
    - Only manages patient identity and demographics
    - No persistence logic (handled by repository)
    """
    
    id: UUID = field(default_factory=uuid4)
    mrn: str = ""  # Medical Record Number
    first_name: str = ""
    last_name: str = ""
    date_of_birth: Optional[date] = None
    sex: Optional[Sex] = None
    
    # Audit fields
    created_at: Optional[date] = None
    updated_at: Optional[date] = None
    
    @property
    def full_name(self) -> str:
        """Return formatted full name."""
        return f"{self.last_name}, {self.first_name}".strip(", ")
    
    @property
    def age(self) -> Optional[int]:
        """Calculate patient age from date of birth."""
        if not self.date_of_birth:
            return None
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )
    
    def __post_init__(self) -> None:
        """Validate entity invariants."""
        if self.mrn and not self.mrn.strip():
            raise ValueError("MRN cannot be empty whitespace")
    
    def __hash__(self) -> int:
        return hash(self.id)
    
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Patient):
            return False
        return self.id == other.id
