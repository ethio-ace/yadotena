from rest_framework.throttling import SimpleRateThrottle

from .permissions import is_staff_user


class PublicActionThrottle(SimpleRateThrottle):
    """Per-IP throttle for anonymous writes on selected viewset actions.

    Configure on the view:
        public_throttle_scope = 'public_orders'
        public_throttle_actions = {'create', 'add_items'}
    Staff requests are never throttled by this class.
    """

    def allow_request(self, request, view):
        actions = getattr(view, 'public_throttle_actions', set())
        if getattr(view, 'action', None) not in actions or is_staff_user(request.user):
            return True
        self.scope = getattr(view, 'public_throttle_scope', 'public_writes')
        self.rate = self.get_rate()
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)

    def get_rate(self):
        scope = getattr(self, 'scope', None)
        if not scope:
            return None
        return self.THROTTLE_RATES.get(scope)

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}
