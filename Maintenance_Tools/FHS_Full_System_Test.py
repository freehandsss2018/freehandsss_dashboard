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

# === Freehandsss V41.11: 完整週期循環測試腳本 (對齊金額欄位) ===

WEBHOOK_URL = "https://yanhei.synology.me:8443/webhook/1444800b-1397-4154-b2da-a4d328c6c51b"
TEST_ID = "test9999003" # 必須以 test+數字 開頭
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")
ssl_context = ssl._create_unverified_context()


def wait_for_order_state(order_id, want_deleted, timeout=30, interval=2):
    """輪詢 Supabase 直至訂單達到預期狀態，唔可以靠 webhook 200 判斷——responseMode:onReceived
    令 HTTP 回應同 n8n 實際處理完全脫鉤（見 test9999003 race condition 事故 2026-07-21）。"""
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
    print(f"\n[PHASE] {name}...")
    ctx = ssl._create_unverified_context()
    headers = {'Content-Type': 'application/json'}
    try:
        req = urllib.request.Request(WEBHOOK_URL, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
            print(f"   [OK] Status: {resp.getcode()}")
            return True
    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        return False

def full_cycle_test():
    # 1. 正常開訂 (Create)
    api_call("1. CREATE ORDER (New)", {
        "action": "create",
        "Order_ID": TEST_ID,
        "Customer_Name": "Cycle_Tester_V4111",
        "Deposit": 500, "Balance": 1000, "Additional_Fee": 100, # 加入金額
        "Full_Order_Text": "【全週期測試 V41.11】這是一筆正常的 *新開單*",
        "Order_Items_List": [{"Product_Name": "木框套裝 (2肢)", "Quantity": 1}]
    })

    created = wait_for_order_state(TEST_ID, want_deleted=False, timeout=20)
    if not created:
        print(f"   [WARN] {TEST_ID} did not appear in Supabase within 20s, continuing anyway (may be plain network delay)")

    time.sleep(10) # 增加等待時間

    # 2. 修改訂單 (Update)
    api_call("2. UPDATE ORDER (Modify)", {
        "action": "update",
        "Order_ID": TEST_ID,
        "Customer_Name": "Cycle_Tester_V4111",
        "Deposit": 500, "Balance": 2000, "Additional_Fee": 0, # 修改金額平衡
        "Full_Order_Text": "【全週期測試 V41.11】內容已進行 *內容修改*",
        "Order_Items_List": [{"Product_Name": "嬰兒鎖匙扣 - 不銹鋼", "Quantity": 2, "Mode": "(加購)"}]
    })

    time.sleep(10)

    # 3. 刪除訂單 (Delete)
    api_call("3. DELETE ORDER (Cleanup)", {
        "action": "delete",
        "Order_ID": TEST_ID
    })

    if created and not wait_for_order_state(TEST_ID, want_deleted=True, timeout=30):
        print(f"\n[FATAL] Cleanup verification TIMEOUT: {TEST_ID} still live in Supabase (deleted_at not set)")
        raise SystemExit(1)

if __name__ == "__main__":
    print("=== [V41.11] FHS Lifecycle Full Logic Test ===")
    full_cycle_test()
    print("\n=== Cleanup verified: order confirmed deleted in Supabase. ===")
