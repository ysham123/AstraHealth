"""Value Objects - Immutable objects defined by their attributes."""

from .modality import Modality
from .body_region import BodyRegion
from .demographics import Sex
from .recommendation_interval import RecommendationInterval

__all__ = [
    "Modality",
    "BodyRegion",
    "Sex",
    "RecommendationInterval",
]
