import asyncio
from ably import AblyRest
import os

key = os.environ['ABLY_API_KEY']
client = AblyRest(key)
channel = client.channels.get("test")
res = channel.publish("test_event", {"hello": "world"})
print("Result of publish:", type(res))
