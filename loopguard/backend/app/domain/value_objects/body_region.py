"""
Body Region Value Object

Represents anatomical regions for imaging studies.
"""

from enum import Enum


class BodyRegion(str, Enum):
    """
    Standard body regions for radiology studies.
    
    Organized by major anatomical areas.
    """
    # Head and Neck
    HEAD = "head"
    BRAIN = "brain"
    NECK = "neck"
    FACE = "face"
    SINUS = "sinus"
    
    # Chest
    CHEST = "chest"
    HEART = "heart"
    LUNG = "lung"
    
    # Abdomen
    ABDOMEN = "abdomen"
    LIVER = "liver"
    KIDNEY = "kidney"
    PANCREAS = "pancreas"
    
    # Pelvis
    PELVIS = "pelvis"
    
    # Spine
    SPINE = "spine"
    CERVICAL_SPINE = "c-spine"
    THORACIC_SPINE = "t-spine"
    LUMBAR_SPINE = "l-spine"
    
    # Extremities
    UPPER_EXTREMITY = "upper_extremity"
    LOWER_EXTREMITY = "lower_extremity"
    SHOULDER = "shoulder"
    ELBOW = "elbow"
    WRIST = "wrist"
    HAND = "hand"
    HIP = "hip"
    KNEE = "knee"
    ANKLE = "ankle"
    FOOT = "foot"
    
    # Other
    WHOLE_BODY = "whole_body"
    BREAST = "breast"
    
    @classmethod
    def from_string(cls, value: str) -> "BodyRegion":
        """Parse body region from string, case-insensitive."""
        normalized = value.lower().strip().replace(" ", "_").replace("-", "_")
        
        # Handle common aliases
        aliases = {
            "cspine": cls.CERVICAL_SPINE,
            "tspine": cls.THORACIC_SPINE,
            "lspine": cls.LUMBAR_SPINE,
            "abd": cls.ABDOMEN,
            "cxr": cls.CHEST,
        }
        
        if normalized in aliases:
            return aliases[normalized]
        
        try:
            return cls(normalized)
        except ValueError:
            raise ValueError(f"Unknown body region: {value}")
    
    @property
    def display_name(self) -> str:
        """Human-readable body region name."""
        return self.value.replace("_", " ").title()
