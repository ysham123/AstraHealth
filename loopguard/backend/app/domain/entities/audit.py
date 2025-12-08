"""
Audit Event Entity

Immutable record of system actions for HIPAA compliance.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from uuid import UUID, uuid4


class AuditAction(str, Enum):
    """Types of auditable actions."""
    # Authentication
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    
    # CRUD operations
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    
    # Business actions
    EXPORT = "export"
    PRINT = "print"
    SHARE = "share"


@dataclass(frozen=True)
class AuditEvent:
    """
    Audit event entity.
    
    Immutable record of an action taken in the system.
    
    HIPAA Requirement: Audit Controls (§164.312(b))
    - Record and examine activity in systems containing PHI
    - Implement hardware, software, and procedural mechanisms
    
    SOLID Principle: Immutability
    - Audit events are frozen (immutable) after creation
    - Cannot be modified or deleted
    """
    
    id: UUID = field(default_factory=uuid4)
    
    # Who
    user_id: Optional[UUID] = None
    user_email: str = ""
    
    # What
    action: AuditAction = AuditAction.READ
    entity_type: str = ""  # e.g., "FollowUpRecommendation", "Patient"
    entity_id: Optional[UUID] = None
    
    # When
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    # Where
    ip_address: str = ""
    user_agent: str = ""
    
    # Details (JSON serializable)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Outcome
    success: bool = True
    error_message: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id) if self.user_id else None,
            "user_email": self.user_email,
            "action": self.action.value,
            "entity_type": self.entity_type,
            "entity_id": str(self.entity_id) if self.entity_id else None,
            "timestamp": self.timestamp.isoformat(),
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "metadata": self.metadata,
            "success": self.success,
            "error_message": self.error_message,
        }
