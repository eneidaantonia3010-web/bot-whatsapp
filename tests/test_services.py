import requests

TARGET_URL = globals().get('TARGET_URL', 'https://glow-studio-api-2vzt.onrender.com')
__AUTH_HEADERS__ = globals().get('__AUTH_HEADERS__', {})

def test_services():
    r = requests.get(f"{TARGET_URL}/api/services", headers={**__AUTH_HEADERS__})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert isinstance(r.json(), list), "Expected response to be a list of services"
    
if __name__ == "__main__":
    test_services()
