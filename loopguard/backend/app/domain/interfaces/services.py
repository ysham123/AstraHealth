"""
Service Interfaces

Abstract contracts for external services.
Infrastructure layer provides concrete implementations.

SOLID Principle: Dependency Inversion
- Domain defines what it needs (interfaces)
- Infrastructure provides implementations
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from ..entities.user import User
from ..entities.audit import AuditEvent, AuditAction


@dataclass
class TokenPayload:
    """Decoded JWT token payload."""
    sub: str  # Supabase user ID
    email: Optional[str] = None
    exp: Optional[int] = None
    iat: Optional[int] = None
    role: Optional[str] = None


class AuthService(ABC):
    """
    Authentication service interface.
    
    Handles Supabase JWT verification and user identity resolution.
    """
    
    @abstractmethod
    async def verify_token(self, token: str) -> TokenPayload:
        """
        Verify and decode a Supabase JWT.
        
        Args:
            token: JWT token from Authorization header
            
        Returns:
            Decoded token payload
            
        Raises:
            AuthenticationError: If token is invalid or expired
        """
        pass
    
    @abstractmethod
    async def get_current_user(self, token: str) -> User:
        """
        Get the current user from a token.
        
        Verifies token and loads user from database.
        
        Args:
            token: JWT token from Authorization header
            
        Returns:
            User entity
            
        Raises:
            AuthenticationError: If token is invalid
            UserNotFoundError: If user not linked to LoopGuard
        """
        pass


class AuditLogger(ABC):
    """
    Audit logging service interface.
    
    HIPAA Requirement: Log all access to PHI.
    """
    
    @abstractmethod
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
        """
        Log an audit event.
        
        Args:
            action: Type of action performed
            entity_type: Type of entity accessed
            entity_id: ID of entity accessed
            user_id: ID of user performing action
            user_email: Email of user
            ip_address: Client IP address
            user_agent: Client user agent
            metadata: Additional context
            success: Whether action succeeded
            error_message: Error message if failed
            
        Returns:
            Created audit event
        """
        pass
    
    @abstractmethod
    async def log_login(
        self,
        user_id: UUID,
        user_email: str,
        ip_address: str,
        success: bool = True,
        error_message: str = "",
    ) -> AuditEvent:
        """Log a login attempt."""
        pass
    
    @abstractmethod
    async def log_data_access(
        self,
        user_id: UUID,
        entity_type: str,
        entity_id: UUID,
        ip_address: str = "",
    ) -> AuditEvent:
        """Log PHI data access."""
        pass
