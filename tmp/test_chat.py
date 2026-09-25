import urllib.request
import json

req = urllib.request.Request(
    "http://localhost:3000/api/chat-ai",
    data=json.dumps({"message": "Buatkan draf transaksi BCA"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req, timeout=15) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        text = res_data.get("text", "")
        print("Success: True")
        print("Length:", len(text))
        print("Has DOCTYPE:", "<!DOCTYPE html>" in text)
        print("Has SHOPEE INDONESIA:", "SHOPEE INDONESIA" in text)
        print("Has Rp 5.000.000:", "Rp 5.000.000" in text)
        print("Has Batalkan Transaksi BCA:", "Batalkan Transaksi BCA" in text)
        print("Text preview:\n", text[:350])
except Exception as e:
    print("Error:", e)
