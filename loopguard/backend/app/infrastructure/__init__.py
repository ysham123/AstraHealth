"""
Infrastructure Layer

Contains implementations of domain interfaces.
- db: SQLAlchemy models and session management
- repositories: Concrete repository implementations
- auth: Supabase JWT verification
- audit: Audit logging implementation
- config: Application settings

SOLID Principle: Dependency Inversion
- This layer implements interfaces defined in domain layer
- Concrete implementations are injected at composition root
"""
