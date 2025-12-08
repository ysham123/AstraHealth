"""
Modality Value Object

Represents imaging modality types in radiology.
"""

from enum import Enum


class Modality(str, Enum):
    """
    Standard radiology imaging modalities.
    
    Based on DICOM modality codes with common additions.
    """
    # Common modalities
    CT = "CT"  # Computed Tomography
    MR = "MR"  # Magnetic Resonance
    XR = "XR"  # X-Ray / Radiograph
    US = "US"  # Ultrasound
    NM = "NM"  # Nuclear Medicine
    PT = "PT"  # PET Scan
    MG = "MG"  # Mammography
    FL = "FL"  # Fluoroscopy
    
    # Less common
    DX = "DX"  # Digital Radiography
    CR = "CR"  # Computed Radiography
    
    @classmethod
    def from_string(cls, value: str) -> "Modality":
        """Parse modality from string, case-insensitive."""
        normalized = value.upper().strip()
        
        # Handle common aliases
        aliases = {
            "XRAY": cls.XR,
            "X-RAY": cls.XR,
            "RADIOGRAPH": cls.XR,
            "MRI": cls.MR,
            "ULTRASOUND": cls.US,
            "ECHO": cls.US,
            "CAT": cls.CT,
            "CAT SCAN": cls.CT,
            "PET": cls.PT,
            "PET SCAN": cls.PT,
            "MAMMO": cls.MG,
        }
        
        if normalized in aliases:
            return aliases[normalized]
        
        try:
            return cls(normalized)
        except ValueError:
            raise ValueError(f"Unknown modality: {value}")
    
    @property
    def display_name(self) -> str:
        """Human-readable modality name."""
        names = {
            self.CT: "CT Scan",
            self.MR: "MRI",
            self.XR: "X-Ray",
            self.US: "Ultrasound",
            self.NM: "Nuclear Medicine",
            self.PT: "PET Scan",
            self.MG: "Mammography",
            self.FL: "Fluoroscopy",
            self.DX: "Digital X-Ray",
            self.CR: "Computed Radiography",
        }
        return names.get(self, self.value)
