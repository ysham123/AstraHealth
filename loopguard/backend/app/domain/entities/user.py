"""
User Entity

Represents a LoopGuard user with role-based access control.
Links to Supabase Auth for authentication.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4


class UserRole(str, Enum):
    """
    User roles for authorization.
    
    HIPAA Alignment: Role-based access control (RBAC)
    - RADIOLOGIST: Can create/modify follow-ups on their reports
    - COORDINATOR: Can manage worklist and update statuses
    - ADMIN: Full access including audit logs and metrics
    """
    RADIOLOGIST = "radiologist"
    COORDINATOR = "coordinator"
    ADMIN = "admin"


@dataclass
class User:
    """
    LoopGuard user entity.
    
    Links Supabase Auth identity to application-specific metadata.
    Authentication is handled by Supabase; this entity handles authorization.
    
    SOLID Principle: Single Responsibility
    - Only manages user identity and authorization metadata
    - Authentication delegated to Supabase Auth
    """
    
    id: UUID = field(default_factory=uuid4)
    supabase_user_id: str = ""  # UUID from Supabase Auth (sub claim)
    
    # Profile
    email: str = ""
    display_name: str = ""
    
    # Authorization
    role: UserRole = UserRole.RADIOLOGIST
    site_id: Optional[UUID] = None  # For multi-site deployments
    
    # Status
    is_active: bool = True
    
    # Audit
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    
    def has_permission(self, required_role: UserRole) -> bool:
        """
        Check if user has required role or higher.
        
        Role hierarchy: ADMIN > COORDINATOR > RADIOLOGIST
        """
        role_hierarchy = {
            UserRole.RADIOLOGIST: 1,
            UserRole.COORDINATOR: 2,
            UserRole.ADMIN: 3,
        }
        return role_hierarchy.get(self.role, 0) >= role_hierarchy.get(required_role, 0)
    
    def can_access_all_sites(self) -> bool:
        """Check if user can access data from all sites."""
        return self.role == UserRole.ADMIN
    
    def __post_init__(self) -> None:
        """Validate entity invariants."""
        if not self.supabase_user_id:
            raise ValueError("supabase_user_id is required")
    
    def __hash__(self) -> int:
        return hash(self.id)
    
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, User):
            return False
        return self.id == other.id
