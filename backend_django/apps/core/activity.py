"""Activity log helpers. Logging must never break the request it describes."""
import json
import logging

from django.core.serializers.json import DjangoJSONEncoder

logger = logging.getLogger(__name__)


def client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip()[:45]
    return (request.META.get('REMOTE_ADDR') or '')[:45]


def _jsonable(value):
    if value is None:
        return None
    try:
        return json.loads(json.dumps(value, cls=DjangoJSONEncoder))
    except (TypeError, ValueError):
        return str(value)


def log_activity(request, action, entity_type, entity_id, description, prev=None, next=None, user=None):
    from .models import ActivityLog
    from .permissions import user_role

    try:
        actor = user or getattr(request, 'user', None)
        if actor is not None and actor.is_authenticated:
            user_id, name, role = str(actor.pk), (actor.name or actor.email), user_role(actor) or 'STAFF'
        else:
            user_id, name, role = 'guest', 'Customer', 'CUSTOMER'
        ActivityLog.objects.create(
            user_id=user_id, user_name=name[:128], user_role=role,
            action=action, entity_type=entity_type, entity_id=str(entity_id)[:64],
            description=description, prev_state=_jsonable(prev), next_state=_jsonable(next),
            ip_address=client_ip(request) if request is not None else '',
        )
    except Exception:  # pragma: no cover - audit must not break business writes
        logger.exception('Failed to write activity log for %s %s', action, entity_id)


class AuditedViewSetMixin:
    """Log create/update/delete for a ModelViewSet.

    Set ``audit_entity`` (e.g. 'MENU_ITEM'). Views that need extra save()
    kwargs override ``get_save_kwargs`` instead of perform_create/update.
    """
    audit_entity = None

    def get_save_kwargs(self):
        return {}

    def audit_label(self, obj):
        return getattr(obj, 'name', None) or getattr(obj, 'description', None) or str(obj.pk)

    def _snapshot(self, obj):
        return self.get_serializer(obj).data

    def perform_create(self, serializer):
        obj = serializer.save(**self.get_save_kwargs())
        log_activity(self.request, f'CREATE_{self.audit_entity}', self.audit_entity, obj.pk,
                     f'Created {self._entity_words()} "{self.audit_label(obj)}"', next=serializer.data)

    def perform_update(self, serializer):
        prev = self._snapshot(serializer.instance)
        obj = serializer.save(**self.get_save_kwargs())
        log_activity(self.request, f'UPDATE_{self.audit_entity}', self.audit_entity, obj.pk,
                     f'Updated {self._entity_words()} "{self.audit_label(obj)}"', prev=prev, next=serializer.data)

    def perform_destroy(self, instance):
        prev, pk, label = self._snapshot(instance), instance.pk, self.audit_label(instance)
        instance.delete()
        log_activity(self.request, f'DELETE_{self.audit_entity}', self.audit_entity, pk,
                     f'Deleted {self._entity_words()} "{label}"', prev=prev)

    def _entity_words(self):
        return (self.audit_entity or 'record').replace('_', ' ').lower()
