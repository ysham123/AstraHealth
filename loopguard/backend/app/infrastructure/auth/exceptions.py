"""Authentication exceptions."""


class AuthenticationError(Exception):
    """JWT verification failed."""
    pass


class UserNotLinkedError(Exception):
    """User exists in Supabase but not linked to LoopGuard."""
    pass
