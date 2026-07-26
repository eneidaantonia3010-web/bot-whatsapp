import requests
import json
import base64
import time

url = "https://evolution-api-latest-yicm.onrender.com"
api_key = "Disjd12-9"
instance = "glow-studio-5491173566392"
phone = "5491173566392"
webhook_url = "https://glow-studio-api-q6ls.onrender.com/api/webhooks/evolution"

headers = {
    "apikey": api_key,
    "Content-Type": "application/json"
}

# ==============================================
# STEP 1: LOGOUT existing session (clear tokens)
# ==============================================
print("1. Logging out existing session...")
try:
    res = requests.delete(f"{url}/instance/logout/{instance}", headers=headers, timeout=15)
    print(f"   Logout status: {res.status_code} - {res.text[:200]}")
except Exception as e:
    print(f"   Logout note: {e}")

time.sleep(2)

# ==============================================
# STEP 2: DELETE the old instance completely
# ==============================================
print("\n2. Deleting old instance completely...")
try:
    res = requests.delete(f"{url}/instance/delete/{instance}", headers=headers, timeout=15)
    print(f"   Delete status: {res.status_code} - {res.text[:200]}")
except Exception as e:
    print(f"   Delete note: {e}")

time.sleep(3)

# ==============================================
# STEP 3: CREATE a brand new instance from scratch
# ==============================================
print("\n3. Creating brand new instance from scratch...")
create_payload = {
    "instanceName": instance,
    "integration": "WHATSAPP-BAILEYS",
    "number": phone,
    "qrcode": True,
    "rejectCall": True,
    "msgCall": "Hola! Atendemos únicamente por mensajes de WhatsApp 💕",
    "groupsIgnore": True,
    "alwaysOnline": True,
    "readMessages": True,
    "webhook": {
        "url": webhook_url,
        "byEvents": False,
        "base64": True,
        "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
    }
}

try:
    res_create = requests.post(f"{url}/instance/create", headers=headers, json=create_payload, timeout=30)
    print(f"   Create status: {res_create.status_code}")
    data_create = res_create.json()
    
    qr_b64 = None
    # Try to get QR from creation response
    if "qrcode" in data_create and isinstance(data_create["qrcode"], dict):
        qr_b64 = data_create["qrcode"].get("base64")
    elif "base64" in data_create:
        qr_b64 = data_create["base64"]
    
    if qr_b64:
        print("   Got QR from create response!")
    else:
        print("   QR not in create response, fetching via /connect...")
        time.sleep(3)
        res_connect = requests.get(f"{url}/instance/connect/{instance}", headers=headers, timeout=30)
        print(f"   Connect status: {res_connect.status_code}")
        data_connect = res_connect.json()
        qr_b64 = data_connect.get("base64") or (data_connect.get("qrcode") or {}).get("base64") or data_connect.get("code")
    
    if qr_b64:
        clean_b64 = qr_b64.split(",")[1] if "," in qr_b64 else qr_b64
        img_data = base64.b64decode(clean_b64)
        
        with open("qr_whatsapp.png", "wb") as f:
            f.write(img_data)
        print("\n✅ Saved fresh qr_whatsapp.png")

        full_b64 = qr_b64 if qr_b64.startswith('data:') else 'data:image/png;base64,' + qr_b64

        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Código QR WhatsApp — Glow Studio</title>
    <style>
        body {{ font-family: system-ui, -apple-system, sans-serif; background: #faf8f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }}
        .card {{ background: white; border: 1px solid #eee0d5; border-radius: 24px; padding: 40px; text-align: center; max-width: 440px; box-shadow: 0 20px 40px rgba(0,0,0,0.06); }}
        .badge {{ background: #fdf2f4; color: #db2777; font-weight: 700; font-size: 13px; padding: 6px 16px; border-radius: 20px; display: inline-block; margin-bottom: 16px; }}
        h1 {{ font-size: 24px; color: #111; margin: 0 0 8px 0; font-weight: 700; }}
        p {{ color: #666; font-size: 15px; line-height: 1.5; margin-bottom: 28px; }}
        img {{ width: 280px; height: 280px; border-radius: 16px; border: 4px solid #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.12); margin-bottom: 24px; }}
        .phone {{ background: #f4f4f5; padding: 10px 18px; border-radius: 12px; font-weight: 600; color: #18181b; display: inline-block; font-size: 14px; }}
        .warn {{ background: #fef3c7; color: #92400e; padding: 12px 16px; border-radius: 12px; font-size: 13px; margin-top: 16px; text-align: left; line-height: 1.4; }}
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">Glow Studio by Sofia</div>
        <h1>🔄 Nuevo Código QR (Regenerado)</h1>
        <p>La instancia anterior fue eliminada y se creó una <strong>nueva instancia limpia</strong>. Escaneá este código QR:</p>
        <img src="{full_b64}" alt="Código QR WhatsApp" />
        <div>
            <span class="phone">📱 +54 9 11 7356-6392</span>
        </div>
        <div class="warn">
            ⚠️ <strong>Importante:</strong> Si el teléfono todavía muestra el dispositivo anterior como vinculado, primero entrá a WhatsApp → Dispositivos vinculados → eliminá el dispositivo viejo, y luego escaneá este nuevo QR.
        </div>
    </div>
</body>
</html>"""

        with open("qr_whatsapp.html", "w", encoding="utf-8") as f:
            f.write(html_content)
        print("✅ Saved fresh qr_whatsapp.html")
    else:
        print("\n❌ Could not extract QR. Full response:")
        print(json.dumps(data_create, indent=2))

except Exception as e:
    print(f"Error: {e}")
