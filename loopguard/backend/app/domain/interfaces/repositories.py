"""
Repository Interfaces

Abstract contracts for data persistence.
Infrastructure layer provides concrete implementations.

SOLID Principle: Interface Segregation
- Each repository handles one aggregate root
- Clients depend only on methods they use
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from ..entities.patient import Patient
from ..entities.study import Study
from ..entities.report import RadiologyReport
from ..entities.followup import FollowUpRecommendation, FollowUpAction, FollowUpStatus
from ..entities.user import User
from ..entities.audit import AuditEvent


class PatientRepository(ABC):
    """Repository interface for Patient entity."""
    
    @abstractmethod
    async def get_by_id(self, patient_id: UUID) -> Optional[Patient]:
        """Get patient by ID."""
        pass
    
    @abstractmethod
    async def get_by_mrn(self, mrn: str) -> Optional[Patient]:
        """Get patient by Medical Record Number."""
        pass
    
    @abstractmethod
    async def save(self, patient: Patient) -> Patient:
        """Create or update patient."""
        pass
    
    @abstractmethod
    async def search(
        self,
        name: Optional[str] = None,
        mrn: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Patient]:
        """Search patients by criteria."""
        pass


class StudyRepository(ABC):
    """Repository interface for Study entity."""
    
    @abstractmethod
    async def get_by_id(self, study_id: UUID) -> Optional[Study]:
        """Get study by ID."""
        pass
    
    @abstractmethod
    async def get_by_accession(self, accession_number: str) -> Optional[Study]:
        """Get study by accession number."""
        pass
    
    @abstractmethod
    async def get_by_patient(
        self,
        patient_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Study]:
        """Get studies for a patient."""
        pass
    
    @abstractmethod
    async def save(self, study: Study) -> Study:
        """Create or update study."""
        pass


class ReportRepository(ABC):
    """Repository interface for RadiologyReport entity."""
    
    @abstractmethod
    async def get_by_id(self, report_id: UUID) -> Optional[RadiologyReport]:
        """Get report by ID."""
        pass
    
    @abstractmethod
    async def get_by_study(self, study_id: UUID) -> Optional[RadiologyReport]:
        """Get report for a study."""
        pass
    
    @abstractmethod
    async def get_by_radiologist(
        self,
        radiologist_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[RadiologyReport]:
        """Get reports by radiologist."""
        pass
    
    @abstractmethod
    async def save(self, report: RadiologyReport) -> RadiologyReport:
        """Create or update report."""
        pass


class FollowUpRepository(ABC):
    """
    Repository interface for FollowUpRecommendation entity.
    
    This is the primary repository for LoopGuard's core functionality.
    """
    
    @abstractmethod
    async def get_by_id(self, followup_id: UUID) -> Optional[FollowUpRecommendation]:
        """Get follow-up by ID."""
        pass
    
    @abstractmethod
    async def get_by_report(self, report_id: UUID) -> List[FollowUpRecommendation]:
        """Get follow-ups for a report."""
        pass
    
    @abstractmethod
    async def get_by_patient(
        self,
        patient_id: UUID,
        status: Optional[FollowUpStatus] = None,
    ) -> List[FollowUpRecommendation]:
        """Get follow-ups for a patient."""
        pass
    
    @abstractmethod
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
        """
        Get worklist of follow-ups matching criteria.
        
        Primary query for Coordinator view.
        """
        pass
    
    @abstractmethod
    async def count_worklist(
        self,
        status: Optional[List[FollowUpStatus]] = None,
        site_id: Optional[UUID] = None,
    ) -> int:
        """Count follow-ups matching worklist criteria."""
        pass
    
    @abstractmethod
    async def save(self, followup: FollowUpRecommendation) -> FollowUpRecommendation:
        """Create or update follow-up."""
        pass
    
    @abstractmethod
    async def add_action(self, action: FollowUpAction) -> FollowUpAction:
        """Add action to follow-up audit trail."""
        pass
    
    @abstractmethod
    async def get_actions(self, followup_id: UUID) -> List[FollowUpAction]:
        """Get action history for a follow-up."""
        pass


class UserRepository(ABC):
    """Repository interface for User entity."""
    
    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        pass
    
    @abstractmethod
    async def get_by_supabase_id(self, supabase_user_id: str) -> Optional[User]:
        """Get user by Supabase user ID."""
        pass
    
    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        pass
    
    @abstractmethod
    async def save(self, user: User) -> User:
        """Create or update user."""
        pass
    
    @abstractmethod
    async def list_by_role(
        self,
        role: str,
        site_id: Optional[UUID] = None,
    ) -> List[User]:
        """List users by role."""
        pass


class AuditRepository(ABC):
    """
    Repository interface for AuditEvent entity.
    
    HIPAA Requirement: Audit logs must be append-only.
    """
    
    @abstractmethod
    async def save(self, event: AuditEvent) -> AuditEvent:
        """
        Save audit event.
        
        Note: Updates and deletes are not allowed.
        """
        pass
    
    @abstractmethod
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
        pass
    
    @abstractmethod
    async def count(
        self,
        user_id: Optional[UUID] = None,
        entity_type: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> int:
        """Count audit events matching criteria."""
        pass
