"""
Application Layer

Contains use cases that orchestrate domain logic.
- No framework dependencies (FastAPI, SQLAlchemy)
- Depends only on domain interfaces
- Implements business workflows

SOLID Principle: Single Responsibility
- Each service handles one use case
- Services are thin orchestrators, not business logic containers
"""
