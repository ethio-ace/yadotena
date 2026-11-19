"""Uniform API error bodies.

Every error response carries a human-readable ``detail`` string (the
frontend shows it as-is), while field errors stay available by key.
"""
from rest_framework.views import exception_handler as drf_exception_handler


def _flatten(value):
    if isinstance(value, dict):
        parts = []
        for key, inner in value.items():
            text = _flatten(inner)
            parts.append(text if key in ('detail', 'non_field_errors') else f'{key}: {text}')
        return ' · '.join(p for p in parts if p)
    if isinstance(value, (list, tuple)):
        return ' '.join(_flatten(v) for v in value)
    return str(value)


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return None
    data = response.data
    if isinstance(data, list):
        response.data = {'detail': _flatten(data)}
    elif isinstance(data, dict) and not isinstance(data.get('detail'), str):
        response.data = {**data, 'detail': _flatten(data)}
    return response
