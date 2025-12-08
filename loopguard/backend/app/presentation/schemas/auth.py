"""Auth-related Pydantic schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class TokenPayloadSchema(BaseModel):
    """Decoded JWT token payload."""
    sub: str
    email: Optional[str] = None
    exp: Optional[int] = None
    iat: Optional[int] = None


class LinkUserRequest(BaseModel):
    """Request to link a Supabase user to LoopGuard."""
    display_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="radiologist", pattern="^(radiologist|coordinator|admin)$")
    site_id: Optional[UUID] = None


class UserResponse(BaseModel):
    """User response schema."""
    id: UUID
    email: str
    display_name: str
    role: str
    site_id: Optional[UUID] = None
    is_active: bool
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
