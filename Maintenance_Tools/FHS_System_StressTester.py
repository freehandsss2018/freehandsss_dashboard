import urllib.request
import urllib.parse
import json
import os
import time
import uuid
import ssl

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

WEBHOOK_URL = "https://yanhei.synology.me:8443/webhook/1444800b-1397-4154-b2da-a4d328c6c51b"
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")

# 忽略 SSL 憑證驗證 (因使用了 Synology 自簽憑證或網址)
ssl_context = ssl._create_unverified_context()


def _fetch_order_deleted_at(order_id):
    """回傳 (found: bool, deleted_at_is_set: bool)。None 代表查詢本身失敗（非資料狀態）。"""
    url = f"{SUPABASE_URL}/rest/v1/orders?order_id=eq.{order_id}&select=deleted_at"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req, context=ssl_context, timeout=10) as resp:
        rows = json.loads(resp.read().decode("utf-8"))
        return (bool(rows), bool(rows and rows[0].get("deleted_at")))


def wait_for_order_state(order_id, want_deleted, timeout=30, interval=2):
    """輪詢 Supabase 直至訂單達到預期狀態，唔可以靠 webhook 200 判斷——responseMode:onReceived
    令 HTTP 回應同 n8n 實際處理完全脫鉤，「未建立」同「已刪除」喺淨睇 row 存在與否時無法分辨，
    必須連 deleted_at 一齊查先分得出（見 test1004 race condition 事故 2026-07-21）。"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print(f"   [WARN] SUPABASE_URL/SUPABASE_ANON_KEY not set, skipping verification for {order_id}")
        return True
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            found, is_deleted = _fetch_order_deleted_at(order_id)
            if want_deleted and found and is_deleted:
                return True
            if not want_deleted and found and not is_deleted:
                return True
        except Exception as e:
            print(f"   [WARN] Verification query failed: {e}")
        time.sleep(interval)
    return False

def run_test_case(name, payload):
    print(f"\n[RUNNING CASE] {name}")
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(WEBHOOK_URL, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, context=ssl_context, timeout=15) as response:
            status_code = response.getcode()
            status = "PASS" if status_code == 200 else f"FAIL ({status_code})"
            body = response.read().decode('utf-8')
            print(f"Result: {status}")
            print(f"Response: {body[:100]}...")
            return status
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return f"ERROR: {str(e)}"

# 測試情境數據
test_cases = [
    {
        "name": "TC-01: Normal Order",
        "payload": {
            "action": "create",
            "Order_ID": f"test1001", # 符合 test+數字 規範
            "Customer_Name": "STRESS_TESTER_NORM",
            "Appointment_Date": "2026-04-01",
            "Deposit": 500,
            "Balance": 1000,
            "Additional_Fee": 50,
            "Order_Items_List": [
                {"Product_Name": "嬰兒鎖匙扣 - 不銹鋼", "Quantity": 1, "Order_Item_Key": "TEST_K_01"},
                {"Product_Name": "嬰兒吊飾 - 925銀", "Quantity": 1, "Order_Item_Key": "TEST_M_01"}
            ]
        }
    },
    {
        "name": "TC-02: Empty Items (Crash Defense)",
        "payload": {
            "action": "create",
            "Order_ID": f"test1002",
            "Customer_Name": "STRESS_TESTER_EMPTY",
            "Order_Items_List": []  # 空陣列
        }
    },
    {
        "name": "TC-03: Unknown SKU (Survival Law)",
        "payload": {
            "action": "create",
            "Order_ID": f"test1003",
            "Customer_Name": "STRESS_TESTER_UNKNOWN_SKU",
            "Order_Items_List": [
                {"Product_Name": "Unknown_SKU_Item", "Quantity": 1, "Order_Item_Key": "TEST_U_01"}
            ]
        }
    },
    {
        "name": "TC-04: Polluted Data Types",
        "payload": {
            "action": "create",
            "Order_ID": f"test1004",
            "Customer_Name": "STRESS_TESTER_POLLUTED",
            "Deposit": "888",
            "Balance": "100.5",
            "Order_Items_List": [
                {"Product_Name": "嬰兒鎖匙扣 - 不銹鋼", "Quantity": "2", "Order_Item_Key": "TEST_P_01"}
            ]
        }
    },
    {
        "name": "TC-05: Missing Main Info",
        "payload": {
            "action": "create",
            "Order_Items_List": [
                {"Product_Name": "嬰兒鎖匙扣 - 不銹鋼", "Quantity": 1, "Order_Item_Key": "TEST_X_01"}
            ]
        }
    }
]

def main():
    print("=== Freehandsss V40.5 System Stress Tester ===")
    results = {}
    cleanup_failures = []
    for tc in test_cases:
        res = run_test_case(tc["name"], tc["payload"])
        results[tc["name"]] = res

        # 數據清理任務 (Cleanup)
        if "Order_ID" in tc["payload"]:
            order_id = tc["payload"]["Order_ID"]

            # Confirm the create actually landed before trusting the delete-verify step
            created = wait_for_order_state(order_id, want_deleted=False, timeout=20)
            if not created:
                print(f"   [SKIP CLEANUP] {order_id} never appeared in Supabase (likely rejected by failsafe), skipping delete verification")

            print(f"   [CLEANUP] Deleting {order_id}...")
            run_test_case(f"Cleanup {order_id}", {
                "action": "delete",
                "Order_ID": order_id
            })

            if created and not wait_for_order_state(order_id, want_deleted=True, timeout=30):
                print(f"   [FAIL] Cleanup verification TIMEOUT: {order_id} still live in Supabase (deleted_at not set)")
                cleanup_failures.append(order_id)

        time.sleep(1)

    print("\n" + "="*50)
    print(" SUMMARY ")
    for name, res in results.items():
        print(f"{name.ljust(40)}: {res}")
    print("="*50)

    if cleanup_failures:
        print(f"\n[FATAL] {len(cleanup_failures)} test order(s) failed cleanup verification (not actually deleted): {cleanup_failures}")
        raise SystemExit(1)

if __name__ == "__main__":
    main()
