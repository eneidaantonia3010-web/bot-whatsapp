import requests
import json
import os

url = "https://evolution-api-latest-yicm.onrender.com"
api_key = "Disjd12-9"
instance = "TEST3010"
phone = "5491173566392"

headers = {
    "apikey": api_key,
    "Content-Type": "application/json"
}

print(f"Connecting to Evolution API at {url} for instance {instance}...")

# 1. Try to fetch connection state
try:
    res = requests.get(f"{url}/instance/connectionState/{instance}", headers=headers, timeout=15)
    print(f"Connection state status: {res.status_code}, response: {res.text}")
except Exception as e:
    print(f"Connection state error: {e}")

# 2. Try connect endpoint to get QR
try:
    res = requests.get(f"{url}/instance/connect/{instance}", headers=headers, timeout=15)
    print(f"Connect status: {res.status_code}")
    data = res.json()
    print("Keys in connect response:", list(data.keys()))
    
    qr_base64 = data.get("base64") or data.get("qrcode", {}).get("base64") or data.get("code")
    if qr_base64:
        print("SUCCESS! Got QR Base64, length:", len(qr_base64))
        with open("qr_result.json", "w", encoding="utf-8") as f:
            json.dump({"qr_base64": qr_base64, "full_response": data}, f)
    else:
        print("Full response:", data)
except Exception as e:
    print(f"Connect error: {e}")
