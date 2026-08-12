import os
import logging
import asyncio
import threading
from ably import AblyRest
from django.conf import settings

logger = logging.getLogger(__name__)

ably_client = None

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

