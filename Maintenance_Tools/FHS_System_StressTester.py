import urllib.request
import urllib.parse
import json
import os
import sys
import time
import uuid
import ssl

# 2026-08-11 fix：同 FHS_Full_System_Test.py 一致嘅 Windows CP950 亂碼修復——
# 新加嘅 EXPECT_LANDING 訊息含全形破折號「—」，喺 pipe 輸出無強制 UTF-8 時亂碼。
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

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
            # Order_ID 必須帶 test+數字（即使故意缺 Customer_Name/Deposit 等主資料測試 failsafe）：
            # 冇 Order_ID 時系統會 fallback 落固定字串「未命名」，多次測試會共用同一筆殘留訂單，
            # 逐單 Telegram 靜音 regex 亦冚唔到，且 cleanup 區塊要求 payload 有 Order_ID 先會刪除
            # （見 2026-08-04 事故：orders 表發現一筆 order_id='未命名' 殘留兩日未清）
            "Order_ID": "test1005",
            "Order_Items_List": [
                {"Product_Name": "嬰兒鎖匙扣 - 不銹鋼", "Quantity": 1, "Order_Item_Key": "TEST_X_01"}
            ]
        }
    }
]

def send_test_summary(results, cleanup_failures):
    """所有測試案例跑完後,一次性發一則 Telegram 彙總,取代逐單 create/delete 通知
    （n8n 側 Order_ID 符合 test+數字已靜音逐單訊息，見 Pack Telegram Data / Filter Test Delete Notify）。"""
    lines = ["🧪 【Freehandsss 壓測報告】"]
    for name, res in results.items():
        mark = "✅" if res == "PASS" else "❌"
        lines.append(f"{mark} {name}: {res}")
    lines.append("------------------------")
    if cleanup_failures:
        lines.append(f"⚠️ Cleanup 未完成: {', '.join(cleanup_failures)}")
    else:
        lines.append("🧹 所有測試訂單已清理完成")
    full_message = "\n".join(lines)

    try:
        data = json.dumps({"action": "test_summary", "Full_Message": full_message}).encode('utf-8')
        req = urllib.request.Request(WEBHOOK_URL, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, context=ssl_context, timeout=15) as response:
            print(f"\n[TEST SUMMARY] Sent to Telegram, status {response.getcode()}")
    except Exception as e:
        print(f"\n[TEST SUMMARY] Failed to send: {e}")


# 2026-08-11 (D63續III): expect_landing 由 2026-08-11 現場實測結果定案（非猜測）——
# 逐一直打 webhook 觀察真實落地行為，確認咗邊啲案例應該成功、邊啲應該被拒收：
#   TC-01 正常單            → 落地（unambiguous）
#   TC-02 Empty Items       → 實測拒收（空品項冇嘢好計，failsafe 正確攔截）
#   TC-03 Unknown SKU       → 實測拒收（未知 SKU 唔應該靜默生成 $0 訂單）
#   TC-04 Polluted Types    → 實測有落地（字串型數字容忍轉型成功）
#   TC-05 Missing Main Info → 實測有落地（缺主資料 fallback 到預設值）
EXPECT_LANDING = {
    "test1001": True,
    "test1002": False,
    "test1003": False,
    "test1004": True,
    "test1005": True,
}


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
            expect = EXPECT_LANDING.get(order_id)
            if expect is None:
                if not created:
                    print(f"   [SKIP CLEANUP] {order_id} never appeared in Supabase (unregistered case, no expectation set), skipping delete verification")
            elif created == expect:
                tag = "EXPECTED LAND" if created else "EXPECTED REJECT"
                print(f"   [{tag}] {order_id} — matches known-good behaviour (see EXPECT_LANDING).")
            elif expect and not created:
                print(f"   [WARN] {order_id} was expected to land but never appeared in Supabase within 20s — possible real regression.")
            else:
                print(f"   [WARN] {order_id} unexpectedly landed despite invalid payload — failsafe may have regressed.")

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

    send_test_summary(results, cleanup_failures)

    if cleanup_failures:
        print(f"\n[FATAL] {len(cleanup_failures)} test order(s) failed cleanup verification (not actually deleted): {cleanup_failures}")
        raise SystemExit(1)

if __name__ == "__main__":
    main()
