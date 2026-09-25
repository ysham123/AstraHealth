"""Create missing tables for local development; this is not a migration runner."""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.infrastructure.db.models import Base
from app.infrastructure.config import get_settings


async def create_tables():
    settings = get_settings()
    engine = create_async_engine(settings.database_url_async, echo=False)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    finally:
        await engine.dispose()
    print("Tables created successfully.")


if __name__ == "__main__":
    asyncio.run(create_tables())
