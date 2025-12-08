"""
Recommendation Interval Value Object

Represents follow-up time intervals with validation.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class IntervalUnit(str, Enum):
    """Time units for follow-up intervals."""
    DAYS = "days"
    WEEKS = "weeks"
    MONTHS = "months"
    YEARS = "years"


@dataclass(frozen=True)
class RecommendationInterval:
    """
    Immutable value object representing a follow-up interval.
    
    Examples:
    - "3 months" -> RecommendationInterval(3, IntervalUnit.MONTHS)
    - "1 year" -> RecommendationInterval(1, IntervalUnit.YEARS)
    - "6-12 months" -> RecommendationInterval(6, IntervalUnit.MONTHS, max_value=12)
    
    SOLID Principle: Single Responsibility
    - Only handles interval representation and conversion
    """
    
    value: int
    unit: IntervalUnit = IntervalUnit.MONTHS
    max_value: Optional[int] = None  # For ranges like "6-12 months"
    
    def __post_init__(self) -> None:
        """Validate interval values."""
        if self.value <= 0:
            raise ValueError("Interval value must be positive")
        if self.max_value is not None and self.max_value <= self.value:
            raise ValueError("max_value must be greater than value")
    
    def to_days(self) -> int:
        """Convert interval to days (approximate)."""
        multipliers = {
            IntervalUnit.DAYS: 1,
            IntervalUnit.WEEKS: 7,
            IntervalUnit.MONTHS: 30,
            IntervalUnit.YEARS: 365,
        }
        return self.value * multipliers[self.unit]
    
    def to_months(self) -> int:
        """Convert interval to months (approximate)."""
        conversions = {
            IntervalUnit.DAYS: self.value // 30,
            IntervalUnit.WEEKS: self.value // 4,
            IntervalUnit.MONTHS: self.value,
            IntervalUnit.YEARS: self.value * 12,
        }
        return max(1, conversions[self.unit])
    
    @classmethod
    def from_months(cls, months: int) -> "RecommendationInterval":
        """Create interval from number of months."""
        if months >= 12 and months % 12 == 0:
            return cls(months // 12, IntervalUnit.YEARS)
        return cls(months, IntervalUnit.MONTHS)
    
    def __str__(self) -> str:
        """Human-readable interval string."""
        if self.max_value:
            return f"{self.value}-{self.max_value} {self.unit.value}"
        unit_str = self.unit.value
        if self.value == 1:
            unit_str = unit_str.rstrip("s")  # Remove plural
        return f"{self.value} {unit_str}"
    
    @classmethod
    def parse(cls, text: str) -> "RecommendationInterval":
        """
        Parse interval from text.
        
        Examples:
        - "3 months" -> RecommendationInterval(3, MONTHS)
        - "1 year" -> RecommendationInterval(1, YEARS)
        - "6-12 months" -> RecommendationInterval(6, MONTHS, max_value=12)
        """
        import re
        
        text = text.lower().strip()
        
        # Handle ranges like "6-12 months"
        range_match = re.match(r"(\d+)\s*-\s*(\d+)\s*(\w+)", text)
        if range_match:
            min_val = int(range_match.group(1))
            max_val = int(range_match.group(2))
            unit_str = range_match.group(3)
            unit = cls._parse_unit(unit_str)
            return cls(min_val, unit, max_value=max_val)
        
        # Handle simple intervals like "3 months"
        simple_match = re.match(r"(\d+)\s*(\w+)", text)
        if simple_match:
            value = int(simple_match.group(1))
            unit_str = simple_match.group(2)
            unit = cls._parse_unit(unit_str)
            return cls(value, unit)
        
        raise ValueError(f"Cannot parse interval: {text}")
    
    @staticmethod
    def _parse_unit(unit_str: str) -> IntervalUnit:
        """Parse unit from string."""
        unit_str = unit_str.lower().rstrip("s")
        mapping = {
            "day": IntervalUnit.DAYS,
            "week": IntervalUnit.WEEKS,
            "month": IntervalUnit.MONTHS,
            "year": IntervalUnit.YEARS,
            "mo": IntervalUnit.MONTHS,
            "yr": IntervalUnit.YEARS,
            "wk": IntervalUnit.WEEKS,
        }
        if unit_str in mapping:
            return mapping[unit_str]
        raise ValueError(f"Unknown time unit: {unit_str}")
