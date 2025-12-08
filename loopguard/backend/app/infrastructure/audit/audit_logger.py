"""
Audit Logger Implementation

Database-backed audit logging for HIPAA compliance.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from ...domain.entities.audit import AuditEvent, AuditAction
from ...domain.interfaces.services import AuditLogger
from ...domain.interfaces.repositories import AuditRepository


class DatabaseAuditLogger(AuditLogger):
    """
    Database-backed audit logger.
    
    HIPAA Requirements:
    - Log all PHI access
    - Append-only (no updates/deletes)
    - Retain for minimum 6 years
    
    SOLID Principle: Single Responsibility
    - Only handles audit event creation
    - Persistence delegated to repository
    """
    
    def __init__(self, audit_repo: AuditRepository) -> None:
        self._audit_repo = audit_repo
    
    async def log(
        self,
        action: AuditAction,
        entity_type: str,
        entity_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        user_email: str = "",
        ip_address: str = "",
        user_agent: str = "",
        metadata: Optional[dict] = None,
        success: bool = True,
        error_message: str = "",
    ) -> AuditEvent:
        """Log an audit event."""
        event = AuditEvent(
            user_id=user_id,
            user_email=user_email,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            timestamp=datetime.utcnow(),
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata or {},
            success=success,
            error_message=error_message,
        )
        
        return await self._audit_repo.save(event)
    
    async def log_login(
        self,
        user_id: UUID,
        user_email: str,
        ip_address: str,
        success: bool = True,
        error_message: str = "",
    ) -> AuditEvent:
        """Log a login attempt."""
        action = AuditAction.LOGIN if success else AuditAction.LOGIN_FAILED
        
        return await self.log(
            action=action,
            entity_type="User",
            entity_id=user_id,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            success=success,
            error_message=error_message,
        )
    
    async def log_data_access(
        self,
        user_id: UUID,
        entity_type: str,
        entity_id: UUID,
        ip_address: str = "",
    ) -> AuditEvent:
        """Log PHI data access."""
        return await self.log(
            action=AuditAction.READ,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            ip_address=ip_address,
        )
