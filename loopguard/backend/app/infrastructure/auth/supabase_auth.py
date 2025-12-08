"""
Supabase Auth Service Implementation

Verifies Supabase JWTs and resolves LoopGuard users.
"""

import jwt
from typing import Optional

from ...domain.entities.user import User
from ...domain.interfaces.services import AuthService, TokenPayload
from ...domain.interfaces.repositories import UserRepository
from ..config import Settings
from .exceptions import AuthenticationError, UserNotLinkedError


class SupabaseAuthService(AuthService):
    """
    Supabase JWT verification service.
    
    Verifies JWTs issued by Supabase Auth and resolves
    the corresponding LoopGuard user.
    
    SOLID Principle: Single Responsibility
    - Only handles JWT verification and user resolution
    - User management is handled by LinkSupabaseUserService
    """
    
    def __init__(
        self,
        settings: Settings,
        user_repo: UserRepository,
    ) -> None:
        self._settings = settings
        self._user_repo = user_repo
        self._jwt_secret = settings.supabase_jwt_secret
        self._supabase_url = settings.supabase_url
    
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
        try:
            # Supabase uses HS256 by default with the JWT secret
            # Add leeway for clock skew between client and server
            payload = jwt.decode(
                token,
                self._jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                leeway=60,  # Allow 60 seconds clock skew
                options={
                    "verify_exp": True,
                    "require": ["sub", "exp", "iat"],
                },
            )
            
            return TokenPayload(
                sub=payload.get("sub", ""),
                email=payload.get("email"),
                exp=payload.get("exp"),
                iat=payload.get("iat"),
                role=payload.get("role"),
            )
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except jwt.InvalidTokenError as e:
            raise AuthenticationError(f"Invalid token: {str(e)}")
    
    async def get_current_user(self, token: str) -> User:
        """
        Get the current user from a token.
        
        Verifies token and loads user from LoopGuard database.
        
        Args:
            token: JWT token from Authorization header
            
        Returns:
            User entity
            
        Raises:
            AuthenticationError: If token is invalid
            UserNotLinkedError: If user not linked to LoopGuard
        """
        # Verify token first
        payload = await self.verify_token(token)
        
        # Look up user in LoopGuard database
        user = await self._user_repo.get_by_supabase_id(payload.sub)
        
        if not user:
            raise UserNotLinkedError(
                f"User {payload.email} is not linked to LoopGuard. "
                "Please complete registration."
            )
        
        if not user.is_active:
            raise AuthenticationError("User account is deactivated")
        
        return user
