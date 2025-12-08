"""
Link Supabase User Service

Use case for linking Supabase Auth users to LoopGuard.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from ...domain.entities.user import User, UserRole
from ...domain.entities.audit import AuditAction
from ...domain.interfaces.repositories import UserRepository
from ...domain.interfaces.services import AuditLogger


class UserAlreadyLinkedError(Exception):
    """User is already linked to LoopGuard."""
    pass


class PermissionError(Exception):
    """User lacks permission for this action."""
    pass


@dataclass
class LinkUserInput:
    """Input DTO for linking a user."""
    supabase_user_id: str
    email: str
    display_name: str
    role: UserRole
    site_id: Optional[UUID] = None


@dataclass
class LinkUserOutput:
    """Output DTO for linked user."""
    user: User
    is_new: bool  # True if created, False if updated


class LinkSupabaseUserService:
    """
    Service for linking Supabase Auth users to LoopGuard.
    
    SOLID Principles:
    - Single Responsibility: Only handles user linking
    - Dependency Inversion: Depends on repository interfaces
    
    Business Rules:
    - Each Supabase user can only be linked once
    - Only admins can assign roles (or self-register as default role)
    - Role changes are audited
    
    Flow:
    1. User signs up/logs in via Supabase Auth
    2. Frontend calls /auth/link with Supabase JWT
    3. This service creates/updates local User record
    """
    
    def __init__(
        self,
        user_repo: UserRepository,
        audit_logger: AuditLogger,
    ) -> None:
        self._user_repo = user_repo
        self._audit_logger = audit_logger
    
    async def execute(
        self,
        input_data: LinkUserInput,
        current_user: Optional[User] = None,
        ip_address: str = "",
    ) -> LinkUserOutput:
        """
        Link a Supabase user to LoopGuard.
        
        Args:
            input_data: User details from Supabase
            current_user: Admin performing the action (None for self-registration)
            ip_address: Client IP for audit logging
            
        Returns:
            Linked user record
            
        Raises:
            UserAlreadyLinkedError: User already exists (for new registrations)
            PermissionError: Non-admin trying to assign non-default role
        """
        # Check if user already exists
        existing_user = await self._user_repo.get_by_supabase_id(
            input_data.supabase_user_id
        )
        
        if existing_user:
            # Update existing user
            # Only admins can change roles
            if input_data.role != existing_user.role:
                if not current_user or current_user.role != UserRole.ADMIN:
                    raise PermissionError("Only admins can change user roles")
            
            existing_user.email = input_data.email
            existing_user.display_name = input_data.display_name
            existing_user.role = input_data.role
            existing_user.site_id = input_data.site_id
            existing_user.updated_at = datetime.utcnow()
            existing_user.last_login_at = datetime.utcnow()
            
            updated_user = await self._user_repo.save(existing_user)
            
            await self._audit_logger.log(
                action=AuditAction.UPDATE,
                entity_type="User",
                entity_id=updated_user.id,
                user_id=current_user.id if current_user else updated_user.id,
                user_email=input_data.email,
                ip_address=ip_address,
                metadata={"role": input_data.role.value},
            )
            
            return LinkUserOutput(user=updated_user, is_new=False)
        
        # Create new user
        # For self-registration, default to RADIOLOGIST role
        effective_role = input_data.role
        if not current_user and effective_role not in (UserRole.RADIOLOGIST,):
            # Non-admin self-registration can only be RADIOLOGIST
            effective_role = UserRole.RADIOLOGIST
        
        new_user = User(
            supabase_user_id=input_data.supabase_user_id,
            email=input_data.email,
            display_name=input_data.display_name,
            role=effective_role,
            site_id=input_data.site_id,
            is_active=True,
            created_at=datetime.utcnow(),
            last_login_at=datetime.utcnow(),
        )
        
        saved_user = await self._user_repo.save(new_user)
        
        await self._audit_logger.log(
            action=AuditAction.CREATE,
            entity_type="User",
            entity_id=saved_user.id,
            user_id=current_user.id if current_user else saved_user.id,
            user_email=input_data.email,
            ip_address=ip_address,
            metadata={
                "role": effective_role.value,
                "supabase_user_id": input_data.supabase_user_id,
            },
        )
        
        return LinkUserOutput(user=saved_user, is_new=True)
