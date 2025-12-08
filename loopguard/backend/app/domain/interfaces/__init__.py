"""
Domain Interfaces

Abstract contracts that define how the domain interacts with external concerns.
Infrastructure layer implements these interfaces.

SOLID Principle: Dependency Inversion
- High-level modules (domain, application) depend on abstractions
- Low-level modules (infrastructure) implement abstractions
"""

from .repositories import (
    PatientRepository,
    StudyRepository,
    ReportRepository,
    FollowUpRepository,
    UserRepository,
    AuditRepository,
)
from .services import (
    AuthService,
    AuditLogger,
)

__all__ = [
    # Repositories
    "PatientRepository",
    "StudyRepository",
    "ReportRepository",
    "FollowUpRepository",
    "UserRepository",
    "AuditRepository",
    # Services
    "AuthService",
    "AuditLogger",
]
