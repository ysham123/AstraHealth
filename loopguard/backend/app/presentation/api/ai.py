"""
AI-powered API Routes

Endpoints for LLM-powered features like report analysis and summarization.
"""

from typing import List, Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, status

from ...infrastructure.ai import ReportAnalyzer, ExtractedRecommendation
from ...infrastructure.ai.report_analyzer import PriorStudySummarizer
from .dependencies import CurrentUser, require_role
from ...domain.entities.user import UserRole

router = APIRouter(prefix="/ai", tags=["ai"])


# --- Schemas ---

class AnalyzeReportRequest(BaseModel):
    """Request to analyze report text."""
    impression_text: str


class ExtractedRecommendationResponse(BaseModel):
    """Extracted follow-up recommendation."""
    modality: str
    body_region: str
    interval_months: int
    finding: str
    urgency: str
    guideline: Optional[str] = None
    confidence: float


class AnalyzeReportResponse(BaseModel):
    """Response from report analysis."""
    recommendations: List[ExtractedRecommendationResponse]
    source: str  # "llm" or "regex"


class PriorStudy(BaseModel):
    """Prior study input for summarization."""
    date: str
    modality: str
    body_region: str
    impression: str


class SummarizeHistoryRequest(BaseModel):
    """Request to summarize patient history."""
    patient_name: str
    prior_studies: List[PriorStudy]


class SummarizeHistoryResponse(BaseModel):
    """Patient history summary."""
    summary: str
    key_findings: List[str]
    pending_followups: List[str]
    trend: str
    attention_items: List[str]


# --- Endpoints ---

@router.post(
    "/analyze-report",
    response_model=AnalyzeReportResponse,
    summary="Analyze report text to extract follow-up recommendations",
)
async def analyze_report(
    body: AnalyzeReportRequest,
    current_user: CurrentUser,
):
    """
    Use AI to parse radiology report impression and extract follow-up recommendations.
    
    Only radiologists and admins can use this feature.
    """
    # Role check: Only radiologists and admins
    if current_user.role not in (UserRole.RADIOLOGIST, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only radiologists can use the report analyzer",
        )
    
    analyzer = ReportAnalyzer()
    recommendations = await analyzer.analyze_report(body.impression_text)
    
    # Determine source based on confidence (LLM has higher confidence)
    source = "llm" if recommendations and recommendations[0].confidence > 0.6 else "regex"
    
    return AnalyzeReportResponse(
        recommendations=[
            ExtractedRecommendationResponse(
                modality=r.modality,
                body_region=r.body_region,
                interval_months=r.interval_months,
                finding=r.finding,
                urgency=r.urgency,
                guideline=r.guideline,
                confidence=r.confidence,
            )
            for r in recommendations
        ],
        source=source,
    )


@router.post(
    "/summarize-history",
    response_model=SummarizeHistoryResponse,
    summary="Summarize patient imaging history",
)
async def summarize_history(
    body: SummarizeHistoryRequest,
    current_user: CurrentUser,
):
    """
    Use AI to generate a concise summary of patient's prior imaging studies.
    
    Only radiologists and admins can use this feature.
    """
    if current_user.role not in (UserRole.RADIOLOGIST, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only radiologists can use the history summarizer",
        )
    
    summarizer = PriorStudySummarizer()
    result = await summarizer.summarize_history(
        patient_name=body.patient_name,
        prior_studies=[s.model_dump() for s in body.prior_studies],
    )
    
    return SummarizeHistoryResponse(**result)
