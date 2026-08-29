import requests

# TestSprite will inject TARGET_URL and __AUTH_HEADERS__ if authentication is configured.
TARGET_URL = globals().get('TARGET_URL', 'https://glow-studio-api-2vzt.onrender.com')
__AUTH_HEADERS__ = globals().get('__AUTH_HEADERS__', {})

def test_health():
    r = requests.get(f"{TARGET_URL}/api/health", headers={**__AUTH_HEADERS__})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    
if __name__ == "__main__":
    test_health()
