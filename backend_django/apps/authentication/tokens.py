"""Expiring API tokens built on DRF's authtoken model (no extra dependency)."""
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication, get_authorization_header
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import AuthenticationFailed


def token_ttl() -> timedelta:
    return timedelta(hours=getattr(settings, 'API_TOKEN_TTL_HOURS', 12))


def token_expires_at(token: Token):
    return token.created + token_ttl()


def is_token_expired(token: Token) -> bool:
    return timezone.now() >= token_expires_at(token)


def issue_token(user) -> Token:
    """Return the user's current token, replacing it if it has expired.

    Tokens are shared across a user's devices, so logging in on a second
    device does not log the first one out.
    """
    token, created = Token.objects.get_or_create(user=user)
    if not created and is_token_expired(token):
        token.delete()
        token = Token.objects.create(user=user)
    return token


class ExpiringTokenAuthentication(TokenAuthentication):
    """``Authorization: Token <key>`` (``Bearer`` also accepted)."""

    keywords = ('token', 'bearer')

    def authenticate(self, request):
        parts = get_authorization_header(request).split()
        if not parts or parts[0].decode(errors='ignore').lower() not in self.keywords:
            return None
        if len(parts) != 2:
            raise AuthenticationFailed('Invalid authorization header.')
        try:
            key = parts[1].decode()
        except UnicodeError:
            raise AuthenticationFailed('Invalid authorization header.')
        return self.authenticate_credentials(key)

    def authenticate_header(self, request):
        return 'Token'

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if is_token_expired(token):
            token.delete()
            raise AuthenticationFailed('Session expired. Please sign in again.')
        if getattr(user, 'status', 'ACTIVE') != 'ACTIVE':
            raise AuthenticationFailed('User account is inactive.')
        return user, token
