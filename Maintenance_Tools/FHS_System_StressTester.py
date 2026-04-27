import urllib.request
import urllib.parse
import json
import time
import uuid
import ssl

WEBHOOK_URL = "https://yanhei.synology.me:8443/webhook/1444800b-1397-4154-b2da-a4d328c6c51b"

# 忽略 SSL 憑證驗證 (因使用了 Synology 自簽憑證或網址)
ssl_context = ssl._create_unverified_context()

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
    for tc in test_cases:
        res = run_test_case(tc["name"], tc["payload"])
        results[tc["name"]] = res
        
        # 數據清理任務 (Cleanup)
        if "Order_ID" in tc["payload"]:
            print(f"   [CLEANUP] Deleting {tc['payload']['Order_ID']}...")
            run_test_case(f"Cleanup {tc['payload']['Order_ID']}", {
                "action": "delete",
                "Order_ID": tc["payload"]["Order_ID"]
            })
        
        time.sleep(1)

    print("\n" + "="*50)
    print(" SUMMARY ")
    for name, res in results.items():
        print(f"{name.ljust(40)}: {res}")
    print("="*50)

if __name__ == "__main__":
    main()
