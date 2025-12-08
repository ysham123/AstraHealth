"""
SQLAlchemy ORM Models

Database models separate from domain entities.
These are persistence concerns, not business logic.

SOLID Principle: Single Responsibility
- Models handle persistence mapping only
- Business logic lives in domain entities
"""

from datetime import datetime, date
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Date,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


class PatientModel(Base):
    """Patient database model."""
    
    __tablename__ = "patients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    mrn = Column(String(50), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    sex = Column(String(1), nullable=True)  # M, F, O, U
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    studies = relationship("StudyModel", back_populates="patient")


class StudyModel(Base):
    """Study database model."""
    
    __tablename__ = "studies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    accession_number = Column(String(50), unique=True, index=True, nullable=False)
    modality = Column(String(10), nullable=True)
    body_region = Column(String(50), nullable=True)
    study_date = Column(DateTime, nullable=True)
    study_description = Column(String(255), nullable=True)
    referring_physician = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    patient = relationship("PatientModel", back_populates="studies")
    report = relationship("ReportModel", back_populates="study", uselist=False)


class ReportModel(Base):
    """Radiology report database model."""
    
    __tablename__ = "reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    study_id = Column(UUID(as_uuid=True), ForeignKey("studies.id"), nullable=False, unique=True, index=True)
    radiologist_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    report_text = Column(Text, nullable=True)
    findings = Column(Text, nullable=True)
    impression = Column(Text, nullable=True)
    
    is_finalized = Column(Boolean, default=False, nullable=False)
    finalized_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    study = relationship("StudyModel", back_populates="report")
    radiologist = relationship("UserModel", back_populates="reports")
    followups = relationship("FollowUpModel", back_populates="report")


class FollowUpModel(Base):
    """Follow-up recommendation database model."""
    
    __tablename__ = "followups"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False, index=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    
    recommended_modality = Column(String(20), nullable=False)
    body_region = Column(String(50), nullable=False)
    reason = Column(Text, nullable=True)
    interval_months = Column(Integer, nullable=False)
    
    due_date = Column(DateTime, nullable=True, index=True)
    status = Column(String(20), default="pending", nullable=False, index=True)
    priority = Column(String(20), default="routine", nullable=False)
    
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    report = relationship("ReportModel", back_populates="followups")
    actions = relationship("FollowUpActionModel", back_populates="recommendation")


class FollowUpActionModel(Base):
    """Follow-up action audit trail."""
    
    __tablename__ = "followup_actions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    recommendation_id = Column(UUID(as_uuid=True), ForeignKey("followups.id"), nullable=False, index=True)
    
    action_type = Column(String(30), nullable=False)
    previous_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=True)
    note = Column(Text, nullable=True)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ip_address = Column(String(45), nullable=True)
    
    # Relationships
    recommendation = relationship("FollowUpModel", back_populates="actions")


class UserModel(Base):
    """User database model."""
    
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    supabase_user_id = Column(String(100), unique=True, index=True, nullable=False)
    
    email = Column(String(255), unique=True, index=True, nullable=False)
    display_name = Column(String(100), nullable=True)
    
    role = Column(String(20), default="radiologist", nullable=False)
    site_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)
    
    # Relationships
    reports = relationship("ReportModel", back_populates="radiologist")


class AuditEventModel(Base):
    """
    Audit event database model.
    
    HIPAA Requirement: Append-only audit log.
    No UPDATE or DELETE operations should be performed on this table.
    """
    
    __tablename__ = "audit_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)
    
    action = Column(String(30), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    extra_data = Column(JSON, nullable=True)  # Renamed from 'metadata' (reserved in SQLAlchemy)
    
    success = Column(Boolean, default=True, nullable=False)
    error_message = Column(Text, nullable=True)
