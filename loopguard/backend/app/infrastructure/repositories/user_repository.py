"""
User Repository Implementation

SQLAlchemy implementation of UserRepository interface.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.entities.user import User, UserRole
from ...domain.interfaces.repositories import UserRepository
from ..db.models import UserModel


class SQLAlchemyUserRepository(UserRepository):
    """SQLAlchemy implementation of UserRepository."""
    
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
    
    def _model_to_entity(self, model: UserModel) -> User:
        """Convert ORM model to domain entity."""
        return User(
            id=model.id,
            supabase_user_id=model.supabase_user_id,
            email=model.email,
            display_name=model.display_name or "",
            role=UserRole(model.role),
            site_id=model.site_id,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at,
            last_login_at=model.last_login_at,
        )
    
    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        result = await self._session.execute(
            select(UserModel).where(UserModel.id == user_id)
        )
        model = result.scalar_one_or_none()
        return self._model_to_entity(model) if model else None
    
    async def get_by_supabase_id(self, supabase_user_id: str) -> Optional[User]:
        """Get user by Supabase user ID."""
        result = await self._session.execute(
            select(UserModel).where(UserModel.supabase_user_id == supabase_user_id)
        )
        model = result.scalar_one_or_none()
        return self._model_to_entity(model) if model else None
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self._session.execute(
            select(UserModel).where(UserModel.email == email)
        )
        model = result.scalar_one_or_none()
        return self._model_to_entity(model) if model else None
    
    async def save(self, user: User) -> User:
        """Create or update user."""
        existing = await self._session.get(UserModel, user.id)
        
        if existing:
            # Update existing
            existing.email = user.email
            existing.display_name = user.display_name
            existing.role = user.role.value
            existing.site_id = user.site_id
            existing.is_active = user.is_active
            existing.updated_at = datetime.utcnow()
            existing.last_login_at = user.last_login_at
            await self._session.flush()
            return self._model_to_entity(existing)
        else:
            # Create new
            model = UserModel(
                id=user.id,
                supabase_user_id=user.supabase_user_id,
                email=user.email,
                display_name=user.display_name,
                role=user.role.value,
                site_id=user.site_id,
                is_active=user.is_active,
                created_at=user.created_at or datetime.utcnow(),
                last_login_at=user.last_login_at,
            )
            self._session.add(model)
            await self._session.flush()
            return self._model_to_entity(model)
    
    async def list_by_role(
        self,
        role: str,
        site_id: Optional[UUID] = None,
    ) -> List[User]:
        """List users by role."""
        query = select(UserModel).where(UserModel.role == role)
        
        if site_id:
            query = query.where(UserModel.site_id == site_id)
        
        query = query.order_by(UserModel.display_name.asc())
        
        result = await self._session.execute(query)
        models = result.scalars().all()
        return [self._model_to_entity(m) for m in models]
