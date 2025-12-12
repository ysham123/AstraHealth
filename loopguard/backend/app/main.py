"""
LoopGuard FastAPI Application

Main application factory with middleware configuration.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .infrastructure.config import get_settings
from .presentation.api import (
    auth_router,
    followups_router,
    metrics_router,
    health_router,
    ai_router,
    worklist_router,
    tumor_board_router,
    scan_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    
    Handles startup and shutdown events.
    """
    # Startup
    settings = get_settings()
    print(f"Starting LoopGuard API v{settings.app_version}")
    print(f"Environment: {settings.environment}")
    
    yield
    
    # Shutdown
    print("Shutting down LoopGuard API")


def create_app() -> FastAPI:
    """
    Application factory.
    
    Creates and configures the FastAPI application.
    This pattern allows for easy testing with different configurations.
    """
    settings = get_settings()
    
    app = FastAPI(
        title="LoopGuard API",
        description="Radiology follow-up tracking system with HIPAA-aligned safeguards",
        version=settings.app_version,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(health_router)
    app.include_router(auth_router, prefix="/api")
    app.include_router(followups_router, prefix="/api")
    app.include_router(metrics_router, prefix="/api")
    app.include_router(ai_router, prefix="/api")
    app.include_router(worklist_router, prefix="/api")
    app.include_router(tumor_board_router, prefix="/api")
    app.include_router(scan_router, prefix="/api")
    
    return app


# Create the application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=not settings.is_production,
    )
