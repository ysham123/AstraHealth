"""
Demographics Value Objects

Immutable objects for patient demographic information.
"""

from enum import Enum


class Sex(str, Enum):
    """
    Biological sex for medical purposes.
    
    Used for clinical decision-making and imaging protocols.
    """
    MALE = "M"
    FEMALE = "F"
    OTHER = "O"
    UNKNOWN = "U"
    
    @classmethod
    def from_string(cls, value: str) -> "Sex":
        """Parse sex from string, case-insensitive."""
        normalized = value.upper().strip()
        
        aliases = {
            "MALE": cls.MALE,
            "FEMALE": cls.FEMALE,
            "MAN": cls.MALE,
            "WOMAN": cls.FEMALE,
            "OTHER": cls.OTHER,
            "UNKNOWN": cls.UNKNOWN,
        }
        
        if normalized in aliases:
            return aliases[normalized]
        
        if normalized in ("M", "F", "O", "U"):
            return cls(normalized)
        
        return cls.UNKNOWN
    
    @property
    def display_name(self) -> str:
        """Human-readable sex name."""
        names = {
            self.MALE: "Male",
            self.FEMALE: "Female",
            self.OTHER: "Other",
            self.UNKNOWN: "Unknown",
        }
        return names.get(self, "Unknown")
