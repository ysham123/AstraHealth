"""Health check endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns basic service status for load balancers and monitoring.
    """
    return {
        "status": "healthy",
        "service": "loopguard-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready")
async def readiness_check():
    """
    Readiness check endpoint.
    
    Verifies the service is ready to accept traffic.
    In production, this would check database connectivity.
    """
    return {
        "status": "ready",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
