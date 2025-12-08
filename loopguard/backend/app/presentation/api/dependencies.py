"""
FastAPI Dependencies

Dependency injection for routers.
"""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.entities.user import User, UserRole
from ...domain.interfaces.services import AuditLogger
from ...infrastructure.db import get_db
from ...infrastructure.config import get_settings, Settings
from ...infrastructure.repositories import (
    SQLAlchemyFollowUpRepository,
    SQLAlchemyUserRepository,
    SQLAlchemyAuditRepository,
)
from ...infrastructure.auth import SupabaseAuthService, AuthenticationError, UserNotLinkedError
from ...infrastructure.audit import DatabaseAuditLogger


async def get_settings_dep() -> Settings:
    """Get application settings."""
    return get_settings()


async def get_audit_logger(
    db: AsyncSession = Depends(get_db),
) -> AuditLogger:
    """Get audit logger instance."""
    audit_repo = SQLAlchemyAuditRepository(db)
    return DatabaseAuditLogger(audit_repo)


async def get_current_user(
    request: Request,
    authorization: Annotated[str, Header()],
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> User:
    """
    Get current authenticated user from Supabase JWT.
    
    Validates the Authorization header and returns the LoopGuard user.
    In development mode, auto-creates users on first login.
    """
    # Extract token from "Bearer <token>" format
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.split(" ", 1)[1]
    
    # Create auth service
    user_repo = SQLAlchemyUserRepository(db)
    auth_service = SupabaseAuthService(settings, user_repo)
    
    try:
        user = await auth_service.get_current_user(token)
        return user
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except UserNotLinkedError:
        # In development, auto-create user on first login
        if settings.environment == "development":
            from uuid import UUID
            payload = await auth_service.verify_token(token)
            new_user = User(
                id=UUID(payload.sub),
                supabase_user_id=payload.sub,
                email=payload.email or "unknown@example.com",
                display_name=payload.email.split("@")[0] if payload.email else "User",
                role=UserRole.RADIOLOGIST,  # Default role for new users in dev
                is_active=True,
            )
            saved_user = await user_repo.save(new_user)
            await db.commit()
            return saved_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not linked to LoopGuard. Please complete registration.",
        )


def require_role(*allowed_roles: UserRole):
    """
    Dependency factory for role-based access control.
    
    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(
            user: User = Depends(require_role(UserRole.ADMIN))
        ):
            ...
    """
    async def check_role(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of: {[r.value for r in allowed_roles]}",
            )
        return current_user
    
    return check_role


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    # Check X-Forwarded-For for proxied requests
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    # Fall back to client host
    client = request.client
    return client.host if client else ""


# Type aliases for cleaner route signatures
CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
AuditLog = Annotated[AuditLogger, Depends(get_audit_logger)]
AppSettings = Annotated[Settings, Depends(get_settings_dep)]
