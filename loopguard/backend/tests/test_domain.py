"""
Domain Layer Unit Tests

Tests for domain entities and value objects.
These tests verify business rules without any infrastructure dependencies.
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from app.domain.entities.followup import (
    FollowUpRecommendation,
    FollowUpStatus,
    FollowUpPriority,
)
from app.domain.entities.user import User, UserRole
from app.domain.value_objects.recommendation_interval import (
    RecommendationInterval,
    IntervalUnit,
)


class TestFollowUpRecommendation:
    """Tests for FollowUpRecommendation entity."""
    
    def test_calculate_due_date(self):
        """Due date should be calculated from reference date + interval."""
        followup = FollowUpRecommendation(
            interval_months=3,
        )
        
        reference = datetime(2024, 1, 1)
        due_date = followup.calculate_due_date(reference)
        
        # 3 months ≈ 90 days
        expected = reference + timedelta(days=90)
        assert due_date == expected
    
    def test_is_overdue_when_past_due_date(self):
        """Follow-up should be overdue when past due date and not completed."""
        followup = FollowUpRecommendation(
            due_date=datetime.utcnow() - timedelta(days=7),
            status=FollowUpStatus.PENDING,
        )
        
        assert followup.is_overdue() is True
    
    def test_is_not_overdue_when_completed(self):
        """Completed follow-ups should not be marked as overdue."""
        followup = FollowUpRecommendation(
            due_date=datetime.utcnow() - timedelta(days=7),
            status=FollowUpStatus.COMPLETED,
        )
        
        assert followup.is_overdue() is False
    
    def test_valid_status_transition_pending_to_scheduled(self):
        """PENDING -> SCHEDULED should be valid."""
        followup = FollowUpRecommendation(status=FollowUpStatus.PENDING)
        
        assert followup.can_transition_to(FollowUpStatus.SCHEDULED) is True
    
    def test_invalid_status_transition_completed_to_pending(self):
        """COMPLETED -> PENDING should be invalid (terminal state)."""
        followup = FollowUpRecommendation(status=FollowUpStatus.COMPLETED)
        
        assert followup.can_transition_to(FollowUpStatus.PENDING) is False
    
    def test_update_status_raises_on_invalid_transition(self):
        """update_status should raise ValueError for invalid transitions."""
        followup = FollowUpRecommendation(status=FollowUpStatus.COMPLETED)
        
        with pytest.raises(ValueError, match="Invalid status transition"):
            followup.update_status(FollowUpStatus.PENDING)


class TestUser:
    """Tests for User entity."""
    
    def test_has_permission_admin_has_all(self):
        """Admin should have permission for all roles."""
        admin = User(
            supabase_user_id="test-id",
            role=UserRole.ADMIN,
        )
        
        assert admin.has_permission(UserRole.RADIOLOGIST) is True
        assert admin.has_permission(UserRole.COORDINATOR) is True
        assert admin.has_permission(UserRole.ADMIN) is True
    
    def test_has_permission_radiologist_limited(self):
        """Radiologist should only have radiologist permission."""
        radiologist = User(
            supabase_user_id="test-id",
            role=UserRole.RADIOLOGIST,
        )
        
        assert radiologist.has_permission(UserRole.RADIOLOGIST) is True
        assert radiologist.has_permission(UserRole.COORDINATOR) is False
        assert radiologist.has_permission(UserRole.ADMIN) is False
    
    def test_requires_supabase_user_id(self):
        """User creation should require supabase_user_id."""
        with pytest.raises(ValueError, match="supabase_user_id is required"):
            User(supabase_user_id="")


class TestRecommendationInterval:
    """Tests for RecommendationInterval value object."""
    
    def test_to_days_months(self):
        """3 months should be approximately 90 days."""
        interval = RecommendationInterval(3, IntervalUnit.MONTHS)
        
        assert interval.to_days() == 90
    
    def test_to_days_years(self):
        """1 year should be 365 days."""
        interval = RecommendationInterval(1, IntervalUnit.YEARS)
        
        assert interval.to_days() == 365
    
    def test_parse_simple_interval(self):
        """Should parse '3 months' correctly."""
        interval = RecommendationInterval.parse("3 months")
        
        assert interval.value == 3
        assert interval.unit == IntervalUnit.MONTHS
    
    def test_parse_range_interval(self):
        """Should parse '6-12 months' as range."""
        interval = RecommendationInterval.parse("6-12 months")
        
        assert interval.value == 6
        assert interval.max_value == 12
        assert interval.unit == IntervalUnit.MONTHS
    
    def test_str_representation(self):
        """String representation should be human-readable."""
        interval = RecommendationInterval(3, IntervalUnit.MONTHS)
        
        assert str(interval) == "3 months"
    
    def test_invalid_value_raises(self):
        """Zero or negative values should raise."""
        with pytest.raises(ValueError, match="must be positive"):
            RecommendationInterval(0, IntervalUnit.MONTHS)
