"""FastAPI routers."""

from .auth import router as auth_router
from .followups import router as followups_router
from .metrics import router as metrics_router
from .health import router as health_router
from .ai import router as ai_router
from .worklist import router as worklist_router
from .tumor_board import router as tumor_board_router
from .scan import router as scan_router

__all__ = [
    "auth_router",
    "followups_router",
    "metrics_router",
    "health_router",
    "ai_router",
    "worklist_router",
    "tumor_board_router",
    "scan_router",
]
