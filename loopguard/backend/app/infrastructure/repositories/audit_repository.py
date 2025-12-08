"""
Audit Repository Implementation

SQLAlchemy implementation of AuditRepository interface.
HIPAA: Append-only audit log.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.entities.audit import AuditEvent, AuditAction
from ...domain.interfaces.repositories import AuditRepository
from ..db.models import AuditEventModel


class SQLAlchemyAuditRepository(AuditRepository):
    """
    SQLAlchemy implementation of AuditRepository.
    
    HIPAA Requirement: This repository only supports INSERT and SELECT.
    UPDATE and DELETE operations are intentionally not implemented.
    """
    
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
    
    def _model_to_entity(self, model: AuditEventModel) -> AuditEvent:
        """Convert ORM model to domain entity."""
        return AuditEvent(
            id=model.id,
            user_id=model.user_id,
            user_email=model.user_email or "",
            action=AuditAction(model.action),
            entity_type=model.entity_type,
            entity_id=model.entity_id,
            timestamp=model.timestamp,
            ip_address=model.ip_address or "",
            user_agent=model.user_agent or "",
            metadata=model.extra_data or {},
            success=model.success,
            error_message=model.error_message or "",
        )
    
    async def save(self, event: AuditEvent) -> AuditEvent:
        """
        Save audit event.
        
        Note: Updates and deletes are not allowed per HIPAA requirements.
        """
        model = AuditEventModel(
            id=event.id,
            user_id=event.user_id,
            user_email=event.user_email,
            action=event.action.value,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            timestamp=event.timestamp,
            ip_address=event.ip_address,
            user_agent=event.user_agent,
            extra_data=event.metadata,
            success=event.success,
            error_message=event.error_message,
        )
        self._session.add(model)
        await self._session.flush()
        return event
    
    async def query(
        self,
        user_id: Optional[UUID] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        action: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[AuditEvent]:
        """Query audit events by criteria."""
        query = select(AuditEventModel)
        
        if user_id:
            query = query.where(AuditEventModel.user_id == user_id)
        
        if entity_type:
            query = query.where(AuditEventModel.entity_type == entity_type)
        
        if entity_id:
            query = query.where(AuditEventModel.entity_id == entity_id)
        
        if action:
            query = query.where(AuditEventModel.action == action)
        
        if start_time:
            query = query.where(AuditEventModel.timestamp >= start_time)
        
        if end_time:
            query = query.where(AuditEventModel.timestamp <= end_time)
        
        query = (
            query
            .order_by(AuditEventModel.timestamp.desc())
            .limit(limit)
            .offset(offset)
        )
        
        result = await self._session.execute(query)
        models = result.scalars().all()
        return [self._model_to_entity(m) for m in models]
    
    async def count(
        self,
        user_id: Optional[UUID] = None,
        entity_type: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> int:
        """Count audit events matching criteria."""
        query = select(func.count(AuditEventModel.id))
        
        if user_id:
            query = query.where(AuditEventModel.user_id == user_id)
        
        if entity_type:
            query = query.where(AuditEventModel.entity_type == entity_type)
        
        if start_time:
            query = query.where(AuditEventModel.timestamp >= start_time)
        
        if end_time:
            query = query.where(AuditEventModel.timestamp <= end_time)
        
        result = await self._session.execute(query)
        return result.scalar() or 0
