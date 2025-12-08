"""
Domain Layer

Contains pure business logic with no framework dependencies.
- entities: Core domain objects with identity and behavior
- value_objects: Immutable objects defined by their attributes
- interfaces: Abstract contracts for repositories and services

SOLID Principle: Dependency Inversion
- Domain layer defines interfaces that infrastructure implements
- No imports from infrastructure, application, or presentation layers
"""
