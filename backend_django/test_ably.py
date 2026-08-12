import asyncio
from ably import AblyRest
import os

key = '-4Zlzg.WUpFWw:B9o8nl84Edt2OjNJLfN4OH551LydEfNgi4mLRqpl1ek'
client = AblyRest(key)
channel = client.channels.get("test")
res = channel.publish("test_event", {"hello": "world"})
print("Result of publish:", type(res))
