import base64
import hashlib
import hmac
import json
import logging
import asyncio
import secrets
import threading
import time
from ably import AblyRest
from django.conf import settings

logger = logging.getLogger(__name__)

REALTIME_CHANNEL = 'yadotena-realtime'

ably_client = None


def create_token_request(capability: dict, client_id=None, ttl_ms: int = 60 * 60 * 1000):
    """Build a signed Ably TokenRequest (https://ably.com/docs/auth/token).

    The browser exchanges it with Ably for a token; the API key secret never
    leaves the server. Returns None when ABLY_API_KEY is not configured.
    """
    api_key = getattr(settings, 'ABLY_API_KEY', '') or ''
    if ':' not in api_key:
        return None
    key_name, key_secret = api_key.split(':', 1)

    capability_json = json.dumps(capability, separators=(',', ':'), sort_keys=True)
    timestamp = int(time.time() * 1000)
    nonce = secrets.token_hex(16)
    client_id = client_id or ''

    sign_text = '\n'.join([
        key_name, str(ttl_ms), capability_json, client_id, str(timestamp), nonce,
    ]) + '\n'
    mac = base64.b64encode(
        hmac.new(key_secret.encode(), sign_text.encode(), hashlib.sha256).digest()
    ).decode()

    token_request = {
        'keyName': key_name,
        'ttl': ttl_ms,
        'capability': capability_json,
        'timestamp': timestamp,
        'nonce': nonce,
        'mac': mac,
    }
    if client_id:
        token_request['clientId'] = client_id
    return token_request

def get_ably_client():
    global ably_client
    if ably_client is None:
        api_key = getattr(settings, 'ABLY_API_KEY', None)
        if api_key:
            ably_client = AblyRest(api_key)
        else:
            logger.warning("ABLY_API_KEY is not set in settings. Real-time events will not be published.")
    return ably_client

def _publish_task(channel_name: str, event_name: str, data: dict):
    async def _async_publish():
        client = get_ably_client()
        if not client:
            return
        try:
            channel = client.channels.get(channel_name)
            await channel.publish(event_name, data)
        except Exception as e:
            logger.error(f"Failed to publish Ably event to {channel_name}: {e}")
            
    asyncio.run(_async_publish())

def publish_event(channel_name: str, event_name: str, data: dict):
    """
    Publish an event to an Ably channel asynchronously without blocking the main thread.
    """
    threading.Thread(target=_publish_task, args=(channel_name, event_name, data), daemon=True).start()

