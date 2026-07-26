import requests
import json
import base64

url = "https://evolution-api-latest-yicm.onrender.com"
h = {"apikey": "Disjd12-9", "Content-Type": "application/json"}
instance = "glow-studio-5491173566392"

r = requests.get(f"{url}/instance/connect/{instance}", headers=h, timeout=30)
print("Status:", r.status_code)
d = r.json()
qr = d.get("base64") or (d.get("qrcode") or {}).get("base64")

if not qr:
    print("No QR found, response:", json.dumps(d, indent=2)[:500])
else:
    c = qr.split(",")[1] if "," in qr else qr
    with open("qr_whatsapp.png", "wb") as f:
        f.write(base64.b64decode(c))
    print("Saved qr_whatsapp.png OK")

    fb = qr if qr.startswith("data:") else "data:image/png;base64," + qr
    html = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>QR Glow Studio</title>
<style>
body{font-family:system-ui,sans-serif;background:#faf8f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}
.card{background:#fff;border:1px solid #eee0d5;border-radius:24px;padding:40px;text-align:center;max-width:440px;box-shadow:0 20px 40px rgba(0,0,0,.06)}
.badge{background:#fdf2f4;color:#db2777;font-weight:700;font-size:13px;padding:6px 16px;border-radius:20px;display:inline-block;margin-bottom:16px}
h1{font-size:22px;color:#111;margin:0 0 8px}
p{color:#666;font-size:14px;line-height:1.5;margin-bottom:24px}
img{width:280px;height:280px;border-radius:16px;border:4px solid #fff;box-shadow:0 10px 30px rgba(0,0,0,.12);margin-bottom:24px}
.phone{background:#f4f4f5;padding:10px 18px;border-radius:12px;font-weight:600;color:#18181b;display:inline-block;font-size:14px}
.warn{background:#fef3c7;color:#92400e;padding:12px 16px;border-radius:12px;font-size:13px;margin-top:16px;text-align:left;line-height:1.4}
</style></head><body>
<div class="card">
<div class="badge">Glow Studio by Sofia</div>
<h1>Nuevo QR (Instancia Limpia)</h1>
<p>Se elimino la instancia anterior y se creo una <strong>nueva desde cero</strong>. Escanea este codigo QR con WhatsApp:</p>
<img src="QRPLACEHOLDER" alt="QR"/>
<div><span class="phone">+54 9 11 7356-6392</span></div>
<div class="warn">Si el telefono todavia muestra el dispositivo anterior como vinculado, primero elimina ese dispositivo viejo desde WhatsApp > Dispositivos vinculados, y despues escanea este QR nuevo.</div>
</div></body></html>""".replace("QRPLACEHOLDER", fb)

    with open("qr_whatsapp.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("Saved qr_whatsapp.html OK")
