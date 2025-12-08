"""
Follow-Up Repository Implementation

SQLAlchemy implementation of FollowUpRepository interface.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.entities.followup import (
    FollowUpRecommendation,
    FollowUpAction,
    FollowUpStatus,
    FollowUpPriority,
    ActionType,
)
from ...domain.interfaces.repositories import FollowUpRepository
from ..db.models import FollowUpModel, FollowUpActionModel


class SQLAlchemyFollowUpRepository(FollowUpRepository):
    """
    SQLAlchemy implementation of FollowUpRepository.
    
    SOLID Principle: Liskov Substitution
    - Can be substituted for any FollowUpRepository implementation
    - Interface contract is fully implemented
    """
    
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
    
    def _model_to_entity(self, model: FollowUpModel) -> FollowUpRecommendation:
        """Convert ORM model to domain entity."""
        return FollowUpRecommendation(
            id=model.id,
            report_id=model.report_id,
            patient_id=model.patient_id,
            recommended_modality=model.recommended_modality,
            body_region=model.body_region,
            reason=model.reason or "",
            interval_months=model.interval_months,
            due_date=model.due_date,
            status=FollowUpStatus(model.status),
            priority=FollowUpPriority(model.priority),
            assigned_to=model.assigned_to,
            created_by=model.created_by,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
    
    def _entity_to_model(self, entity: FollowUpRecommendation) -> FollowUpModel:
        """Convert domain entity to ORM model."""
        return FollowUpModel(
            id=entity.id,
            report_id=entity.report_id,
            patient_id=entity.patient_id,
            recommended_modality=entity.recommended_modality,
            body_region=entity.body_region,
            reason=entity.reason,
            interval_months=entity.interval_months,
            due_date=entity.due_date,
            status=entity.status.value,
            priority=entity.priority.value,
            assigned_to=entity.assigned_to,
            created_by=entity.created_by,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
    
    async def get_by_id(self, followup_id: UUID) -> Optional[FollowUpRecommendation]:
        """Get follow-up by ID."""
        result = await self._session.execute(
            select(FollowUpModel).where(FollowUpModel.id == followup_id)
        )
        model = result.scalar_one_or_none()
        return self._model_to_entity(model) if model else None
    
    async def get_by_report(self, report_id: UUID) -> List[FollowUpRecommendation]:
        """Get follow-ups for a report."""
        result = await self._session.execute(
            select(FollowUpModel)
            .where(FollowUpModel.report_id == report_id)
            .order_by(FollowUpModel.created_at.desc())
        )
        models = result.scalars().all()
        return [self._model_to_entity(m) for m in models]
    
    async def get_by_patient(
        self,
        patient_id: UUID,
        status: Optional[FollowUpStatus] = None,
    ) -> List[FollowUpRecommendation]:
        """Get follow-ups for a patient."""
        query = select(FollowUpModel).where(FollowUpModel.patient_id == patient_id)
        
        if status:
            query = query.where(FollowUpModel.status == status.value)
        
        query = query.order_by(FollowUpModel.due_date.asc())
        
        result = await self._session.execute(query)
        models = result.scalars().all()
        return [self._model_to_entity(m) for m in models]
    
    async def get_worklist(
        self,
        status: Optional[List[FollowUpStatus]] = None,
        site_id: Optional[UUID] = None,
        assigned_to: Optional[UUID] = None,
        due_before: Optional[datetime] = None,
        due_after: Optional[datetime] = None,
        modality: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[FollowUpRecommendation]:
        """Get worklist of follow-ups matching criteria."""
        query = select(FollowUpModel)
        
        if status:
            query = query.where(
                FollowUpModel.status.in_([s.value for s in status])
            )
        
        if assigned_to:
            query = query.where(FollowUpModel.assigned_to == assigned_to)
        
        if due_before:
            query = query.where(FollowUpModel.due_date <= due_before)
        
        if due_after:
            query = query.where(FollowUpModel.due_date >= due_after)
        
        if modality:
            query = query.where(FollowUpModel.recommended_modality == modality)
        
        query = (
            query
            .order_by(FollowUpModel.due_date.asc())
            .limit(limit)
            .offset(offset)
        )
        
        result = await self._session.execute(query)
        models = result.scalars().all()
        return [self._model_to_entity(m) for m in models]
    
    async def count_worklist(
        self,
        status: Optional[List[FollowUpStatus]] = None,
        site_id: Optional[UUID] = None,
    ) -> int:
        """Count follow-ups matching worklist criteria."""
        query = select(func.count(FollowUpModel.id))
        
        if status:
            query = query.where(
                FollowUpModel.status.in_([s.value for s in status])
            )
        
        result = await self._session.execute(query)
        return result.scalar() or 0
    
    async def save(self, followup: FollowUpRecommendation) -> FollowUpRecommendation:
        """Create or update follow-up."""
        # Check if exists
        existing = await self._session.get(FollowUpModel, followup.id)
        
        if existing:
            # Update existing
            existing.recommended_modality = followup.recommended_modality
            existing.body_region = followup.body_region
            existing.reason = followup.reason
            existing.interval_months = followup.interval_months
            existing.due_date = followup.due_date
            existing.status = followup.status.value
            existing.priority = followup.priority.value
            existing.assigned_to = followup.assigned_to
            existing.updated_at = datetime.utcnow()
            await self._session.flush()
            return self._model_to_entity(existing)
        else:
            # Create new
            model = self._entity_to_model(followup)
            self._session.add(model)
            await self._session.flush()
            return self._model_to_entity(model)
    
    async def add_action(self, action: FollowUpAction) -> FollowUpAction:
        """Add action to follow-up audit trail."""
        model = FollowUpActionModel(
            id=action.id,
            recommendation_id=action.recommendation_id,
            action_type=action.action_type.value,
            previous_status=action.previous_status.value if action.previous_status else None,
            new_status=action.new_status.value if action.new_status else None,
            note=action.note,
            created_by=action.created_by,
            created_at=action.created_at,
            ip_address=action.ip_address,
        )
        self._session.add(model)
        await self._session.flush()
        return action
    
    async def get_actions(self, followup_id: UUID) -> List[FollowUpAction]:
        """Get action history for a follow-up."""
        result = await self._session.execute(
            select(FollowUpActionModel)
            .where(FollowUpActionModel.recommendation_id == followup_id)
            .order_by(FollowUpActionModel.created_at.asc())
        )
        models = result.scalars().all()
        
        return [
            FollowUpAction(
                id=m.id,
                recommendation_id=m.recommendation_id,
                action_type=ActionType(m.action_type),
                previous_status=FollowUpStatus(m.previous_status) if m.previous_status else None,
                new_status=FollowUpStatus(m.new_status) if m.new_status else None,
                note=m.note or "",
                created_by=m.created_by,
                created_at=m.created_at,
                ip_address=m.ip_address,
            )
            for m in models
        ]
