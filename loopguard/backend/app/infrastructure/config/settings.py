"""
Application Settings

Environment-based configuration using Pydantic Settings.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables.
    
    HIPAA Note: Sensitive values should be provided via environment
    variables or secrets management, never hardcoded.
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    
    # Application
    app_name: str = "LoopGuard"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: str = "development"  # development, staging, production
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/loopguard"
    database_echo: bool = False  # Log SQL queries
    
    # Supabase Auth
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""  # For local JWT verification
    skip_auth: bool = False  # DEV ONLY: Skip JWT verification
    
    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    
    # Security
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 30
    
    # Audit
    audit_log_retention_days: int = 365  # HIPAA: 6 years recommended
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment == "production"
    
    @property
    def database_url_async(self) -> str:
        """Convert sync URL to async (for asyncpg)."""
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace(
                "postgresql://", "postgresql+asyncpg://", 1
            )
        return self.database_url


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Uses lru_cache for singleton behavior.
    """
    return Settings()
