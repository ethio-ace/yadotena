import requests
import json
import os

url = "http://localhost:8000/api/v1/menu/"

# Let's create a dummy image
with open("dummy.png", "wb") as f:
    f.write(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDAT\x08\xd7c\xf8\xff\xff\x3f\x00\x05\xfe\x02\xfe\xa7\x35\x81\x84\x00\x00\x00\x00IEND\xaeB`\x82")

data = {
    "name": "Test Dish",
    "description": "Test description",
    "category": "Main Course",
    "price": "100.00",
    "preparationTime": "15",
    "available": "true",
    "dietaryTags": json.dumps(["Spicy"]),
    "customAddons": json.dumps([{"name": "Extra Spicy", "price": 10.0}])
}

files = {
    "image": ("dummy.png", open("dummy.png", "rb"), "image/png")
}

try:
    response = requests.post(url, data=data, files=files)
    print("STATUS:", response.status_code)
    print("RESPONSE:", response.text)
except Exception as e:
    print("Error:", e)

