"""Create database tables from SQLAlchemy models."""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.infrastructure.db.models import Base
from app.infrastructure.config import get_settings

async def create_tables():
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=True)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    await engine.dispose()
    print("✅ Tables created successfully!")

if __name__ == "__main__":
    asyncio.run(create_tables())
