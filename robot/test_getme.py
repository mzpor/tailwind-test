import urllib.request
import json

BOT_TOKEN = "1778171143:vD6rjJXAYidLL7hQyQkBeu5TJ9KpRd4zAKegqUt3"
BASE_URL = f"https://tapi.bale.ai/bot{BOT_TOKEN}"

print(f"Testing BASE_URL: {BASE_URL}")

try:
    # تست getMe
    req = urllib.request.Request(f"{BASE_URL}/getMe")
    response = urllib.request.urlopen(req, timeout=10)
    result = response.read().decode('utf-8')
    result_json = json.loads(result)
    print(f"getMe response: {result_json}")
    
    if result_json.get("ok"):
        print("✅ getMe successful!")
    else:
        print("❌ getMe failed!")
        
except Exception as e:
    print(f"❌ Error in getMe: {e}")

try:
    # تست sendMessage با chat_id نامعتبر
    payload = {
        "chat_id": 12345,
        "text": "test message"
    }
    payload_bytes = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/sendMessage", data=payload_bytes, headers={'Content-Type': 'application/json'})
    response = urllib.request.urlopen(req, timeout=10)
    result = response.read().decode('utf-8')
    result_json = json.loads(result)
    print(f"sendMessage response: {result_json}")
    
    if result_json.get("ok"):
        print("✅ sendMessage successful!")
    else:
        print(f"❌ sendMessage failed: {result_json.get('description', 'Unknown error')}")
        
except Exception as e:
    print(f"❌ Error in sendMessage: {e}")
