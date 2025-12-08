"""
Auth API Routes

Endpoints for user authentication and registration.
"""

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from ...domain.entities.user import UserRole
from ...infrastructure.db import get_db
from ...infrastructure.config import get_settings, Settings
from ...infrastructure.repositories import SQLAlchemyUserRepository, SQLAlchemyAuditRepository
from ...infrastructure.auth import SupabaseAuthService, AuthenticationError
from ...infrastructure.audit import DatabaseAuditLogger
from ...application.services import LinkSupabaseUserService
from ..schemas.auth import LinkUserRequest, UserResponse
from .dependencies import CurrentUser, get_client_ip

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/link", response_model=UserResponse)
async def link_user(
    request: Request,
    body: LinkUserRequest,
    authorization: Annotated[str, Header()],
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """
    Link a Supabase user to LoopGuard.
    
    Called after signup/login to create or update the local user record.
    The Supabase JWT is used to identify the user.
    """
    # Extract and verify token
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )
    
    token = authorization.split(" ", 1)[1]
    
    # Create services
    user_repo = SQLAlchemyUserRepository(db)
    audit_repo = SQLAlchemyAuditRepository(db)
    audit_logger = DatabaseAuditLogger(audit_repo)
    auth_service = SupabaseAuthService(settings, user_repo)
    
    try:
        payload = await auth_service.verify_token(token)
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    
    # Link user
    link_service = LinkSupabaseUserService(user_repo, audit_logger)
    
    from ...application.services.link_user_service import LinkUserInput
    
    result = await link_service.execute(
        input_data=LinkUserInput(
            supabase_user_id=payload.sub,
            email=payload.email or "",
            display_name=body.display_name,
            role=UserRole(body.role),
            site_id=body.site_id,
        ),
        ip_address=get_client_ip(request),
    )
    
    user = result.user
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role.value,
        site_id=user.site_id,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser):
    """
    Get current authenticated user information.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        role=current_user.role.value,
        site_id=current_user.site_id,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        last_login_at=current_user.last_login_at,
    )
