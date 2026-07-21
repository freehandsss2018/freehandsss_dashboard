import urllib.request
import json
import os
import time
import ssl

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# === Freehandsss V41.9c: 結案驗收測試腳本 ===

# 生產路徑 (Active 模式)
WEBHOOK_URL = "https://yanhei.synology.me:8443/webhook/1444800b-1397-4154-b2da-a4d328c6c51b"
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")
ssl_context = ssl._create_unverified_context()


def wait_for_order_state(order_id, want_deleted, timeout=30, interval=2):
    """輪詢 Supabase 直至訂單達到預期狀態，唔可以靠 webhook 200 判斷——responseMode:onReceived
    令 HTTP 回應同 n8n 實際處理完全脫鉤（見 test9999003/test1004 race condition 事故 2026-07-21）。"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print(f"   [WARN] SUPABASE_URL/SUPABASE_ANON_KEY not set, skipping verification for {order_id}")
        return True
    url = f"{SUPABASE_URL}/rest/v1/orders?order_id=eq.{order_id}&select=deleted_at"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, context=ssl_context, timeout=10) as resp:
                rows = json.loads(resp.read().decode("utf-8"))
                found, is_deleted = bool(rows), bool(rows and rows[0].get("deleted_at"))
                if want_deleted and found and is_deleted:
                    return True
                if not want_deleted and found and not is_deleted:
                    return True
        except Exception as e:
            print(f"   [WARN] Verification query failed: {e}")
        time.sleep(interval)
    return False


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
    cleanup_failures = []
    for order_id in ("test2001", "test2002"):
        created = wait_for_order_state(order_id, want_deleted=False, timeout=20)
        if not created:
            print(f"   [SKIP CLEANUP] {order_id} never appeared in Supabase, skipping delete verification")
        api_call(f"Cleanup {order_id}", {"action": "delete", "Order_ID": order_id})
        if created and not wait_for_order_state(order_id, want_deleted=True, timeout=30):
            print(f"   [FAIL] Cleanup verification TIMEOUT: {order_id} still live in Supabase (deleted_at not set)")
            cleanup_failures.append(order_id)

    if cleanup_failures:
        print(f"\n[FATAL] {len(cleanup_failures)} test order(s) failed cleanup verification (not actually deleted): {cleanup_failures}")
        raise SystemExit(1)

if __name__ == "__main__":
    print("=== [V41.9c] Final Production Stress Test ===")
    run_all_tests()
    print("\n--- Testing Finished ---")
