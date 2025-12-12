"""
AI Scan Analysis API - Integrates with Myndra multi-agent system

Endpoints:
- POST /scan/analyze - Analyze chest X-ray using Myndra AI
- GET /scan/results/{case_id} - Get analysis results
- POST /scan/review - Submit radiologist review
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import httpx
import os
import uuid

from ..api.dependencies import get_current_user

router = APIRouter(prefix="/scan", tags=["AI Scan Analysis"])

# Myndra API URL - defaults to localhost:8001
MYNDRA_API_URL = os.getenv("MYNDRA_API_URL", "http://localhost:8001")

# In-memory storage for scan results (in production, use database)
scan_results_db: Dict[str, Dict[str, Any]] = {}


class ReviewRequest(BaseModel):
    case_id: str
    finding_id: str
    approved: bool
    radiologist_note: Optional[str] = None


class FollowUpSuggestion(BaseModel):
    condition: str
    recommendation: str
    urgency: str
    interval_months: Optional[int] = None


@router.post("/analyze")
async def analyze_scan(
    file: UploadFile = File(...),
    analysis_type: str = "dual",
    current_user = Depends(get_current_user)
):
    """
    Analyze a chest X-ray using Myndra AI models.
    
    - Supports JPEG, PNG images
    - Returns pneumonia and cardiomegaly predictions
    - Includes saliency heatmaps for interpretability
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {allowed_types}"
        )
    
    # Generate case ID
    case_id = str(uuid.uuid4())
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Call Myndra API
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Determine endpoint based on analysis type
            if analysis_type == "pneumonia":
                endpoint = f"{MYNDRA_API_URL}/analyze_pneumonia"
            elif analysis_type == "cardiomegaly":
                endpoint = f"{MYNDRA_API_URL}/analyze_cardiomegaly"
            else:
                endpoint = f"{MYNDRA_API_URL}/analyze_dual"
            
            # Send image to Myndra
            files = {"file": (file.filename, file_content, file.content_type)}
            response = await client.post(endpoint, files=files)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"Myndra API error: {response.text}"
                )
            
            myndra_result = response.json()
        
        # Process results into standardized format
        findings = []
        
        if analysis_type == "dual":
            # Dual analysis returns nested results
            if "pneumonia" in myndra_result:
                pneu = myndra_result["pneumonia"]
                findings.append({
                    "id": str(uuid.uuid4()),
                    "condition": "Pneumonia",
                    "probability": pneu.get("probability", 0),
                    "diagnosis": pneu.get("diagnosis", "Unknown"),
                    "severity": _get_severity(pneu.get("probability", 0)),
                    "location": "Lungs",
                    "heatmap": pneu.get("artifacts", {}).get("heatmap_png"),
                    "processing_steps": pneu.get("steps", []),
                })
            
            if "cardiomegaly" in myndra_result:
                cardio = myndra_result["cardiomegaly"]
                findings.append({
                    "id": str(uuid.uuid4()),
                    "condition": "Cardiomegaly",
                    "probability": cardio.get("probability", 0),
                    "diagnosis": cardio.get("diagnosis", "Unknown"),
                    "severity": _get_severity(cardio.get("probability", 0)),
                    "location": "Heart",
                    "heatmap": cardio.get("artifacts", {}).get("heatmap_png"),
                    "processing_steps": cardio.get("steps", []),
                })
        else:
            # Single analysis
            findings.append({
                "id": str(uuid.uuid4()),
                "condition": analysis_type.capitalize(),
                "probability": myndra_result.get("probability", 0),
                "diagnosis": myndra_result.get("diagnosis", "Unknown"),
                "severity": _get_severity(myndra_result.get("probability", 0)),
                "location": "Lungs" if analysis_type == "pneumonia" else "Heart",
                "heatmap": myndra_result.get("artifacts", {}).get("heatmap_png"),
                "processing_steps": myndra_result.get("steps", []),
            })
        
        # Generate follow-up suggestions based on findings
        followup_suggestions = _generate_followup_suggestions(findings)
        
        # Store result
        result = {
            "case_id": case_id,
            "filename": file.filename,
            "analysis_type": analysis_type,
            "analyzed_at": datetime.utcnow().isoformat(),
            "analyzed_by": str(current_user.id),
            "findings": findings,
            "followup_suggestions": followup_suggestions,
            "radiologist_reviews": [],
            "myndra_case_id": myndra_result.get("case_id"),
            "status": "pending_review",
        }
        
        scan_results_db[case_id] = result
        
        return result
        
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Myndra AI service unavailable. Please ensure Myndra is running on port 8001."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@router.get("/results/{case_id}")
async def get_results(case_id: str, current_user = Depends(get_current_user)):
    """Get analysis results for a specific case."""
    if case_id not in scan_results_db:
        raise HTTPException(status_code=404, detail="Case not found")
    return scan_results_db[case_id]


@router.get("/results")
async def list_results(current_user = Depends(get_current_user)):
    """List all scan analysis results."""
    return list(scan_results_db.values())


@router.post("/review")
async def submit_review(
    review: ReviewRequest,
    current_user = Depends(get_current_user)
):
    """Submit radiologist review for a finding."""
    if review.case_id not in scan_results_db:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case = scan_results_db[review.case_id]
    
    # Find and update the finding
    for finding in case["findings"]:
        if finding["id"] == review.finding_id:
            finding["radiologist_approved"] = review.approved
            finding["radiologist_note"] = review.radiologist_note
            finding["reviewed_by"] = str(current_user.id)
            finding["reviewed_at"] = datetime.utcnow().isoformat()
            break
    
    # Add to reviews list
    case["radiologist_reviews"].append({
        "finding_id": review.finding_id,
        "approved": review.approved,
        "note": review.radiologist_note,
        "reviewer_id": str(current_user.id),
        "reviewed_at": datetime.utcnow().isoformat(),
    })
    
    # Update status if all findings reviewed
    all_reviewed = all(
        "radiologist_approved" in f 
        for f in case["findings"]
    )
    if all_reviewed:
        case["status"] = "reviewed"
    
    return {"success": True, "case": case}


@router.get("/health")
async def myndra_health():
    """Check Myndra API health status."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{MYNDRA_API_URL}/health")
            if response.status_code == 200:
                return {
                    "myndra_status": "connected",
                    "myndra_url": MYNDRA_API_URL,
                    **response.json()
                }
    except:
        pass
    
    return {
        "myndra_status": "disconnected",
        "myndra_url": MYNDRA_API_URL,
        "message": "Myndra API not reachable"
    }


def _get_severity(probability: float) -> str:
    """Convert probability to severity level."""
    if probability < 0.3:
        return "normal"
    elif probability < 0.5:
        return "mild"
    elif probability < 0.7:
        return "moderate"
    else:
        return "severe"


def _generate_followup_suggestions(findings: List[Dict]) -> List[Dict]:
    """Generate follow-up recommendations based on AI findings."""
    suggestions = []
    
    for finding in findings:
        if finding["diagnosis"] != "Normal" and finding["probability"] >= 0.5:
            if finding["condition"] == "Pneumonia":
                suggestions.append({
                    "condition": "Pneumonia",
                    "recommendation": "Follow-up chest X-ray to confirm resolution",
                    "urgency": "high" if finding["probability"] >= 0.7 else "routine",
                    "interval_months": 1,
                    "rationale": f"AI detected pneumonia with {finding['probability']*100:.0f}% confidence. Clinical correlation recommended."
                })
    
    return suggestions
