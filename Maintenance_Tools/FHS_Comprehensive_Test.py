import urllib.request
import json
import ssl

# === Freehandsss V41.9c: 結案驗收測試腳本 ===

# 生產路徑 (Active 模式)
WEBHOOK_URL = "https://yanhei.synology.me:8443/webhook/1444800b-1397-4154-b2da-a4d328c6c51b"

def api_call(name, payload):
    print(f"\n[TESTING] {name}")
    ctx = ssl._create_unverified_context()
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (V41.9c-Tester)'
    }
    try:
        req = urllib.request.Request(WEBHOOK_URL, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
            print(f"   [OK] Status: {resp.getcode()}")
            return True
    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        return False

def run_all_tests():
    # Test A: 混合品項 (驗證 GODMODE 透傳)
    api_call("A. Mixed Items (Wood Frame & Keychain)", {
        "Order_ID": "test2001", # 符合 test+數字 規範
        "Customer_Name": "Final_Tester_A",
        "Deposit": 500, "Balance": 1000, "Additional_Fee": 0,
        "Full_Order_Text": "【V41.9 終極測試】混合單",
        "Order_Items_List": [
            {"Product_Name": "木框套裝 (2肢)", "Quantity": 1, "Mode": "(加購)"},
            {"Product_Name": "金屬鎖匙扣 (不鏽鋼)", "Quantity": 1, "Mode": "(加購)"}
        ]
    })

    # Test B: 缺失 SKU (驗證安全回退)
    api_call("B. Unknown SKU (Verify Failsafe)", {
        "Order_ID": "test2002",
        "Customer_Name": "Final_Tester_B",
        "Order_Items_List": [{"Product_Name": "Alien_Artifact", "Quantity": 1}]
    })

    # --- 數據清理任務 (Cleanup) ---
    print("\n[CLEANUP] Removing test data...")
    api_call("Cleanup A", {"action": "delete", "Order_ID": "test2001"})
    api_call("Cleanup B", {"action": "delete", "Order_ID": "test2002"})

if __name__ == "__main__":
    print("=== [V41.9c] Final Production Stress Test ===")
    run_all_tests()
    print("\n--- Testing Finished ---")
